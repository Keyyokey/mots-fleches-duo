# Liste des mots de Magnético : mot découpé en syllabes, définition, rareté, niveau.
# Sources : dictionnaires des grilles (outils/grilles/dict, sauf noms de lieux) + mots_longs.txt (mots longs pour le niveau Difficile).
# Fréquence : nombre de livres (sur 204) où le mot apparaît (comptage fait le 14/11, aucun texte gardé) — /home/claude/vocab/compte.json si présent.
# Sortie : public/d/magnetico-<empreinte>.js  (window.MG_MOTS = {facile:[...], normal:[...], difficile:[...]})
import os, re, json, sys, hashlib, unicodedata, glob
sys.path.insert(0, os.path.dirname(__file__))
from syllabes import syllabes
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
def plain(s): return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper()
books = {}
cp = "/home/claude/vocab/compte.json"
if os.path.exists(cp):
    for w, (n, b, cap) in json.load(open(cp))["mots"].items():
        k = plain(w)
        if cap > n * 0.6: continue                     # surtout des noms propres
        books[k] = max(books.get(k, 0), b)
    json.dump(books, open(os.path.join(os.path.dirname(__file__), "frequences.json"), "w"))
else:
    books = json.load(open(os.path.join(os.path.dirname(__file__), "frequences.json")))
BAD = re.compile(r"\.\.\.|…|\(|\)|^[A-Z]+$")
defs = {}
files = [f for f in glob.glob(os.path.join(ROOT, "outils/grilles/dict/*.txt")) if not re.search(r"(atlas|geo)\.txt$", f)]
files.append(os.path.join(os.path.dirname(__file__), "mots_longs.txt"))
for f in files:
    if not os.path.exists(f): continue
    for line in open(f, encoding="utf8"):
        if "|" not in line: continue
        w, d = line.rstrip("\n").split("|", 1); w = plain(w.strip()); d = d.strip()
        if not re.fullmatch(r"[A-Z]{4,16}", w) or not d or BAD.search(d) or len(d) > 70: continue
        d = d[0].upper() + d[1:]
        if not d.endswith((".", "!", "?")): d += "."
        if w not in defs or len(d) > len(defs[w]): defs[w] = d
out = {"facile": [], "normal": [], "difficile": []}
for w, d in sorted(defs.items()):
    s = syllabes(w)
    if len(s) < 2 or any(len(x) > 5 for x in s): continue
    b = books.get(w, 0); rar = 1 if b >= 100 else 1.5 if b >= 25 else 2
    n = len(s)
    if n >= 5 or (n == 4 and len(w) >= 9): lvl = "difficile"
    elif n <= 3 and b >= 60 and len(w) <= 8: lvl = "facile"
    elif n >= 3 or b >= 15: lvl = "normal"
    else: continue
    out[lvl].append("-".join(s) + "|" + d + "|" + str(rar))
for k, v in out.items(): print(k, len(v), v[:3])
js = "window.MG_MOTS=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";"
h = hashlib.sha1(js.encode()).hexdigest()[:10]
for old in glob.glob(os.path.join(ROOT, "public/d/magnetico-*.js")): os.remove(old)
dst = os.path.join(ROOT, "public/d/magnetico-" + h + ".js"); open(dst, "w", encoding="utf8").write(js)
print(dst, len(js) // 1024, "Ko")
