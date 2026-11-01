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
const makePoker = require("./poker");
const makeCatalog = require("./catalog");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const SAVE_FILE = path.join(DATA_DIR, "salons.json");
const PAGE = path.join(__dirname, "public", "index.html");
const HOME = path.join(__dirname, "public", "accueil.html");
const MAX_DOC = 300 * 1024;          // taille max d'une partie
const MAX_DOCS = 40;                 // parties max par salon
const CODE_RE = /^[A-Z0-9]{5}$/;
// Bouton « Soutenir le site » : renseigne SUPPORT_URL (lien Ko-fi, PayPal, Stripe, Lydia…) dans l'hébergeur.
const SUPPORT_URL = /^https:\/\/[^\s"'<>]+$/.test(process.env.SUPPORT_URL || "") ? process.env.SUPPORT_URL : "";
const SUPPORT = JSON.stringify({ url: SUPPORT_URL, label: process.env.SUPPORT_LABEL || "☕ Soutenir le site", cost: process.env.MONTHLY_COST || "7 €" }).replace(/</g, "\\u003c");

// ---------- stockage durable optionnel (Upstash Redis, offre gratuite) ----------
// Renseigne UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN chez l'hébergeur : les salons survivent alors
// aux mises en veille et aux redéploiements. Sans ces variables, on garde le fichier local + la sauvegarde navigateur.
// valeurs collées depuis Upstash : on retire guillemets et espaces éventuels autour
const envClean = v => String(v || "").trim().replace(/^["']+|["']+$/g, "").trim();
const RURL = envClean(process.env.UPSTASH_REDIS_REST_URL).replace(/\/$/, "");
const RTOK = envClean(process.env.UPSTASH_REDIS_REST_TOKEN);
const REDIS = !!(RURL && RTOK);
// diagnostic : dernière erreur du stockage (statut et message d'Upstash, jamais la commande ni ses valeurs)
const redisDiag = { ok: 0, err: 0, last: null };
// vérification du stockage toutes les 5 minutes (et au démarrage)
const storage = { ok: null, since: null, msg: "" };
async function checkStorage() {
  if (!REDIS) return;
  try { await redis(["PING"]); if (storage.ok === false) console.log("Stockage de nouveau accessible"); storage.ok = true; storage.since = null; storage.msg = ""; }
  catch (e) { if (storage.ok !== false) { storage.since = new Date().toISOString(); console.error("STOCKAGE KO :", redisDiag.last && redisDiag.last.msg); } storage.ok = false; storage.msg = (redisDiag.last && redisDiag.last.msg || e.message).slice(0, 140); }
}
setTimeout(checkStorage, 2000); setInterval(checkStorage, 5 * 60e3);
async function redis(cmd) {
  let r;
  try { r = await fetch(RURL, { method: "POST", headers: { Authorization: "Bearer " + RTOK, "content-type": "application/json" }, body: JSON.stringify(cmd) }); }
  catch (e) { redisDiag.err++; redisDiag.last = { t: new Date().toISOString(), op: cmd[0], msg: "réseau : " + e.message }; throw e; }
  if (!r.ok) { const txt = (await r.text().catch(() => "")).replace(/[A-Za-z0-9_-]{30,}/g, "…").slice(0, 160); redisDiag.err++; redisDiag.last = { t: new Date().toISOString(), op: cmd[0], msg: "HTTP " + r.status + " " + txt }; throw new Error("redis " + r.status); }
  const j = await r.json(); if (j && j.error) { redisDiag.err++; redisDiag.last = { t: new Date().toISOString(), op: cmd[0], msg: String(j.error).slice(0, 160) }; throw new Error("redis " + j.error); }
  redisDiag.ok++; return j.result;
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
  if (code && code[0] === "~") return;
  if (code) dirty.add(code);
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const out = {};
    for (const [code, s] of salons) if (code[0] !== "~" && Object.keys(s.docs).length) out[code] = { docs: s.docs, touched: s.touched };
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

// ---------- tirage des contenus et lancement des parties multijoueurs ----------
// Règle : une nouvelle partie multijoueur exclut tout contenu déjà commencé (1er coup joué) ou terminé par l'un de ses participants,
// en solo comme en multijoueur. Vérification à la proposition (draw) puis juste avant le lancement (launch), sur le serveur.
const CAT = makeCatalog(__dirname);
const MSG_NONE = "Aucune nouvelle partie disponible pour ces paramètres.", MSG_ERR = "Impossible de vérifier les parties disponibles. Réessaie.";
async function histsOf(names) {               // lève une erreur si un historique ne peut pas être lu
  const out = [];
  if (process.env.FL_TEST_FAIL && names.some(n => n.startsWith(process.env.FL_TEST_FAIL))) throw new Error("test : stockage indisponible");
  for (const n of names) { const p = await getPlayerStrict(n); if (!p) throw new Error("compte introuvable"); out.push(p.hist || {}); }
  return out;
}
const roomLock = new Map();
function locked1(room, fn) { const prev = roomLock.get(room) || Promise.resolve(); const next = prev.then(fn, fn); roomLock.set(room, next.catch(() => {})); return next; }
async function handleDraw(ws, s, m) {
  const game = String(m.game || ""); const reply = o => send(ws, { t: "drawn", req: m.req, ...o });
  if (!CAT.GAMES.includes(game)) return reply({ ok: false, msg: MSG_ERR });
  const lvl = CAT.level(game, m.level); if (!lvl) return reply({ ok: false, msg: MSG_NONE });
  const acc = accs.get(ws.room);
  const names = [ws.user]; const opp = normPseudo(m.opp); if (PSEUDO_RE.test(opp) && opp !== ws.user && acc && acc.members[opp]) names.push(opp);
  let hists; try { hists = await histsOf(names); } catch (e) { return reply({ ok: false, msg: MSG_ERR }); }
  if (game === "culture") return reply({ ok: true, qs: CAT.drawSet(hists) });
  const adm = CAT.admissible(game, lvl, hists);
  const n = Number(m.n) || 0;
  if (n) { const ref = CAT.byNumber(game, lvl, n); return ref && adm.includes(ref) ? reply({ ok: true, ref, manual: true }) : reply({ ok: false, msg: MSG_NONE }); }
  if (!adm.length) return reply({ ok: false, msg: MSG_NONE });
  return reply({ ok: true, ref: CAT.pick(adm) });
}
async function handleLaunch(ws, s, m) {
  const id = String(m.id || ""); const game = { fl: "fleches", rond: "rond", meles: "meles", cg: "culture" }[id];
  if (!game) return;
  return locked1(ws.room, async () => {
    const d = s.docs[id]; if (!d || !d.wait || d.done || d.solo) return;           // déjà lancée, terminée ou solo : rien à faire
    if (m.gid && d.gid !== m.gid) return;
    const names = d.players.map(p => String(p.name || "").toUpperCase());
    // tous les participants doivent être de vrais comptes, présents dans le salon
    if (names.some(n => !PSEUDO_RE.test(n))) return;
    const here = new Set([...s.sockets].map(w => w.user));
    if (!names.every(n => here.has(n))) return;
    const lvl = CAT.level(game, d.level);
    let hists; try { hists = await histsOf(names); } catch (e) { d.blocked = MSG_ERR; d.blockedAt = Date.now(); return publish(ws.room, s, id, d); }
    if (game === "culture") { if (!CAT.setOk(d.qs, hists)) CAT.applyTo(game, d, CAT.drawSet(hists)); }
    else { const adm = CAT.admissible(game, lvl, hists); const cur = CAT.refOf(game, d);
    if (!adm.includes(cur)) {
      if (d.manual || !adm.length) { d.blocked = MSG_NONE; d.blockedAt = Date.now(); return publish(ws.room, s, id, d); }
      CAT.applyTo(game, d, CAT.pick(adm));                                          // le contenu proposé est devenu exclu : nouveau tirage
    } }
    delete d.blocked; d.wait = false; d.go = Date.now() + 5600; d.started = d.go; if (game !== "meles" && game !== "culture") d.turnStart = d.go; if (game === "culture") { d.qStart = d.go; d.i = 0; }
    d.msg = game === "culture" ? "Le jeu est lancé ! Répondez en même temps." : game === "meles" ? "Le jeu est lancé ! Le premier qui trouve un mot le prend." : "Le jeu est lancé ! " + d.players[d.turn || 0].name + " commence.";
    publish(ws.room, s, id, d);
  });
}
function publish(room, s, id, d) { d._v = (d._v || 0) + 1; s.docs[id] = d; s.touched = Date.now(); scheduleSave(room); const msg = { t: "snap", docs: snapshot(s) }; for (const w of s.sockets) send(w, msg); }
// historique du joueur : contenu commencé (1er coup joué) ou terminé, relié au compte
function markHist(p, game, ref, ev) {
  const c = CAT.cid(game, ref); if (!c) return false;
  p.hist = p.hist || {}; const h = p.hist[game] = p.hist[game] || {}; const e = h[c] = h[c] || {};
  if (!e.s) e.s = Date.now(); if (ev === "d" && !e.d) e.d = Date.now(); return true;
}

// seul le serveur lance une partie multijoueur (après vérification des historiques) ; le contenu d'une partie lancée ne change plus
function launchOk(id, prev, next) {
  const game = { fl: "fleches", rond: "rond", meles: "meles", cg: "culture" }[id]; if (!game || !next || next.solo || !Array.isArray(next.players)) return true;
  const same = prev && prev.gid === next.gid;
  if (!same) return !!next.wait || !!next.done;                                     // une nouvelle partie commence toujours en attente
  if (prev.wait && !next.wait && !next.done) return false;                          // lancement réservé au serveur
  if (!prev.wait && next.wait) return false;                                        // copie périmée d'avant le lancement
  if (!prev.wait && CAT.refOf(game, prev) !== CAT.refOf(game, next)) return false;  // contenu figé une fois lancée
  if (prev.blocked && !next.blocked) return false;
  return true;
}
// une partie ne peut faire apparaître que le joueur connecté ; une nouvelle partie peut inviter un membre du salon ou « Invité »
function seatsOk(prev, next, user, acc) {
  const ps = Array.isArray(next.players) ? next.players : null; if (!ps) return true;
  const fresh = !prev || prev.gid !== next.gid;
  const old = new Set(fresh ? [] : (Array.isArray(prev.players) ? prev.players : []).map(x => x && x.name));
  for (const pl of ps) {
    const n = String(pl && pl.name || "");
    if (old.has(n) || n === user || /^invit/i.test(n)) continue;
    if (fresh && acc && acc.members[n.toUpperCase()]) continue;
    return false;
  }
  return true;
}
async function handle(ws, m) {
  if (m.t === "join") {
    if (ws.room) { const old = salons.get(ws.room); if (old) { old.sockets.delete(ws); broadcastPeers(old); if (ws.solo) salons.delete(ws.room); } ws.room = null; }
    // partie solo (poker contre le robot…) : table privée à cette connexion, jamais partagée ni sauvegardée
    if (m.solo) { ws.solo = true; ws.room = "~" + ws.pid; const s = salon(ws.room); s.sockets.add(ws); send(ws, { t: "snap", docs: [] }); return; }
    ws.solo = false;
    const code = String(m.room || "").toUpperCase();
    if (!CODE_RE.test(code)) return send(ws, { t: "error", code: "invalid_argument", msg: "Code de salon invalide." });
    // le pseudo vient du compte (jeton vérifié ici), jamais du navigateur
    const nm = normPseudo(m.name);
    let p = null, acc = null;
    try { p = PSEUDO_RE.test(nm) ? await getPlayer(nm) : null; if (tokOk(p, m.token)) { await migratePlayer(nm, p); acc = await getAcc(code); } }
    catch (e) { return send(ws, { t: "error", code: "unavailable", msg: "Serveur occupé, réessaie dans un instant." }); }
    if (!tokOk(p, m.token)) return send(ws, { t: "error", code: "auth", msg: "Connecte-toi pour ouvrir ce salon." });
    if (!acc || !acc.members[nm]) return send(ws, { t: "error", code: "forbidden", msg: "Impossible de rejoindre ce salon. Vérifie le nom et le code, ou contacte le responsable." });
    acc.members[nm].o = Date.now(); saveAcc(acc);
    await loadSalon(code);
    const s = salon(code); ws.room = code; ws.user = nm; s.sockets.add(ws); s.touched = Date.now();
    send(ws, { t: "room", id: code, name: acc.name, role: acc.owner === nm ? "owner" : "member", me: nm, ...(acc.owner === nm ? { acode: acc.code } : {}) });
    send(ws, { t: "snap", docs: snapshot(s) });
    return broadcastPeers(s);
  }
  const s = ws.room && salons.get(ws.room); if (!s) return;
  // chaque action multijoueur revérifie l'accès (un accès retiré coupe immédiatement)
  if (!ws.solo) { const a = accs.get(ws.room); if (!a || !ws.user || !a.members[ws.user]) { s.sockets.delete(ws); ws.room = null; broadcastPeers(s); return send(ws, { t: "error", code: "forbidden", msg: "Tu n'as plus accès à ce salon." }); } }
  if (m.t === "draw") return handleDraw(ws, s, m);
  if (m.t === "launch") return handleLaunch(ws, s, m);
  if (m.t === "set") {
    const id = String(m.id || "");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || typeof m.data !== "object" || !m.data) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    const json = JSON.stringify(m.data);
    if (json.length > MAX_DOC) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    if (!s.docs[id] && Object.keys(s.docs).length >= MAX_DOCS) return send(ws, { t: "ack", req: m.req, ok: false, code: "quota_exceeded" });
    if (id === "meta") return send(ws, { t: "ack", req: m.req, ok: false, code: "permission_denied" });
    const doc = JSON.parse(json);
    if (!ws.solo && !seatsOk(s.docs[id], doc, ws.user, accs.get(ws.room))) return send(ws, { t: "ack", req: m.req, ok: false, code: "permission_denied" });
    if (!ws.solo && !launchOk(id, s.docs[id], doc)) return send(ws, { t: "ack", req: m.req, ok: false, code: "permission_denied" });
    doc._v = ((s.docs[id] && s.docs[id]._v) || 0) + 1;
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
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || id === "meta" || !d.data || typeof d.data !== "object") continue;
      if (!ws.solo && (!seatsOk(s.docs[id], d.data, ws.user, accs.get(ws.room)) || !launchOk(id, s.docs[id], d.data))) continue;
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
    if (id === "meta") return send(ws, { t: "ack", req: m.req, ok: false, code: "permission_denied" });
    if (m.extra && typeof m.extra === "object") for (const [k, v] of Object.entries(m.extra)) if (/^[a-zA-Z]{1,20}$/.test(k) && !["players", "gid", "_v", "wait", "go", "grid", "pid", "mid", "level", "blocked", "manual", "words", "grid", "qs", "ans", "adv"].includes(k)) d[k] = v;
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
  if (m.t === "pk") {
    let who = null; const nm = String(m.name || "").toUpperCase();
    if (PSEUDO_RE.test(nm) && m.token && (ws.solo || nm === ws.user)) { const p = await getPlayer(nm); if (tokOk(p, m.token)) { who = nm; ensureWallet(p); } }
    if (!ws.solo && !who) return send(ws, { t: "pkerr", msg: "Connecte-toi pour jouer dans ce salon." });
    return poker.handle(ws, m, who);
  }
  if (m.t === "presence") {
    const p = m.presence && typeof m.presence === "object" ? m.presence : {};
    if (JSON.stringify(p).length > 4000) return;
    if (!ws.solo) p.name = ws.user;            // le nom affiché aux autres est celui du compte
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
  if (REDIS) { try { const v = await redis(["GET", "pl:" + name]); if (v) { const p = JSON.parse(v); players.set(name, p); return p; } } catch (e) { console.error("Lecture Redis (pseudo) :", e.message); } }
  return null;
}
// lecture stricte : une panne de stockage est une erreur, pas un historique vide
async function getPlayerStrict(name) {
  if (players.has(name)) return players.get(name);
  if (!REDIS) return null;
  const v = await redis(["GET", "pl:" + name]); if (!v) return null;
  const p = JSON.parse(v); if (!players.has(name)) players.set(name, p); return players.get(name);
}
let plTimer = null;
function savePlayer(name) {
  const p = players.get(name);
  if (REDIS && p) redis(["SET", "pl:" + name, JSON.stringify(p)]).catch(e => console.error("Écriture Redis (pseudo) :", e.message));
  clearTimeout(plTimer); plTimer = setTimeout(() => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PLAYERS_FILE, JSON.stringify(Object.fromEntries(players))); } catch {} }, 1500);
}
const fails = new Map();             // pseudo ou ip -> { n, until }
// blocage progressif : max erreurs → blocage ms, puis 2×, 4×… (24 h au plus) tant que les erreurs continuent
function locked(k) { const f = fails.get(k); return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 60e3) : 0; }
function fail(k, max, ms) { const f = fails.get(k) || { n: 0, until: 0, lvl: 0 }; f.n++; if (f.n >= max) { f.until = Date.now() + Math.min(ms * 2 ** f.lvl, 24 * 3600e3); f.lvl++; f.n = 0; } fails.set(k, f); }
const normPseudo = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
const tokOk = (p, t) => !!(p && t && (p.toks || []).includes(sha(String(t))));
const DUMMY_SALT = crypto.randomBytes(12).toString("hex");
const creating = new Set();          // pseudos en cours de création (deux demandes simultanées)
function newToken(p) { const t = crypto.randomBytes(24).toString("base64url"); p.toks = [sha(t)].concat(p.toks || []).slice(0, 12); return t; }
// ---------- accès aux salons (compte ↔ salon) ----------
// Un salon a trois choses distinctes : son identifiant interne (5 caractères, dans l'adresse),
// son nom affiché et son code d'accès (6 caractères, connu du seul responsable). Rejoindre = nom + code vérifiés ici.
// Redis : sa:ID = { id, name, code, owner, members:{PSEUDO:{t,o}}, c }   sc:CODE = ID
const ACC_FILE = path.join(DATA_DIR, "access.json");
const accs = new Map();              // id -> fiche du salon
const codeIdx = new Map();           // code d'accès -> id
try { const o = JSON.parse(fs.readFileSync(ACC_FILE, "utf8")); for (const id in o) { accs.set(id, o[id]); if (o[id].code) codeIdx.set(o[id].code, id); } } catch {}
const ACODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans I, O, 0, 1 (faciles à confondre)
const ACODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const rndStr = (n, ch) => { const a = crypto.randomBytes(n); return [...a].map(x => ch[x % ch.length]).join(""); };
const normName = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const cleanName = v => String(v || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim();
async function getAcc(id) {               // lève une erreur si Redis ne répond pas (≠ salon inexistant)
  if (accs.has(id)) return accs.get(id);
  if (!REDIS) return null;
  const v = await redis(["GET", "sa:" + id]);
  if (!v) return null;
  const m = JSON.parse(v); if (!accs.has(id)) { accs.set(id, m); if (m.code) codeIdx.set(m.code, id); }
  return accs.get(id);
}
let accTimer = null;
function saveAcc(m) {
  accs.set(m.id, m);
  if (REDIS) redis(["SET", "sa:" + m.id, JSON.stringify(m)]).catch(e => console.error("Écriture Redis (salon) :", e.message));
  clearTimeout(accTimer); accTimer = setTimeout(() => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(ACC_FILE, JSON.stringify(Object.fromEntries(accs))); } catch {} }, 1500);
}
async function idByCode(code) {
  if (codeIdx.has(code)) return codeIdx.get(code);
  if (!REDIS) return null;
  return await redis(["GET", "sc:" + code]);
}
async function reserveCode(id) {          // code d'accès unique (réservation atomique)
  for (let i = 0; i < 20; i++) {
    const c = rndStr(6, ACODE_CH);
    if (codeIdx.has(c)) continue;
    if (REDIS && (await redis(["SET", "sc:" + c, id, "NX"])) !== "OK") continue;
    codeIdx.set(c, id); return c;
  }
  throw new Error("code");
}
const accCreating = new Map();            // id -> Promise (création en cours)
async function createAcc(id, name, owner) {
  if (accCreating.has(id)) return accCreating.get(id);
  const pr = (async () => {
    const ex = await getAcc(id); if (ex) return { m: ex, created: false };
    const m = { id, name: cleanName(name).slice(0, 40) || "Salon " + id, code: null, owner: owner || null, members: {}, c: Date.now() };
    if (REDIS && (await redis(["SET", "sa:" + id, JSON.stringify(m), "NX"])) !== "OK") return { m: await getAcc(id), created: false };
    m.code = await reserveCode(id); saveAcc(m); return { m, created: true };
  })();
  accCreating.set(id, pr);
  try { return await pr; } finally { accCreating.delete(id); }
}
function addMember(m, name, p) {          // sans doublon : une seule entrée par pseudo
  const now = Date.now(); const had = !!m.members[name];
  if (!had) m.members[name] = { t: now, o: now };
  p.acc = p.acc || {}; p.acc[m.id] = p.acc[m.id] || now;
  return had;
}
// Reprise des anciens salons : les salons déjà liés au compte deviennent des accès (une seule fois par compte).
async function migratePlayer(name, p) {
  if (p.migS) return;
  await backupReady;
  for (const [id, t] of Object.entries(p.salons || {})) {
    if (!CODE_RE.test(id)) continue;
    let m = await getAcc(id);
    if (!m) {
      await loadSalon(id); const s = salons.get(id);
      if (!s || !Object.keys(s.docs).length) continue;            // salon vide ou expiré : rien à reprendre
      const nm = s.docs.meta && typeof s.docs.meta.name === "string" ? s.docs.meta.name : "";
      m = (await createAcc(id, nm, null)).m;
    }
    if (!m.members[name]) { m.members[name] = { t: Date.now(), o: Number(t) || Date.now() }; saveAcc(m); }
    p.acc = p.acc || {}; p.acc[id] = Number(t) || Date.now();
  }
  p.migS = 1; savePlayer(name);
}
function liveInfo(id) {
  const s = salons.get(id); let live = 0, open = 0;
  if (s) { live = s.sockets.size; for (const k in s.docs) { const d = s.docs[k]; if (d && d.players && !d.solo && !d.done) open++; } }
  return { live, open };
}
// liste complète des salons accessibles, du plus récemment ouvert au plus ancien
async function salonList(name, p) {
  await migratePlayer(name, p);
  const ids = Object.keys(p.acc || {});
  const ms = await Promise.all(ids.map(id => getAcc(id)));
  const list = []; let changed = false;
  ms.forEach((m, i) => {
    if (!m || !m.members[name]) { delete p.acc[ids[i]]; changed = true; return; }   // accès retiré
    const own = m.owner === name;
    list.push({ code: m.id, name: m.name, o: m.members[name].o || 0, role: own ? "owner" : "member", ...(own ? { acode: m.code, members: Object.keys(m.members) } : {}), ...liveInfo(m.id) });
  });
  if (changed) savePlayer(name);
  return list.sort((a, b) => b.o - a.o);
}
// fermer les connexions d'un joueur qui n'a plus accès
function evict(id, who) {
  const s = salons.get(id); if (!s) return;
  for (const w of [...s.sockets]) if (w.user === who) { send(w, { t: "error", code: "forbidden", msg: "Tu n'as plus accès à ce salon." }); s.sockets.delete(w); w.room = null; }
  broadcastPeers(s);
}
async function salonApi(route, name, p, b, ip, out, bad) {
  const ROUTES = ["salons", "sjoin", "screate", "skick", "scode"];
  if (!ROUTES.includes(route)) return undefined;
  try {
    if (route === "salons") return out(200, { salons: await salonList(name, p) });
    if (route === "screate") {
      const nm = cleanName(b.sname);
      if (!nm || nm.length > 40) return bad("sname", "Nom du salon : 1 à 40 caractères.");
      let id = null;
      for (let i = 0; i < 20 && !id; i++) {
        const c = rndStr(5, ACODE_CH);
        if (salons.has(c) || accs.has(c)) continue;
        if (REDIS && await redis(["EXISTS", "salon:" + c])) continue;
        const r = await createAcc(c, nm, name); if (r.created) id = c;
      }
      if (!id) return out(503, { error: "indispo", msg: "Serveur occupé, réessaie dans un instant." });
      const m = accs.get(id); addMember(m, name, p); saveAcc(m); savePlayer(name);
      return out(200, { msg: "Salon créé.", salon: { code: id, name: m.name, role: "owner", acode: m.code }, salons: await salonList(name, p) });
    }
    if (route === "sjoin") {
      const nm = cleanName(b.sname); const code = String(b.scode || "").toUpperCase().replace(/[\s-]/g, "");
      if (!nm || nm.length > 40) return bad("sname", "Nom du salon : 1 à 40 caractères.");
      if (!ACODE_RE.test(code)) return bad("scode", "Code d'accès : 6 caractères (lettres et chiffres).");
      const lk = locked("sj:" + name) || locked("sjip:" + ip);
      if (lk) return out(429, { error: "trop", msg: "Trop d'essais. Réessaie dans " + lk + " min." });
      const id = await idByCode(code); const m = id ? await getAcc(id) : null;
      if (!m || m.code !== code || normName(m.name) !== normName(nm)) {
        fail("sj:" + name, 5, 15 * 60e3); fail("sjip:" + ip, 30, 15 * 60e3);
        return out(403, { error: "refus", msg: "Impossible de rejoindre ce salon. Vérifie le nom et le code, ou contacte le responsable." });
      }
      fails.delete("sj:" + name);
      const had = addMember(m, name, p); if (!had) saveAcc(m); savePlayer(name);
      return out(200, { already: had, msg: had ? "Tu as déjà accès à ce salon." : "Tu as rejoint le salon.", salon: { code: m.id, name: m.name }, salons: await salonList(name, p) });
    }
    // actions du responsable
    const id = String(b.salon || "").toUpperCase();
    const m = CODE_RE.test(id) ? await getAcc(id) : null;
    if (!m || m.owner !== name) return out(403, { error: "droits", msg: "Seul le responsable du salon peut faire cela." });
    if (route === "skick") {
      const who = normPseudo(b.member);
      if (who === name) return bad("member", "Le responsable ne peut pas se retirer lui-même.");
      if (!m.members[who]) return out(200, { msg: "Ce joueur n'a pas accès à ce salon.", members: Object.keys(m.members) });
      delete m.members[who]; saveAcc(m);
      const q = await getPlayer(who); if (q && q.acc) { delete q.acc[id]; savePlayer(who); }
      evict(id, who);
      return out(200, { msg: "Accès retiré.", members: Object.keys(m.members) });
    }
    if (route === "scode") {
      const old = m.code; m.code = await reserveCode(id); saveAcc(m);
      codeIdx.delete(old); if (REDIS) redis(["DEL", "sc:" + old]).catch(() => {});
      return out(200, { msg: "Nouveau code créé. L'ancien ne fonctionne plus.", acode: m.code });
    }
  } catch (e) {
    console.error("Salons :", e.message);   // jamais de code d'accès dans les journaux
    return out(503, { error: "indispo", msg: route === "salons" ? "Impossible de charger tes salons. Réessaie." : "Serveur occupé, réessaie dans un instant." });
  }
}
// Sauvegarde avant la reprise des comptes : copie unique de tous les comptes (pl:*) dans bak:pl:AAAAMMJJ.
async function backupPlayers() {
  const tag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (!REDIS) { try { if (fs.existsSync(PLAYERS_FILE) && !fs.existsSync(PLAYERS_FILE + ".bak-acces")) fs.copyFileSync(PLAYERS_FILE, PLAYERS_FILE + ".bak-acces"); } catch {} return; }
  try {
    if (await redis(["EXISTS", "bak:pl:done"])) return;
    const all = {}; let cur = "0";
    do { const r = await redis(["SCAN", cur, "MATCH", "pl:*", "COUNT", "200"]); cur = String(r[0]); const keys = r[1] || [];
      if (keys.length) { const vals = await redis(["MGET", ...keys]); keys.forEach((k, i) => { if (vals[i]) all[k] = vals[i]; }); } } while (cur !== "0");
    await redis(["SET", "bak:pl:" + tag, JSON.stringify(all)]);
    await redis(["SET", "bak:pl:done", tag]);
    console.log("Sauvegarde des comptes faite : bak:pl:" + tag + " (" + Object.keys(all).length + " comptes)");
  } catch (e) { console.error("Sauvegarde des comptes impossible :", e.message); }
}
const backupReady = backupPlayers();
// ---------- points des joueurs (classement général, progression) ----------
const rankMem = new Map();           // pseudo -> total (secours sans Redis)
const DAYKEY = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
const SOLO_MULT = { facile: 1, normal: 1.5, moyen: 1.5, difficile: 2 };
// solde du jour (total en fin de journée) : sert au graphique « Total », qui montre aussi les baisses (conversion en jetons)
function balSnap(p) { p.pts.b = p.pts.b || {}; p.pts.b[DAYKEY()] = p.pts.tot; const k = Object.keys(p.pts.b).sort(); if (k.length > 60) k.slice(0, k.length - 60).forEach(x => delete p.pts.b[x]); }
const ptsOut = p => { const q = p.pts || { tot: 0, g: {}, d: {} }; return { ...q, ever: !!(q.ever || q.tot > 0 || Object.values(q.g || {}).some(v => v > 0)) }; };
async function addPoints(name, p, game, pts) {
  p.pts = p.pts || { tot: 0, g: {}, d: {} };
  p.pts.tot += pts; p.pts.g[game] = (p.pts.g[game] || 0) + pts;
  if (pts > 0) p.pts.ever = 1;                       // a déjà accumulé des points (reste vrai même si le total revient à zéro)
  const day = DAYKEY(); const d = p.pts.d[day] || {}; d[game] = (d[game] || 0) + pts; p.pts.d[day] = d;
  balSnap(p);
  const days = Object.keys(p.pts.d).sort(); if (days.length > 60) days.slice(0, days.length - 60).forEach(k => delete p.pts.d[k]);
  rankMem.set(name, p.pts.tot);
  if (REDIS) redis(["ZADD", "rank", String(p.pts.tot), name]).catch(e => console.error("Classement Redis :", e.message));
}
async function topRank(me) {
  let top = [], mine = null;
  if (REDIS) {
    try {
      const r = await redis(["ZREVRANGE", "rank", "0", "9", "WITHSCORES"]);
      for (let i = 0; i < r.length; i += 2) top.push({ name: r[i], pts: Math.round(Number(r[i + 1])) });
      if (me) { const [rk, sc] = await Promise.all([redis(["ZREVRANK", "rank", me]), redis(["ZSCORE", "rank", me])]); if (rk !== null && rk !== undefined) mine = { name: me, rank: Number(rk) + 1, pts: Math.round(Number(sc)) }; }
      return { top, me: mine };
    } catch (e) { console.error("Classement Redis :", e.message); }
  }
  const all = [...rankMem].sort((a, b) => b[1] - a[1]);
  top = all.slice(0, 10).map(([name, pts]) => ({ name, pts: Math.round(pts) }));
  const i = all.findIndex(x => x[0] === me); if (i >= 0) mine = { name: me, rank: i + 1, pts: Math.round(all[i][1]) };
  return { top, me: mine };
}
for (const [k, p] of players) if (p.pts) rankMem.set(k, p.pts.tot);

