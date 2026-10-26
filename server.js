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
  if (m.t === "patch") {
    // écriture atomique d'un champ : sert aux courses (mots mêlés), le premier qui trouve un mot le garde
    const id = String(m.id || ""), field = String(m.field || ""), key = String(m.key || "");
    const d = s.docs[id];
    if (!d || !/^[a-zA-Z]{1,20}$/.test(field) || !/^[A-Za-z0-9_-]{1,40}$/.test(key)) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    if (m.gid && d.gid !== m.gid) return send(ws, { t: "ack", req: m.req, ok: false, code: "stale" });
    d[field] = d[field] && typeof d[field] === "object" ? d[field] : {};
    if (m.ifAbsent && d[field][key] !== undefined) return send(ws, { t: "ack", req: m.req, ok: false, code: "taken" });
    const val = JSON.parse(JSON.stringify(m.value === undefined ? null : m.value));
    if (JSON.stringify(val).length > 2000) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    d[field][key] = val;
    if (m.extra && typeof m.extra === "object") for (const [k, v] of Object.entries(m.extra)) if (/^[a-zA-Z]{1,20}$/.test(k) && !["players", "gid", "_v"].includes(k)) d[k] = v;
    if (m.score && Number.isInteger(m.score.i) && d.players && d.players[m.score.i]) d.players[m.score.i].score = (d.players[m.score.i].score || 0) + (Number(m.score.add) || 0);
    d._v = (d._v || 0) + 1; s.touched = Date.now(); scheduleSave(ws.room);
    send(ws, { t: "ack", req: m.req, ok: true });
    const msg = { t: "snap", docs: snapshot(s) }; for (const w of s.sockets) send(w, msg);
    return;
  }
  if (m.t === "tally") {
    // tableau des scores du salon : chaque partie terminée n'est comptée qu'une fois
    const gid = String(m.gid || ""), game = String(m.game || "");
    if (!/^[a-z0-9]{4,12}$/.test(gid) || !Array.isArray(m.results) || m.results.length < 2 || m.results.length > 4) return;
    const st = s.docs.stats && typeof s.docs.stats === "object" ? s.docs.stats : { players: {}, seen: [], players_: 0 };
    st.players = st.players || {}; st.seen = Array.isArray(st.seen) ? st.seen : [];
    if (st.seen.includes(gid)) return;
    st.seen = st.seen.slice(-300).concat(gid);
    const best = Math.max(...m.results.map(r => Number(r.score) || 0));
    for (const r of m.results) {
      const name = String(r.name || "").trim().slice(0, 14); if (!name) continue;
      const key = name.toLowerCase();
      const p = st.players[key] || { name, wins: 0, games: 0, points: 0, best: 0, byGame: {} };
      p.name = name; p.games++; p.points += Number(r.score) || 0; p.best = Math.max(p.best, Number(r.score) || 0);
      const win = (Number(r.score) || 0) === best; if (win) p.wins++;
      p.byGame = p.byGame || {}; const bg = p.byGame[game] || { w: 0, g: 0 }; bg.g++; if (win) bg.w++; p.byGame[game] = bg;
      p.last = Date.now(); st.players[key] = p;
    }
    st.updated = Date.now(); st._v = (st._v || 0) + 1; s.docs.stats = st; s.touched = Date.now(); scheduleSave(ws.room);
    const msg = { t: "snap", docs: snapshot(s) }; for (const w of s.sockets) send(w, msg);
    return;
  }
  if (m.t === "presence") {
    const p = m.presence && typeof m.presence === "object" ? m.presence : {};
    if (JSON.stringify(p).length > 4000) return;
    ws.presence = p; return broadcastPeers(s);
  }
}

