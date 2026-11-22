// Motipop (ex-Mots Fléchés Duo) — serveur du site (Node.js + WebSocket)
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
const HOME = path.join(__dirname, "public", "accueil.html");
// adresse du joueur : en ligne, l'en-tête posé par le relais de Render (Cloudflare) fait foi ; X-Forwarded-For seulement à défaut (le navigateur peut l'inventer)
function clientIp(req) { const h = req.headers, cf = h["cf-connecting-ip"] || h["true-client-ip"]; if (cf) return String(cf).trim().slice(0, 64); return String(h["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim().slice(0, 64); }
function ipSource(req) { const h = req.headers; return { cf: !!h["cf-connecting-ip"], tci: !!h["true-client-ip"], xri: !!h["x-real-ip"], xff: String(h["x-forwarded-for"] || "").split(",").filter(Boolean).length }; }
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
// 20/11 : si tout le bloc copié depuis Upstash est collé dans une variable (UPSTASH_…_URL="…" UPSTASH_…_TOKEN="…"),
// on retrouve quand même la bonne valeur au lieu d'envoyer un en-tête invalide
const envPick = (v, k) => { const s = String(v || ""), m = s.match(new RegExp(k + '\\s*=\\s*["\']?([^"\'\\s]+)')); return m ? m[1] : envClean(s); };
const RURL = envPick(process.env.UPSTASH_REDIS_REST_URL, "UPSTASH_REDIS_REST_URL").replace(/\/$/, "");
const RTOK = envPick(process.env.UPSTASH_REDIS_REST_TOKEN, "UPSTASH_REDIS_REST_TOKEN");
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
// lectures : un 2e essai après un incident passager (coupure réseau, erreur 5xx ou 429) ; écritures : jamais rejouées (pas de double écriture)
const R_READ = new Set(["GET", "MGET", "EXISTS", "SCAN", "ZREVRANGE", "ZREVRANK", "ZSCORE", "PING"]);
async function redis(cmd, again) {
  let r; const read = R_READ.has(String(cmd[0]).toUpperCase());
  try { r = await fetch(RURL, { method: "POST", headers: { Authorization: "Bearer " + RTOK, "content-type": "application/json" }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(8000) }); }
  catch (e) { redisDiag.err++; redisDiag.last = { t: new Date().toISOString(), op: cmd[0], msg: "réseau : " + e.message }; if (read && !again) { await new Promise(z => setTimeout(z, 200)); return redis(cmd, true); } throw e; }
  if (read && !again && (r.status >= 500 || r.status === 429)) { redisDiag.err++; redisDiag.last = { t: new Date().toISOString(), op: cmd[0], msg: "HTTP " + r.status + " (2e essai)" }; await new Promise(z => setTimeout(z, 200)); return redis(cmd, true); }
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
  if (game === "culture") return reply({ ok: true, qs: CAT.drawSet(hists, m.theme) });
  const lk = CAT.lkey(game, lvl, m.fmt);
  const adm = CAT.admissible(game, lk, hists);
  const n = Number(m.n) || 0;
  if (n) { const ref = CAT.byNumber(game, lk, n); return ref && adm.includes(ref) ? reply({ ok: true, ref, manual: true }) : reply({ ok: false, msg: MSG_NONE }); }
  if (!adm.length) return reply({ ok: false, msg: MSG_NONE });
  return reply({ ok: true, ref: CAT.pick(adm) });
}
async function handleLaunch(ws, s, m) {
  const id = String(m.id || ""); const game = { fl: "fleches", rond: "rond", meles: "meles", cg: "culture", mg: "magnetico" }[id];
  if (!game) return;
  if (game === "magnetico") return locked1(ws.room, async () => {
    // Magnético : pas de catalogue à vérifier, seulement les joueurs (2 à 4 vrais comptes présents dans le salon)
    const d = s.docs[id]; if (!d || !d.wait || d.done || d.solo || (m.gid && d.gid !== m.gid)) return;
    const names = (d.players || []).map(p => String(p.name || "").toUpperCase());
    if (names.length < 2 || names.length > 4 || names.some(n => !PSEUDO_RE.test(n))) return;
    const here = new Set([...s.sockets].map(w => w.user)); if (!names.every(n => here.has(n))) return;
    d.wait = false; d.go = Date.now() + 5600; d.started = d.go; d.msg = "Le jeu est lancé !";
    publish(ws.room, s, id, d);
  });
  return locked1(ws.room, async () => {
    const d = s.docs[id]; if (!d || !d.wait || d.done || d.solo) return;           // déjà lancée, terminée ou solo : rien à faire
    if (m.gid && d.gid !== m.gid) return;
    const names = d.players.map(p => String(p.name || "").toUpperCase());
    // tous les participants doivent être de vrais comptes, présents dans le salon
    if (names.length < 2 || names.length > 4 || names.some(n => !PSEUDO_RE.test(n))) return;
    const here = new Set([...s.sockets].map(w => w.user));
    if (!names.every(n => here.has(n))) return;
    const lvl = CAT.level(game, d.level);
    let hists; try { hists = await histsOf(names); } catch (e) { d.blocked = MSG_ERR; d.blockedAt = Date.now(); return publish(ws.room, s, id, d); }
    if (game === "culture") { if (!CAT.setOk(d.qs, hists, d.theme)) CAT.applyTo(game, d, CAT.drawSet(hists, d.theme)); }
    else { const cur = CAT.refOf(game, d); const adm = CAT.admissible(game, CAT.lkey(game, lvl, CAT.fmtOf(game, cur)), hists);
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
  if (id === "mg") {                                                                  // Magnético : mêmes règles, le contenu = la liste des mots
    if (!next || next.solo || !Array.isArray(next.players)) return true;
    if (!prev || prev.gid !== next.gid) return !!next.wait || !!next.done;
    if (prev.wait && !next.wait && !next.done) return false;
    if (!prev.wait && next.wait) return false;
    if (!prev.wait && JSON.stringify(prev.words) !== JSON.stringify(next.words)) return false;
    return true;
  }
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
  if (!next.solo && ps.length > 4) return false;                                     // 4 joueurs au plus
  const fresh = !prev || prev.gid !== next.gid;
  const old = new Set(fresh ? [] : (Array.isArray(prev.players) ? prev.players : []).map(x => x && x.name));
  for (const pl of ps) {
    const n = String(pl && pl.name || "");
    if (old.has(n)) continue;
    if (!fresh && !prev.wait) return false;                                          // personne n'entre dans une partie déjà lancée
    if (n === user || /^invit/i.test(n)) continue;
    if (fresh && acc && acc.members[n.toUpperCase()]) continue;
    return false;
  }
  return true;
}
async function handle(ws, m) {
  if (!m || typeof m !== "object" || Array.isArray(m) || typeof m.t !== "string") return;   // message malformé : ignoré
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
  // table solo (poker contre le robot) : rien d'autre n'y est stocké — sinon une connexion sans compte pourrait remplir la mémoire du serveur
  if (ws.solo && m.t !== "pk" && m.t !== "presence") return send(ws, { t: "ack", req: m.req, ok: false, code: "permission_denied" });
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
    if (id === "meta") return send(ws, { t: "ack", req: m.req, ok: false, code: "permission_denied" });
    if (m.gid && d.gid !== m.gid) return send(ws, { t: "ack", req: m.req, ok: false, code: "stale" });
    d[field] = d[field] && typeof d[field] === "object" ? d[field] : {};
    if (m.ifAbsent && d[field][key] !== undefined) return send(ws, { t: "ack", req: m.req, ok: false, code: "taken" });
    const val = JSON.parse(JSON.stringify(m.value === undefined ? null : m.value));
    if (JSON.stringify(val).length > 2000) return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    if (key === "__proto__" || key === "constructor" || key === "prototype") return send(ws, { t: "ack", req: m.req, ok: false, code: "invalid_argument" });
    const backup = JSON.stringify(d);
    d[field][key] = val;
    if (m.extra && typeof m.extra === "object") for (const [k, v] of Object.entries(m.extra)) if (/^[a-zA-Z]{1,20}$/.test(k) && !["players", "gid", "_v", "wait", "go", "grid", "pid", "mid", "level", "blocked", "manual", "words", "grid", "qs", "ans", "adv"].includes(k)) d[k] = v;
    if (m.score && Number.isInteger(m.score.i) && d.players && d.players[m.score.i]) d.players[m.score.i].score = (d.players[m.score.i].score || 0) + (Number(m.score.add) || 0);
    if (JSON.stringify(d).length > MAX_DOC) { s.docs[id] = JSON.parse(backup); return send(ws, { t: "ack", req: m.req, ok: false, code: "quota_exceeded" }); }   // une partie ne grossit pas sans fin
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
const creating = new Map();          // pseudos en cours de création (deux demandes simultanées) → fin de la création en cours
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
  const ROUTES = ["salons", "sjoin", "screate", "skick", "scode", "sleave", "sdelete"];
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
    // un membre quitte un salon : il n'en est plus membre (pour revenir : nom + code d'accès, ou lien du responsable)
    if (route === "sleave") {
      const lid = String(b.salon || "").toUpperCase(); const lm = CODE_RE.test(lid) ? await getAcc(lid) : null;
      if (!lm || !lm.members[name]) { if (p.acc && p.acc[lid]) { delete p.acc[lid]; savePlayer(name); } return out(200, { msg: "Tu n'es plus membre de ce salon.", salons: await salonList(name, p) }); }
      if (lm.owner === name) return bad("salon", "Tu es le responsable de ce salon : tu ne peux pas le quitter.");
      delete lm.members[name]; saveAcc(lm); if (p.acc) delete p.acc[lid]; savePlayer(name); evict(lid, name);
      return out(200, { msg: "Tu as quitté le salon « " + lm.name + " ».", salons: await salonList(name, p) });
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
    // le responsable supprime son salon : plus personne n'y a accès, le code d'accès ne marche plus (19/11/2026)
    if (route === "sdelete") {
      for (const w of Object.keys(m.members)) {
        if (w === name) { if (p.acc) delete p.acc[id]; continue; }
        const q = await getPlayer(w); if (q && q.acc && q.acc[id]) { delete q.acc[id]; savePlayer(w); }
        evict(id, w);
      }
      evict(id, name);
      const old = m.code; m.members = {}; m.code = null; m.deleted = Date.now(); saveAcc(m); savePlayer(name);
      if (old) { codeIdx.delete(old); if (REDIS) redis(["DEL", "sc:" + old]).catch(() => {}); }
      const live = salons.get(id); if (live && !live.sockets.size) salons.delete(id);
      return out(200, { msg: "Salon « " + m.name + " » supprimé.", salons: await salonList(name, p) });
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

// ---------- sauvegardes automatiques (9/11/2026) ----------
// Une copie par jour de toutes les données durables (comptes, points, classements, skins, salons enregistrés…), gardée 7 jours
// dans Redis sous bak:auto:AAAAMMJJ (découpée en morceaux de 400 Ko). Les parties en cours (salon:*) et les sauvegardes elles-mêmes
// ne sont pas copiées. ADMIN_KEY (variable Render) permet de lister, télécharger et restaurer : /admin/sauvegardes?key=…
const BAK_KEEP_S = 8 * 86400, BAK_CHUNK = 400000;
const bakSkip = k => /^(bak:|salon:)/.test(k);
const parisDay = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).replace(/-/g, "");
async function bakSnapshot() {
  const keys = []; let cur = "0";
  do { const r = await redis(["SCAN", cur, "COUNT", "500"]); cur = String(r[0]); (r[1] || []).forEach(k => { if (!bakSkip(k)) keys.push(k); }); } while (cur !== "0");
  const data = {};
  for (const k of keys) {
    const type = await redis(["TYPE", k]); let v;
    if (type === "string") v = await redis(["GET", k]);
    else if (type === "hash") v = await redis(["HGETALL", k]);
    else if (type === "zset") v = await redis(["ZRANGE", k, "0", "-1", "WITHSCORES"]);
    else if (type === "set") v = await redis(["SMEMBERS", k]);
    else if (type === "list") v = await redis(["LRANGE", k, "0", "-1"]);
    else continue;
    const ttl = await redis(["PTTL", k]);
    data[k] = { type, v, ttl: ttl > 0 ? ttl : 0 };
  }
  return data;
}
async function writeBackup(tag) {
  const data = await bakSnapshot(), txt = JSON.stringify({ v: 1, at: new Date().toISOString(), keys: data });
  const n = Math.ceil(txt.length / BAK_CHUNK) || 1;
  for (let i = 0; i < n; i++) await redis(["SET", "bak:auto:" + tag + ":" + i, txt.slice(i * BAK_CHUNK, (i + 1) * BAK_CHUNK), "EX", String(BAK_KEEP_S)]);
  await redis(["SET", "bak:auto:" + tag, JSON.stringify({ parts: n, keys: Object.keys(data).length, bytes: txt.length, at: new Date().toISOString() }), "EX", String(BAK_KEEP_S)]);
  return { tag, keys: Object.keys(data).length, bytes: txt.length };
}
async function readBackup(tag) {
  const meta = JSON.parse(await redis(["GET", "bak:auto:" + tag]) || "null"); if (!meta) return null;
  let txt = ""; for (let i = 0; i < meta.parts; i++) { const part = await redis(["GET", "bak:auto:" + tag + ":" + i]); if (part == null) throw new Error("morceau manquant"); txt += part; }
  return JSON.parse(txt);
}
async function listBackups() {
  const out = []; let cur = "0";
  do { const r = await redis(["SCAN", cur, "MATCH", "bak:auto:*", "COUNT", "500"]); cur = String(r[0]); (r[1] || []).forEach(k => { const t = k.slice(9); if (!/:\d+$/.test(t)) out.push(t); }); } while (cur !== "0");   // les morceaux (…:0, …:1) ne sont pas listés
  const res = []; for (const t of out.sort().reverse()) { try { res.push(Object.assign({ tag: t }, JSON.parse(await redis(["GET", "bak:auto:" + t])))); } catch (e) {} }
  return res;
}
async function restoreBackup(tag) {
  const b = await readBackup(tag); if (!b) throw new Error("sauvegarde introuvable");
  const safety = await writeBackup("avant-" + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ""));   // état actuel gardé avant d'écraser
  let n = 0;
  for (const [k, o] of Object.entries(b.keys)) {
    if (bakSkip(k)) continue;
    await redis(["DEL", k]);
    if (o.type === "string") await redis(["SET", k, o.v]);
    else if (o.type === "hash") { const a = Array.isArray(o.v) ? o.v : Object.entries(o.v).flat(); if (a.length) await redis(["HSET", k, ...a.map(String)]); }
    else if (o.type === "zset") { const a = []; for (let i = 0; i < o.v.length; i += 2) a.push(String(o.v[i + 1]), String(o.v[i])); if (a.length) await redis(["ZADD", k, ...a]); }
    else if (o.type === "set") { if (o.v.length) await redis(["SADD", k, ...o.v.map(String)]); }
    else if (o.type === "list") { if (o.v.length) await redis(["RPUSH", k, ...o.v.map(String)]); }
    if (o.ttl) await redis(["PEXPIRE", k, String(o.ttl)]);
    n++;
  }
  // le serveur relit ensuite la base : on vide ce qu'il gardait en mémoire (comptes, fiches de salon, skins)
  players.clear(); accs.clear(); codeIdx.clear(); skinMem.clear(); rankMem.clear();
  return { restored: n, safety: safety.tag };
}
let bakBusy = false;
async function dailyBackup() {
  if (!REDIS || bakBusy) return; bakBusy = true;
  try { const tag = parisDay(); if (!(await redis(["EXISTS", "bak:auto:" + tag]))) { const r = await writeBackup(tag); console.log("Sauvegarde du jour faite : " + r.keys + " clés, " + Math.round(r.bytes / 1024) + " Ko"); } }
  catch (e) { console.error("Sauvegarde du jour impossible :", e.message); }
  finally { bakBusy = false; }
}
setTimeout(dailyBackup, 90e3); setInterval(dailyBackup, 3 * 3600e3);
const ADMIN_KEY = envClean(process.env.ADMIN_KEY);
const adminOk = k => { if (!ADMIN_KEY || ADMIN_KEY.length < 16) return false; const a = Buffer.from(String(k || "")), b = Buffer.from(ADMIN_KEY); return a.length === b.length && crypto.timingSafeEqual(a, b); };
// ---------- points des joueurs (classement général, progression) ----------
const SKINS = require("./public/d/skins.js");   // catalogue des skins (partagé avec les pages)
const skinMem = new Map();           // pseudo -> habillage porté (pour le classement)
const moisParis = () => Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris", month: "numeric" }));
async function skinsOf(names) {
  const out = {}; names.forEach(n => { if (skinMem.has(n)) out[n] = skinMem.get(n); });
  const miss = names.filter(n => !(n in out));
  if (REDIS && miss.length) { try { const r = await redis(["HMGET", "skins", ...miss]); miss.forEach((n, i) => { if (r[i]) { out[n] = r[i]; skinMem.set(n, r[i]); } }); } catch (e) { console.error("Skins Redis :", e.message); } }
  return out;
}
const rankMem = new Map();           // pseudo -> total (secours sans Redis)
const DAYKEY = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
const SOLO_MULT = { facile: 1, normal: 1.5, moyen: 1.5, difficile: 2 };
const DEGRESSIF = n => n <= 3 ? 1 : n <= 6 ? 0.75 : n <= 10 ? 0.5 : 0.25;
// solde du jour (total en fin de journée) : sert au graphique « Total », qui montre aussi les baisses (conversion en jetons)
function balSnap(p) { p.pts.b = p.pts.b || {}; p.pts.b[DAYKEY()] = p.pts.tot; const k = Object.keys(p.pts.b).sort(); if (k.length > 60) k.slice(0, k.length - 60).forEach(x => delete p.pts.b[x]); }
const ptsOut = p => { const q = p.pts || { tot: 0, g: {}, d: {} }; return { ...q, ever: !!(q.ever || q.tot > 0 || Object.values(q.g || {}).some(v => v > 0)) }; };
// ---------- contrôle des points envoyés par le navigateur ----------
// solo : la partie doit avoir été vue par le serveur (ticket posé à sa 1re sauvegarde) depuis au moins 20 s ; 40 tickets par heure au plus
const SOLO_MIN_MS = Number(process.env.SOLO_MIN_MS) || 20e3, TICKETS_H = 40;
function soloTicket(p, game, gid) {
  gid = String(gid || ""); if (!/^[A-Za-z0-9_-]{3,40}$/.test(gid)) return;
  p.tk = p.tk && typeof p.tk === "object" ? p.tk : {}; const k = game + ":" + gid; if (p.tk[k]) return;
  const now = Date.now(); for (const [x, t] of Object.entries(p.tk)) if (now - t > 24 * 3600e3) delete p.tk[x];
  if (Object.values(p.tk).filter(t => now - t < 3600e3).length >= TICKETS_H) return;
  p.tk[k] = now;
}
// multijoueur : le score retenu est celui de la partie gardée par le serveur, pas celui annoncé par le navigateur
const DOCID = { fleches: "fl", rond: "rond", meles: "meles", culture: "cg", magnetico: "mg" };
function multiScore(game, gid, name) {
  const id = DOCID[game]; if (!id) return null;
  for (const s of salons.values()) {
    const d = s.docs && s.docs[id]; if (!d || d.solo || String(d.gid) !== gid || !Array.isArray(d.players)) continue;
    const me = d.players.find(x => x && String(x.name).toUpperCase() === name.toUpperCase());
    if (!me) return { pts: 0 };
    return { pts: d.done ? Math.max(0, Number(me.score) || 0) : 0, done: !!d.done };
  }
  return null;
}
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
      const sk = await skinsOf(top.map(x => x.name).concat(mine ? [mine.name] : [])); top.forEach(x => { if (sk[x.name]) x.skin = sk[x.name]; }); if (mine && sk[mine.name]) mine.skin = sk[mine.name];
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
  if (p.wk !== wk) { const add = ALLOW(p.wkBet || 0); p.coins = p.coins >= 300 ? p.coins : Math.min(300, p.coins + add); /* la dotation s'arrête à 300 mais ne retire jamais rien */ p.lastAllow = add; p.wk = wk; p.wkBet = 0; }
  return p;
}
const poker = makePoker({
  send,
  wallet: name => { const p = players.get(name); return p ? ensureWallet(p) : null; },
  pay: (name, delta) => { const p = players.get(name); if (!p) return; ensureWallet(p); p.coins = Math.max(0, Math.round(p.coins + delta)); if (delta < 0) p.wkBet = (p.wkBet || 0) - delta; savePlayer(name); },
  points: (name, pts) => { const p = players.get(name); if (p && pts > 0) { addPoints(name, p, "poker", pts); savePlayer(name); } },
  // cagnotte progressive du salon (Poker V2) : gardée dans la fiche du salon, sauvegardée avec lui
  jackpot: {
    get: room => { const s = salons.get(room); return s && s.docs.meta ? Math.max(0, s.docs.meta.jackpot || 0) : 0; },
    add: (room, n) => { const s = salons.get(room); if (!s) return; s.docs.meta = s.docs.meta || {}; s.docs.meta.jackpot = Math.max(0, (s.docs.meta.jackpot || 0) + n); s.touched = Date.now(); scheduleSave(room); }
  }
});

// ---------- 20/11 : MOT DU JOUR (défi du jour, solo) ----------
// Un mot de 6 ou 7 lettres par jour (heure de Paris), le même pour tous. 6 essais, 1re lettre donnée. Le mot ne quitte jamais
// le serveur avant la fin : chaque essai est vérifié ici (mot du dictionnaire) et reçoit ses couleurs. Joueurs avec pseudo :
// classés (du jour : essais puis temps ; depuis le début : mots trouvés). Invités : jouent aussi, comptés dans « trouvé par ».
const MJ = (() => {
  const strip = w => String(w || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
  let words = [], defs = {}, dict = new Set();
  // un « beau » mot du jour : pas de pluriel, ni de verbe conjugué (finales typiques), ni de définition qui commence par un article
  const mjNice = (w, d) => !/(S|X|Z|AIT|AI|ERA|IONS|IEZ|ONS|EZ|ERAI|[^I]A)$/.test(w) && !(/ENT$/.test(w) && !/(MENT|CENT|GENT|DENT|PENT)$/.test(w)) && !/^(A |Au |Aux |De |Du |Des |Il |Elle |Ils |On |Tu |Je |Nous |Vous )/.test(d || "");
  try {
    const f = fs.readdirSync(path.join(__dirname, "public", "d")).find(n => /^magnetico-[0-9a-f]{10}\.js$/.test(n));
    const sb = { window: {} }; require("vm").runInNewContext(fs.readFileSync(path.join(__dirname, "public", "d", f), "utf8"), sb);
    for (const lv in sb.window.MG_MOTS) for (const e of sb.window.MG_MOTS[lv]) { const [s, d, r] = e.split("|"); const w = strip(s); dict.add(w); if (lv === "facile" && r === "1" && w.length >= 6 && w.length <= 7 && mjNice(w, d)) { words.push(w); defs[w] = d; } }
  } catch (e) { console.error("Mot du jour : liste de mots illisible :", e.message); }
  try { fs.readFileSync(path.join(__dirname, "poker_mots.txt"), "utf8").split(/\s+/).forEach(w => { if (w) dict.add(strip(w)); }); } catch {}
  // ordre fixe mélangé une fois (graine), un mot par jour à partir du 20/11/2026 ; un mot ne revient pas avant d'avoir épuisé la liste
  words = [...new Set(words)].sort(); let seed = 20261120; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  const D0 = Date.UTC(2026, 10, 20);
  const dayNo = day => Math.round((Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8)) - D0) / 864e5);
  const wordOf = day => words.length ? words[((dayNo(day) % words.length) + words.length) % words.length] : "MOTIPOP";
  function colors(g, w) {            // 2 = bien placée, 1 = présente ailleurs, 0 = absente (lettres en double comptées comme il faut)
    const r = Array(w.length).fill(0), left = {};
    for (let i = 0; i < w.length; i++) if (g[i] === w[i]) r[i] = 2; else left[w[i]] = (left[w[i]] || 0) + 1;
    for (let i = 0; i < w.length; i++) if (r[i] !== 2 && left[g[i]]) { r[i] = 1; left[g[i]]--; }
    return r;
  }
  const mem = new Map();             // jour -> Map(id -> état) ; recopié dans Redis (hash mj:AAAAMMJJ, 40 jours)
  async function load(day) {
    if (!mem.has(day)) { const m = new Map(); mem.set(day, m); if (REDIS) { try { const a = await redis(["HGETALL", "mj:" + day]); if (Array.isArray(a)) for (let i = 0; i < a.length; i += 2) { try { m.set(a[i], JSON.parse(a[i + 1])); } catch {} } } catch (e) { console.error("Mot du jour (lecture) :", e.message); } } for (const k of mem.keys()) if (k < parisDay(new Date(Date.now() - 3 * 864e5))) mem.delete(k); }
    return mem.get(day);
  }
  function persist(day, id, st) { if (REDIS) redis(["HSET", "mj:" + day, id, JSON.stringify(st)]).then(() => redis(["EXPIRE", "mj:" + day, String(40 * 86400)])).catch(e => console.error("Mot du jour (écriture) :", e.message)); }
  function view(day, st, w) {
    const v = { day, len: w.length, first: w[0], tries: (st && st.t || []).map(g => ({ g, c: colors(g, w) })), done: !!(st && (st.ok || (st.t || []).length >= 6)), ok: !!(st && st.ok) };
    if (v.done) { v.word = w; v.def = defs[w] || ""; if (st.ok) v.ms = st.ms; }
    return v;
  }
  // points du jour : +2 par lettre trouvée à sa place, +1 par lettre trouvée mais mal placée (jamais vue à sa place), +12 pour le mot.
  // La 1re lettre est donnée : elle ne rapporte rien. Calculé sur l'ensemble des essais (une lettre ne compte qu'une fois).
  function score(st, w) {
    const t = (st && st.t) || [], g = new Set(), y = new Set();
    t.forEach(x => colors(x, w).forEach((c, i) => { if (i && c === 2) g.add(i); }));
    t.forEach(x => colors(x, w).forEach((c, i) => { if (c !== 1) return; for (let k = 1; k < w.length; k++) if (!g.has(k) && !y.has(k) && w[k] === x[i]) { y.add(k); break; } }));
    let firstG = null; for (let k = 0; k < t.length; k++) if (colors(t[k], w).some((c, i) => i && c === 2)) { firstG = st.ts ? st.ts[k] : null; break; }
    return { pts: g.size * 2 + y.size + (st && st.ok ? 12 : 0), g: g.size, y: y.size, firstG };
  }
  const MAXPTS = w => (w.length - 1) * 2 + 12;
  const sortDay = (a, b) => b.pts - a.pts || b.ok - a.ok || a.n - b.n || (a.ms ?? 9e9) - (b.ms ?? 9e9);
  async function dayList(day) {
    const m = await load(day), w = wordOf(day); let found = 0, played = 0; const list = [];
    for (const [id, st] of m) {
      const t = st.t || []; if (!t.length) continue; played++; if (st.ok) found++;
      if (id.startsWith("g:")) continue;
      const sc = score(st, w), last = st.ts && st.ts.length ? st.ts[st.ts.length - 1] : undefined;
      list.push({ name: id, pts: sc.pts, ok: st.ok ? 1 : 0, n: t.length, ms: st.ok ? st.ms : last, g: sc.g, y: sc.y, done: st.ok || t.length >= 6 ? 1 : 0 });
    }
    list.sort(sortDay);
    return { found, played, list, w };
  }
  let totCache = null;
  async function totalList() {
    if (totCache && Date.now() - totCache.at < 20e3) return totCache.v;
    let top = [];
    if (REDIS) { try { const r = await redis(["ZREVRANGE", "mj:pts", "0", "14", "WITHSCORES"]); for (let i = 0; i < (r || []).length; i += 2) top.push({ name: r[i], pts: Number(r[i + 1]) }); } catch {} }
    else top = [...MJ_TOTAL.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, pts]) => ({ name, pts }));
    const v = await Promise.all(top.map(async x => { let q = null; try { q = await getPlayer(x.name); } catch {} const a = (q && q.mj) || {}; return { name: x.name, pts: x.pts, found: a.found || 0, days: a.days || 0, avgN: a.found ? +(a.nF / a.found).toFixed(1) : null, avgMs: a.found ? Math.round(a.msF / a.found) : null }; }));
    totCache = { at: Date.now(), v }; return v;
  }
  async function board(day) {
    const d = await dayList(day); const total = await totalList();
    let prize = null; const yd = parisDay(new Date(Date.now() - 864e5));
    try { const r = REDIS ? await redis(["GET", "mj:prize:" + yd]) : MJ_PRIZE.get(yd); if (r) prize = Object.assign({ day: yd }, typeof r === "string" ? JSON.parse(r) : r); } catch {}
    return { found: d.found, played: d.played, len: d.w.length, max: MAXPTS(d.w), today: d.list.slice(0, 15), total, prize };
  }
  return { strip, wordOf, colors, load, persist, view, board, score, dayList, MAXPTS, dict, size: () => words.length, resetTot: () => { totCache = null; } };
})();
const MJ_TOTAL = new Map(), MJ_PRIZE = new Map();   // sans Redis (tests locaux) : points cumulés par pseudo, gagnants du jour
// fin de journée d'un joueur : ses moyennes (mots trouvés, essais, temps pour trouver, temps pour la 1re lettre bien placée)
function mjClose(p, st, sc) {
  const a = p.mj = p.mj || { days: 0, found: 0, pts: 0, nF: 0, msF: 0, gN: 0, gMs: 0 };
  if (st.ok) { a.found++; a.nF += st.t.length; a.msF += st.ms || 0; }
  if (sc.firstG != null) { a.gN++; a.gMs += sc.firstG; }
}
// audit 21/11 : un même appareil ne peut pas créer des dizaines d'invités pour essayer tous les mots (ni remplir la mémoire)
const mjGuestIp = new Map();   // "jour|ip" -> nombre d'invités différents
function mjGuestOk(day, ip, id) { const k = day + "|" + ip; let e = mjGuestIp.get(k); if (!e) { if (mjGuestIp.size > 50000) mjGuestIp.clear(); e = new Set(); mjGuestIp.set(k, e); } if (e.has(id)) return true; if (e.size >= 12) return false; e.add(id); return true; }
// ---------- Énigme du jour (22/11) : une énigme par jour, réponse gardée jusqu'au lendemain, solution révélée à minuit ----------
// enigmes.json est à la racine (jamais servi au navigateur) : q = énigme, s = solution affichée, r = réponses acceptées (sans accents)
let ENIG = []; try { ENIG = JSON.parse(fs.readFileSync(path.join(__dirname, "enigmes.json"), "utf8")).filter(e => e && e.q && e.s && Array.isArray(e.r) && e.r.length); } catch (e) { console.error("Énigmes illisibles :", e.message); }
const EN_START = Date.UTC(2026, 10, 22);
const enNum = day => Math.round((Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8)) - EN_START) / 864e5) + 1;
const enOf = day => { const n = enNum(day); return ENIG.length ? { n, ...ENIG[((n - 1) % ENIG.length + ENIG.length) % ENIG.length] } : null; };
const enNorm = v => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9]+/g, " ")
  .replace(/\b(le|la|les|l|un|une|des|du|de|d|c est|cest|ton|ta|tes|mon|ma|mes)\b/g, " ").replace(/\s+/g, " ").trim().split(" ").map(w => w.length > 3 ? w.replace(/[sx]$/, "") : w).join(" ");
