#!/usr/bin/env python3
"""23/11/2026 : coupe chaque public/d/gl-<niveau>-*.js en deux fichiers (t = grilles téléphone 8×8, c = classiques 10 colonnes)
pour que le téléphone ne télécharge que ses grilles. À relancer après publier_tel.py. Met à jour fl.html (__GLF)."""
import json, re, glob, hashlib, os
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
D = os.path.join(ROOT, "public", "d")
PRE = "window.__GRIDS=window.__GRIDS||[];window.__GRIDS.push.apply(window.__GRIDS,"
F = {}
for lv in ["facile", "moyen", "difficile"]:
    src = [f for f in glob.glob(os.path.join(D, f"gl-{lv}-*.js")) if re.search(rf"gl-{lv}-[0-9a-f]{{10}}\.js$", f)]
    assert len(src) == 1, (lv, src)
    t = open(src[0], encoding="utf8").read()
    arr = json.loads(t[len(PRE):t.rindex("]") + 1])
    F[lv] = {}
    for fmt in ("t", "c"):
        part = [g for g in arr if (g["id"].startswith("T")) == (fmt == "t")]
        body = PRE + json.dumps(part, ensure_ascii=False, separators=(",", ":")) + ");"
        h = hashlib.sha1(body.encode()).hexdigest()[:10]
        for old in glob.glob(os.path.join(D, f"gl-{lv}-{fmt}-*.js")): os.remove(old)
        open(os.path.join(D, f"gl-{lv}-{fmt}-{h}.js"), "w", encoding="utf8").write(body)
        F[lv][fmt] = f"/d/gl-{lv}-{fmt}-{h}.js"
        print(lv, fmt, len(part), len(body))
fl = os.path.join(ROOT, "public", "fl.html")
s = open(fl, encoding="utf8").read()
new = "window.__GLF=" + json.dumps(F, separators=(",", ":")) + ";"
s, n = re.subn(r"window\.__GLF=\{[^;]*\};", new, s, count=1)
assert n == 1, "__GLF introuvable dans fl.html"
open(fl, "w", encoding="utf8").write(s)
