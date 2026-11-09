// Poker Lettres — moteur côté serveur (le serveur seul connaît le paquet et les lettres cachées)
"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PV = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:10,L:1,M:2,N:1,O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:10,X:10,Y:10,Z:10 };
const DECK = { E:6,A:4,I:4,S:4,N:3,R:3,T:3,U:3,O:3,L:2,C:2,D:2,M:2,P:2,B:1,G:1,F:1,H:1,V:1,J:1,Q:1,X:1,Z:1,K:1,W:1,Y:1 };
const WORD_TIME = 45, MAX_SEATS = 6;
// Barème V2 (cahier des charges Poker Lettres V2, 7/11/2026) : valeur des lettres + bonus de longueur + bonus « Main Pleine »
const LEN_BONUS = { 2: 0, 3: 3, 4: 6, 5: 10, 6: 15, 7: 22 }, FULL_HAND = 5;
const BAREME = "V2 · 7/11/2026";
let DICT = new Set(), WORDS = [];
try { WORDS = fs.readFileSync(path.join(__dirname, "poker_mots.txt"), "utf8").split("\n").map(w => w.trim()).filter(w => /^[A-Z]{2,7}$/.test(w)); DICT = new Set(WORDS); } catch (e) { console.error("Dictionnaire du poker absent :", e.message); }
const DICT_VERSION = "Dictionnaire 2026-11 · " + WORDS.length.toLocaleString("fr-FR") + " mots de 2 à 7 lettres, sans accent (pluriels et formes conjuguées compris)";

