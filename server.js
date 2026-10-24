// Mots Fléchés Duo — serveur du site (Node.js + WebSocket)
// Chaque « salon » (code de 5 caractères dans le lien) partage ses parties en direct.
// Lancer : npm install  puis  npm start   →  http://localhost:3000
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const out = {};
    for (const [code, s] of salons) if (Object.keys(s.docs).length) out[code] = { docs: s.docs, touched: s.touched };
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(SAVE_FILE + ".tmp", JSON.stringify(out)); fs.renameSync(SAVE_FILE + ".tmp", SAVE_FILE); }
    catch (e) { console.error("Sauvegarde impossible :", e.message); }
  }, 1500);
}

function send(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function snapshot(s) { return Object.entries(s.docs).map(([id, data]) => ({ id, data })); }
function peers(s) { return [...s.sockets].map(w => ({ id: w.pid, presence: w.presence || {} })); }
function broadcastPeers(s) { const list = peers(s); for (const w of s.sockets) send(w, { t: "peers", peers: list }); }

function handle(ws, m) {
  if (m.t === "join") {
    const code = String(m.room || "").toUpperCase();
    if (!CODE_RE.test(code)) return send(ws, { t: "error", code: "invalid_argument", msg: "Code de salon invalide." });
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
    s.docs[id] = JSON.parse(json); s.touched = Date.now(); scheduleSave();
    send(ws, { t: "ack", req: m.req, ok: true });
    const msg = { t: "snap", docs: snapshot(s) };
    for (const w of s.sockets) send(w, msg);
    return;
  }
  if (m.t === "presence") {
    const p = m.presence && typeof m.presence === "object" ? m.presence : {};
    if (JSON.stringify(p).length > 4000) return;
    ws.presence = p; return broadcastPeers(s);
  }
}

// ---------- serveur web ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") { res.writeHead(200); return res.end("ok"); }
  if (url.pathname === "/" || /^\/[A-Za-z0-9]{5}\/?$/.test(url.pathname)) {
    return fs.readFile(PAGE, (err, data) => {
      if (err) { res.writeHead(500); return res.end("Page manquante"); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      res.end(data.toString("utf8").replace("<head>", "<head>\n<script>window.SUPPORT=" + SUPPORT + ";</script>"));
    });
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Introuvable");
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: MAX_DOC + 4096 });
wss.on("connection", ws => {
  ws.pid = crypto.randomUUID(); ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  ws.on("message", raw => { let m; try { m = JSON.parse(raw); } catch { return; } try { handle(ws, m); } catch (e) { console.error(e); } });
  ws.on("close", () => { const s = ws.room && salons.get(ws.room); if (s) { s.sockets.delete(ws); broadcastPeers(s); } });
  send(ws, { t: "hello", id: ws.pid });
});
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  const now = Date.now();
  for (const [code, s] of salons) if (!s.sockets.size && now - s.touched > 30 * 24 * 3600e3) { salons.delete(code); scheduleSave(); }
}, 30000);
server.listen(PORT, () => console.log("Mots Fléchés Duo en ligne sur http://localhost:" + PORT));
