# Construit public/mg.html : coquille du site prise dans public/mm.html (en-tête, styles, menus, invitations, icônes)
# + écran et moteur de Magnético (mg_body.html, mg_style.css, mg_engine.js). Relancer après chaque modification.
import os, re, glob
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, "..", ".."))
mm = open(os.path.join(ROOT, "public/mm.html"), encoding="utf8").read()
def between(a, b, s=mm, inc_b=True):
    i = s.index(a); j = s.index(b, i + len(a)); return s[i:j + (len(b) if inc_b else 0)]
head = mm[:mm.index("<style>")]
head = head.replace("<title>Mots mêlés — Motipop</title>", "<title>Magnético — Motipop</title>")
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Magnético : reforme le mot avec les syllabes qui s\'entrechoquent, en solo ou jusqu\'à 4 joueurs.">', head)
css_main = between("<style>", "</style>")
css_fl = between("<style>/* mots fléchés : compléments", "</style>")
css_sk = between('<style id="sk-css">', "</style>")
sk_js = between("<script>window.SK_HDR=1;</script>", "</script>\n<script>// données des mots mêlés", inc_b=False)
sk_js = sk_js.replace('/\\/meles\\/?$/.test(location.pathname)?"meles":"fleches"', '/\\/meles\\/?$/.test(location.pathname)?"meles":/\\/magnetico\\/?$/.test(location.pathname)?"magnetico":"fleches"')
inv = between("<script>// ---------- invitations", "</script>")
icons = between("<script>// ---------- fenêtres et boutons", "</script>")
data = sorted(glob.glob(os.path.join(ROOT, "public/d/magnetico-*.js")))[-1]
body = open(os.path.join(D, "mg_body.html"), encoding="utf8").read()
css = open(os.path.join(D, "mg_style.css"), encoding="utf8").read()
eng = open(os.path.join(D, "mg_engine.js"), encoding="utf8").read()
out = (head + css_main + "\n" + css_fl + "\n" + css_sk + '\n<script src="/d/icons.js" defer></script><style id="mg-css">' + css + "</style>\n</head>\n"
  + '<body class="sk-new booting g-mg">\n<div id="skTop" class="skph"></div>\n<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>\n<div class="wrap">\n'
  + '<div id="boot"><span class="spin"></span><b>Préparation de la partie…</b></div><script>setTimeout(function(){document.body.classList.remove("booting")},10000)</script>\n'
  + body + sk_js + "</script>\n"
  + '<script src="/d/' + os.path.basename(data) + '" defer></script>\n<script>' + eng + "</script>\n" + inv + "\n" + icons + "\n</body></html>\n")
open(os.path.join(ROOT, "public/mg.html"), "w", encoding="utf8").write(out)
print("public/mg.html", len(out) // 1024, "Ko")