// ---------- jetons du Poker Lettres (monnaie virtuelle) ----------
function isoWeek(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + "-" + Math.ceil(((t - y) / 864e5 + 1) / 7); }
const ALLOW = bet => bet >= 50 ? 70 : bet >= 20 ? 50 : bet >= 1 ? 35 : 20;
function ensureWallet(p) {
  const wk = isoWeek();
  if (typeof p.coins !== "number") { p.coins = 70; p.wk = wk; p.wkBet = 0; return p; }
  if (p.wk !== wk) { const add = ALLOW(p.wkBet || 0); p.coins = Math.min(300, p.coins + add); p.lastAllow = add; p.wk = wk; p.wkBet = 0; }
  return p;
}
const poker = makePoker({
  send,
  wallet: name => { const p = players.get(name); return p ? ensureWallet(p) : null; },
  pay: (name, delta) => { const p = players.get(name); if (!p) return; ensureWallet(p); p.coins = Math.max(0, Math.round(p.coins + delta)); if (delta < 0) p.wkBet = (p.wkBet || 0) - delta; savePlayer(name); },
  points: (name, pts) => { const p = players.get(name); if (p && pts > 0) { addPoints(name, p, "poker", pts); savePlayer(name); } }
});

async function api(req, res, route) {
  const out = (code, o) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return out(405, { error: "méthode" });
  const MAXB = route === "solo" ? 96 * 1024 : 4096;
  let body = ""; for await (const ch of req) { body += ch; if (body.length > MAXB) return out(413, { error: "trop long" }); }
  let b; try { b = JSON.parse(body || "{}"); } catch { return out(400, { error: "json" }); }
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const name = normPseudo(b.name);
  if (route === "rank") return out(200, await topRank(PSEUDO_RE.test(name) ? name : null));
  const bad = (field, detail) => out(400, { error: "saisie", field, msg: "Vérifie les informations saisies.", detail });
  if (!PSEUDO_RE.test(name)) return bad("name", "Pseudo : 2 à 7 caractères, lettres A-Z, chiffres et @ # _ (sans espace).");
  // lecture stricte : si le stockage ne répond pas, on le dit (on ne répond pas « identifiants incorrects »)
  const DOWN = "Le site ne peut pas accéder aux comptes pour le moment. Réessaie plus tard.";
  let p; try { p = await getPlayerStrict(name); } catch (e) { console.error("Lecture du compte :", e.message); return out(503, { error: "indispo", msg: DOWN }); }
  const authed = () => tokOk(p, b.token);
  const pinOk = /^\d{4}$/.test(String(b.pin || ""));
  const PIN_DETAIL = "Code secret : exactement 4 chiffres.";
  const tooMany = mn => out(429, { error: "trop", msg: "Trop d'essais. Réessaie dans " + mn + " min." });
  if (route === "create") {
    const lk = locked("ip:" + ip); if (lk) return tooMany(lk);
    if (!pinOk) return bad("pin", PIN_DETAIL);
    const taken = () => out(409, { error: "pris", field: "name", msg: "Ce pseudonyme n'est pas disponible. Choisis-en un autre ou connecte-toi à ton compte." });
    if (p || creating.has(name) || players.has(name)) return taken();
    creating.add(name);
    try {
      fail("ip:" + ip, 20, 10 * 60e3);
      const salt = crypto.randomBytes(12).toString("hex");
      const np = { h: hashPin(b.pin, salt), salt, toks: [], salons: {}, acc: {}, migS: 1, c: Date.now() };
      const token = newToken(np);
      // réservation atomique : si deux créations arrivent en même temps, une seule obtient le pseudo
      if (REDIS) { const r = await redis(["SET", "pl:" + name, JSON.stringify(np), "NX"]); if (r !== "OK") return taken(); }
      if (players.has(name)) return taken();
      players.set(name, np); savePlayer(name);
      return out(200, { name, token, salons: [] });
    } catch (e) { console.error("Création de compte :", e.message); return out(503, { error: "indispo", msg: "Le compte n'a pas pu être enregistré (stockage indisponible). Rien n'a été créé : réessaie plus tard." }); }
    finally { creating.delete(name); }
  }
  if (route === "login") {
    if (!pinOk) return bad("pin", PIN_DETAIL);
    const lk = locked("pl:" + name) || locked("ip:" + ip); if (lk) return tooMany(lk);
    // même calcul et même message que le pseudo existe ou non : on ne révèle pas lequel est faux
    const h = hashPin(b.pin, p ? p.salt : DUMMY_SALT);
    const ok = !!p && h.length === p.h.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(p.h));
    if (!ok) { fail("pl:" + name, 5, 15 * 60e3); fail("ip:" + ip, 30, 15 * 60e3); return out(401, { error: "ident", msg: "Identifiants incorrects." }); }
    fails.delete("pl:" + name); const token = newToken(p); savePlayer(name);
    let list = null; try { list = await salonList(name, p); } catch {}
    return out(200, { name, token, salons: list });
  }
  if (!authed()) return out(401, { error: "jeton", msg: "Reconnecte-toi avec ton code secret." });
  if (["salons", "sjoin", "screate", "skick", "scode"].includes(route)) return void await salonApi(route, name, p, b, ip, out, bad);
  if (route === "me") { let list = null; try { list = await salonList(name, p); } catch {} return out(200, { name, salons: list, pts: ptsOut(p), solo: Object.keys(p.solo || {}) }); }
  if (route === "wallet" || route === "conv") {
    ensureWallet(p); p.cv = (p.cv || []).filter(x => Date.now() - x.t < 2 * 3600e3);
    const used = p.cv.reduce((a, x) => a + x.n, 0);
    if (route === "conv") {
      const n = Math.floor((Number(b.pts) || 0) / 4) * 4; const tot = (p.pts && p.pts.tot) || 0;
      if (n <= 0) return out(400, { error: "pts", msg: "Choisis un nombre de points." });
      if (n > 500 - used) return out(400, { error: "limite", msg: "Limite de 500 points toutes les 2 heures." });
      if (n > tot) return out(400, { error: "pts", msg: "Tu n'as pas assez de points." });
      p.pts.tot -= n; p.coins += n / 4; p.cv.push({ t: Date.now(), n }); balSnap(p);
      rankMem.set(name, p.pts.tot); if (REDIS) redis(["ZADD", "rank", String(p.pts.tot), name]).catch(() => {});
      savePlayer(name);
    }
    const left = 500 - p.cv.reduce((a, x) => a + x.n, 0);
    const next = p.cv.length ? Math.max(0, 2 * 3600e3 - (Date.now() - p.cv[0].t)) : 0;
    return out(200, { coins: p.coins, pts: (p.pts && p.pts.tot) || 0, left, next, allow: ALLOW(p.wkBet || 0), wkBet: p.wkBet || 0 });
  }
  if (route === "score") {
    // points d'une partie terminée, envoyés par le joueur lui-même (une seule fois par partie)
    const game = String(b.game || ""), gid = String(b.gid || "");
    if (!/^(fleches|rond|meles|poker|mot|culture)$/.test(game) || !/^[A-Za-z0-9_-]{3,40}$/.test(gid)) return out(400, { error: "partie" });
    p.gids = Array.isArray(p.gids) ? p.gids : [];
    if (p.gids.includes(game + gid)) return out(200, { ok: true, dup: true, pts: p.pts });
    let pts = Math.max(0, Math.min(800, Math.round(Number(b.pts) || 0)));
    if (b.solo) pts = Math.round(pts * (SOLO_MULT[b.level] || 1));
    p.gids = p.gids.slice(-300).concat(game + gid);
    if (pts) await addPoints(name, p, game, pts);
    savePlayer(name); return out(200, { ok: true, add: pts, pts: p.pts });
  }
  if (route === "pin") { if (!pinOk) return bad("pin", PIN_DETAIL); p.salt = crypto.randomBytes(12).toString("hex"); p.h = hashPin(b.pin, p.salt); savePlayer(name); return out(200, { ok: true }); }
  if (route === "hist") {
    const game = String(b.game || ""); if (!CAT.GAMES.includes(game)) return bad("game", "Jeu inconnu.");
    const refs = Array.isArray(b.items) ? b.items.slice(0, 50) : [{ ref: b.ref, ev: b.ev }];
    let n = 0; for (const it of refs) if (it && markHist(p, game, String(it.ref || ""), it.ev === "d" ? "d" : "s")) n++;
    if (n) savePlayer(name); return out(200, { ok: true, n });
  }
  // partie solo en cours, gardée sur le compte : on la poursuit depuis un autre appareil
  if (route === "solo") {
    const game = String(b.game || ""); if (!CAT.GAMES.includes(game)) return bad("game", "Jeu inconnu.");
    p.solo = p.solo || {};
    if (b.op === "put") { const d = b.doc; if (d && typeof d === "object" && d.solo && !d.done) p.solo[game] = { t: Date.now(), doc: d }; else delete p.solo[game]; savePlayer(name); return out(200, { ok: true }); }
    const h = (p.hist && p.hist[game]) || {};
    return out(200, { ok: true, doc: p.solo[game] ? p.solo[game].doc : null, t: p.solo[game] ? p.solo[game].t : 0, played: Object.keys(h) });
  }
  if (route === "logout") { p.toks = (p.toks || []).filter(t => t !== sha(String(b.token))); savePlayer(name); return out(200, { ok: true }); }
  return out(404, { error: "route" });
}

