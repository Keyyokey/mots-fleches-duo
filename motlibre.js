// Mot du jour — Journalier / Libre (protocole du 26/11/2026, étape 2) et tirage annuel du Défi du jour (étape 1).
// Le mot à deviner ne quitte jamais le serveur avant la fin : la partie voyage dans un jeton chiffré (AES-256-GCM) que le
// navigateur renvoie à chaque essai ; le serveur seul peut le lire. Rien n'est gardé côté serveur pendant la partie
// (un redémarrage ne casse pas une partie en cours si la clé est stable), sauf la trace « points déjà donnés ».
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

module.exports = function makeMotLibre(D) {
  const { redis, REDIS, KEY } = D;
  let data = { pool: {}, valid: [], daily6: {} };
  try { data = JSON.parse(fs.readFileSync(path.join(__dirname, "motlibre_mots.json"), "utf8")); } catch (e) { console.error("Mot libre : dictionnaire illisible :", e.message); }
  const VALID = new Set(data.valid || []);
  const LENS = [3, 4, 5, 6, 7, 8, 9, 10, 12];                 // longueurs proposées (protocole : 3 à 10, puis 12)
  const PROG = LENS;                                          // mode Progressif : un palier de 3 mots par longueur
  const strip = w => String(w || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");

  // ---------- Défi du jour : 370 mots de 6 lettres tirés au sort chaque année (à partir du 1er janvier 2027) ----------
  // Tirage reproductible (graine = année), sans reprendre un mot des années précédentes tant que la réserve n'est pas épuisée.
  const RESERVE = Object.keys(data.daily6 || {}).sort();
  const yearCache = new Map();
  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function yearList(y, exclude0) {
    if (yearCache.has(y)) return yearCache.get(y);
    const used = new Set(exclude0 || []);
    for (let k = 2027; k < y; k++) yearList(k, exclude0).forEach(w => used.add(w));
    let left = RESERVE.filter(w => !used.has(w)); if (left.length < 370) left = RESERVE.filter(w => !(exclude0 || []).includes(w));   // réserve épuisée : nouveau cycle
    const r = seeded(y * 7919 + 13); const a = left.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const out = a.slice(0, 370); yearCache.set(y, out); return out;
  }
  // le jour (AAAAMMJJ) → mot du Défi, ou null avant 2027 (l'ancienne liste continue jusqu'au 31/12/2026)
  let OLD2026 = [];                                         // mots de l'ancienne liste encore à venir en 2026 (fournis par le serveur)
  function dailyWord(day) {
    const y = +day.slice(0, 4); if (y < 2027 || !RESERVE.length) return null;
    const doy = Math.round((Date.UTC(y, +day.slice(4, 6) - 1, +day.slice(6, 8)) - Date.UTC(y, 0, 1)) / 864e5);
    return yearList(y, OLD2026)[doy] || null;
  }
  const dailyDef = w => (data.daily6 || {})[w] || "";
  // mots à ne jamais proposer ailleurs (entraînement, direct) : Défis de l'année en cours et de la suivante, fin de l'ancienne liste
  function reserved(day) { const y = +day.slice(0, 4), s = new Set(OLD2026); [y, y + 1].forEach(k => { if (k >= 2027) yearList(k, OLD2026).forEach(w => s.add(w)); }); return s; }

  // ---------- réserves du mode Journalier ----------
  let POOL = null, poolDay = "";
  function pools(day) {
    if (POOL && poolDay === day.slice(0, 4)) return POOL;
    const res = reserved(day); POOL = {};
    for (const L of LENS) { const p = (data.pool || {})[String(L)] || { n: [], d: [] }; POOL[L] = { n: p.n.filter(w => !res.has(w)), d: p.d.filter(w => !res.has(w)) }; }
    poolDay = day.slice(0, 4); return POOL;
  }
  // tirage vraiment aléatoire (crypto) ; jamais deux mots voisins dans le dictionnaire (au moins 10 places d'écart avec les 40 derniers mots)
  function draw(list, recent) {
    if (!list.length) return -1; const near = i => (recent || []).some(r => Math.abs(r - i) < 10);
    for (let k = 0; k < 60; k++) { const i = crypto.randomInt(list.length); if (!near(i)) return i; }
    return crypto.randomInt(list.length);
  }
  // ---------- jeton chiffré ----------
  const key = crypto.createHash("sha256").update("motlibre:" + (KEY || crypto.randomBytes(16).toString("hex"))).digest();
  function seal(o) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key, iv); const b = Buffer.concat([c.update(JSON.stringify(o), "utf8"), c.final()]); return Buffer.concat([iv, c.getAuthTag(), b]).toString("base64url"); }
  function open(t) { try { const b = Buffer.from(String(t || ""), "base64url"); if (b.length < 30) return null; const d = crypto.createDecipheriv("aes-256-gcm", key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")); } catch (e) { return null; } }
  function colors(g, w) {
    const r = Array(w.length).fill(0), left = {};
    for (let i = 0; i < w.length; i++) if (g[i] === w[i]) r[i] = 2; else left[w[i]] = (left[w[i]] || 0) + 1;
    for (let i = 0; i < w.length; i++) if (r[i] !== 2 && left[g[i]]) { r[i] = 1; left[g[i]]--; }
    return r;
  }
  const TRIES = 6, DAY_CAP = 150;
  // barème : mot trouvé = longueur + 2 par essai non utilisé ; +5 pour le 3e mot (difficile) d'un palier ; +3 si trouvé avant la fin du chrono
  const points = s => s.ok ? s.L + 2 * (TRIES - s.t.length) + (s.h ? 5 : 0) + (s.ch ? 3 : 0) : 0;
  const view = s => ({ len: s.L, first: s.w[0], mode: s.m, step: s.s, hard: !!s.h, chrono: s.ch || 0, t0: s.t0, tries: s.t.map(g => ({ g, c: colors(g, s.w) })), done: !!s.done, ok: !!s.ok, ...(s.done ? { word: s.w } : {}) });

  // op new / essai / fin — `who` : pseudo connecté (points) ou null (invité : pas de points)
  async function api(b, who, day, award) {
    const P = pools(day);
    if (b.op === "new") {
      const m = b.mode === "prog" ? "prog" : "libre"; let L, s = 0, h = 0;
      if (m === "prog") { s = Math.max(0, Math.min(PROG.length * 3 - 1, Number(b.step) || 0)); L = PROG[Math.floor(s / 3)]; h = s % 3 === 2 ? 1 : 0; }
      else { L = LENS.includes(Number(b.len)) ? Number(b.len) : 6; }
      const list = h ? P[L].d : P[L].n; const recent = Array.isArray(b.rec) ? b.rec.slice(-40).map(Number).filter(Number.isFinite) : [];
      const i = draw(list, recent); if (i < 0) return [503, { error: "vide", msg: "Pas de mot disponible pour cette longueur." }];
      const ch = [2, 3, 4, 5].includes(Number(b.chrono)) ? Number(b.chrono) : 0;
      const st = { id: crypto.randomBytes(8).toString("hex"), w: list[i], L, m, s, h, ch, t: [], t0: Date.now(), u: who || "" };
      return [200, { tok: seal(st), i, ...view(st) }];
    }
    const st = open(b.tok); if (!st || !st.w) return [400, { error: "jeton", msg: "Partie introuvable : relance un mot." }];
    if (st.u && st.u !== (who || "")) return [403, { error: "joueur", msg: "Cette partie appartient à un autre joueur." }];
    const late = () => st.ch && Date.now() > st.t0 + st.ch * 60e3 + 1500;
    if (b.op === "essai" && !st.done) {
      if (late()) { st.done = 1; st.late = 1; }
      else {
        const g = strip(b.g);
        if (g.length !== st.L) return [200, { refus: "Le mot fait " + st.L + " lettres." }];
        if (g[0] !== st.w[0]) return [200, { refus: "Le mot commence par " + st.w[0] + "." }];
        if (!VALID.has(g)) return [200, { refus: "« " + g + " » n'est pas dans le dictionnaire." }];
        if (st.t.includes(g)) return [200, { refus: "Mot déjà essayé." }];
        st.t.push(g); if (g === st.w) { st.ok = 1; st.done = 1; st.ms = Date.now() - st.t0; } else if (st.t.length >= TRIES) st.done = 1;
      }
    } else if (b.op === "fin") { st.done = 1; }                 // abandon (ou chrono écoulé côté joueur) : le mot est montré
    let pts = 0, gained = 0;
    if (st.done && st.ok && who) { pts = points(st); gained = await award(st.id, pts); }
    return [200, { tok: seal(st), ...view(st), late: !!st.late, pts, gained, cap: DAY_CAP }];
  }
  return { peek: t => open(t), api, dailyWord, dailyDef, reserved, setOld: l => { OLD2026 = l; yearCache.clear(); POOL = null; }, LENS, PROG, DAY_CAP, sizes: () => Object.fromEntries(LENS.map(L => [L, (data.pool[String(L)] || { n: [] }).n.length])), valid: VALID };
};
