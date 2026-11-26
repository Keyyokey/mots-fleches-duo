# Grilles de Sudoku de Motipop (protocole du 26/11/2026, étape 3) : 200 grilles à solution unique, 3 niveaux.
# Niveau mesuré par un solveur « humain » : Facile = singletons seulement ; Intermédiaire = il faut aussi les paires et les
# candidats bloqués ; Difficile = il faut davantage (X-wing ou hypothèse). Graine fixe : relancer redonne les mêmes grilles.
# Usage : python3 outils/sudoku/gen_sudoku.py   → public/d/sudoku-<empreinte>.js (window.__SUDOKU)
import os, random, hashlib, json, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
R = random.Random(20261126)
UNITS = [[r * 9 + c for c in range(9)] for r in range(9)] + [[r * 9 + c for r in range(9)] for c in range(9)] + \
        [[(br * 3 + r) * 9 + bc * 3 + c for r in range(3) for c in range(3)] for br in range(3) for bc in range(3)]
PEERS = [set(x for u in UNITS if i in u for x in u) - {i} for i in range(81)]

def solutions(g, limit=2):
    """nombre de solutions (arrêt à `limit`) — retour arrière avec la case la plus contrainte"""
    g = g[:]; cnt = [0]
    def rec():
        best, bc = -1, None
        for i in range(81):
            if g[i]: continue
            c = {1, 2, 3, 4, 5, 6, 7, 8, 9} - {g[j] for j in PEERS[i]}
            if not c: return
            if bc is None or len(c) < len(bc): best, bc = i, c
            if len(c) == 1: break
        if best < 0: cnt[0] += 1; return
        for v in bc:
            g[best] = v; rec(); g[best] = 0
            if cnt[0] >= limit: return
    rec(); return cnt[0]

def full():
    g = [0] * 81
    def rec(i):
        if i == 81: return True
        c = list({1, 2, 3, 4, 5, 6, 7, 8, 9} - {g[j] for j in PEERS[i]}); R.shuffle(c)
        for v in c:
            g[i] = v
            if rec(i + 1): return True
        g[i] = 0; return False
    rec(0); return g

def grade(p):
    """0 = singletons suffisent, 1 = + paires et candidats bloqués, 2 = davantage"""
    cand = [set() if p[i] else {1, 2, 3, 4, 5, 6, 7, 8, 9} - {p[j] for j in PEERS[i]} for i in range(81)]
    g = p[:]; level = 0
    def place(i, v):
        g[i] = v; cand[i] = set()
        for j in PEERS[i]: cand[j].discard(v)
    while 0 in g:
        moved = False
        for i in range(81):                                   # singleton nu
            if not g[i] and len(cand[i]) == 1: place(i, next(iter(cand[i]))); moved = True
        if moved: continue
        for u in UNITS:                                       # singleton caché
            for v in range(1, 10):
                pos = [i for i in u if not g[i] and v in cand[i]]
                if len(pos) == 1: place(pos[0], v); moved = True
        if moved: continue
        level = max(level, 1); ch = False
        for u in UNITS:                                       # paires nues
            pr = [i for i in u if not g[i] and len(cand[i]) == 2]
            for a in range(len(pr)):
                for b in range(a + 1, len(pr)):
                    if cand[pr[a]] == cand[pr[b]]:
                        for k in u:
                            if k not in (pr[a], pr[b]) and not g[k] and cand[k] & cand[pr[a]]: cand[k] -= cand[pr[a]]; ch = True
        for bi in range(18, 27):                              # candidats bloqués (bloc → ligne/colonne, et l'inverse)
            box = UNITS[bi]
            for v in range(1, 10):
                pos = [i for i in box if not g[i] and v in cand[i]]
                if not pos: continue
                for u in UNITS[:18]:
                    if all(i in u for i in pos):
                        for k in u:
                            if k not in box and not g[k] and v in cand[k]: cand[k].discard(v); ch = True
        for ui in range(18):
            u = UNITS[ui]
            for v in range(1, 10):
                pos = [i for i in u if not g[i] and v in cand[i]]
                if not pos: continue
                for box in UNITS[18:]:
                    if all(i in box for i in pos):
                        for k in box:
                            if k not in u and not g[k] and v in cand[k]: cand[k].discard(v); ch = True
        if not ch: return 2
    return level

def make(target):
    while True:
        s = full(); p = s[:]; cells = list(range(81)); R.shuffle(cells)
        floor = {0: 34, 1: 28, 2: 23}[target]                 # nombre minimal de chiffres donnés
        for i in cells:
            if sum(1 for x in p if x) <= floor: break
            v, w = p[i], p[80 - i]; p[i] = 0; p[80 - i] = 0     # retrait symétrique (plus joli)
            if solutions(p) != 1: p[i] = v; p[80 - i] = w
        lv = grade(p)
        if lv == target: return p, s

out = []; want = [("facile", 0, 70), ("moyen", 1, 70), ("difficile", 2, 60)]
for name, t, n in want:
    for k in range(n):
        p, s = make(t)
        out.append({"id": name[0].upper() + "%03d" % (k + 1), "lvl": name, "p": "".join(str(x) if x else "." for x in p), "s": "".join(map(str, s)), "n": sum(1 for x in p if x)})
    print(name, n, "grilles, chiffres donnés en moyenne :", round(sum(x["n"] for x in out if x["lvl"] == name) / n, 1))
body = "window.__SUDOKU=" + json.dumps(out, separators=(",", ":")) + ";"
h = hashlib.sha1(body.encode()).hexdigest()[:10]
for old in glob.glob(os.path.join(ROOT, "public", "d", "sudoku-" + "[0-9a-f]" * 10 + ".js")): os.remove(old)
open(os.path.join(ROOT, "public", "d", "sudoku-" + h + ".js"), "w").write(body)
print("public/d/sudoku-" + h + ".js", len(body) // 1024, "Ko")
