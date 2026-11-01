// Catalogue des contenus jouables (côté serveur) et tirage des grilles
// - identifiant stable du contenu (ex. « fleches:F012 ») ≠ identifiant de la partie (gid)
// - deux contenus identiques publiés sous deux numéros (même Tourniquet en Normal et Difficile) ont le même identifiant canonique
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

module.exports = function (root) {
  const D = path.join(root, "public", "d");
  const load = (prefix, key) => {
    const f = fs.readdirSync(D).find(x => x.startsWith(prefix) && x.endsWith(".js"));
    const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(D, f), "utf8"), ctx);
    return ctx.window[key] || [];
  };
  const GRIDS = load("grilles-", "__GRIDS"), ROND = load("rond-", "__ROND");
  // mots mêlés : grilles générées à partir d'un numéro et d'un niveau (graine fixe → même contenu à chaque fois)
  const mctx = { norm: s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z]/g, "") };
  vm.createContext(mctx); vm.runInContext(fs.readFileSync(path.join(root, "meles_data.js"), "utf8") + "\nthis.melesDef=melesDef;this.makeMeles=makeMeles;this.NMELES=NMELES;", mctx);

  const LVL = { fleches: { facile: "facile", normal: "moyen", moyen: "moyen", difficile: "difficile" }, rond: { facile: "facile", moyen: "moyen", normal: "moyen", difficile: "difficile" }, meles: { facile: "facile", moyen: "moyen", normal: "moyen", difficile: "difficile" } };
  const canon = { fleches: {}, rond: {}, meles: {} };          // référence → identifiant canonique
  const lists = { fleches: {}, rond: {}, meles: {} };          // niveau → [références] (ordre du catalogue)
  GRIDS.forEach(g => { if (!g.lvl) return; canon.fleches[g.id] = "fleches:" + g.id; (lists.fleches[g.lvl] = lists.fleches[g.lvl] || []).push(g.id); });
  const seen = new Map();
  ROND.forEach(r => { const sig = JSON.stringify(r.cols); if (!seen.has(sig)) seen.set(sig, "rond:" + r.id); canon.rond[r.id] = seen.get(sig); (lists.rond[r.lvl] = lists.rond[r.lvl] || []).push(r.id); });
  for (const lv of ["facile", "moyen", "difficile"]) { lists.meles[lv] = []; for (let k = 1; k <= mctx.NMELES; k++) { const ref = lv + ":n" + k; canon.meles[ref] = "meles:" + ref; lists.meles[lv].push(ref); } }

  const GAMES = ["fleches", "rond", "meles"];
  // référence du contenu d'une partie (document du salon)
  const refOf = (game, d) => game === "fleches" ? d.grid : game === "rond" ? d.pid : (d.level + ":" + d.mid);
  const level = (game, l) => (LVL[game] || {})[l] || null;
  const cid = (game, ref) => (canon[game] || {})[ref] || null;
  // contenus admissibles pour des participants (historiques déjà chargés)
  function admissible(game, lvl, hists) {
    const L = lists[game][lvl] || [];
    return L.filter(ref => { const c = canon[game][ref]; return hists.every(h => !(h && h[game] && h[game][c])); });
  }
  const pick = arr => arr[crypto.randomInt(arr.length)];
  // le numéro choisi à la main (1, 2, 3…) → référence du contenu
  const byNumber = (game, lvl, n) => (lists[game][lvl] || [])[n - 1] || null;
  // applique un nouveau contenu à un document de partie qui n'a pas encore démarré
  function applyTo(game, d, ref) {
    if (game === "fleches") { const g = GRIDS.find(x => x.id === ref); d.grid = ref; d.filled = {}; d.letters = {}; if (d.level === "facile") (g.paper || []).forEach(k => d.filled[k] = -1); d.mystery = null; }
    else if (game === "rond") { d.pid = ref; d.found = {}; }
    else { const [lv, mid] = ref.split(":"); const def = mctx.melesDef(mid, lv); const m = mctx.makeMeles(def.theme, lv, def.seed); Object.assign(d, m, { mid: "n" + def.k, found: {} }); }
    d.players.forEach(p => p.score = 0);
  }
  return { GAMES, refOf, level, cid, admissible, pick, byNumber, applyTo, lists, counts: { fleches: GRIDS.length, rond: ROND.length } };
};
