// Poker Lettres — moteur côté serveur (le serveur seul connaît le paquet et les lettres cachées)
"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PV = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:10,L:1,M:2,N:1,O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:10,X:10,Y:10,Z:10 };
const DECK = { E:6,A:4,I:4,S:4,N:3,R:3,T:3,U:3,O:3,L:2,C:2,D:2,M:2,P:2,B:1,G:1,F:1,H:1,V:1,J:1,Q:1,X:1,Z:1,K:1,W:1,Y:1 };
const WORD_BONUS = 5, WORD_TIME = 45, MAX_SEATS = 6;
let DICT = new Set(), WORDS = [];
try { WORDS = fs.readFileSync(path.join(__dirname, "poker_mots.txt"), "utf8").split("\n").filter(Boolean); DICT = new Set(WORDS); } catch (e) { console.error("Dictionnaire du poker absent :", e.message); }

const rnd = n => crypto.randomInt(n);
function shuffle() {           // Fisher-Yates avec un générateur cryptographique
  const a = []; for (const [l, n] of Object.entries(DECK)) for (let i = 0; i < n; i++) a.push(l);
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const count = arr => { const m = {}; for (const c of arr) m[c] = (m[c] || 0) + 1; return m; };
const fits = (wc, have) => { for (const c in wc) if ((have[c] || 0) < wc[c]) return false; return true; };
const wordValue = w => [...w].reduce((t, c) => t + (PV[c] || 0), 0) + WORD_BONUS;
// mot valide : existe, se forme avec la main + le milieu, et utilise au moins une lettre cachée du joueur
function checkWord(w, hand, board) {
  w = String(w || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (w.length < 2) return { ok: false, why: "trop court" };
  if (!DICT.has(w)) return { ok: false, why: "mot inexistant" };
  const wc = count(w);
  if (!fits(wc, count(hand.concat(board)))) return { ok: false, why: "lettre absente" };
  if (fits(wc, count(board))) return { ok: false, why: "aucune de tes lettres" };
  return { ok: true, pts: wordValue(w) };
}
let WC = null;
function botWord(hand, board) {   // le robot ne trouve pas toujours le meilleur mot
  if (!WC) WC = WORDS.map(w => [w, count(w)]);
  const have = count(hand.concat(board)), bc = count(board); const all = [];
  for (const [w, wc] of WC) { if (fits(wc, have) && !fits(wc, bc)) all.push({ w, pts: wordValue(w) }); }
  if (!all.length) return null; all.sort((a, b) => b.pts - a.pts);
  return all[Math.min(all.length - 1, crypto.randomInt(Math.min(all.length, 10)))];
}
function bestWord(hand, board, limit) {
  if (!WC) WC = WORDS.map(w => [w, count(w)]);
  const have = count(hand.concat(board)), bc = count(board); let best = null;
  for (const [w, wc] of WC) { if (!fits(wc, have) || fits(wc, bc)) continue;
    const v = wordValue(w); if (!best || v > best.pts) best = { w, pts: v }; if (limit && best.pts >= limit) break; }
  return best;
}

const tables = new Map();            // salle -> table
function table(room) { return tables.get(room); }

function newTable(room, opts) {
  const buy = [10, 20, 50].includes(+opts.mise) ? +opts.mise : 20;
  const t = { room, seats: [], started: false, hand: 0, maxHands: opts.fmt === "last" ? 0 : 10, buy, ante: Math.max(1, Math.round(buy / 10)),
    dec: [20, 30, 45].includes(+opts.dec) ? +opts.dec : 30, solo: !!opts.solo, carry: 0, bank: 0, phase: "attente", log: [], timer: null, deadline: 0 };
  const old = tables.get(room); if (old) { clearTimeout(old.timer); old.dead = true; }   // l'ancienne table ne doit plus rien déclencher
  tables.set(room, t); return t;
}

module.exports = function (hooks) {
  // hooks : send(ws,o), wallet(name) -> {coins}, pay(name, delta, betAmount), points(name, pts)
  const sockSeat = new WeakMap();

  function publicState(t, seatIdx) {
    const me = t.seats[seatIdx];
    const show = t.phase === "abattage" || t.phase === "fin";
    return {
      room: t.room, started: t.started, phase: t.phase, hand: t.hand, maxHands: t.maxHands, buy: t.buy, ante: t.ante, dec: t.dec, solo: t.solo,
      pot: t.pot || 0, carry: 0, bank: t.bank || 0, bet: t.bet || 0, turn: t.turn, deadline: t.deadline, now: Date.now(), commit: t.commit || "", reveal: t.phase === "abattage" || t.phase === "fin" ? t.revealDeck || "" : "",
      board: (t.board || []).map((c, i) => i < (t.shown || 0) ? c : null), shown: t.shown || 0,
      deckLeft: me ? leftFor(t, me) : null,
      seats: t.seats.map((s, i) => ({ name: s.name, bot: !!s.bot, stack: s.stack, inPot: s.inPot || 0, roundBet: s.roundBet || 0, folded: !!s.folded, allin: !!s.allin, out: !!s.out, here: s.bot || !!s.ws, gone: !!s.gone,
        acted: !!s.acted, wordDone: !!s.word, last: s.last || "", hand: i === seatIdx ? s.hand : (show && !s.folded && s.hand ? s.hand : null), result: show ? s.result || null : null })),
      me: seatIdx, results: t.results || null, msg: t.msg || ""
    };
  }
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
    t.hand++; t.results = null; t.msg = ""; t.pot = 0; t.carry = 0; t.bet = 0;
    t.seats.forEach(s => { s.folded = !!(s.out || s.gone); s.allin = false; s.inPot = 0; s.roundBet = 0; s.word = null; s.result = null; s.acted = false; s.last = ""; s.hand = null; });
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
    t.first = (t.hand - 1) % t.seats.length;
    startRound(t);
  }
  function startRound(t) {
    t.bet = 0; t.seats.forEach(s => { s.roundBet = 0; s.acted = false; });
    if (canAct(t).length < 2) return nextStreet(t);
    t.turn = nextFrom(t, t.first - 1); ask(t);
  }
  function nextFrom(t, i) { for (let k = 1; k <= t.seats.length; k++) { const j = (i + k) % t.seats.length; const s = t.seats[j]; if (!s.folded && !s.out && !s.allin) return j; } return -1; }
  function ask(t) {
    const s = t.seats[t.turn];
    setTimer(t, t.dec, () => act(t, t.turn, (t.bet - (s.roundBet || 0)) > 0 ? "fold" : "call", true));
    broadcast(t);
    const i = t.turn;
    if (s.bot) later(t, 1200 + rnd(1600), () => botAct(t, i));
    if (s.gone) later(t, 300, () => act(t, i, "fold", true));
  }
  function act(t, i, a, auto) {
    if (t.phase !== "mise" || i !== t.turn) return;
    const s = t.seats[i]; const owe = t.bet - s.roundBet;
    const put = n => { n = Math.max(0, Math.min(n, s.stack)); s.stack -= n; s.roundBet += n; s.inPot += n; t.pot += n; if (!s.stack) s.allin = true; return n; };
    if (a === "fold") { s.folded = true; s.last = auto ? "temps écoulé : couché" : "couché"; }
    else if (a === "call") { const n = put(owe); s.last = n ? "suit " + n : "parole"; }
    else if (a === "raise") { const n = put(owe + t.ante * 2); if (s.roundBet > t.bet) { t.bet = s.roundBet; t.seats.forEach((o, k) => { if (k !== i) o.acted = false; }); } s.last = "relance +" + (n - owe > 0 ? n - owe : 0); }
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
    if (t.shown < 5) { t.shown++; t.round++; t.msg = (t.shown === 4 ? "4e" : "5e") + " lettre retournée"; return startRound(t); }
    wordPhase(t);
  }
  function wordPhase(t) {
    t.phase = "mot"; t.msg = "À vous ! " + WORD_TIME + " s pour taper votre mot";
    setTimer(t, WORD_TIME, () => showdown(t));
    broadcast(t);
    active(t).forEach((s, i) => { if (s.bot) later(t, 4000 + rnd(9000), () => { if (t.phase !== "mot") return; const b = botWord(s.hand, t.board); s.word = b ? b.w : "-"; checkAllWords(t); }); });
  }
  function checkAllWords(t) { if (t.phase === "mot" && active(t).every(s => s.word || s.gone)) showdown(t); else broadcast(t); }
  function settle(t, winners, share) { // gains crédités aux joueurs
    t.seats.forEach(s => { if (!s.bot && s.name) hooks.points && winners.includes(s) && hooks.points(s.name, Math.max(0, share - s.inPot)); });
  }
  function winAlone(t) {
    clearTimeout(t.timer); const w = active(t)[0];
    // pots séparés : le joueur restant ne gagne, sur chaque mise, que jusqu'à hauteur de sa propre mise ; le reste (mises de joueurs couchés au-delà) va à la banque
    const cap = t.seats.reduce((a, o) => a + Math.min(o.inPot || 0, w.inPot || 0), 0), gain = Math.min(t.pot, cap), toBank = t.pot - gain;
    w.stack += gain; settle(t, [w], gain); t.bank = (t.bank || 0) + toBank;
    t.results = [{ name: w.name, win: true, gain, why: "les autres se sont couchés" }]; t.msg = w.name + " remporte le pot (" + gain + ")" + (toBank ? " · banque +" + toBank : "");
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
        const best = Math.max(...elig.map(s => s.result.pts)); const win = elig.filter(s => s.result.pts === best);
        const share = Math.floor(part / win.length); toBank += part - share * win.length;
        win.forEach(s => { gain[t.seats.indexOf(s)] += share; winnersAll.add(s); });
      }
      dealt += part; prev = lvl;
    });
    t.seats.forEach((s, i) => { if (gain[i]) { s.stack += gain[i]; s.result.win = true; s.result.gain = gain[i]; } });
    t.seats.forEach((s, i) => { if (!s.bot && s.name && gain[i] > (s.inPot || 0)) hooks.points && hooks.points(s.name, gain[i] - (s.inPot || 0)); });
    t.bank = (t.bank || 0) + toBank;
    const W = [...winnersAll];
    t.msg = !W.length ? "Personne n'a de mot valide : la banque remporte le pot (" + t.pot + ")"
      : (W.length > 1 ? "Partage : " + W.map(s => s.name + " +" + gain[t.seats.indexOf(s)]).join(", ") : W[0].name + " gagne " + gain[t.seats.indexOf(W[0])]) + (toBank ? " · banque +" + toBank : "");
    t.results = res.map(s => ({ name: s.name, ...s.result })); t.pot = 0;
    broadcast(t); later(t, 7000, () => afterHand(t));
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
    if (t.pot) { const sh = t.seats.filter(s => !s.out); const each = sh.length ? Math.floor(t.pot / sh.length) : 0; sh.forEach(s => s.stack += each); t.bank = (t.bank || 0) + t.pot - each * sh.length; t.pot = 0; }
    t.phase = "fin"; t.started = false;
    t.seats.forEach(s => { if (!s.bot && s.name && !s.paid) { s.paid = true; hooks.pay(s.name, s.stack); } });
    const ranking = t.seats.slice().sort((a, b) => b.stack - a.stack);
    t.msg = why || (ranking.length ? "Partie terminée : " + ranking[0].name + " finit en tête avec " + ranking[0].stack + " jetons" : "Partie terminée.");
    broadcast(t); setTimeout(() => { if (tables.get(t.room) === t && t.phase === "fin" && !t.seats.some(s => s.ws)) tables.delete(t.room); }, 10 * 60e3);
  }
  function botAct(t, i) {
    if (t.phase !== "mise" || t.turn !== i) return;
    const s = t.seats[i]; const b = bestWord(s.hand, t.board.slice(0, t.shown)) || { pts: 0 }; const owe = t.bet - s.roundBet; const r = rnd(100);
    let a = "call"; if (b.pts >= 16 && r < 45) a = "raise"; else if (b.pts < 8 && owe > t.ante * 2 && r < 60) a = "fold"; else if (r < 6) a = "raise";
    act(t, i, a);
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
        if (m.solo) { t.solo = true; if (!t.seats.some(x => x.bot)) t.seats.push({ name: "ROBOT", bot: true, stack: t.buy }); }
        broadcast(t); return;
      }
      if (!t) return;
      const i = t.seats.findIndex(s => s.ws === ws);
      if (m.a === "start") { if (t.started || i < 0 || t.seats.length < 2) return; t.started = true; t.hand = 0; startHand(t); return; }
      if (m.a === "act" && i >= 0) return act(t, i, String(m.act || ""));
      if (m.a === "word" && i >= 0 && t.phase === "mot") { const s = t.seats[i]; if (s.folded) return; s.word = String(m.w || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 7) || "-"; return checkAllWords(t); }
      if (m.a === "leave" && i >= 0) return leave(t, i);
    },
    gone(ws) { const t = sockSeat.get(ws); if (!t) return; if (t.watchers) t.watchers.delete(ws); const i = t.seats.findIndex(s => s.ws === ws); if (i < 0) return;
      const s = t.seats[i]; s.ws = null;
      if (t.phase === "fin" || t.dead) return;                                     // partie finie : la table reste telle quelle (résultats)
      if (!t.started) { if (!s.bot && s.name && !s.paid) { s.paid = true; hooks.pay(s.name, s.stack); } t.seats.splice(i, 1); if (!t.seats.some(x => !x.bot)) tables.delete(t.room); else broadcast(t); return; }
      // déconnexion : 60 s pour revenir, sinon le joueur quitte la table
      later(t, 60e3, () => { const j = t.seats.indexOf(s); if (!s.ws && j >= 0) leave(t, j); }); broadcast(t); },
    publicLetters: { PV, DECK }
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
