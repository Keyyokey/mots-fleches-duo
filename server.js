// Mots Fléchés Duo — serveur du site (Node.js + WebSocket)
// Chaque « salon » (code de 5 caractères dans le lien) partage ses parties en direct.
// Lancer : npm install  puis  npm start   →  http://localhost:3000
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const SAVE_FILE = path.join(DATA_DIR, "salons.json");
const PAGE = path.join(__dirname, "public", "index.html");
const MAX_DOC = 300 * 1024;          // taille max d'une partie
const MAX_DOCS = 40;                 // parties max par salon
const CODE_RE = /^[A-Z0-9]{5}$/;
// Bouton « Soutenir le site » : renseigne SUPPORT_URL (lien Ko-fi, PayPal, Stripe, Lydia…) dans l'hébergeur.
const SUPPORT_URL = /^https:\/\/[^\s"'<>]+$/.test(process.env.SUPPORT_URL || "") ? process.env.SUPPORT_URL : "";
const SUPPORT = JSON.stringify({ url: SUPPORT_URL, label: process.env.SUPPORT_LABEL || "☕ Soutenir le site", cost: process.env.MONTHLY_COST || "7 €" }).replace(/</g, "\\u003c");

// ---------- stockage durable optionnel (Upstash Redis, offre gratuite) ----------
// Renseigne UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN chez l'hébergeur : les salons survivent alors
// aux mises en veille et aux redéploiements. Sans ces variables, on garde le fichier local + la sauvegarde navigateur.
const RURL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const REDIS = !!(RURL && RTOK);
async function redis(cmd) {
  const r = await fetch(RURL, { method: "POST", headers: { Authorization: "Bearer " + RTOK, "content-type": "application/json" }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).result;
}
const loading = new Map();           // code -> Promise (chargement depuis Redis en cours)
async function loadSalon(code) {
  if (!REDIS || salons.has(code)) return;
  if (!loading.has(code)) loading.set(code, (async () => {
    try { const v = await redis(["GET", "salon:" + code]); if (v && !salons.has(code)) { const o = JSON.parse(v); salons.set(code, { docs: o.docs || {}, touched: o.touched || Date.now(), sockets: new Set() }); } }
    catch (e) { console.error("Lecture Redis impossible :", e.message); }
    finally { loading.delete(code); }
  })());
  return loading.get(code);
}
const dirty = new Set();

// ---------- salons ----------
const salons = new Map();            // code -> { docs:{id:data}, touched, sockets:Set }
function salon(code) {
  let s = salons.get(code);
  if (!s) { s = { docs: {}, touched: Date.now(), sockets: new Set() }; salons.set(code, s); }
  return s;
}
try {
  const saved = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
  for (const [code, v] of Object.entries(saved)) salons.set(code, { docs: v.docs || {}, touched: v.touched || Date.now(), sockets: new Set() });
  console.log(salons.size + " salon(s) rechargé(s)");
} catch { /* premier démarrage */ }
let saveTimer = null;
function scheduleSave(code) {
  if (code) dirty.add(code);
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const out = {};
    for (const [code, s] of salons) if (Object.keys(s.docs).length) out[code] = { docs: s.docs, touched: s.touched };
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(SAVE_FILE + ".tmp", JSON.stringify(out)); fs.renameSync(SAVE_FILE + ".tmp", SAVE_FILE); }
    catch (e) { console.error("Sauvegarde impossible :", e.message); }
    if (REDIS) for (const code of [...dirty]) { dirty.delete(code); const sl = salons.get(code); if (!sl) continue;
      const cmd = Object.keys(sl.docs).length ? ["SET", "salon:" + code, JSON.stringify({ docs: sl.docs, touched: sl.touched }), "EX", "2592000"] : ["DEL", "salon:" + code];
      redis(cmd).catch(e => { console.error("Écriture Redis impossible :", e.message); dirty.add(code); }); }
  }, 1500);
}