const rnd = n => crypto.randomInt(n);
function shuffle() {           // Fisher-Yates avec un générateur cryptographique
  const a = []; for (const [l, n] of Object.entries(DECK)) for (let i = 0; i < n; i++) a.push(l);
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const count = arr => { const m = {}; for (const c of arr) m[c] = (m[c] || 0) + 1; return m; };
const fits = (wc, have) => { for (const c in wc) if ((have[c] || 0) < wc[c]) return false; return true; };
const norm = w => String(w || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
// lettres privées utilisables au maximum : quand une lettre est à la fois dans la main et sur la table, on la prend dans la main (bonus le plus favorable)
const privUsed = (wc, hc) => { let n = 0; for (const c in wc) n += Math.min(wc[c], hc[c] || 0); return n; };
// évaluation normalisée : tous les champs sont toujours présents, même pour un mot refusé
function evaluateWord(w, hand, board) {
  const word = norm(w).slice(0, 12), r = { valid: false, reason: "", word, length: word.length, base_points: 0, length_bonus: 0, full_hand_bonus: 0, private_used_count: 0, total_score: 0 };
  if (word.length < 2) { r.reason = "trop court (2 lettres minimum)"; return r; }
  if (word.length > 7) { r.reason = "trop long (7 lettres maximum)"; return r; }
  if (!DICT.has(word)) { r.reason = "mot absent du dictionnaire"; return r; }
  const wc = count(word), hc = count(hand || []);
  if (!fits(wc, count((hand || []).concat(board || [])))) { r.reason = "lettre indisponible"; return r; }
  r.private_used_count = privUsed(wc, hc);
  if (r.private_used_count < 1) { r.reason = "aucune de tes lettres cachées"; return r; }
  r.valid = true; r.base_points = [...word].reduce((t, c) => t + (PV[c] || 0), 0); r.length_bonus = LEN_BONUS[word.length] || 0;
  r.full_hand_bonus = (hand || []).length === 2 && r.private_used_count >= 2 ? FULL_HAND : 0;
  r.total_score = r.base_points + r.length_bonus + r.full_hand_bonus; return r;
}
// ancien format, utilisé par l'abattage et le robot
function checkWord(w, hand, board) { const e = evaluateWord(w, hand, board); return e.valid ? { ok: true, pts: e.total_score, len: e.length, eval: e } : { ok: false, why: e.reason, eval: e }; }
const better = (a, b) => !b || a.pts > b.pts || (a.pts === b.pts && a.w.length > b.w.length) || (a.pts === b.pts && a.w.length === b.w.length && a.w < b.w);
let WC = null;
// tous les mots jouables avec cette main, notés selon le barème V2
function allWords(hand, board) {
  if (!WC) WC = WORDS.map(w => [w, count(w)]);
  const have = count(hand.concat(board)), hc = count(hand), out = [];
  for (const [w, wc] of WC) { if (!fits(wc, have)) continue; const pu = privUsed(wc, hc); if (pu < 1) continue;
    let b = 0; for (const c of w) b += PV[c] || 0; out.push({ w, pts: b + (LEN_BONUS[w.length] || 0) + (hand.length === 2 && pu >= 2 ? FULL_HAND : 0) }); }
  return out;
}
// Mot Max : recherche exhaustive (aucun arrêt sur un seuil arbitraire), départage par la longueur puis l'ordre alphabétique
function bestWord(hand, board, limit) {
  if (limit) { if (!WC) WC = WORDS.map(w => [w, count(w)]); const have = count(hand.concat(board)), hc = count(hand); for (const [w, wc] of WC) if (fits(wc, have) && privUsed(wc, hc) >= 1) return { w, pts: 1 }; return null; }
  let best = null; for (const x of allWords(hand, board)) if (better(x, best)) best = x; return best;
}
// Force de la main pendant les mises : le meilleur score que permettent tes 2 lettres et les lettres déjà retournées,
// comparé à 24 mains de 2 lettres tirées parmi les lettres encore invisibles pour toi (même table). Le mot lui-même n'est jamais donné.
function handForce(hand, board, unseen) {
  const mine = allWords(hand, board), best = mine.length ? Math.max(...mine.map(x => x.pts)) : 0;
  const pool = []; for (const c in unseen) for (let k = 0; k < unseen[c]; k++) pool.push(c);
  let beat = 0, tie = 0; const N = 24;
  for (let i = 0; i < N && pool.length > 1; i++) {
    const a = rnd(pool.length); let b = rnd(pool.length - 1); if (b >= a) b++;
    const o = allWords([pool[a], pool[b]], board), ob = o.length ? Math.max(...o.map(x => x.pts)) : 0;
    if (best > ob) beat++; else if (best === ob) tie++;
  }
  const pct = Math.round(100 * (beat + tie / 2) / N);
  return { best, words: mine.length, pct, level: !mine.length ? 0 : pct < 35 ? 1 : pct < 60 ? 2 : pct < 82 ? 3 : 4 };
}
// le robot Léo : débutant = mots courants courts, intermédiaire = parmi ses 10 meilleurs, confirmé = son Mot Max
function botWord(hand, board, lvl) {
  let all = allWords(hand, board); if (!all.length) return null;
  all.sort((a, b) => b.pts - a.pts || b.w.length - a.w.length);
  if (lvl === "confirme") return all[0];
  if (lvl === "debutant") { const s = all.filter(x => x.w.length >= 3 && x.w.length <= 5); all = s.length ? s : all; return all[Math.min(all.length - 1, 5 + rnd(Math.min(all.length, 40)))] || all[all.length - 1]; }
  return all[Math.min(all.length - 1, rnd(Math.min(all.length, 10)))];
}

const tables = new Map();            // salle -> table
function table(room) { return tables.get(room); }

function newTable(room, opts) {
  const buy = [10, 20, 50].includes(+opts.mise) ? +opts.mise : 20;
  const t = { room, seats: [], started: false, hand: 0, maxHands: opts.fmt === "last" ? 0 : 10, buy, ante: Math.max(1, Math.round(buy / 10)),
    dec: [20, 30, 45].includes(+opts.dec) ? +opts.dec : 30, solo: !!opts.solo, carry: 0, bank: 0, phase: "attente", log: [], timer: null, deadline: 0,
    botLvl: ["debutant", "inter", "confirme"].includes(opts.lvl) ? opts.lvl : "inter", minInc: 0, jp: 0 };
  const old = tables.get(room); if (old) { clearTimeout(old.timer); old.dead = true; }   // l'ancienne table ne doit plus rien déclencher
  tables.set(room, t); return t;
}

module.exports = function (hooks) {
  // cagnotte progressive : par salon, conservée entre les parties (hooks.jackpot) ; table solo : propre à la partie
  const shared = t => !!hooks.jackpot && !String(t.room).startsWith("~");   // vrai salon (la table privée « ~… » garde sa cagnotte pour la partie)
  const jpGet = t => shared(t) ? (hooks.jackpot.get(t.room) || 0) : (t.jp || 0);
  const jpAdd = (t, n) => { n = Math.round(n); if (!n) return; if (shared(t)) hooks.jackpot.add(t.room, n); else t.jp = Math.max(0, (t.jp || 0) + n); };
  // hooks : send(ws,o), wallet(name) -> {coins}, pay(name, delta, betAmount), points(name, pts)
  const sockSeat = new WeakMap();

  function publicState(t, seatIdx) {
    const me = t.seats[seatIdx];
    const show = t.phase === "abattage" || t.phase === "fin";
    return {
      room: t.room, started: t.started, phase: t.phase, hand: t.hand, maxHands: t.maxHands, buy: t.buy, ante: t.ante, dec: t.dec, solo: t.solo,
      pot: t.pot || 0, carry: 0, dealEnd: t.dealEnd || 0, bank: 0, jackpot: jpGet(t), minInc: t.minInc || t.ante * 2, botLvl: t.botLvl, bareme: BAREME, dict: DICT_VERSION, bet: t.bet || 0, turn: t.turn, deadline: t.deadline, now: Date.now(), commit: t.commit || "", reveal: t.phase === "abattage" || t.phase === "fin" ? t.revealDeck || "" : "",
      board: (t.board || []).map((c, i) => i < (t.shown || 0) ? c : null), shown: t.shown || 0,
      deckLeft: me ? leftFor(t, me) : null,
      force: me && me.hand && !me.folded && !me.bot && t.phase === "mise" ? forceOf(t, me) : null,
      seats: t.seats.map((s, i) => ({ name: s.name, bot: !!s.bot, stack: s.stack, inPot: s.inPot || 0, roundBet: s.roundBet || 0, folded: !!s.folded, allin: !!s.allin, out: !!s.out, here: s.bot || !!s.ws, gone: !!s.gone,
        acted: !!s.acted, wordDone: !!s.word, wordLen: s.word && s.word !== "-" ? s.word.length : 0, last: s.last || "", hand: i === seatIdx ? s.hand : (show && !s.folded && s.hand ? s.hand : null), result: show ? s.result || null : null })),
      me: seatIdx, results: t.results || null, msg: t.msg || "", jackpotWon: t.jpWon || null,
      // Mot Max : seulement pour sa propre main, après la résolution (aucune fuite d'information pendant le coup)
      mymax: show && me && me.max ? me.max : null
    };
  }
  function forceOf(t, s) { const k = t.hand + ":" + (t.shown || 0); if (s.forceK !== k) { s.forceK = k; s.force = handForce(s.hand, (t.board || []).slice(0, t.shown || 0), leftFor(t, s)); } return s.force; }
  function leftFor(t, s) { const seen = (t.board || []).slice(0, t.shown || 0).concat(s.hand || []); const m = { ...DECK }; for (const c of seen) m[c]--; return m; }
  function broadcast(t) {
    t.seats.forEach((s, i) => { if (s.ws) hooks.send(s.ws, { t: "pkst", st: publicState(t, i) }); });
    const seated = new Set(t.seats.map(s => s.ws).filter(Boolean));
    (t.watchers || new Set()).forEach(ws => { if (!seated.has(ws)) hooks.send(ws, { t: "pkst", st: publicState(t, -1) }); });
  }
  // une table remplacée ou terminée ne déclenche plus aucune action différée
  const live = t => !t.dead && tables.get(t.room) === t;
  const later = (t, ms, fn) => setTimeout(() => { if (live(t)) fn(); }, ms);
  function setTimer(t, sec, fn) { clearTimeout(t.timer); t.deadline = Date.now() + sec * 1000; t.timer = later(t, sec * 1000, fn); }
  const active = t => t.seats.filter(s => !s.folded && !s.out);
  const canAct = t => t.seats.filter(s => !s.folded && !s.out && !s.allin);

  function startHand(t) {
    t.hand++; t.results = null; t.msg = ""; t.pot = 0; t.carry = 0; t.bet = 0; t.jpWon = null;
    t.seats.forEach(s => { s.folded = !!(s.out || s.gone); s.allin = false; s.inPot = 0; s.roundBet = 0; s.word = null; s.result = null; s.acted = false; s.last = ""; s.hand = null; s.max = null; });
    if (active(t).length < 2) return endGame(t, "Il faut au moins deux joueurs.");
    // donne vérifiée : au moins un joueur doit pouvoir former un mot valide
    let deck, tries = 0;
    do { deck = shuffle(); tries++;
      let k = 0; t.seats.forEach(s => { s.hand = s.folded ? null : [deck[k++], deck[k++]]; });
      t.board = deck.slice(k, k + 5); t.rest = deck.slice(k + 5);
    } while (tries < 60 && !active(t).some(s => bestWord(s.hand, t.board, 1)));
    const salt = crypto.randomBytes(8).toString("hex");
    t.revealDeck = t.seats.map(s => (s.hand || []).join("")).join("|") + "|" + t.board.join("") + "|" + salt;
    t.commit = crypto.createHash("sha256").update(t.revealDeck).digest("hex").slice(0, 16);
    for (const s of active(t)) { const a = Math.min(t.ante, s.stack); s.stack -= a; s.inPot += a; t.pot += a; if (!s.stack) s.allin = true; }
    t.shown = 3; t.phase = "mise"; t.round = 1;
    t.grace = Math.ceil(4 + active(t).length * 1.1 + 8.5);   // annonce du coup + 2 lettres par joueur + 3 lettres communes
    t.first = (t.hand - 1) % t.seats.length;
    startRound(t);
  }
  function startRound(t) {
    t.bet = 0; t.minInc = t.ante * 2; t.seats.forEach(s => { s.roundBet = 0; s.acted = false; });
    if (canAct(t).length < 2) return nextStreet(t);
    t.turn = nextFrom(t, t.first - 1); ask(t);
  }
  function nextFrom(t, i) { for (let k = 1; k <= t.seats.length; k++) { const j = (i + k) % t.seats.length; const s = t.seats[j]; if (!s.folded && !s.out && !s.allin) return j; } return -1; }
  function ask(t) {
    const s = t.seats[t.turn];
    // temps du croupier (distribution, lettres retournées) : le chrono du joueur ne démarre qu'après
    const g = t.grace || 0; t.grace = 0;
    setTimer(t, t.dec + g, () => act(t, t.turn, (t.bet - (s.roundBet || 0)) > 0 ? "fold" : "call", true));
    t.dealEnd = Date.now() + g * 1000;
    broadcast(t);
    const i = t.turn;
    if (s.bot) later(t, g * 1000 + 1200 + rnd(1600), () => botAct(t, i));
    if (s.gone) later(t, 300, () => act(t, i, "fold", true));
  }
  function act(t, i, a, auto, amt) {
    if (t.phase !== "mise" || i !== t.turn) return;
    const s = t.seats[i]; const owe = t.bet - s.roundBet;
    const put = n => { n = Math.max(0, Math.min(n, s.stack)); s.stack -= n; s.roundBet += n; s.inPot += n; t.pot += n; if (!s.stack) s.allin = true; return n; };
    if (a === "fold") { s.folded = true; s.last = auto ? "temps écoulé : couché" : "couché"; }
    else if (a === "call") { const n = put(owe); s.last = n ? "suit " + n : "parole"; }
    else if (a === "raise") {
      // relance au choix : « relancer à » un montant entre la relance minimale et le tapis du joueur
      const minTo = t.bet + (t.minInc || t.ante * 2), maxTo = s.roundBet + s.stack;
      let to = Math.floor(Number(amt)); if (!Number.isFinite(to)) to = minTo; to = Math.max(minTo, Math.min(to, maxTo));
      if (to <= t.bet) { const n = put(owe); s.last = n ? "suit " + n : "parole"; }       // pas assez pour relancer : il suit
      else { const prevBet = t.bet; put(to - s.roundBet); const inc = s.roundBet - prevBet;
        if (s.roundBet > t.bet) { t.bet = s.roundBet; if (inc >= (t.minInc || 0)) t.minInc = inc; t.seats.forEach((o, k) => { if (k !== i) o.acted = false; }); }
        s.last = s.allin ? "tapis ! (" + s.roundBet + ")" : "relance à " + s.roundBet; } }
    else if (a === "allin") { put(s.stack); if (s.roundBet > t.bet) { t.bet = s.roundBet; t.seats.forEach((o, k) => { if (k !== i) o.acted = false; }); } s.last = "tapis !"; }
    else return;
    s.acted = true;
    if (!s.bot && s.name) hooks.bet && hooks.bet(s.name, s.inPot);
    if (active(t).length === 1) return winAlone(t);
    const pending = canAct(t).filter(o => !o.acted || o.roundBet < t.bet);
    if (!pending.length) return nextStreet(t);
    t.turn = nextFrom(t, i); if (t.turn < 0) return nextStreet(t);
    ask(t);
  }
  function nextStreet(t) {
    if (t.shown < 5) { t.shown++; t.round++; t.grace = 5; t.msg = (t.shown === 4 ? "4e" : "5e") + " lettre retournée"; return startRound(t); }
    wordPhase(t);
  }
  function wordPhase(t) {
    t.phase = "mot"; t.msg = "À vous ! " + WORD_TIME + " s pour taper votre mot";
    setTimer(t, WORD_TIME, () => showdown(t));
    broadcast(t);
    active(t).forEach((s, i) => { if (s.bot) later(t, 4000 + rnd(9000), () => { if (t.phase !== "mot") return; const b = botWord(s.hand, t.board, t.botLvl); s.word = b ? b.w : "-"; checkAllWords(t); }); });
  }
  function checkAllWords(t) { if (t.phase === "mot" && active(t).every(s => s.word || s.gone)) showdown(t); else broadcast(t); }
  function settle(t, winners, share) { // gains crédités aux joueurs
    t.seats.forEach(s => { if (!s.bot && s.name) hooks.points && winners.includes(s) && hooks.points(s.name, Math.max(0, share - s.inPot)); });
  }
  function winAlone(t) {
    clearTimeout(t.timer); const w = active(t)[0];
    // pots séparés : le joueur restant ne gagne, sur chaque mise, que jusqu'à hauteur de sa propre mise ; le reste (mises de joueurs couchés au-delà) va à la banque
    const cap = t.seats.reduce((a, o) => a + Math.min(o.inPot || 0, w.inPot || 0), 0), gain = Math.min(t.pot, cap), toBank = t.pot - gain;
    w.stack += gain; settle(t, [w], gain); jpAdd(t, toBank);
    // victoire sans abattage : le gagnant n'a pas à montrer de mot, et la cagnotte ne se déclenche pas
    t.results = [{ name: w.name, win: true, gain, why: "les autres se sont couchés" }]; t.msg = w.name + " remporte le pot (" + gain + ") sans montrer son mot" + (toBank ? " · cagnotte +" + toBank : "");
    t.pot = 0; t.phase = "abattage"; broadcast(t); later(t, 5000, () => afterHand(t));
  }
  // Abattage avec pots séparés : chaque couche de mise ne peut être gagnée que par les joueurs qui l'ont suivie.
  // La banque participe : une couche que personne ne gagne (aucun mot valide) et les restes d'arrondi lui reviennent.
  function showdown(t) {
    if (t.phase !== "mot") return; clearTimeout(t.timer); t.phase = "abattage";
    const res = active(t).map(s => { const c = s.word && s.word !== "-" ? checkWord(s.word, s.hand, t.board) : { ok: false, why: "pas de mot" }; s.result = { word: (s.word || "").replace("-", ""), ...c }; return s; });
    const contrib = t.seats.map(s => s.inPot || 0), gain = t.seats.map(() => 0);
    const levels = [...new Set(res.map(s => s.inPot || 0).filter(v => v > 0))].sort((a, b) => a - b);
    let prev = 0, dealt = 0, toBank = 0; const winnersAll = new Set();
    levels.forEach((lvl, li) => {
      let part = 0; contrib.forEach(c => { part += Math.min(c, lvl) - Math.min(c, prev); });
      if (li === levels.length - 1) part = t.pot - dealt;                 // le reste (mises au-delà du dernier niveau) va à la dernière couche
      const elig = res.filter(s => (s.inPot || 0) >= lvl && s.result.ok);
      if (!elig.length) toBank += part;
      else {
        // départage : score, puis mot le plus long, puis partage
        const best = Math.max(...elig.map(s => s.result.pts)); const top = elig.filter(s => s.result.pts === best); const L = Math.max(...top.map(s => s.result.len || 0)); const win = top.filter(s => (s.result.len || 0) === L);
        const share = Math.floor(part / win.length); toBank += part - share * win.length;
        win.forEach(s => { gain[t.seats.indexOf(s)] += share; winnersAll.add(s); });
      }
      dealt += part; prev = lvl;
    });
    // cagnotte : un gagnant de l'abattage avec un mot valide de 6 ou 7 lettres la remporte (partage égal, le reste indivisible y reste)
    const W = [...winnersAll], jw = W.filter(s => (s.result.len || 0) >= 6), jp = jpGet(t);
    if (jw.length && jp > 0) { const each = Math.floor(jp / jw.length); if (each > 0) { jw.forEach(s => { gain[t.seats.indexOf(s)] += each; s.result.jackpot = each; }); jpAdd(t, -each * jw.length); t.jpWon = { names: jw.map(s => s.name), each }; } }
    t.seats.forEach((s, i) => { if (gain[i]) { s.stack += gain[i]; s.result.win = s.result.win || winnersAll.has(s); s.result.gain = gain[i]; } });
    t.seats.forEach((s, i) => { if (!s.bot && s.name && gain[i] > (s.inPot || 0)) hooks.points && hooks.points(s.name, gain[i] - (s.inPot || 0)); });
    jpAdd(t, toBank);
    t.msg = !W.length ? "Personne n'a de mot valide : le pot (" + t.pot + ") part dans la cagnotte"
      : (W.length > 1 ? "Partage : " + W.map(s => s.name + " +" + gain[t.seats.indexOf(s)]).join(", ") : W[0].name + " gagne " + gain[t.seats.indexOf(W[0])]) + (t.jpWon ? " · 🎰 CAGNOTTE " + t.jpWon.each * t.jpWon.names.length + " !" : "") + (toBank ? " · cagnotte +" + toBank : "");
    // Mot Max de chaque joueur encore en lice (affiché à lui seul)
    res.forEach(s => { if (!s.bot) { const b = bestWord(s.hand, t.board); s.max = b ? { word: b.w, ...evaluateWord(b.w, s.hand, t.board) } : null; } });
    t.results = res.map(s => ({ name: s.name, ...s.result })); t.pot = 0;
    broadcast(t); later(t, 5000 + res.length * 2200, () => afterHand(t));   // le temps de voir les lettres se retourner et les mots de chacun
  }
  function afterHand(t) {
    if (!live(t) || t.phase !== "abattage") return;
    t.seats.forEach(s => { if (s.stack <= 0) s.out = true; });
    const alive = t.seats.filter(s => !s.out && !s.gone);
    if (alive.length < 2 || (t.maxHands && t.hand >= t.maxHands) || !t.seats.some(s => !s.bot && !s.gone)) return endGame(t);
    startHand(t);
  }
  function endGame(t, why) {
    clearTimeout(t.timer); if (t.phase === "fin") return;
    if (t.pot) { const sh = t.seats.filter(s => !s.out); const each = sh.length ? Math.floor(t.pot / sh.length) : 0; sh.forEach(s => s.stack += each); jpAdd(t, t.pot - each * sh.length); t.pot = 0; }
    t.phase = "fin"; t.started = false;
    t.seats.forEach(s => { if (!s.bot && s.name && !s.paid) { s.paid = true; hooks.pay(s.name, s.stack); } });
    const ranking = t.seats.slice().sort((a, b) => b.stack - a.stack);
    t.msg = why || (ranking.length ? "Partie terminée : " + ranking[0].name + " finit en tête avec " + ranking[0].stack + " jetons" : "Partie terminée.");
    broadcast(t); setTimeout(() => { if (tables.get(t.room) === t && t.phase === "fin" && !t.seats.some(s => s.ws)) tables.delete(t.room); }, 10 * 60e3);
  }
  // Léo ne voit que ses 2 lettres et les lettres communes déjà retournées : force estimée = son meilleur mot actuel
  function botAct(t, i) {
    if (t.phase !== "mise" || t.turn !== i) return;
    const s = t.seats[i], lvl = t.botLvl || "inter"; const b = bestWord(s.hand, t.board.slice(0, t.shown)) || { pts: 0 }; const owe = t.bet - s.roundBet, r = rnd(100), pot = t.pot || 0;
    const minTo = t.bet + (t.minInc || t.ante * 2);
    let a = "call", amt;
    if (lvl === "debutant") { if (b.pts >= 26 && r < 25) a = "raise"; else if (b.pts < 10 && owe > t.ante * 4 && r < 50) a = "fold"; else if (r < 2) a = "raise"; amt = minTo; }
    else if (lvl === "confirme") {
      if (b.pts >= 22 && r < 60) { a = "raise"; amt = t.bet + Math.max(t.minInc || 0, Math.round(pot * (b.pts >= 28 ? 1 : .5))); }
      else if (owe === 0 && r < 10) { a = "raise"; amt = t.bet + Math.max(t.minInc || 0, Math.round(pot * .5)); }        // bluff mesuré
      else if (b.pts < 14 && owe > pot / 3 && r < 70) a = "fold";
    } else { if (b.pts >= 22 && r < 45) { a = "raise"; amt = r < 20 ? t.bet + Math.max(t.minInc || 0, Math.round(pot / 2)) : minTo; } else if (b.pts < 12 && owe > t.ante * 2 && r < 60) a = "fold"; else if (r < 6) { a = "raise"; amt = minTo; } }
    if (a === "fold" && owe === 0) a = "call";                                     // inutile de se coucher quand on peut dire parole
    act(t, i, a, false, amt);
  }

  return {
    // messages {t:"pk", a:...} reçus d'un joueur
    async handle(ws, m, who) {
      const room = ws.room; if (!room) return;
      let t = table(room);
      if (m.a === "watch") { if (t) { t.watchers = t.watchers || new Set(); t.watchers.add(ws); const i = t.seats.findIndex(s => s.ws === ws || (who && s.name === who && !s.bot)); if (i >= 0) { t.seats[i].ws = ws; t.seats[i].gone = false; sockSeat.set(ws, t); } hooks.send(ws, { t: "pkst", st: publicState(t, i) }); } else hooks.send(ws, { t: "pkst", st: null }); return; }
      if (m.a === "sit") {
        if (!t || t.phase === "fin") t = newTable(room, m);
        if (t.started) { const i = t.seats.findIndex(s => who && s.name === who && !s.bot); if (i >= 0) { t.seats[i].ws = ws; t.seats[i].gone = false; sockSeat.set(ws, t); broadcast(t); } return; }
        const name = who || ("INVITÉ" + (t.seats.length + 1));
        let s = t.seats.find(x => x.name === name && !x.bot);
        if (!s) {
          if (t.seats.length >= MAX_SEATS) return hooks.send(ws, { t: "pkerr", msg: "La table est complète." });
          let stack = t.buy;
          if (who) { const w = hooks.wallet(who); if (!w || w.coins < t.buy) return hooks.send(ws, { t: "pkerr", msg: "Il te faut " + t.buy + " jetons pour t'asseoir (tu en as " + (w ? w.coins : 0) + "). Convertis des points ou attends l'allocation de lundi.", need: t.buy }); hooks.pay(who, -t.buy); }
          s = { name, stack, ws, paid: !who }; t.seats.push(s);
        }
        s.ws = ws; s.gone = false; sockSeat.set(ws, t);
        if (m.solo) { t.solo = true; if (["debutant", "inter", "confirme"].includes(m.lvl)) t.botLvl = m.lvl; if (!t.seats.some(x => x.bot)) t.seats.push({ name: "LÉO", bot: true, stack: t.buy }); }
        broadcast(t); return;
      }
      if (!t) return;
      const i = t.seats.findIndex(s => s.ws === ws);
      if (m.a === "start") { if (t.started || i < 0 || t.seats.length < 2) return; t.started = true; t.hand = 0; startHand(t); return; }
      if (m.a === "act" && i >= 0) return act(t, i, String(m.act || ""), false, m.amt);
      // aperçu du score : calculé par le serveur avec la main du joueur et les lettres déjà visibles (rien de caché)
      if (m.a === "check" && i >= 0) { const s = t.seats[i]; if (!s.hand) return; return hooks.send(ws, { t: "pkchk", w: String(m.w || "").slice(0, 12), r: evaluateWord(m.w, s.hand, (t.board || []).slice(0, t.shown || 0)) }); }
      if (m.a === "word" && i >= 0 && t.phase === "mot") { const s = t.seats[i]; if (s.folded || s.word) return hooks.send(ws, { t: "pklock", ok: !!s.word, w: s.word || "" }); s.word = norm(m.w).slice(0, 7) || "-"; hooks.send(ws, { t: "pklock", ok: true, w: s.word }); return checkAllWords(t); }
      if (m.a === "leave" && i >= 0) return leave(t, i);
    },
    gone(ws) { const t = sockSeat.get(ws); if (!t) return; if (t.watchers) t.watchers.delete(ws); const i = t.seats.findIndex(s => s.ws === ws); if (i < 0) return;
      const s = t.seats[i]; s.ws = null;
      if (t.phase === "fin" || t.dead) return;                                     // partie finie : la table reste telle quelle (résultats)
      if (!t.started) { if (!s.bot && s.name && !s.paid) { s.paid = true; hooks.pay(s.name, s.stack); } t.seats.splice(i, 1); if (!t.seats.some(x => !x.bot)) tables.delete(t.room); else broadcast(t); return; }
      // déconnexion : 60 s pour revenir, sinon le joueur quitte la table
      later(t, 60e3, () => { const j = t.seats.indexOf(s); if (!s.ws && j >= 0) leave(t, j); }); broadcast(t); },
    publicLetters: { PV, DECK, LEN_BONUS, FULL_HAND }, evaluateWord, bestWord,
    _table: room => tables.get(room)          // tests du serveur uniquement (jamais exposé aux joueurs)
  };
  function leave(t, i) {
    const s = t.seats[i]; if (!s || s.gone) return; s.gone = true; s.ws = null;
    if (t.started && !s.folded && t.phase === "mise" && t.turn === i) act(t, i, "fold", true); else if (!s.folded) s.folded = true;
        // plus aucun humain : chacun récupère exactement ce qu'il avait misé dans ce coup (pas d'arrondi)
    if (!t.seats.some(x => !x.bot && !x.gone)) { if (t.started && (t.phase === "mise" || t.phase === "mot")) { t.seats.forEach(x => { x.stack += x.inPot || 0; x.inPot = 0; }); t.pot = 0; } t.carry = 0; endGame(t, "Tous les joueurs ont quitté : mises du coup rendues.");
      // plus personne à la table : on la ferme, la prochaine visite ouvre une table neuve
      t.dead = true; if (tables.get(t.room) === t) tables.delete(t.room); return; }
    if (t.started && active(t).length === 1 && (t.phase === "mise" || t.phase === "mot")) return winAlone(t);
    if (t.phase === "mot") checkAllWords(t); else broadcast(t);
  }
};