// ---------- pseudos (registre unique, code secret à 4 chiffres) ----------
// Un pseudo = 2 à 7 caractères A-Z 0-9 @ # _. Le code secret n'est jamais stocké en clair (scrypt + sel).
// Chaque appareil reçoit un jeton : le code n'est redemandé que sur un nouvel appareil.
const PSEUDO_RE = /^[A-Z0-9@#_]{2,7}$/;
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");
const players = new Map();           // pseudo -> { h, salt, toks:[sha256], salons:{CODE:ts}, c }
let playersLoaded = false;
try { const o = JSON.parse(fs.readFileSync(PLAYERS_FILE, "utf8")); for (const k in o) players.set(k, o[k]); } catch {}
const sha = t => crypto.createHash("sha256").update(t).digest("hex");
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString("hex");
async function getPlayer(name) {
  if (players.has(name)) return players.get(name);
  if (REDIS) { try { const v = await redis(["GET", "pl:" + name]); if (v) { const p = JSON.parse(v); players.set(name, p); return p; } } catch (e) { console.error("Lecture Redis (pseudo) :", e.message); throw e; } }
  return null;
}
let plTimer = null;
function savePlayer(name) {
  const p = players.get(name);
  if (REDIS && p) redis(["SET", "pl:" + name, JSON.stringify(p)]).catch(e => console.error("Écriture Redis (pseudo) :", e.message));
  clearTimeout(plTimer); plTimer = setTimeout(() => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PLAYERS_FILE, JSON.stringify(Object.fromEntries(players))); } catch {} }, 1500);
}
const fails = new Map();             // pseudo ou ip -> { n, until }
function locked(k) { const f = fails.get(k); return f && f.until > Date.now(); }
function fail(k, max, ms) { const f = fails.get(k) || { n: 0, until: 0 }; f.n++; if (f.n >= max) { f.until = Date.now() + ms; f.n = 0; } fails.set(k, f); }
function newToken(p) { const t = crypto.randomBytes(24).toString("base64url"); p.toks = [sha(t)].concat(p.toks || []).slice(0, 12); return t; }
function salonList(p) {
  return Object.entries(p.salons || {}).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([code, t]) => {
    const s = salons.get(code); let live = 0, open = 0;
    if (s) { live = s.sockets.size; for (const id in s.docs) { const d = s.docs[id]; if (d && d.players && !d.solo && !d.done) open++; } }
    return { code, t, live, open };
  });
}
async function api(req, res, route) {
  const out = (code, o) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return out(405, { error: "méthode" });
  let body = ""; for await (const ch of req) { body += ch; if (body.length > 4096) return out(413, { error: "trop long" }); }
  let b; try { b = JSON.parse(body || "{}"); } catch { return out(400, { error: "json" }); }
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const name = String(b.name || "").toUpperCase();
  if (!PSEUDO_RE.test(name)) return out(400, { error: "pseudo", msg: "Pseudo invalide : 2 à 7 caractères (A-Z, 0-9, @ # _)." });
  let p; try { p = await getPlayer(name); } catch { return out(503, { error: "indispo", msg: "Serveur occupé, réessaie dans un instant." }); }
  const authed = () => p && b.token && (p.toks || []).includes(sha(String(b.token)));
  const pinOk = /^\d{4}$/.test(String(b.pin || ""));
  if (route === "check") return out(200, { exists: !!p });
  if (route === "create") {
    if (locked("ip:" + ip)) return out(429, { error: "trop", msg: "Trop d'essais. Patiente quelques minutes." });
    if (!pinOk) return out(400, { error: "pin", msg: "Le code secret fait 4 chiffres." });
    if (p) return out(409, { error: "pris", msg: "Ce pseudo est déjà pris." });
    fail("ip:" + ip, 20, 10 * 60e3);
    const salt = crypto.randomBytes(12).toString("hex");
    p = { h: hashPin(b.pin, salt), salt, toks: [], salons: {}, c: Date.now() }; players.set(name, p);
    const token = newToken(p); savePlayer(name); return out(200, { token, salons: [] });
  }
  if (route === "login") {
    if (!p) return out(404, { error: "inconnu", msg: "Ce pseudo n'existe pas encore." });
    if (locked("pl:" + name) || locked("ip:" + ip)) return out(429, { error: "trop", msg: "Trop d'essais. Réessaie dans 10 minutes." });
    if (!pinOk || hashPin(b.pin, p.salt) !== p.h) { fail("pl:" + name, 5, 10 * 60e3); fail("ip:" + ip, 30, 10 * 60e3); return out(401, { error: "pin", msg: "Code secret incorrect." }); }
    fails.delete("pl:" + name); const token = newToken(p); savePlayer(name); return out(200, { token, salons: salonList(p) });
  }
  if (!authed()) return out(401, { error: "jeton", msg: "Reconnecte-toi avec ton code secret." });
  if (route === "me") return out(200, { salons: salonList(p) });
  if (route === "link") {
    const code = String(b.salon || "").toUpperCase(); if (!CODE_RE.test(code)) return out(400, { error: "salon" });
    p.salons = p.salons || {}; if (b.remove) delete p.salons[code]; else p.salons[code] = Date.now();
    const keys = Object.keys(p.salons); if (keys.length > 60) keys.sort((a, c) => p.salons[a] - p.salons[c]).slice(0, keys.length - 60).forEach(k => delete p.salons[k]);
    savePlayer(name); return out(200, { salons: salonList(p) });
  }
  if (route === "pin") { if (!pinOk) return out(400, { error: "pin", msg: "Le code secret fait 4 chiffres." }); p.salt = crypto.randomBytes(12).toString("hex"); p.h = hashPin(b.pin, p.salt); savePlayer(name); return out(200, { ok: true }); }
  if (route === "logout") { p.toks = (p.toks || []).filter(t => t !== sha(String(b.token))); savePlayer(name); return out(200, { ok: true }); }
  return out(404, { error: "route" });
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
  const am = url.pathname.match(/^\/api\/p\/(check|create|login|me|link|pin|logout)$/);
  if (am) return void api(req, res, am[1]).catch(e => { console.error(e); try { res.writeHead(500); res.end("{}"); } catch {} });
  if (url.pathname === "/mot" || url.pathname === "/mot/") return sendPage(req, res, path.join(__dirname, "public", "mot.html"));
  if (/^\/[A-Za-z0-9]{5}\/(rond|meles)\/?$/.test(url.pathname) || /^\/(rond|meles)\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "jeux.html"));
  if (url.pathname === "/" || /^\/[A-Za-z0-9]{5}\/?$/.test(url.pathname)) return sendPage(req, res, PAGE);
  res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
  res.end('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Salon introuvable</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121214;color:#ECEDF2;font-family:system-ui,sans-serif;padding:16px}main{max-width:380px;text-align:center;display:flex;flex-direction:column;gap:12px}h1{margin:0;font-size:1.4rem}p{color:#8B8C99;margin:0}form{display:flex;gap:8px}input{flex:1;min-width:0;font-size:1.3rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;text-align:center;padding:10px;border-radius:12px;border:1px solid #2f2f39;background:#1E1E24;color:#ECEDF2}button,a{font:inherit;font-weight:700;padding:12px 16px;border-radius:12px;border:none;background:#00ADB5;color:#041b1d;text-decoration:none;cursor:pointer}</style></head><body><main><h1>Ce salon n\'existe pas</h1><p>Un code de salon fait 5 caractères (lettres et chiffres). Vérifie celui qu\'on t\'a envoyé.</p><form onsubmit="event.preventDefault();var v=this.c.value.toUpperCase().replace(/[^A-Z0-9]/g,\'\');if(v.length===5)location.href=\'/\'+v"><input name="c" maxlength="5" placeholder="CODE" aria-label="Code du salon"><button>Rejoindre</button></form><a href="/">Créer un nouveau salon</a></main></body></html>');
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
