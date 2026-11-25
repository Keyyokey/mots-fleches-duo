// 25/11/2026 — définitions raccourcies pour la « taille unique » des mots fléchés (grilles classiques 10 colonnes).
// Lit outils/grilles/definitions_courtes.txt (une ligne : ANCIENNE DÉFINITION|RÉPONSE|NOUVELLE DÉFINITION)
// et remplace la définition dans public/d/grilles-*.js et public/d/gl-<niveau>-<hash>.js (à relancer avant split_gl.py).
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), D = path.join(ROOT, "public", "d");
const MAP = new Map(fs.readFileSync(path.join(__dirname, "definitions_courtes.txt"), "utf8").trim().split("\n").map(l => l.split("|")).map(([t, w, n]) => [t + "|" + w, n]));
const norm = t => t.replace(/-\n/g, "").replace(/\n/g, " ");
function answers(g) { const NR = g.nr || 10, NC = g.nc || 10, K = Buffer.from(g.k, "base64").toString("latin1").split("").reverse().join("");
  const at = (r, c) => r < NR && c < NC ? K[r * NC + c] : "#"; return (r, c, a) => { let sr = r, sc = c, dr = 0, dc = 0; if (a[0] === "R") sc = c + 1; else sr = r + 1; if (a[a.length - 1] === "R") dc = 1; else dr = 1;
    let w = ""; while (sr < NR && sc < NC && at(sr, sc) !== "#" && at(sr, sc) !== "@") { w += at(sr, sc); sr += dr; sc += dc } return w } }
let total = 0;
for (const f of fs.readdirSync(D).filter(f => /^grilles-[0-9a-f]+\.js$|^gl-(facile|moyen|difficile)-[0-9a-f]{10}\.js$/.test(f))) {
  const src = fs.readFileSync(path.join(D, f), "utf8"); const i = src.indexOf("[{"), j = src.lastIndexOf("}]") + 1;
  const arr = JSON.parse(src.slice(i, j + 1)); let n = 0;
  for (const g of arr) { if (!g.k || (g.id || "").startsWith("T") || g.fmt === "t") continue; const ans = answers(g);
    for (const [pos, list] of Object.entries(g.clues)) { const [r, c] = pos.split(",").map(Number);
      for (const cl of list) { const k = norm(cl[0]) + "|" + ans(r, c, cl[1]); if (MAP.has(k)) { cl[0] = MAP.get(k); n++ } } } }
  fs.writeFileSync(path.join(D, f), src.slice(0, i) + JSON.stringify(arr) + src.slice(j + 1)); console.log(f, n, "définitions raccourcies"); total += n;
}
console.log("total", total);
