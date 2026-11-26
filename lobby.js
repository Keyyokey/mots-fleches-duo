// Multijoueur « hors salon » (26/11/2026) : joueurs en ligne, partie rapide, invitation directe, lien d'invitation, défi différé.
// Une partie trouvée ici se joue dans une TABLE : un salon temporaire (temp:1) que personne n'a à créer ni à rejoindre avec un code.
// La table réutilise tout le multijoueur des salons (tirage, lancement, tours, scores) ; elle n'apparaît pas dans « Mes salons »
// et disparaît d'elle-même (48 h dans Redis, 6 h en mémoire après la dernière connexion).
// Messages WebSocket (sans salon) : lob (présence), lobq / lobx (file de partie rapide), lobinv / lobans (invitation directe), loblink (lien).
const crypto = require("crypto");
module.exports = function makeLobby(D) {
  const { send, getPlayer, tokOk, normPseudo, PSEUDO_RE, accs, getAcc, saveAcc, redis, REDIS, CAT } = D;
  const ID_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", K_CH = "abcdefghijkmnpqrstuvwxyz23456789";
  const rnd = (n, ch) => [...crypto.randomBytes(n)].map(x => ch[x % ch.length]).join("");
  const GAMES = { fleches: "mots fléchés", magnetico: "Magnético", rond: "Tourniquet", meles: "mots mêlés", culture: "culture générale", poker: "Wordflush", sudoku: "Sudoku", accueil: "l'accueil" };
  const LVLS = ["facile", "normal", "moyen", "difficile"];   // « moyen » : nom du niveau Normal au Tourniquet
  const socks = new Set();                    // connexions présentes dans le salon d'attente (une page de jeu ouverte)
  const queue = [];                           // partie rapide : { ws, u, game, lvl, at }
  const invites = new Map();                  // k -> { fromU, to, game, lvl, at } : la boîte d'invitations (10 min, gardée même si l'expéditeur change de page)
  const INV_TTL = 10 * 60e3;
  const GAME_OK = g => g !== "accueil" && !!GAMES[g];
  function cleanInv() { const now = Date.now(); let ch = false; for (const [k, v] of invites) if (now - v.at > INV_TTL) { invites.delete(k); ch = true; toUser(v.to, { t: "lobinvx", k }); } if (ch) saveInv(); }
  // 26/11 : les invitations sont gardées dans Redis (un redémarrage du serveur ne les efface plus)
  let invT = null;
  function saveInv() { if (!REDIS || invT) return; invT = setTimeout(() => { invT = null; redis(["SET", "lob:inv", JSON.stringify([...invites.entries()]), "EX", "900"]).catch(() => {}); }, 300); }
  if (REDIS) redis(["GET", "lob:inv"]).then(v => { if (!v) return; const now = Date.now(); for (const [k, x] of JSON.parse(v)) if (x && now - x.at < INV_TTL && !invites.has(k)) invites.set(k, x); }).catch(() => {});
  // Boîte des salons (26/11) : demandes d'entrée (pour le responsable) et réponses (pour le demandeur), gardées 30 jours (Redis bx:PSEUDO)
  const boxes = new Map();                    // pseudo -> [{ k, kind: "dem"|"rep", salon, sname, from, ok, at }]
  const BOX_TTL = 30 * 864e5, BOX_MAX = 40;
  async function boxGet(u) {
    if (boxes.has(u)) return boxes.get(u);
    let l = []; if (REDIS) { try { const v = await redis(["GET", "bx:" + u]); if (v) l = JSON.parse(v); } catch (e) { return []; } }
    const now = Date.now(); l = (Array.isArray(l) ? l : []).filter(x => x && now - x.at < BOX_TTL);
    if (!boxes.has(u)) boxes.set(u, l); return boxes.get(u);
  }
  function boxSave(u) { const l = boxes.get(u) || []; if (REDIS) (l.length ? redis(["SET", "bx:" + u, JSON.stringify(l), "EX", String(BOX_TTL / 1000)]) : redis(["DEL", "bx:" + u])).catch(() => {}); }
  async function boxAdd(u, m) { const l = await boxGet(u); const x = { k: rnd(10, K_CH), at: Date.now(), ...m }; l.unshift(x); l.length = Math.min(l.length, BOX_MAX); boxSave(u); toUser(u, { t: "boxmsg", m: x }); return x; }
  async function boxDel(u, test) { const l = await boxGet(u); const gone = l.filter(test); if (!gone.length) return; boxes.set(u, l.filter(x => !test(x))); boxSave(u); gone.forEach(x => toUser(u, { t: "lobinvx", k: x.k })); }
  const inboxOf = u => [...invites.entries()].filter(([, v]) => v.to === u).map(([k, v]) => ({ k, kind: "inv", from: v.fromU, game: v.game, gname: GAMES[v.game], lvl: v.lvl, at: v.at }));
  const TABLE_NAME = { fleches: "Partie de mots fléchés", poker: "Partie de Wordflush", sudoku: "Partie de Sudoku" };

  // ---------- tables (salons temporaires) ----------
  async function newTable(game, members, owner) {
    for (let i = 0; i < 30; i++) {
      const id = rnd(5, ID_CH);
      if (accs.has(id)) continue;
      if (REDIS) { const ok = await redis(["SET", "sa:" + id, JSON.stringify({ id, temp: 1 }), "NX", "EX", "172800"]); if (ok !== "OK") continue; }
      const now = Date.now(); const m = { id, temp: 1, game, name: TABLE_NAME[game] || "Partie à plusieurs", code: null, owner, members: {}, k: rnd(8, K_CH), c: now };
      for (const u of members) m.members[u] = { t: now, o: now };
      saveAcc(m); return m;
    }
    throw new Error("table");
  }
  // une table oubliée est retirée de la mémoire (Redis l'efface seul au bout de 48 h)
  function prune(salons) { const now = Date.now();
    for (const [id, a] of accs) if (a.temp && now - Math.max(a.c || 0, ...Object.values(a.members || {}).map(x => x.o || 0)) > 6 * 3600e3) { const s = salons.get(id); if (!s || !s.sockets.size) { accs.delete(id); if (s) salons.delete(id); } } }

  // ---------- présence ----------
  function online() {
    const by = new Map();
    for (const w of socks) { if (!w.lob || !w.lob.u) continue; const o = by.get(w.lob.u) || { name: w.lob.u, games: new Set(), busy: false, wait: false };
      o.games.add(w.lob.game); if (w.lob.busy) o.busy = true; if (queue.some(q => q.ws === w)) o.wait = true; by.set(w.lob.u, o); }
    return [...by.values()].map(o => ({ name: o.name, game: [...o.games][0], busy: o.busy, wait: o.wait })).sort((a, b) => a.name.localeCompare(b.name));
  }
  let bt = null;
  function pushOnline() { if (bt) return; bt = setTimeout(() => { bt = null; const list = online(); const guests = [...socks].filter(w => w.lob && !w.lob.u).length;
    for (const w of socks) send(w, { t: "online", list, guests, me: w.lob && w.lob.u || null }); }, 400); }
  function gone(ws) { if (!socks.has(ws) && !queue.some(q => q.ws === ws)) return; socks.delete(ws); for (let i = queue.length - 1; i >= 0; i--) if (queue[i].ws === ws) queue.splice(i, 1);
    pushOnline(); }
  const sockOf = u => [...socks].filter(w => w.lob && w.lob.u === u && w.readyState === 1);
  const toUser = (u, o) => sockOf(u).forEach(w => send(w, o));

  async function go(game, lvl, host, guest, hostWs, guestWs) {
    let t; try { t = await newTable(game, [host, guest], host); } catch (e) { [hostWs, guestWs].forEach(w => w && send(w, { t: "lobfail", msg: "Impossible de créer la table. Réessaie." })); return; }
    const o = { t: "lobgo", id: t.id, game, lvl };
    (hostWs ? [hostWs] : sockOf(host)).forEach(w => send(w, { ...o, host: 1, opp: guest }));
    (guestWs ? [guestWs] : sockOf(guest)).forEach(w => send(w, { ...o, host: 0, opp: host }));
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].u === host || queue[i].u === guest) queue.splice(i, 1);
    pushOnline();
  }

  // renvoie true si le message était pour le salon d'attente
  async function handle(ws, m) {
    if (m.t === "lob") {
      const game = GAMES[m.game] ? m.game : "fleches"; const nm = normPseudo(m.name); let u = null;
      if (PSEUDO_RE.test(nm)) { try { const p = await getPlayer(nm); if (tokOk(p, m.token)) u = nm; } catch (e) {} }
      ws.lob = { u, game, busy: !!m.busy }; socks.add(ws); send(ws, { t: "lob", me: u }); pushOnline();
      if (u) { cleanInv(); const bx = await boxGet(u); send(ws, { t: "inbox", list: inboxOf(u).concat(bx) }); }   // invitations reçues encore valables
      return true;
    }
    if (!/^lob/.test(m.t)) return false;
    if (!ws.lob) return true;
    const u = ws.lob.u, game = ws.lob.game;
    if (m.t === "lobboxx") { if (u) { const k = String(m.k || ""); await boxDel(u, x => x.k === k && x.kind === "rep"); } return true; }
    if (m.t === "lobbusy") { ws.lob.busy = !!m.busy; pushOnline(); return true; }
    if (!u) { send(ws, { t: "lobfail", need: "pseudo", msg: "Il te faut un pseudo pour jouer avec d'autres joueurs." }); return true; }
    if (m.t === "lobq") {
      if (!GAME_OK(game)) return true;                     // partie rapide : le premier joueur en attente sur ce jeu est pris (même niveau de préférence)
      const lvl = LVLS.includes(m.lvl) ? m.lvl : "facile";
      for (let i = queue.length - 1; i >= 0; i--) if (queue[i].ws === ws || queue[i].ws.readyState !== 1) queue.splice(i, 1);
      const cand = queue.filter(q => q.game === game && q.u !== u); const q = cand.find(x => x.lvl === lvl) || cand[0];
      if (q) { await go(game, q.lvl, q.u, u, q.ws, ws); return true; }
      queue.push({ ws, u, game, lvl, at: Date.now() }); send(ws, { t: "lobq", wait: 1, lvl }); pushOnline(); return true;
    }
    if (m.t === "lobx") { for (let i = queue.length - 1; i >= 0; i--) if (queue[i].ws === ws) queue.splice(i, 1); pushOnline(); return true; }
    if (m.t === "lobinv") {                   // invitation d'un joueur en ligne
      const to = normPseudo(m.to); const lvl = LVLS.includes(m.lvl) ? m.lvl : "facile";
      if (!PSEUDO_RE.test(to) || to === u || !sockOf(to).length) { send(ws, { t: "lobfail", msg: "Ce joueur n'est plus en ligne." }); return true; }
      if (!GAME_OK(game)) return true;
      const now = Date.now(); cleanInv();
      for (const [k, v] of invites) if (v.fromU === u && v.to === to) { invites.delete(k); saveInv(); toUser(to, { t: "lobinvx", k }); }   // une seule invitation à la fois pour la même personne
      if ([...invites.values()].filter(v => v.fromU === u).length >= 5) { send(ws, { t: "lobfail", msg: "Attends une réponse avant d'inviter d'autres joueurs." }); return true; }
      const k = rnd(10, K_CH); invites.set(k, { fromU: u, to, game, lvl, at: now }); saveInv();
      toUser(to, { t: "lobinv", k, from: u, game, gname: GAMES[game], lvl, at: now });
      send(ws, { t: "lobsent", k, to }); return true;
    }
    if (m.t === "lobans") {
      const v = invites.get(String(m.k || "")); if (!v || v.to !== u) { send(ws, { t: "lobfail", msg: "Cette invitation n'est plus valable." }); return true; }
      invites.delete(m.k); saveInv(); sockOf(u).forEach(w => w !== ws && send(w, { t: "lobinvx", k: m.k }));
      if (!m.ok) { toUser(v.fromU, { t: "lobno", by: u }); return true; }
      // l'expéditeur a pu changer de page : on prend une de ses pages ouvertes qui n'est pas en pleine partie
      const fw = sockOf(v.fromU); const host = fw.find(w => !w.lob.busy);
      if (!fw.length) { send(ws, { t: "lobfail", msg: v.fromU + " n'est plus en ligne." }); return true; }
      if (!host) { send(ws, { t: "lobfail", msg: v.fromU + " est en pleine partie. Réessaie dans un moment." }); return true; }
      await go(v.game, v.lvl, v.fromU, u, host, ws); return true;
    }
    if (m.t === "loblink") {                  // lien d'invitation : une table avec une place, ouverte à qui a le lien
      try { const t = await newTable(game, [u], u); send(ws, { t: "loblink", id: t.id, k: t.k, game }); } catch (e) { send(ws, { t: "lobfail", msg: "Impossible de créer le lien. Réessaie." }); }
      return true;
    }
    return true;
  }
  // rejoindre une table par son lien : la place est ajoutée si la clé est bonne (4 joueurs au plus)
  function admit(acc, nm, k) {
    if (!acc || !acc.temp || acc.members[nm] || !k || k !== acc.k || Object.keys(acc.members).length >= 4) return false;
    acc.members[nm] = { t: Date.now(), o: Date.now() }; return true;
  }

  // ---------- défi différé : une grille, des scores comparés (chacun joue quand il veut) ----------
  // Redis dz:ID = { id, game, ref, level, by, c, res:[{n, s, t, at}] }   (30 jours)
  const duels = new Map();
  async function duelGet(id) { if (!/^[a-z2-9]{7}$/.test(id)) return null; if (duels.has(id)) return duels.get(id);
    if (!REDIS) return null; const v = await redis(["GET", "dz:" + id]); if (!v) return null; const o = JSON.parse(v); duels.set(id, o); return o; }
  function duelSave(o) { duels.set(o.id, o); if (duels.size > 2000) duels.delete(duels.keys().next().value); if (REDIS) redis(["SET", "dz:" + o.id, JSON.stringify(o), "EX", "2592000"]).catch(e => console.error("Écriture Redis (défi) :", e.message)); }
  async function who(b) { const nm = normPseudo(b.name); if (!PSEUDO_RE.test(nm)) return null; try { const p = await getPlayer(nm); return tokOk(p, b.token) ? nm : null; } catch (e) { return null; } }
  const cleanRes = (b, n) => ({ n, s: Math.max(-999, Math.min(9999, Math.round(Number(b.score) || 0))), t: Math.max(0, Math.min(36e5, Math.round(Number(b.secs) || 0))), at: Date.now() });
  async function duelApi(route, b, id) {
    if (route === "new") {
      const game = GAMES[b.game] ? b.game : null; const level = LVLS.includes(b.level) ? b.level : null; const ref = String(b.ref || "");
      const refOk = game === "magnetico" ? /^\d{1,10}\|[A-Za-z0-9,]{1,300}$/.test(ref) : game === "culture" ? ref.length < 600 && ref.split(",").length <= 15 && ref.split(",").every(x => CAT.CGBY[x]) : !!CAT.cid(game, ref);   // culture : liste des questions   // Magnético : graine + liste des mots
      if (!game || !level || !refOk) return [400, { error: "partie" }];
      const n = (await who(b)) || "Un ami"; let nid; for (let i = 0; i < 10; i++) { nid = rnd(7, K_CH); if (!(await duelGet(nid).catch(() => null))) break; }
      const o = { id: nid, game, ref, level, by: n, c: Date.now(), res: [] }; if (b.score != null) o.res.push(cleanRes(b, n)); duelSave(o);
      return [200, { ok: true, id: nid }];
    }
    let o; try { o = await duelGet(id); } catch (e) { return [503, { error: "stockage" }]; }
    if (!o) return [404, { error: "introuvable" }];
    if (route === "get") return [200, { ok: true, duel: o }];
    if (route === "res") {
      const u = await who(b); const n = u || String(b.guest || "").replace(/[^A-Za-zÀ-ÿ0-9 '-]/g, "").trim().slice(0, 14) || "Invité";
      if (o.res.length >= 30) return [200, { ok: true, duel: o }];
      if (u && o.res.some(r => r.n === u)) return [200, { ok: true, duel: o, again: 1 }];   // un compte n'a qu'un score par défi
      o.res.push(cleanRes(b, n)); duelSave(o); return [200, { ok: true, duel: o }];
    }
    return [404, { error: "route" }];
  }
  function stats() { return { presents: socks.size, comptes: [...socks].filter(w => w.lob && w.lob.u).length, file: queue.length, invitations: invites.size, boites: boxes.size, tables: [...accs.values()].filter(a => a.temp).length }; }
  return { handle, gone, admit, prune, duelApi, duelGet, online, stats, GAMES, boxAdd, boxDel, boxGet };
};
