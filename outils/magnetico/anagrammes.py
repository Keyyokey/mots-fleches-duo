# Magnético (21/11/2026, retour de Juvenal : E-MIT peut aussi donner MITE) : repère les mots dont les syllabes,
# remises dans un autre ordre, forment un AUTRE mot français valable. Ces mots sont marqués « |a » (4e champ) dans
# public/d/magnetico-*.js et ne sont plus tirés (les positions des mots ne bougent pas : parties en cours et mot du jour intacts).
import json, re, glob, os, itertools, unicodedata, hashlib
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
def plain(s): return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper()
f = glob.glob(os.path.join(ROOT, "public/d/magnetico-*.js")); assert len(f) == 1
txt = open(f[0], encoding="utf8").read(); M = json.loads(re.match(r"window\.MG_MOTS=(.*);\s*$", txt, re.S).group(1))
D = set()
for w in open(os.path.join(ROOT, "poker_mots.txt"), encoding="utf8").read().split(): D.add(plain(w))
for lv in M:
    for e in M[lv]: D.add(plain(e.split("|")[0].replace("-", "")))
n = 0; ex = []
for lv in M:
    for i, e in enumerate(M[lv]):
        p = e.split("|"); syl = p[0].split("-"); w = "".join(syl)
        alt = None
        if 1 < len(syl) <= 6:
            for perm in itertools.permutations(syl):
                x = plain("".join(perm))
                if x != plain(w) and x in D: alt = x; break
        p = p[:3] + (["a"] if alt else [])
        M[lv][i] = "|".join(p)
        if alt: n += 1; ex.append(w + "→" + alt)
js = "window.MG_MOTS=" + json.dumps(M, ensure_ascii=False, separators=(",", ":")) + ";"
h = hashlib.sha1(js.encode()).hexdigest()[:10]; dst = os.path.join(ROOT, "public/d/magnetico-" + h + ".js")
if dst != f[0]: open(dst, "w", encoding="utf8").write(js); os.remove(f[0])
print(n, "mots écartés ; ex.", ex[:40], "->", os.path.basename(dst))
