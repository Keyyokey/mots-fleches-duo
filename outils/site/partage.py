# Code et styles communs aux pages de jeu, sortis des pages et mis en cache par le téléphone (fichiers à empreinte, gardés 1 an).
# Sources : outils/site/sk.js (en-tête du site), sk.css (habillage), jeu.css (styles communs des jeux), icones.js (icônes « verre »).
# Usage : python3 outils/site/partage.py   (après toute modification d'une source ; met à jour public/d/*-<empreinte>.* et les pages)
import os, re, glob, hashlib
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, "..", ".."))
PUB = os.path.join(ROOT, "public")
PAGES = ["fl.html", "mm.html", "rd.html", "cg.html", "mg.html", "md.html", "poker.html", "regles.html", "legal.html"]
def src(n): return open(os.path.join(D, n), encoding="utf8").read()
def emit(prefix, ext, body):
    h = hashlib.sha1(body.encode()).hexdigest()[:10]
    for old in glob.glob(os.path.join(PUB, "d", prefix + "-" + "[0-9a-f]" * 10 + "." + ext)):
        if not old.endswith(h + "." + ext): os.remove(old)
    open(os.path.join(PUB, "d", prefix + "-" + h + "." + ext), "w", encoding="utf8").write(body)
    return "/d/" + prefix + "-" + h + "." + ext
SK_JS, SK_CSS, JEU, ICO = src("sk.js"), src("sk.css"), src("jeu.css"), src("icones.js")
u_skjs, u_skcss, u_jeu, u_ico = emit("sk", "js", SK_JS), emit("sk", "css", SK_CSS), emit("jeu", "css", JEU), emit("ic", "js", ICO)
H = "[0-9a-f]{10}"
# icônes dessinées (public/d/icons.js, source unique) : copie à empreinte pour toutes les pages
u_icons = emit("icons", "js", open(os.path.join(PUB, "d", "icons.js"), encoding="utf8").read())
for name in [os.path.basename(x) for x in glob.glob(os.path.join(PUB, "*.html"))]:
    p = os.path.join(PUB, name); s = open(p, encoding="utf8").read()
    t = re.sub(r'/d/icons(?:-' + H + r')?\.js', u_icons, s)
    if t != s: open(p, "w", encoding="utf8").write(t)
for name in PAGES:
    p = os.path.join(PUB, name)
    if not os.path.exists(p): continue
    s = open(p, encoding="utf8").read(); n0 = len(s)
    # en-tête du site
    s = re.sub(r'<script id="sk-js">.*?</script>', '<script src="' + u_skjs + '"></script>', s, count=1, flags=re.S)
    s = re.sub(r'<script src="/d/sk-' + H + r'\.js"></script>', '<script src="' + u_skjs + '"></script>', s)
    # habillage
    s = re.sub(r'<style id="sk-css">.*?</style>', '<link rel="stylesheet" href="' + u_skcss + '">', s, count=1, flags=re.S)
    s = re.sub(r'<link rel="stylesheet" href="/d/sk-' + H + r'\.css">', '<link rel="stylesheet" href="' + u_skcss + '">', s)
    # styles communs des jeux : seulement si la page a exactement la même feuille (sinon elle garde la sienne)
    if "<style>" + JEU + "</style>" in s: s = s.replace("<style>" + JEU + "</style>", '<link rel="stylesheet" href="' + u_jeu + '">', 1)
    s = re.sub(r'<link rel="stylesheet" href="/d/jeu-' + H + r'\.css">', '<link rel="stylesheet" href="' + u_jeu + '">', s)
    # icônes « verre »
    if "<script>" + ICO + "</script>" in s: s = s.replace("<script>" + ICO + "</script>", '<script src="' + u_ico + '"></script>', 1)
    s = re.sub(r'<script src="/d/ic-' + H + r'\.js"></script>', '<script src="' + u_ico + '"></script>', s)
    open(p, "w", encoding="utf8").write(s)
    print(f"{name:10s} {n0 // 1024:4d} Ko → {len(s) // 1024:4d} Ko")
print(u_skjs, u_skcss, u_jeu, u_ico, u_icons)