function send(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function snapshot(s) { return Object.entries(s.docs).map(([id, data]) => ({ id, data })); }
function peers(s) { return [...s.sockets].map(w => ({ id: w.pid, presence: w.presence || {} })); }
function broadcastPeers(s) { const list = peers(s); for (const w of s.sockets) send(w, { t: "peers", peers: list }); }

async function handle(ws, m) {
  if (m.t === "join") {
    const code = String(m.room || "").toUpperCase();
    if (!CODE_RE.test(code)) return send(ws, { t: "error", code: "invalid_argument", msg: "Code de salon invalide." });
    await loadSalon(code);
    if (ws.room) { const old = salons.get(ws.room); if (old) { old.sockets.delete(ws); broadcastPeers(old); } }
    const s = salon(code); ws.room = code; s.sockets.add(ws); s.touched = Date.now();
    send(ws, { t: "snap", docs: snapshot(s) });
    return broadcastPeers(s);
  }
  const s = ws.room && salons.get(ws.room); if (!s) return;
  if (m.t === "set") {
    const id = String(m.id || "");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || typeof m.data !== "object" || !m.data) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    const json = JSON.stringify(m.data);
    if (json.length > MAX_DOC) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    if (!s.docs[id] && Object.keys(s.docs).length >= MAX_DOCS) return send(ws, { t: "ack", req: m.req, ok: false, code: "quota_exceeded" });
    const doc = JSON.parse(json); doc._v = ((s.docs[id] && s.docs[id]._v) || 0) + 1;
    s.docs[id] = doc; s.touched = Date.now(); scheduleSave(ws.room);
    send(ws, { t: "ack", req: m.req, ok: true });
    const msg = { t: "snap", docs: snapshot(s) };
    for (const w of s.sockets) send(w, msg);
    return;
  }
  if (m.t === "restore") {
    // un navigateur renvoie ses copies locales (après une mise en veille du serveur) : on garde la version la plus récente
    let changed = false;
    for (const d of Array.isArray(m.docs) ? m.docs.slice(0, MAX_DOCS) : []) {
      const id = String(d && d.id || "");
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !d.data || typeof d.data !== "object") continue;
      const json = JSON.stringify(d.data); if (json.length > MAX_DOC) continue;
      const cur = s.docs[id]; const v = Number(d.data._v) || 0;
      if (cur ? (Number(cur._v) || 0) < v : Object.keys(s.docs).length < MAX_DOCS) { s.docs[id] = JSON.parse(json); changed = true; }
    }
    if (changed) { s.touched = Date.now(); scheduleSave(ws.room); const msg = { t: "snap", docs: snapshot(s) }; for (const w of s.sockets) send(w, msg); }
    return;
  }
  if (m.t === "presence") {
    const p = m.presence && typeof m.presence === "object" ? m.presence : {};
    if (JSON.stringify(p).length > 4000) return;
    ws.presence = p; return broadcastPeers(s);
  }
}

// ---------- serveur web ----------
const pages = {};                      // fichier -> { raw, gz, mtime }
function page(file) {
  const st = fs.statSync(file);
  const c = pages[file];
  if (c && c.mtime === st.mtimeMs) return c;
  const raw = Buffer.from(fs.readFileSync(file, "utf8").replace("<head>", "<head>\n<script>window.SUPPORT=" + SUPPORT + ";</script>"));
  return (pages[file] = { raw, gz: zlib.gzipSync(raw, { level: 9 }), mtime: st.mtimeMs });
}
function sendPage(req, res, file) {
  let p; try { p = page(file); } catch { res.writeHead(500); return res.end("Page manquante"); }
  const gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", vary: "Accept-Encoding", ...(gz ? { "content-encoding": "gzip" } : {}) });
  res.end(gz ? p.gz : p.raw);
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok " + salons.size + (REDIS ? " redis" : "")); }
  if (url.pathname === "/mot" || url.pathname === "/mot/") return sendPage(req, res, path.join(__dirname, "public", "mot.html"));
  if (url.pathname === "/" || /^\/[A-Za-z0-9]{5}\/?$/.test(url.pathname)) return sendPage(req, res, PAGE);
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Introuvable");
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: MAX_DOC + 4096 });
wss.on("connection", ws => {
  ws.pid = crypto.randomUUID(); ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  ws.on("message", raw => { let m; try { m = JSON.parse(raw); } catch { return; } ws.q = (ws.q || Promise.resolve()).then(() => handle(ws, m)).catch(e => console.error(e)); });
  ws.on("close", () => { const s = ws.room && salons.get(ws.room); if (s) { s.sockets.delete(ws); broadcastPeers(s); } });
  send(ws, { t: "hello", id: ws.pid });
});
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  const now = Date.now();
  for (const [code, s] of salons) if (!s.sockets.size && now - s.touched > 30 * 24 * 3600e3) { salons.delete(code); scheduleSave(); }
}, 30000);
server.listen(PORT, () => console.log("Mots Fléchés Duo en ligne sur http://localhost:" + PORT + (REDIS ? " (stockage Redis actif)" : "")));
