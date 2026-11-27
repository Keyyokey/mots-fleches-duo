# Construit public/ml.html (« Mot libre » : Mot du jour – Journalier / Libre) : en-tête et styles de la page Mot du jour (md.html)
# + corps et moteur propres (ml_body.html). Relancer après une modification de md.html ou de ml_body.html, puis partage.py.
import os, re
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, "..", ".."))
md = open(os.path.join(ROOT, "public", "md.html"), encoding="utf8").read()
head = md[:md.index('<body')]
head = re.sub(r"<title>.*?</title>", "<title>Mot libre — le Mot du jour à volonté, de 3 à 12 lettres — Motipop</title>", head, count=1)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Joue au Mot du jour autant que tu veux : mots de 3 à 12 lettres, mode Progressif, chronomètre au choix. Gratuit, sans inscription.">', head, count=1)
CSS = """<style id="mlcss">
/* Mot libre (26/11) : bleu pervenche pour le distinguer du Mot du jour (corail) */
.g-ml .mdc.first{color:#7c9bff}.g-ml .mdc.cur{border-color:rgba(124,155,255,.75);box-shadow:0 0 0 2px rgba(124,155,255,.25)}
.g-ml .mdrow{gap:var(--gap,6px)}.g-ml .md{min-width:0}.g-ml .mdgrid{overflow:hidden}.g-ml .mdgrid{gap:var(--gap,6px)}
.mlclock{font:800 1.05rem Nunito,Inter,sans-serif;padding:4px 12px;border-radius:999px;background:rgba(124,155,255,.15);border:1px solid rgba(124,155,255,.4)}.mlclock.low{color:#fff;background:#e5484d;border-color:#e5484d;animation:mlblink 1s infinite}
@keyframes mlblink{50%{opacity:.6}}
.g-ml .mdcount{background:rgba(124,155,255,.14);border-color:rgba(124,155,255,.35)}
.mlpal{display:flex;gap:4px;margin-top:10px}.mlpal span{flex:1;text-align:center;padding:3px 0;border-radius:8px;font:800 .78rem Nunito,Inter,sans-serif;background:var(--glass);border:1px solid var(--stroke);color:var(--muted)}
.mlpal span.ok{background:linear-gradient(135deg,#14b8a6,#0e9f8f);color:#fff;border-color:transparent}.mlpal span.now{border-color:#7c9bff;color:var(--ink);box-shadow:0 0 0 2px rgba(124,155,255,.25)}
.mlset h3{margin:0 0 8px}.mllab{font:700 .8rem Inter,sans-serif;color:var(--muted);margin:10px 0 6px}
.mllens{display:flex;flex-wrap:wrap;gap:6px}.mllens button{flex:1 0 34px;min-height:38px;border-radius:12px;border:1px solid var(--stroke);background:var(--glass);color:var(--ink);font:800 .9rem Nunito,Inter,sans-serif;cursor:pointer}
.mllens button.on,.g-ml .mdtabs button.on{background:linear-gradient(135deg,#00ADB5,#7c6bff);color:#fff;border-color:transparent}
.mlhelp{margin:10px 0}.mlset #mlGo{width:100%}
.mldist{display:flex;flex-direction:column;gap:4px;margin-top:10px}.mldist div{display:flex;align-items:center;gap:6px;font:700 .8rem Inter,sans-serif}.mldist span{width:14px;color:var(--muted)}
.mldist i{display:block;height:18px;border-radius:6px;background:linear-gradient(90deg,#14b8a6,#7c9bff);color:#fff;font-style:normal;font-size:.72rem;line-height:18px;padding:0 6px;text-align:right;min-width:4%}
.g-ml #mdBar{display:flex;gap:8px}.g-ml #mlGive{margin-right:auto}
.g-ml .mdend .w{font:900 1.6rem Nunito,Inter,sans-serif;letter-spacing:.08em;margin:6px 0}
body.g-ml.mdpc #mdOk,body.g-ml.mdpc #mdDel{display:inline-flex!important}
/* 27/11 : page épurée — pas de barre du site, stats dans une fenêtre */
.g-ml .gtop .mlstb{flex:0 0 auto;margin-left:auto}.g-ml .gtop .mlstb svg{color:#7c9bff}
.mlov{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(5,10,25,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.mlov[hidden]{display:none}
.mlov .mlbox{position:relative;width:min(420px,100%);max-height:86vh;overflow:auto;margin:0;animation:mlpop .2s ease-out}.mlov h3{margin:0 46px 14px 0;min-height:36px;display:flex;align-items:center;justify-content:flex-start;gap:8px}.mlov h3 small{color:var(--muted);font-weight:600}
.mlx{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:12px;border:1px solid var(--stroke);background:var(--glass2);color:var(--ink);font:700 1.3rem/1 Inter,sans-serif;cursor:pointer}
@keyframes mlpop{from{transform:scale(.96);opacity:0}}
body.sk-nohdr #skTop{min-height:0}
/* 27/11 : diagramme en colonnes — abscisse : nombre de lettres, ordonnée : mots trouvés */
.mllg{font:700 .8rem Inter,sans-serif;color:var(--muted);margin:0 0 6px}.mlov .mldist{margin:0 0 14px}
.mlcols{display:flex;align-items:flex-end;gap:5px;height:120px;padding:0 2px;border-bottom:1px solid var(--stroke)}
.mlcol{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
.mlcol i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:linear-gradient(0deg,#14b8a6,#7c9bff);transition:height .3s}
.mlcol b{font:800 .75rem Nunito,Inter,sans-serif;margin-bottom:3px;min-height:1em}
.mlcol span{position:absolute;bottom:-20px;font:700 .75rem Inter,sans-serif;color:var(--muted)}
.mldist .mlax{display:block;text-align:center;font:600 .72rem Inter,sans-serif;color:var(--muted);margin-top:24px}
</style>
"""
body = open(os.path.join(D, "ml_body.html"), encoding="utf8").read()
tail = md[md.index('<script>window.SK_HDR=1;</script>'):]
tail = tail[:tail.index('\n') + 1] + '<script src="/d/icons-8d7b87098e.js" defer></script>\n</body></html>\n'
out = head.replace("</head>", CSS + "</head>") if "</head>" in head else head + CSS
open(os.path.join(ROOT, "public", "ml.html"), "w", encoding="utf8").write(out + body + tail)
print("public/ml.html", len(out + body + tail) // 1024, "Ko")