// ---------- serveur web ----------
const pages = {};                      // fichier -> { raw, gz, br, etag, mtime }
function pack(raw) {
  return { raw, gz: zlib.gzipSync(raw, { level: 9 }), br: zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }), etag: '"' + crypto.createHash("sha1").update(raw).digest("base64url").slice(0, 16) + '"' };
}
function page(file, inject) {
  const st = fs.statSync(file);
  const c = pages[file];
  if (c && c.mtime === st.mtimeMs) return c;
  let txt = fs.readFileSync(file, "utf8");
  if (inject) txt = txt.replace("<head>", "<head>\n<script>window.SUPPORT=" + SUPPORT + ";</script>");
  return (pages[file] = { ...pack(Buffer.from(txt)), mtime: st.mtimeMs });
}
function sendBody(req, res, p, type, cache) {
  const ae = req.headers["accept-encoding"] || "";
  const h = { "content-type": type, "cache-control": cache, vary: "Accept-Encoding", etag: p.etag };
  if (req.headers["if-none-match"] === p.etag) { res.writeHead(304, h); return res.end(); }
  if (/\bbr\b/.test(ae)) { res.writeHead(200, { ...h, "content-encoding": "br" }); return res.end(p.br); }
  if (/\bgzip\b/.test(ae)) { res.writeHead(200, { ...h, "content-encoding": "gzip" }); return res.end(p.gz); }
  res.writeHead(200, h); res.end(p.raw);
}
function sendPage(req, res, file) {
  let p; try { p = page(file, true); } catch { res.writeHead(500); return res.end("Page manquante"); }
  sendBody(req, res, p, "text/html; charset=utf-8", "no-cache");
}
// données lourdes (grilles…) : nom de fichier versionné → mises en cache un an par le navigateur
const STATIC = { js: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", css: "text/css; charset=utf-8" };
function sendStatic(req, res, name) {
  const m = name.match(/^([a-z0-9-]{3,60})\.(js|json|svg|css)$/); if (!m) { res.writeHead(404); return res.end(); }
  let p; try { p = page(path.join(__dirname, "public", "d", name), false); } catch { res.writeHead(404); return res.end(); }
  sendBody(req, res, p, STATIC[m[2]], /-[0-9a-f]{10}\./.test(name) ? "public, max-age=31536000, immutable" : "public, max-age=3600");
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz" && url.searchParams.get("redis") === "1") {
    const t0 = Date.now();
    return void (REDIS ? redis(["PING"]).then(v => ({ ping: v }), e => ({ ping: "échec", err: e.message })) : Promise.resolve({ ping: "pas de Redis" }))
      .then(o => { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify({ ...o, ms: Date.now() - t0, depuisDemarrage: redisDiag, comptesEnMemoire: players.size })); });
  }
  // /healthz répond 503 si le stockage refuse l'accès : UptimeRobot (qui surveille /healthz) envoie alors une alerte par e-mail
  if (url.pathname === "/healthz") { const bad = REDIS && storage.ok === false; res.writeHead(bad ? 503 : 200, { "content-type": "text/plain; charset=utf-8" }); return res.end(bad ? "STOCKAGE KO depuis " + storage.since + " : " + storage.msg : "ok " + salons.size + (REDIS ? " redis" : "")); }
  const am = url.pathname.match(/^\/api\/p\/(create|login|me|pin|logout|rank|score|wallet|conv|salons|sjoin|screate|skick|scode|hist|solo)$/);
  if (am) return void api(req, res, am[1]).catch(e => { console.error(e); try { res.writeHead(500); res.end("{}"); } catch {} });
  if (url.pathname.startsWith("/d/")) return sendStatic(req, res, url.pathname.slice(3));
  if (url.pathname === "/maquette" || url.pathname === "/maquette/") return sendPage(req, res, path.join(__dirname, "public", "maquette.html"));
  if (url.pathname === "/mot" || url.pathname === "/mot/") return sendPage(req, res, path.join(__dirname, "public", "mot.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?rond\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "rd.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?meles\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "mm.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?culture\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "cg.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?fleches\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "fl.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?poker\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "poker.html"));
  if (url.pathname === "/" || /^\/[A-Za-z0-9]{5}\/?$/.test(url.pathname)) {
    // anciens liens d'invitation vers une partie de mots fléchés : on garde le chemin du jeu
    if (/[?&]join=/.test(url.search) && !/[?&]join=1\b/.test(url.search) && url.pathname !== "/") { res.writeHead(302, { location: url.pathname.replace(/\/$/, "") + "/fleches" + url.search }); return res.end(); }
    return sendPage(req, res, HOME);
  }
  res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
  res.end('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Salon introuvable</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121214;color:#ECEDF2;font-family:system-ui,sans-serif;padding:16px}main{max-width:380px;text-align:center;display:flex;flex-direction:column;gap:12px}h1{margin:0;font-size:1.4rem}p{color:#8B8C99;margin:0}form{display:flex;gap:8px}input{flex:1;min-width:0;font-size:1.3rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;text-align:center;padding:10px;border-radius:12px;border:1px solid #2f2f39;background:#1E1E24;color:#ECEDF2}button,a{font:inherit;font-weight:700;padding:12px 16px;border-radius:12px;border:none;background:#00ADB5;color:#041b1d;text-decoration:none;cursor:pointer}</style></head><body><main><h1>Ce salon n\'existe pas</h1><p>Un code de salon fait 5 caractères (lettres et chiffres). Vérifie celui qu\'on t\'a envoyé.</p><form onsubmit="event.preventDefault();var v=this.c.value.toUpperCase().replace(/[^A-Z0-9]/g,\'\');if(v.length===5)location.href=\'/\'+v"><input name="c" maxlength="5" placeholder="CODE" aria-label="Code du salon"><button>Rejoindre</button></form><a href="/">Créer un nouveau salon</a></main></body></html>');
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: MAX_DOC + 4096 });
wss.on("connection", ws => {
  ws.pid = crypto.randomUUID(); ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  ws.on("message", raw => { let m; try { m = JSON.parse(raw); } catch { return; } ws.q = (ws.q || Promise.resolve()).then(() => handle(ws, m)).catch(e => console.error(e)); });
  ws.on("close", () => { poker.gone(ws); const s = ws.room && salons.get(ws.room); if (s) { s.sockets.delete(ws); broadcastPeers(s); if (ws.solo && !s.sockets.size) salons.delete(ws.room); } });
  send(ws, { t: "hello", id: ws.pid });
});
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  const now = Date.now();
  for (const [code, s] of salons) if (!s.sockets.size && now - s.touched > 30 * 24 * 3600e3) { salons.delete(code); scheduleSave(); }
}, 30000);
// ---------- remise à zéro demandée par Juvenal (1/11/2026) : comptes, salons, classement ----------
// Rien n'est effacé : chaque clé est renommée en arch1:<clé> (récupérable). Ne s'exécute qu'une fois (clé reset:arch1).
const RESET_TAG = "arch1";
async function resetOnce() {
  const files = ["players.json", "access.json", "salons.json"].map(f => path.join(DATA_DIR, f));
  const wipeMem = () => { players.clear(); accs.clear(); codeIdx.clear(); salons.clear(); rankMem.clear(); };
  if (!REDIS) {
    const flag = path.join(DATA_DIR, "reset-" + RESET_TAG);
    if (fs.existsSync(flag)) return;
    for (const f of files) try { if (fs.existsSync(f)) fs.renameSync(f, f + "." + RESET_TAG); } catch {}
    wipeMem(); try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(flag, String(Date.now())); } catch {}
    console.log("Remise à zéro faite (fichiers archivés)"); return;
  }
  try {
    if (await redis(["EXISTS", "reset:" + RESET_TAG])) return;
    let n = 0;
    for (const pat of ["pl:*", "sa:*", "sc:*", "salon:*"]) {
      let cur = "0";
      do { const r = await redis(["SCAN", cur, "MATCH", pat, "COUNT", "200"]); cur = String(r[0]);
        for (const k of r[1] || []) { await redis(["RENAME", k, RESET_TAG + ":" + k]); n++; } } while (cur !== "0");
    }
    if (await redis(["EXISTS", "rank"])) { await redis(["RENAME", "rank", RESET_TAG + ":rank"]); n++; }
    await redis(["SET", "reset:" + RESET_TAG, String(Date.now())]);
    for (const f of files) try { if (fs.existsSync(f)) fs.renameSync(f, f + "." + RESET_TAG); } catch {}
    wipeMem();
    console.log("Remise à zéro faite : " + n + " clés archivées sous " + RESET_TAG + ":");
  } catch (e) { console.error("Remise à zéro impossible :", e.message); }
}
// une erreur imprévue dans un salon ne doit pas arrêter tout le site (les autres parties continuent) : on la note dans le journal
process.on("uncaughtException", e => console.error("Erreur imprévue (le serveur continue) :", e && e.stack || e));
process.on("unhandledRejection", e => console.error("Promesse rejetée (le serveur continue) :", e && e.stack || e));
Promise.all([backupReady, resetOnce()]).then(() => server.listen(PORT, () => console.log("Mots Fléchés Duo en ligne sur http://localhost:" + PORT + (REDIS ? " (stockage Redis actif)" : ""))));