function enLev(a, b) { if (Math.abs(a.length - b.length) > 1) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const enOk = (ans, e) => { const a = enNorm(ans); if (!a) return false; return e.r.some(r => { const x = enNorm(r); return a === x || (x.length >= 5 && enLev(a, x) <= 1); }); };
const EN_MEM = new Map();                                      // sans Redis (tests) : jour → Map(id → réponse)
async function enGet(day, id) { if (REDIS) { try { return JSON.parse(await redis(["HGET", "en:" + day, id]) || "null"); } catch { return null; } } const m = EN_MEM.get(day); return m ? m.get(id) || null : null; }
async function enPut(day, id, v, onlyNew) { if (REDIS) { const k = "en:" + day; const r = await redis([onlyNew ? "HSETNX" : "HSET", k, id, JSON.stringify(v)]); redis(["EXPIRE", k, String(40 * 86400)]).catch(() => {}); return onlyNew ? +r === 1 : true; }
  let m = EN_MEM.get(day); if (!m) { m = new Map(); EN_MEM.set(day, m); } if (onlyNew && m.has(id)) return false; m.set(id, v); return true; }
async function enCount(day) { if (REDIS) { try { const [t, o] = await Promise.all([redis(["HLEN", "en:" + day]), redis(["GET", "en:" + day + ":ok"])]); return { total: +t || 0, ok: +o || 0 }; } catch { return { total: 0, ok: 0 }; } }
  const m = EN_MEM.get(day); return { total: m ? m.size : 0, ok: m ? [...m.values()].filter(v => v.ok).length : 0 }; }
async function enApi(b, out, ip) {
  const day = parisDay(), e = enOf(day); if (!e) return out(503, { error: "pas d'énigme" });
  const yday = parisDay(new Date(Date.now() - 86400e3)), ye = enOf(yday);
  let id = null, name = normPseudo(b.name), pl = null;
  if (PSEUDO_RE.test(name) && b.token) { try { const p = await getPlayer(name); if (tokOk(p, b.token)) { id = name; pl = p; } } catch {} }
  if (!id) { const g = String(b.guest || ""); if (/^[a-z0-9]{12,24}$/.test(g)) id = "g:" + g; }
  let mine = id ? await enGet(day, id) : null;
  if (b.op === "answer" && id && !mine) {
    const a = String(b.a || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 40);
    if (!a) return out(400, { error: "vide", msg: "Écris ta réponse." });
    if (id.startsWith("g:") && ip && !mjGuestOk("en" + day, ip, id)) return out(429, { error: "trop", msg: "Trop de réponses invitées depuis cet appareil aujourd'hui : crée ton pseudo." });
    const v = { a, ok: enOk(a, e) };
    if (await enPut(day, id, v, true)) { mine = v; statAdd("enigme:reponse"); if (REDIS && v.ok) { redis(["INCR", "en:" + day + ":ok"]).catch(() => {}); redis(["EXPIRE", "en:" + day + ":ok", String(40 * 86400)]).catch(() => {}); } }
    else mine = await enGet(day, id);
  }
  // hier : solution, nombre de bonnes réponses, et la réponse du joueur (+5 points une seule fois pour un pseudo qui avait trouvé)
  let y = null;
  if (ye && ye.n >= 1) { const ym = id ? await enGet(yday, id) : null; const c = await enCount(yday); let gain = 0;
    if (ym && ym.ok && pl && !ym.c) { ym.c = 1; await enPut(yday, id, ym, false); addPoints(id, pl, "enigme", 5); savePlayer(id); gain = 5; }
    y = { n: ye.n, q: ye.q, s: ye.s, total: c.total, ok: c.ok, mine: ym ? { a: ym.a, ok: !!ym.ok } : null, gain }; }
  const c = await enCount(day);
  return out(200, { n: e.n, q: e.q, mine: mine ? { a: mine.a } : null, total: c.total, hier: y, ranked: !!pl });
}
async function mjApi(b, out, ip) {
  if (b.op === "share") { statAdd("motdujour:partage"); return out(200, { ok: true }); }
  const day = parisDay(), w = MJ.wordOf(day);
  // qui joue : un pseudo connecté (classé) ou un invité (identifiant tiré au hasard par son navigateur)
  let id = null, name = normPseudo(b.name), pl = null;
  if (PSEUDO_RE.test(name) && b.token) { try { const p = await getPlayer(name); if (tokOk(p, b.token)) { id = name; pl = p; } } catch {} }
  if (!id) { const g = String(b.guest || ""); if (/^[a-z0-9]{12,24}$/.test(g)) id = "g:" + g; }
  const m = await MJ.load(day); const st = id ? m.get(id) : null;
  if (id && id.startsWith("g:") && !st && (b.op === "start" || b.op === "essai") && ip && !mjGuestOk(day, ip, id)) return out(429, { error: "trop", msg: "Trop de parties invitées depuis cet appareil aujourd'hui : crée ton pseudo pour jouer." });
  // le chrono démarre à la 1re lettre tapée (pas à l'ouverture de la page)
  if (b.op === "start") { if (!id) return out(400, { error: "joueur" }); if (!st) { const s = { t: [], ts: [], at: Date.now() }; m.set(id, s); MJ.persist(day, id, s); } return out(200, { ok: 1 }); }
  if (b.op === "essai") {
    if (!id) return out(400, { error: "joueur" });
    const g = MJ.strip(b.g);
    const s = st || { t: [], ts: [], at: Date.now() };
    if (s.ok || s.t.length >= 6) return out(200, MJ.view(day, s, w));
    if (g.length !== w.length) return out(200, { refus: "Le mot fait " + w.length + " lettres." });
    if (g[0] !== w[0]) return out(200, { refus: "Le mot commence par " + w[0] + "." });
    if (!MJ.dict.has(g)) return out(200, { refus: "« " + g + " » n'est pas dans le dictionnaire." });
    if (s.t.includes(g)) return out(200, { refus: "Mot déjà essayé." });
    const before = s.t.length ? MJ.score(s, w).pts : 0;
    s.t.push(g); s.ts = s.ts || []; s.ts.push(Date.now() - (s.at || Date.now())); if (g === w) { s.ok = 1; s.ms = s.ts[s.ts.length - 1]; }
    const sc = MJ.score(s, w); s.p = sc.pts;
    m.set(id, s); MJ.persist(day, id, s); statAdd(s.ok ? "motdujour:trouve" : s.t.length >= 6 ? "motdujour:rate" : "motdujour:essai");
    if (pl) {
      const delta = sc.pts - before;
      if (s.t.length === 1) { pl.mj = pl.mj || { days: 0, found: 0, pts: 0, nF: 0, msF: 0, gN: 0, gMs: 0 }; pl.mj.days++; }
      if (delta > 0) { addPoints(id, pl, "motdujour", delta); pl.mj.pts = (pl.mj.pts || 0) + delta; if (REDIS) redis(["ZINCRBY", "mj:pts", String(delta), id]).catch(() => {}); else MJ_TOTAL.set(id, (MJ_TOTAL.get(id) || 0) + delta); MJ.resetTot(); }
      if (s.ok || s.t.length >= 6) mjClose(pl, s, sc);
      savePlayer(id);
    }
    return out(200, { ...MJ.view(day, s, w), pts: sc.pts, gained: sc.pts - before, board: await MJ.board(day), mine: pl ? mjMine(pl) : undefined });
  }
  // op « etat » : ma grille du jour + les chiffres du jour + les classements
  return out(200, { ...MJ.view(day, st, w), pts: st && st.t && st.t.length ? MJ.score(st, w).pts : 0, board: await MJ.board(day), ranked: !!pl, mine: pl ? mjMine(pl) : undefined });
}
const mjMine = p => { const a = p.mj || {}; return { days: a.days || 0, found: a.found || 0, pts: a.pts || 0, avgN: a.found ? +(a.nF / a.found).toFixed(1) : null, avgMs: a.found ? Math.round(a.msF / a.found) : null, avgG: a.gN ? Math.round(a.gMs / a.gN) : null, wins: p.mjWins || 0 }; };
// minuit (Paris) : le 1er du classement du jour qui se termine gagne 5 jetons (une seule fois, même si le serveur redémarre)
async function mjPrize() {
  const yd = parisDay(new Date(Date.now() - 864e5));
  try {
    if (REDIS ? await redis(["EXISTS", "mj:prize:" + yd]) : MJ_PRIZE.has(yd)) return;
    const d = await MJ.dayList(yd); const top = d.list[0]; if (!top || top.pts <= 0) return;
    const rec = JSON.stringify({ name: top.name, pts: top.pts, coins: 5 });
    if (REDIS) { const ok = await redis(["SET", "mj:prize:" + yd, rec, "NX", "EX", String(90 * 86400)]); if (!ok) return; } else MJ_PRIZE.set(yd, rec);
    const p = await getPlayer(top.name); if (!p) return;
    ensureWallet(p); p.coins = Math.round(p.coins + 5); p.mjWins = (p.mjWins || 0) + 1; savePlayer(top.name);
    console.log("Mot du jour " + yd + " : 5 jetons pour " + top.name + " (" + top.pts + " points)");
  } catch (e) { console.error("Mot du jour (prix de minuit) :", e.message); }
}
setTimeout(mjPrize, 20e3); setInterval(mjPrize, 5 * 60e3);
// reprise des parties jouées avant le barème à points (20-21/11) : points cumulés et moyennes, une seule fois
async function mjBackfill() {
  if (!REDIS) return;
  try {
    if (!(await redis(["SET", "mj:v2", "1", "NX"]))) return;
    for (const day of ["20261120", "20261121"]) {
      const m = await MJ.load(day), w = MJ.wordOf(day);
      for (const [id, st] of m) {
        if (id.startsWith("g:") || !(st.t || []).length) continue;
        const p = await getPlayer(id); if (!p) continue; const sc = MJ.score(st, w);
        p.mj = p.mj || { days: 0, found: 0, pts: 0, nF: 0, msF: 0, gN: 0, gMs: 0 }; p.mj.days++; p.mj.pts += sc.pts; st.p = sc.pts; MJ.persist(day, id, st);
        if (st.ok || st.t.length >= 6) mjClose(p, st, sc);
        if (sc.pts > 0) { addPoints(id, p, "motdujour", sc.pts); await redis(["ZINCRBY", "mj:pts", String(sc.pts), id]); }
        savePlayer(id);
      }
    }
    MJ.resetTot(); console.log("Mot du jour : points des 20 et 21/11 repris");
  } catch (e) { console.error("Mot du jour (reprise) :", e.message); }
}
setTimeout(mjBackfill, 15e3);
async function api(req, res, route) {
  const out = (code, o) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return out(405, { error: "méthode" });
  const MAXB = route === "solo" ? 96 * 1024 : 4096;
  let body = ""; for await (const ch of req) { body += ch; if (body.length > MAXB) return out(413, { error: "trop long" }); }
  let b; try { b = JSON.parse(body || "{}"); } catch { return out(400, { error: "json" }); }
  const ip = clientIp(req);
  const name = normPseudo(b.name);
  if (route === "rank") return out(200, await topRank(PSEUDO_RE.test(name) ? name : null));
  if (route === "mj") return mjApi(b, out, clientIp(req));
  if (route === "en") return enApi(b, out, clientIp(req));
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
    if (p || players.has(name)) return taken();
    // une création du même pseudo est en cours : on attend son issue ; si elle a échoué (stockage), cette demande-ci peut réussir
    if (creating.has(name)) { await creating.get(name); if (players.has(name) || creating.has(name)) return taken(); }
    let done; creating.set(name, new Promise(z => done = z));
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
    finally { creating.delete(name); done(); }
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
  if (["salons", "sjoin", "screate", "skick", "scode", "sleave", "sdelete"].includes(route)) return void await salonApi(route, name, p, b, ip, out, bad);
  if (route === "me") { let list = null; try { list = await salonList(name, p); } catch {} return out(200, { name, salons: list, pts: ptsOut(p), solo: Object.keys(p.solo || {}), coins: ensureWallet(p).coins, skin: p.skin || "" }); }
  // skin du profil : le serveur vérifie que l'habillage existe et qu'il est débloqué (points au total, ou mois de décembre pour l'Hiver)
  if (route === "skin") {
    const id = String(b.skin || "");
    if (id && !SKINS.BY[id]) return out(400, { error: "Habillage inconnu." });
    if (id && id !== p.skin && !SKINS.unlocked(id, (p.pts && p.pts.tot) || 0, moisParis())) return out(403, { error: "Habillage pas encore débloqué : " + SKINS.condition(id) + "." });
    if (id) p.skin = id; else delete p.skin;
    savePlayer(name); skinMem.set(name, id);
    if (REDIS) (id ? redis(["HSET", "skins", name, id]) : redis(["HDEL", "skins", name])).catch(e => console.error("Skins Redis :", e.message));
    return out(200, { ok: true, skin: id });
  }
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
    if (!/^(fleches|rond|meles|poker|mot|culture|magnetico)$/.test(game) || !/^[A-Za-z0-9_-]{3,40}$/.test(gid)) return out(400, { error: "partie" });
    p.gids = Array.isArray(p.gids) ? p.gids : [];
    if (p.gids.includes(game + gid)) return out(200, { ok: true, dup: true, pts: p.pts });
    statAdd(game + ":finie");
    let pts = Math.max(0, Math.min(800, Math.round(Number(b.pts) || 0)));
    if (game === "poker" || game === "mot") return out(200, { ok: true, add: 0, refus: "points non attribués par cette voie", pts: p.pts });   // aucun de ces jeux n'envoie de points ici
    if (b.solo) {
      const k = game + ":" + gid, t = p.tk && p.tk[k];
      if (!t || Date.now() - t < SOLO_MIN_MS) return out(200, { ok: true, add: 0, refus: "partie non vérifiée", pts: p.pts });
      delete p.tk[k];
    } else if (!b.solo && DOCID[game]) {
      let ms = multiScore(game, gid, name);
      for (let i = 0; i < 8 && ms && !ms.done; i++) { await new Promise(r => setTimeout(r, 500)); ms = multiScore(game, gid, name); }   // la fin de partie peut arriver juste après
      if (!ms || !ms.done) return out(200, { ok: true, add: 0, refus: "partie introuvable", pts: p.pts });
      pts = Math.min(pts, Math.round(ms.pts));
    }
    if (p.gids.includes(game + gid)) return out(200, { ok: true, dup: true, pts: p.pts });   // deux envois simultanés : un seul compte
    // grille (ou série de questions) rejouée en solo : 10 points la 2e fois, 3 points les fois suivantes
    let rep = 0;
    if (b.solo && typeof b.ref === "string" && b.ref && b.ref.length <= 400) {
      p.reps = p.reps && typeof p.reps === "object" ? p.reps : {};
      const key = game + ":" + b.ref; let n = p.reps[key] || 0;
      if (!n) { const c = CAT.GAMES.includes(game) && CAT.cid(game, b.ref); const e = c && p.hist && p.hist[game] && p.hist[game][c]; if (e && e.d && Number(b.started) && e.d < Number(b.started)) n = 1; }
      rep = n; p.reps[key] = n + 1;
      const ks = Object.keys(p.reps); if (ks.length > 600) ks.slice(0, ks.length - 600).forEach(k => delete p.reps[k]);
    }
    if (rep === 1) pts = 10; else if (rep >= 2) pts = 3;
    else if (b.solo) pts = Math.round(pts * (SOLO_MULT[b.level] || 1));
    // barème dégressif : dans une même journée et pour un même jeu, les parties rapportent de moins en moins
    // (1re à 3e : 100 %, 4e à 6e : 75 %, 7e à 10e : 50 %, ensuite 25 %) ; le compteur repart à zéro chaque jour
    const day = DAYKEY(); if (!p.dg || p.dg.d !== day) p.dg = { d: day, n: {} };
    const nth = (p.dg.n[game] || 0) + 1; p.dg.n[game] = nth;
    const f = DEGRESSIF(nth); if (rep === 0) pts = Math.round(pts * f);
    p.gids = p.gids.slice(-300).concat(game + gid);
    if (pts) await addPoints(name, p, game, pts);
    savePlayer(name); return out(200, { ok: true, add: pts, rep, nth, f: rep ? 1 : f, pts: p.pts });
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
    const game = String(b.game || "");
    if (game === "magnetico") { const d = b.doc; if (b.op === "put" && d && typeof d === "object" && d.solo) soloTicket(p, game, d.gid); savePlayer(name); return out(200, { ok: true, doc: null, played: [] }); }
    if (!CAT.GAMES.includes(game)) return bad("game", "Jeu inconnu.");
    p.solo = p.solo || {};
    if (b.op === "put") { const d = b.doc; if (d && typeof d === "object" && d.solo && !d.done) { p.solo[game] = { t: Date.now(), doc: d }; soloTicket(p, game, d.gid); } else delete p.solo[game]; savePlayer(name); return out(200, { ok: true }); }
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
// ---------- référencement : adresse canonique, aperçu de partage, robots.txt, sitemap.xml ----------
const SITE = (process.env.SITE_URL || "https://mots-fleches-duo.onrender.com").replace(/\/$/, "");
// arrivée depuis l'ancienne adresse : on range la session et les réglages emportés (sans écraser ce qui existe déjà ici),
// seulement si l'on vient bien de l'ancienne adresse (le referrer), puis on efface le fragment de l'adresse
const TRANSFER_JS = '<script>(function(){var h=location.hash,m="#motipop-transfert=";if(h.indexOf(m)!==0)return;try{if(/^https:\\/\\/[a-z0-9-]+\\.onrender\\.com\\//.test(document.referrer)){var d=JSON.parse(decodeURIComponent(h.slice(m.length)));for(var k in d)if(/^fl-/.test(k)&&typeof d[k]==="string"&&localStorage.getItem(k)===null)localStorage.setItem(k,d[k])}}catch(e){}history.replaceState(null,"",location.pathname+location.search)})()</script>';
const OLDHOST_REDIRECT = !/\.onrender\.com/i.test(SITE);   // actif seulement quand SITE_URL est un vrai domaine
const CANON = { "regles.html": "/regles", "legal.html": "/mentions-legales", "accueil.html": "/", "fl.html": "/fleches", "rd.html": "/rond", "mm.html": "/meles", "mg.html": "/magnetico", "md.html": "/motdujour", "cg.html": "/culture", "poker.html": "/poker" };
function seoTags(file, txt) {
  const c = CANON[path.basename(file)]; if (c === undefined) return "";
  const t = (txt.match(/<title>([^<]*)<\/title>/) || [])[1] || "Motipop";
  const d = (txt.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const u = SITE + c;
  return '\n<link rel="canonical" href="' + u + '"><meta property="og:type" content="website"><meta property="og:site_name" content="Motipop"><meta property="og:image" content="' + SITE + '/motipop-512.png"><meta property="og:locale" content="fr_FR"><meta property="og:url" content="' + u + '"><meta property="og:title" content="' + t + '"><meta property="og:description" content="' + d + '"><meta name="twitter:card" content="summary">' + (c === "/" ? '<script type="application/ld+json">' + JSON.stringify([
    { "@context": "https://schema.org", "@type": "WebSite", name: "Motipop", alternateName: ["Motipop jeux de mots", "motipop.fr"], url: SITE + "/", inLanguage: "fr-FR" },
    { "@context": "https://schema.org", "@type": "Organization", name: "Motipop", url: SITE + "/", logo: SITE + "/motipop-512.png" }]).replace(/</g, "\\u003c") + '</script>' : "");
}
// informations légales : réglées chez Render (CONTACT_EMAIL, et EDITEUR_NOM / EDITEUR_ADRESSE pour un éditeur professionnel)
const escH = v => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const CEMAIL = envClean(process.env.CONTACT_EMAIL);
const CONTACT_HTML = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(CEMAIL) ? '<a href="mailto:' + escH(CEMAIL) + '">' + escH(CEMAIL) + "</a>" : '<span class="note">adresse de contact bientôt disponible</span>';
const EDITEUR_HTML = envClean(process.env.EDITEUR_NOM)
  ? "<b>" + escH(envClean(process.env.EDITEUR_NOM)) + "</b>" + (envClean(process.env.EDITEUR_ADRESSE) ? " — " + escH(envClean(process.env.EDITEUR_ADRESSE)) : "")
  : "Motipop est édité à titre non professionnel par un particulier. Conformément à l'article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, ses coordonnées ont été communiquées à l'hébergeur.";
const SITEMAP_PATHS = ["/", "/motdujour", "/fleches", "/rond", "/meles", "/magnetico", "/culture", "/poker", "/regles", "/mentions-legales"];
function page(file, inject) {
  const st = fs.statSync(file);
  const c = pages[file];
  if (c && c.mtime === st.mtimeMs) return c;
  if (/\.(woff2|webp|png)$/.test(file)) { const raw = fs.readFileSync(file); return (pages[file] = { raw, gz: raw, br: raw, bin: true, etag: '"' + crypto.createHash("sha1").update(raw).digest("base64url").slice(0, 16) + '"', mtime: st.mtimeMs }); }   // police : binaire, déjà compressée
  let txt = fs.readFileSync(file, "utf8");
  if (txt.includes("{{CONTACT}}") || txt.includes("{{EDITEUR}}")) txt = txt.split("{{CONTACT}}").join(CONTACT_HTML).split("{{EDITEUR}}").join(EDITEUR_HTML);
  if (inject) txt = txt.replace("<head>", "<head>\n<script>window.SUPPORT=" + SUPPORT + ";</script>" + (txt.includes('rel="manifest"') ? "" : '<link rel="manifest" href="/manifest.webmanifest">') + TRANSFER_JS + SW_REG + (txt.includes('rel="canonical"') ? "" : seoTags(file, txt)));
  return (pages[file] = { ...pack(Buffer.from(txt)), mtime: st.mtimeMs });
}
function sendBody(req, res, p, type, cache) {
  const ae = req.headers["accept-encoding"] || "";
  const h = { "content-type": type, "cache-control": cache, vary: "Accept-Encoding", etag: p.etag };
  if (req.headers["if-none-match"] === p.etag) { res.writeHead(304, h); return res.end(); }
  if (p.bin) { res.writeHead(200, { ...h, "content-length": p.raw.length }); return res.end(req.method === "HEAD" ? undefined : p.raw); }
  if (/\bbr\b/.test(ae)) { res.writeHead(200, { ...h, "content-encoding": "br" }); return res.end(p.br); }
  if (/\bgzip\b/.test(ae)) { res.writeHead(200, { ...h, "content-encoding": "gzip" }); return res.end(p.gz); }
  res.writeHead(200, h); res.end(p.raw);
}
// ---------- 20/11 : compteurs anonymes et journal d'erreurs (sans cookie, sans adresse IP enregistrée) ----------
// Par jour (heure de Paris) : visites de l'accueil, parties ouvertes et finies par jeu, erreurs des pages. Gardé en mémoire,
// recopié dans Redis toutes les 10 min (clé stat:AAAAMMJJ, 60 jours) : ~150 commandes par jour. Lecture : /admin/stats?key=…
const STAT = { day: null, c: {}, errs: [], dirty: false };
function statDay() { const d = parisDay(); if (STAT.day !== d) { if (STAT.day && STAT.dirty) statFlush(); STAT.day = d; STAT.c = {}; STAT.errs = []; STAT.dirty = false; } return d; }
function statAdd(k, n = 1) { statDay(); STAT.c[k] = (STAT.c[k] || 0) + n; STAT.dirty = true; }
function statFlush() { if (!REDIS || !STAT.day || !STAT.dirty) return; STAT.dirty = false; redis(["SET", "stat:" + STAT.day, JSON.stringify({ c: STAT.c, errs: STAT.errs }), "EX", String(60 * 86400)]).catch(e => { STAT.dirty = true; console.error("Compteurs non sauvegardés :", e.message); }); }
setInterval(statFlush, 10 * 60e3).unref();
process.on("SIGTERM", () => { try { statFlush(); } catch {} });
if (REDIS) { const d = parisDay(); redis(["GET", "stat:" + d]).then(v => { try { const o = JSON.parse(v || "null"); if (!o) return; statDay(); for (const k in o.c || {}) STAT.c[k] = (STAT.c[k] || 0) + o.c[k]; STAT.errs = (o.errs || []).concat(STAT.errs).slice(-60); } catch {} }).catch(() => {}); }
const errRate = new Map();   // limite : 20 erreurs par adresse et par heure (l'adresse reste en mémoire, seulement pour cette limite)
function statErr(b, ip) {
  const now = Date.now(), r = errRate.get(ip) || { n: 0, t: now }; if (now - r.t > 3600e3) { r.n = 0; r.t = now; } r.n++; errRate.set(ip, r); if (r.n > 20) return;
  if (errRate.size > 5000) errRate.clear();
  const cut = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").slice(0, n);
  const e = { t: new Date().toISOString().slice(11, 19), m: cut(b.m, 300), p: cut(b.p, 80), w: cut(b.w, 120), ua: /iPhone|iPad/.test(b.ua || "") ? "iOS" : /Android/.test(b.ua || "") ? "Android" : /Mobile/.test(b.ua || "") ? "mobile" : "ordinateur" };
  statDay(); STAT.errs.push(e); if (STAT.errs.length > 60) STAT.errs.shift(); statAdd("erreurs"); console.error("Erreur joueur :", e.p, e.m, e.w, e.ua);
}
function sendPage(req, res, file) {
  let p; try { p = page(file, true); } catch { res.writeHead(500); return res.end("Page manquante"); }
  try { if (req.method === "GET" && !/bot|spider|crawl|preview|uptime/i.test(req.headers["user-agent"] || "")) { const f = path.basename(file), g = { "fl.html": "fleches", "rd.html": "rond", "mm.html": "meles", "mg.html": "magnetico", "md.html": "motdujour", "cg.html": "culture", "poker.html": "poker" }[f]; const q = String(req.url || ""); const rf = (q.match(/[?&]ref=([a-z0-9-]{2,20})(?:&|$)/) || [])[1]; if (rf) statAdd("ref:" + rf); if (f === "accueil.html") statAdd("accueil"); else if (g) statAdd(g + ":" + (/[?&]go=multi/.test(q) ? "ouverte-multi" : /[?&]go=/.test(q) ? "ouverte-solo" : "ouverte")); } } catch {}
  sendBody(req, res, p, "text/html; charset=utf-8", "no-cache");
}
// données lourdes (grilles…) : nom de fichier versionné → mises en cache un an par le navigateur
const STATIC = { js: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", css: "text/css; charset=utf-8", woff2: "font/woff2", webp: "image/webp", png: "image/png" };
const skinCache = new Map();
let cgIdx = null;
const SW_REG = '<script>if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})</script>';
const SW_JS = `// Motipop · service worker : n'enregistre que la page « hors connexion » (le jeu se charge toujours en ligne)
const V = "motipop-hl-1", OFF = "/hors-ligne";
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.add(new Request(OFF, { cache: "reload" }))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => { if (e.request.mode !== "navigate") return; e.respondWith(fetch(e.request).catch(() => caches.match(OFF))); });
`;
// page introuvable : Pop perdu avec sa carte
const NOTFOUND_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#12152e"><meta name="robots" content="noindex"><title>Page introuvable — Motipop</title><link rel="icon" href="/favicon.svg">
<style>html,body{margin:0;min-height:100%}body{min-height:100vh;display:grid;place-items:center;color:#eef2f7;font-family:system-ui,sans-serif;text-align:center;background:radial-gradient(900px 600px at 10% -10%,#0f3b3f,transparent 60%),radial-gradient(700px 500px at 100% 10%,#1b1440,transparent 55%),linear-gradient(160deg,#0b1d2a,#1b1440)}
.b{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 24px 28px;margin:16px;max-width:360px;border-radius:24px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 10px 40px rgba(0,0,0,.35)}
img{width:180px;height:auto;filter:drop-shadow(0 10px 20px rgba(0,0,0,.35));animation:f 3.2s ease-in-out infinite}@keyframes f{50%{transform:translateY(-6px) rotate(-2deg)}}
h1{margin:0;font-size:1.35rem}p{margin:0;color:#a9b3c7;line-height:1.45}
a{margin-top:6px;text-decoration:none;border-radius:14px;padding:12px 22px;font-weight:700;color:#fff;background:linear-gradient(135deg,#00ADB5,#A26BFF);box-shadow:0 6px 20px rgba(0,173,181,.35)}
@media (prefers-reduced-motion:reduce){img{animation:none}}</style></head><body><main class="b"><img src="/d/pop-perdu-b4dd8a59b8.webp" width="180" height="180" alt="Pop regarde sa carte, un peu perdu"><h1>Page introuvable</h1><p>Pop a beau chercher sur sa carte : ce lien ne mène nulle part, ou ce salon n'existe plus.</p><a href="/">Retour à l'accueil</a></main></body></html>`;
const OFFLINE_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#12152e"><title>Motipop — pas de connexion</title>
<style>html,body{margin:0;height:100%}body{display:grid;place-items:center;color:#eef2f7;font-family:system-ui,sans-serif;text-align:center;background:radial-gradient(900px 600px at 10% -10%,#0f3b3f,transparent 60%),radial-gradient(700px 500px at 100% 10%,#1b1440,transparent 55%),linear-gradient(160deg,#0b1d2a,#1b1440)}
.b{display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 24px;margin:16px;max-width:340px;border-radius:24px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 10px 40px rgba(0,0,0,.35)}
svg{width:120px;height:120px;animation:f 3s ease-in-out infinite}@keyframes f{50%{transform:translateY(-8px) rotate(3deg)}}
h1{margin:0;font-size:1.3rem}p{margin:0;color:#a9b3c7;line-height:1.45}
button{margin-top:6px;border:0;border-radius:14px;padding:12px 22px;font:700 1rem system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#00ADB5,#A26BFF);box-shadow:0 6px 20px rgba(0,173,181,.35)}
@media (prefers-reduced-motion:reduce){svg{animation:none}}</style></head><body><div class="b">${fs.readFileSync(path.join(__dirname, "public", "d", "favicon.svg"), "utf8")}<h1>Pas de connexion</h1><p>Motipop a besoin d'internet pour jouer avec tout le monde. Dès que ton téléphone retrouve le réseau, on repart.</p><button onclick="location.reload()">Réessayer</button></div>
<script>addEventListener("online",()=>location.reload())</script></body></html>`;
const FAVICON = fs.readFileSync(path.join(__dirname, "public", "d", "favicon.svg"));
function sendSkin(req, res, name, ext) {
  let buf = skinCache.get(name);
  if (!buf) { try { buf = fs.readFileSync(path.join(__dirname, "public", "d", "skins", name)); } catch { res.writeHead(404, { "cache-control": "public, max-age=300" }); return res.end(); } skinCache.set(name, buf); }
  res.writeHead(200, { "content-type": ext === "jpg" ? "image/jpeg" : "image/" + ext, "content-length": buf.length, "cache-control": "public, max-age=86400" });
  res.end(req.method === "HEAD" ? undefined : buf);
}
function sendStatic(req, res, name) {
  // musique d'ambiance (mp3) : servie par morceaux (en-tête Range), indispensable pour Safari sur iPhone
  { const mm = name.match(/^(musique-[a-z]{3,20}-[0-9a-f]{10})\.mp3$/); if (mm) return sendAudio(req, res, name); }
  const m = name.match(/^([a-z0-9-]{3,60})\.(js|json|svg|css|woff2|webp|png)$/); if (!m) { res.writeHead(404); return res.end(); }
  let p; try { p = page(path.join(__dirname, "public", "d", name), false); } catch { res.writeHead(404); return res.end(); }
  sendBody(req, res, p, STATIC[m[2]], /-[0-9a-f]{10}\./.test(name) ? "public, max-age=31536000, immutable" : "public, max-age=3600");
}
const audioCache = new Map();
function sendAudio(req, res, name) {
  let buf = audioCache.get(name);
  if (!buf) { try { buf = fs.readFileSync(path.join(__dirname, "public", "d", name)); } catch { res.writeHead(404); return res.end(); } audioCache.set(name, buf); }
  const H = { "content-type": "audio/mpeg", "accept-ranges": "bytes", "cache-control": "public, max-age=31536000, immutable" };
  const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (r && (r[1] || r[2])) {
    let a = r[1] ? +r[1] : buf.length - +r[2], b = r[1] && r[2] ? Math.min(+r[2], buf.length - 1) : buf.length - 1;
    if (a < 0) a = 0;
    if (a > b || a >= buf.length) { res.writeHead(416, { "content-range": "bytes */" + buf.length }); return res.end(); }
    res.writeHead(206, { ...H, "content-range": "bytes " + a + "-" + b + "/" + buf.length, "content-length": b - a + 1 });
    return res.end(req.method === "HEAD" ? undefined : buf.subarray(a, b + 1));
  }
  res.writeHead(200, { ...H, "content-length": buf.length });
  res.end(req.method === "HEAD" ? undefined : buf);
}
// page lisible des statistiques (22/11) : mêmes chiffres que ?format=json, rendus côté serveur (aucun appel depuis la page)
const GAME_NAMES = { fleches: "Mots fléchés", rond: "Tourniquet", meles: "Mots mêlés", culture: "Culture générale", poker: "Wordflush", magnetico: "Magnético", motdujour: "Mot du jour" };
function adminStatsHtml(days, key) {
  const sum = (c, re) => Object.keys(c || {}).filter(k => re.test(k)).reduce((a, k) => a + (+c[k] || 0), 0);
  const fmtDay = d => { const m = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]; return Number(d.slice(6, 8)) + " " + m[Number(d.slice(4, 6)) - 1]; };
  const rows = days.map(d => { const c = d.compteurs || {}; return { jour: d.jour, visites: +c.accueil || 0, lancees: sum(c, /:ouverte/), finies: sum(c, /:finie$/), mjOk: +c["motdujour:trouve"] || 0, mjKo: +c["motdujour:rate"] || 0, erreurs: Array.isArray(d.erreurs) ? d.erreurs.length : (+d.erreurs || 0), c }; });
  const t = rows[0] || { visites: 0, lancees: 0, finies: 0, mjOk: 0, mjKo: 0, erreurs: 0, c: {}, jour: parisDay() };
  const card = (n, l, col) => `<div class="card"><b style="color:${col}">${n}</b><span>${l}</span></div>`;
  const byDay = Object.fromEntries(rows.map(r => [r.jour, r])), chrono = Array.from({ length: 14 }, (_, i) => { const d = parisDay(new Date(Date.now() - (13 - i) * 86400e3)); return byDay[d] || { jour: d, visites: 0, lancees: 0 }; }), max = Math.max(1, ...chrono.map(r => Math.max(r.visites, r.lancees)));
  const W = 640, H = 220, bw = W / Math.max(1, chrono.length);
  const bars = chrono.map((r, i) => { const x = i * bw, hv = Math.round(r.visites / max * (H - 40)), hl = Math.round(r.lancees / max * (H - 40));
    return `<rect x="${x + bw * .14}" y="${H - 24 - hv}" width="${bw * .34}" height="${hv}" rx="3" fill="#7b9bff"><title>${fmtDay(r.jour)} : ${r.visites} visites</title></rect><rect x="${x + bw * .52}" y="${H - 24 - hl}" width="${bw * .34}" height="${hl}" rx="3" fill="#ff8a6b"><title>${fmtDay(r.jour)} : ${r.lancees} parties</title></rect><text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${escH(fmtDay(r.jour).split(" ")[0])}</text>`; }).join("");
  const games = Object.keys(GAME_NAMES).map(g => { const c = t.c; const so = +c[g + ":ouverte-solo"] || 0, mu = +c[g + ":ouverte-multi"] || 0, fi = +c[g + ":finie"] || 0; return so + mu + fi ? `<tr><td>${GAME_NAMES[g]}</td><td>${so}</td><td>${mu}</td><td>${fi}</td></tr>` : ""; }).join("") || `<tr><td colspan="4" class="mut">Aucune partie aujourd'hui</td></tr>`;
  const errs = (rows.length && Array.isArray(days[0].erreurs) ? days[0].erreurs : []).slice(-30).reverse().map(e => `<li><b>${escH(e.t || "")}</b> · ${escH(e.p || "")} · ${escH(e.ua || "")}<br><span>${escH(e.m || "")}</span></li>`).join("") || `<li class="mut">Aucune erreur aujourd'hui</li>`;
  const hist = rows.map(r => `<tr><td>${fmtDay(r.jour)}</td><td>${r.visites}</td><td>${r.lancees}</td><td>${r.finies}</td><td>${r.mjOk}</td><td>${r.erreurs}</td></tr>`).join("");
  const RN = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", whatsapp: "WhatsApp", affiche: "Affiche / QR code" }, rt = {}, rs = {};
  rows.forEach((r, i) => Object.keys(r.c || {}).forEach(x => { if (!x.startsWith("ref:")) return; const n = x.slice(4); rs[n] = (rs[n] || 0) + (+r.c[x] || 0); if (i === 0) rt[n] = +r.c[x] || 0; }));
  const refs = Object.keys(rs).sort((a, b) => rs[b] - rs[a]).map(n => `<tr><td>${escH(RN[n] || n)}</td><td>${rt[n] || 0}</td><td>${rs[n]}</td></tr>`).join("") || `<tr><td colspan="3" class="mut">Pas encore de visite par un lien court (motipop.fr/tt, /fb…)</td></tr>`;
  const k = encodeURIComponent(key || "");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Statistiques — Motipop</title><style>
body{margin:0;background:#12152e;color:#fff;font:17px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:760px;margin:0 auto;padding:18px 16px 40px}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.2rem;margin:26px 0 10px}.mut{color:#c9d1e6}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}.card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:14px;display:flex;flex-direction:column}.card b{font-size:2rem;line-height:1.1}.card span{color:#d6dcef;font-size:.95rem}
.box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:12px;overflow-x:auto}svg{width:100%;height:auto;display:block}svg text{fill:#c9d1e6;font-size:11px}
.leg{display:flex;gap:16px;margin:8px 4px 0;font-size:.95rem;color:#d6dcef}.leg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;font-size:.98rem}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.1)}th{color:#c9d1e6;font-weight:600}td:not(:first-child),th:not(:first-child){text-align:right}
ul{list-style:none;margin:0;padding:0}li{padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.1)}li span{color:#ffc2b5;font-size:.95rem;word-break:break-word}a{color:#9fb5ff}</style></head><body><main>
<h1>Statistiques Motipop</h1><div class="mut">Aujourd'hui, ${fmtDay(t.jour)} · <a href="?key=${k}">actualiser</a> · <a href="/admin/sauvegardes?key=${k}">sauvegardes</a></div>
<div class="cards">${card(t.visites, "visites de l'accueil", "#9fb5ff")}${card(t.lancees, "parties lancées", "#ffa58a")}${card(t.finies, "parties finies", "#7be0c8")}${card(+t.c["motdujour:partage"] || 0, "résultats partagés", "#c7a2ff")}${card(+t.c["enigme:reponse"] || 0, "réponses à l'énigme", "#f2deb0")}${card(t.mjOk, "Mot du jour trouvé" + (t.mjKo ? " · " + t.mjKo + " raté" + (t.mjKo > 1 ? "s" : "") : ""), "#ffd27a")}${card(t.erreurs, "erreurs chez les joueurs", t.erreurs ? "#ff8a8a" : "#c9d1e6")}</div>
<h2>Les 14 derniers jours</h2><div class="box"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visites et parties lancées par jour">${bars}</svg><div class="leg"><span><i style="background:#7b9bff"></i>visites</span><span><i style="background:#ff8a6b"></i>parties lancées</span></div></div>
<h2>D'où viennent les visiteurs (14 jours)</h2><div class="box"><table><tr><th>Provenance</th><th>Aujourd'hui</th><th>14 jours</th></tr>${refs}</table></div>
<h2>Parties par jeu aujourd'hui</h2><div class="box"><table><tr><th>Jeu</th><th>Solo</th><th>À plusieurs</th><th>Finies</th></tr>${games}</table></div>
<h2>Erreurs du jour</h2><div class="box"><ul>${errs}</ul></div>
<h2>Jour par jour</h2><div class="box"><table><tr><th>Jour</th><th>Visites</th><th>Lancées</th><th>Finies</th><th>Mot trouvé</th><th>Erreurs</th></tr>${hist}</table></div>
<p class="mut">Chiffres anonymes. Données brutes : <a href="?key=${k}&amp;format=json">format JSON</a>.</p></main></body></html>`;
}
// espace d'administration des sauvegardes (seulement si ADMIN_KEY est réglée chez Render ; la clé n'est jamais écrite dans les journaux)
async function adminRoute(req, res, url) {
    const key = url.searchParams.get("key") || req.headers["x-admin-key"];
    if (!adminOk(key)) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Introuvable"); }
    const J = (c, o) => { res.writeHead(c, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(o, null, 1)); };
    if (url.pathname === "/admin/stats") { statFlush(); const days = []; for (let i = 0; i < 14; i++) { const d = parisDay(new Date(Date.now() - i * 86400e3)); let o = null; if (d === STAT.day) o = { c: STAT.c, errs: STAT.errs }; else if (REDIS) { try { o = JSON.parse(await redis(["GET", "stat:" + d]) || "null"); } catch {} } if (o) days.push({ jour: d, compteurs: o.c, erreurs: i === 0 ? o.errs : (o.errs || []).length }); } if (url.searchParams.get("format") === "json") return J(200, { aide: "accueil = visites de l'accueil ; <jeu>:ouverte-solo / -multi = parties lancées ; <jeu>:finie = parties terminées avec points ; erreurs = pages qui ont planté chez un joueur (détail du jour)", jours: days });
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" }); return res.end(adminStatsHtml(days, url.searchParams.get("key"))); }
    if (!REDIS) return J(503, { error: "Pas de stockage Redis sur ce serveur" });
    try {
      if (url.pathname === "/admin/sauvegardes" && req.method === "GET") return J(200, { sauvegardes: await listBackups(), aide: "Télécharger : /admin/telecharger?key=…&date=AAAAMMJJ · Sauvegarde immédiate : POST /admin/sauvegarder · Restaurer : POST /admin/restaurer?date=AAAAMMJJ&confirmer=RESTAURER" });
      if (url.pathname === "/admin/telecharger" && req.method === "GET") { const tag = String(url.searchParams.get("date") || ""); if (!/^[\w-]{1,40}$/.test(tag)) return J(400, { error: "date ?" }); const b = await readBackup(tag); if (!b) return J(404, { error: "sauvegarde introuvable" });
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "content-disposition": "attachment; filename=\"motipop-sauvegarde-" + tag + ".json\"", "cache-control": "no-store" }); return res.end(JSON.stringify(b)); }
      if (url.pathname === "/admin/sauvegarder" && req.method === "POST") return J(200, await writeBackup(parisDay() + "-" + new Date().toISOString().slice(11, 16).replace(":", "")));
      if (url.pathname === "/admin/restaurer" && req.method === "POST") { const tag = String(url.searchParams.get("date") || ""); if (url.searchParams.get("confirmer") !== "RESTAURER") return J(400, { error: "ajoute confirmer=RESTAURER" }); if (!/^[\w-]{1,40}$/.test(tag)) return J(400, { error: "date ?" });
        const r = await restoreBackup(tag); console.log("Restauration de la sauvegarde " + tag + " : " + r.restored + " clés (état précédent gardé dans " + r.safety + ")"); return J(200, r); }
    } catch (e) { console.error("Admin :", e.message); return J(500, { error: e.message }); }
    return J(404, { error: "inconnu" });
  }
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  // en-têtes de sécurité sur toutes les réponses (audit du 21/11) : pas d'affichage du site dans un cadre d'un autre site,
  // pas de devinette du type de fichier, adresse d'origine discrète, pas d'accès caméra/micro/position, HTTPS imposé en ligne
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (String(req.headers["x-forwarded-proto"] || "").split(",")[0] === "https") res.setHeader("Strict-Transport-Security", "max-age=31536000");
  // nouveau domaine : une fois SITE_URL réglé sur le domaine (ex. https://tuilo.fr), les visites de l'ancienne adresse
  // onrender sont redirigées (301) vers la même page du domaine. Les appels API (POST) et le WebSocket ne sont pas touchés.
  if (OLDHOST_REDIRECT && (req.method === "GET" || req.method === "HEAD") && /\.onrender\.com$/i.test(String(req.headers.host || "").split(":")[0]) && !url.pathname.startsWith("/api/") && url.pathname !== "/healthz") {   // /healthz jamais redirigé : le contrôle de santé de Render doit répondre ici
    // 20/11 : un joueur qui ouvre une page de l'ancienne adresse dans son navigateur garde sa session et ses réglages :
    // une petite page lit son stockage local (pseudo connecté, thème, son, tutoriels vus…) et l'emporte vers le domaine
    // dans le fragment de l'adresse (#motipop-transfert=…, jamais envoyé au serveur). Robots et fichiers : 301 classique.
    const nav = req.method === "GET" && req.headers["sec-fetch-mode"] === "navigate" && /text\/html/.test(req.headers.accept || "") && !/\.[a-z0-9]{2,5}$/i.test(url.pathname);
    if (nav) {
      const to = JSON.stringify(SITE + url.pathname + url.search).replace(/</g, "\\u003c");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" });
      return res.end('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Motipop déménage…</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#121214;color:#ECEDF2;font-family:system-ui,sans-serif">Motipop déménage sur ' + escH(SITE.replace(/^https?:\/\//, "")) + '…<script>(function(){var to=' + to + ',d={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^fl-(me|theme|sound|deco|icons|guest-asked|salon-names|tuto-|cfg-lvl-)/.test(k)){var v=localStorage.getItem(k);if(v&&v.length<4000)d[k]=v}}}catch(e){}var j=JSON.stringify(d);if(j!=="{}")to+="#motipop-transfert="+encodeURIComponent(j);location.replace(to)})()</script></body></html>');
    }
    res.writeHead(301, { location: SITE + url.pathname + url.search, "cache-control": "public, max-age=3600" }); return res.end();
  }
  if (url.pathname.startsWith("/admin/")) return void adminRoute(req, res, url);
  // liens courts à donner dans les vidéos et les bios (22/11) : motipop.fr/tt → accueil, provenance comptée dans /admin/stats
  const SHORT = { "/tt": "tiktok", "/fb": "facebook", "/ig": "instagram", "/yt": "youtube", "/wa": "whatsapp", "/qr": "affiche" };
  if (req.method === "GET" && SHORT[url.pathname]) { res.writeHead(302, { location: "/?ref=" + SHORT[url.pathname], "cache-control": "no-store" }); return res.end(); }
  if (url.pathname === "/healthz" && url.searchParams.get("redis") === "1") {
    const t0 = Date.now();
    return void (REDIS ? redis(["PING"]).then(v => ({ ping: v }), e => ({ ping: "échec", err: e.message })) : Promise.resolve({ ping: "pas de Redis" }))
      .then(o => { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify({ ...o, ms: Date.now() - t0, depuisDemarrage: redisDiag, comptesEnMemoire: players.size })); });
  }
  // /healthz répond 503 si le stockage refuse l'accès : UptimeRobot (qui surveille /healthz) envoie alors une alerte par e-mail
  if (url.pathname === "/healthz" && url.searchParams.get("ip") === "1") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(ipSource(req))); }   // quels en-têtes d'adresse arrivent (sans les valeurs)
  if (url.pathname === "/healthz") { const bad = REDIS && storage.ok === false; res.writeHead(bad ? 503 : 200, { "content-type": "text/plain; charset=utf-8" }); return res.end(bad ? "STOCKAGE KO depuis " + storage.since + " : " + storage.msg : "ok " + salons.size + (REDIS ? " redis" : "")); }
  const am = url.pathname.match(/^\/api\/p\/(create|login|me|pin|logout|rank|mj|en|score|wallet|conv|salons|sjoin|screate|skick|scode|sleave|sdelete|hist|solo|skin)$/);
  if (am) return void api(req, res, am[1]).catch(e => { console.error(e); try { res.writeHead(500); res.end("{}"); } catch {} });
  // culture générale : index léger des questions (identifiant → type), puis seulement les questions de la partie
  if (url.pathname === "/d/cg-index.js") { cgIdx = cgIdx || pack(Buffer.from("window.__CGI=" + JSON.stringify(CAT.cgIndex()) + ";window.__CGT=" + JSON.stringify(CAT.THEMES) + ";")); return sendBody(req, res, cgIdx, STATIC.js, "public, max-age=600"); }
  if (url.pathname === "/api/err" && req.method === "POST") {
    let body = ""; req.on("data", d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on("end", () => { try { statErr(JSON.parse(body || "{}"), clientIp(req)); } catch {} res.writeHead(204); res.end(); });
    return;
  }
  if (url.pathname === "/api/cg/q") {
    const ids = String(url.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 30);
    const qs = ids.map(id => CAT.CGBY[id]).filter(Boolean);
    const raw = Buffer.from(JSON.stringify(qs)), gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600", vary: "Accept-Encoding", ...(gz ? { "content-encoding": "gzip" } : {}) });
    return res.end(gz ? zlib.gzipSync(raw) : raw);
  }
  // images des skins (fichiers binaires, gardées en mémoire après la 1re lecture)
  { const sm = url.pathname.match(/^\/d\/skins\/([a-z0-9-]{3,80})\.(jpg|png|webp)$/); if (sm) return sendSkin(req, res, sm[1] + "." + sm[2], sm[2]); }
  if (url.pathname.startsWith("/d/")) return sendStatic(req, res, url.pathname.slice(3));
  if (url.pathname === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" }); return res.end("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /maquette\nDisallow: /healthz\n\nSitemap: " + SITE + "/sitemap.xml\n"); }
  if (url.pathname === "/sitemap.xml") {
    const day = new Date().toISOString().slice(0, 10);
    res.writeHead(200, { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=86400" });
    return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + SITEMAP_PATHS.map(p => "  <url><loc>" + SITE + p + "</loc><lastmod>" + day + "</lastmod><changefreq>" + "weekly" + "</changefreq><priority>" + (p === "/" ? "1.0" : "0.8") + "</priority></url>").join("\n") + "\n</urlset>\n");
  }
  if (url.pathname === "/maquette" || url.pathname === "/maquette/") return sendPage(req, res, path.join(__dirname, "public", "maquette.html"));
  // Wordflush = le nom du poker (8/11/2026) : /wordflush et /CODE/wordflush mènent à la table
  { const wf = url.pathname.match(/^(\/[A-Za-z0-9]{5})?\/wordflush\/?$/i); if (wf) { res.writeHead(301, { location: (wf[1] || "") + "/poker" + url.search }); return res.end(); } }
  // le mot du jour a été retiré le 8/11/2026 : les anciens liens ramènent à l'accueil
  if (url.pathname === "/mot" || url.pathname === "/mot/") { res.writeHead(301, { location: "/" }); return res.end(); }
  // pages d'information : règles et jetons, informations légales (3 adresses vers la même page, ouverte à la bonne section)
  if (url.pathname === "/regles" || url.pathname === "/regles/") return sendPage(req, res, path.join(__dirname, "public", "regles.html"));
  if (/^\/(?:mentions-legales|confidentialite|conditions|legal)\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "legal.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?rond\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "rd.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?meles\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "mm.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?magnetico\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "mg.html"));
  if (/^\/(?:motdujour|mot-du-jour|defi)\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "md.html"));
  // icône du site (onglet du navigateur)
  // icônes Motipop : onglet (SVG) et écran d'accueil du téléphone (PNG)
  if (url.pathname === "/favicon.ico" || url.pathname === "/favicon.svg") { res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" }); return res.end(FAVICON); }
  // 20/11 : manifeste d'application (Motipop s'installe sur l'écran d'accueil du téléphone, plein écran, sans barre du navigateur)
  if (url.pathname === "/manifest.webmanifest") { res.writeHead(200, { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=3600" }); return res.end(JSON.stringify({ id: "/", name: "Motipop — jeux de mots entre amis", short_name: "Motipop", description: "Mot du jour, mots fléchés, Magnético, Wordflush, culture générale : jeux de mots en solo ou entre amis.", lang: "fr", dir: "ltr", start_url: "/?app=1", scope: "/", display: "standalone", orientation: "portrait", background_color: "#12152e", theme_color: "#12152e", categories: ["games", "education"], icons: [{ src: "/motipop-app-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/motipop-app-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/motipop-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }], shortcuts: [{ name: "Mot du jour", url: "/motdujour", icons: [{ src: "/motipop-app-192.png", sizes: "192x192" }] }] })); }
  if (/^\/motipop-(app-192|app-512|maskable-512)\.png$/.test(url.pathname)) { res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=86400" }); return res.end(fs.readFileSync(path.join(__dirname, "public", "d", url.pathname.slice(1)))); }
  // application installée (et future appli Android) : service worker minimal = écran « hors connexion » aux couleurs de Motipop
  if (url.pathname === "/sw.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "service-worker-allowed": "/" }); return res.end(SW_JS); }
  if (url.pathname === "/hors-ligne") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" }); return res.end(OFFLINE_HTML); }
  // lien entre l'appli Android (TWA) et le site : contenu fourni par PWABuilder/Bubblewrap, collé dans la variable ASSETLINKS_JSON sur Render
  if (url.pathname === "/.well-known/assetlinks.json") { const a = (process.env.ASSETLINKS_JSON || "").trim(); if (!a) { res.writeHead(404, { "content-type": "application/json" }); return res.end("[]"); } res.writeHead(200, { "content-type": "application/json", "cache-control": "public, max-age=3600" }); return res.end(a); }
  if (url.pathname === "/motipop-192.png") { res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=86400" }); return res.end(fs.readFileSync(path.join(__dirname, "public", "d", "motipop-192.png"))); }
  if (url.pathname === "/apple-touch-icon.png" || url.pathname === "/motipop-512.png") { const f = url.pathname === "/motipop-512.png" ? "motipop-512.png" : "motipop-180.png"; res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=86400" }); return res.end(fs.readFileSync(path.join(__dirname, "public", "d", f))); }
  if (/^\/(?:[A-Za-z0-9]{5}\/)?culture\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "cg.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?fleches\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "fl.html"));
  if (/^\/(?:[A-Za-z0-9]{5}\/)?poker\/?$/.test(url.pathname)) return sendPage(req, res, path.join(__dirname, "public", "poker.html"));
  if (url.pathname === "/" || /^\/[A-Za-z0-9]{5}\/?$/.test(url.pathname)) {
    // anciens liens d'invitation vers une partie de mots fléchés : on garde le chemin du jeu
    if (/[?&]join=/.test(url.search) && !/[?&]join=1\b/.test(url.search) && url.pathname !== "/") { res.writeHead(302, { location: url.pathname.replace(/\/$/, "") + "/fleches" + url.search }); return res.end(); }
    return sendPage(req, res, HOME);
  }
  res.writeHead(404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
  res.end(NOTFOUND_HTML);
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: MAX_DOC + 4096 });
// garde-fous (test de charge du 2/11/2026) : connexions par adresse, total, et débit de messages par connexion
const WS_PER_IP = 24, WS_TOTAL = 4000, MSG_RATE = 25, MSG_BURST = 80;
const wsByIp = new Map();
wss.on("connection", (ws, req) => {
  ws.pid = crypto.randomUUID(); ws.isAlive = true; ws.ip = clientIp(req);
  const n = (wsByIp.get(ws.ip) || 0) + 1;
  if (n > WS_PER_IP || wss.clients.size > WS_TOTAL) { if (process.env.WSDBG) console.log("refus connexion", ws.ip, n); try { ws.close(1013, "Trop de connexions"); } catch {} return; }
  wsByIp.set(ws.ip, n); ws.counted = true;
  ws.tok = MSG_BURST; ws.tokAt = Date.now(); ws.drop = 0;
  ws.on("pong", () => (ws.isAlive = true));
  ws.on("message", raw => {
    const now = Date.now(); ws.tok = Math.min(MSG_BURST, ws.tok + (now - ws.tokAt) * MSG_RATE / 1000); ws.tokAt = now;
    if (ws.tok < 1) { if (process.env.WSDBG && !ws.drop) console.log("débit dépassé", ws.ip, ws.user); if (++ws.drop > 400) { try { ws.close(1008, "Trop de messages"); } catch {} } return; }   // rafale : messages ignorés, puis connexion coupée
    ws.tok -= 1; if (ws.drop) ws.drop = Math.max(0, ws.drop - 1);
    if (ws.busy > 200) return;                                       // file d'attente pleine : on n'empile pas sans fin
    let m; try { m = JSON.parse(raw); } catch { return; }
    ws.busy = (ws.busy || 0) + 1;
    ws.q = (ws.q || Promise.resolve()).then(() => handle(ws, m)).catch(e => console.error(e)).finally(() => { ws.busy--; });
  });
  ws.on("close", () => {
    if (ws.counted) { ws.counted = false; const k = (wsByIp.get(ws.ip) || 1) - 1; if (k > 0) wsByIp.set(ws.ip, k); else wsByIp.delete(ws.ip); } poker.gone(ws); const s = ws.room && salons.get(ws.room); if (s) { s.sockets.delete(ws); broadcastPeers(s); if (ws.solo && !s.sockets.size) salons.delete(ws.room); } });
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
// port déjà pris ou autre erreur d'écoute : on s'arrête net (sinon le processus resterait vivant sans servir, à cause du filet uncaughtException)
server.on("error", e => { console.error("Écoute impossible :", e.message); process.exit(1); });
Promise.all([backupReady, resetOnce()]).then(() => server.listen(PORT, () => console.log("Motipop en ligne sur http://localhost:" + PORT + (REDIS ? " (stockage Redis actif)" : ""))));
