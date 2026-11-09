# Gabarit commun des pages d'information (règles, légal) — style verre de Motipop
LOGO=open('/home/claude/brand/logo-site.svg').read().replace('<svg ','<svg style="height:38px;width:auto;display:block;overflow:visible" ',1)
CSS='''
:root{--bg1:#141a2b;--ink:#eef2f7;--mut:#b9c3d6;--glass:rgba(255,255,255,.07);--stroke:rgba(255,255,255,.16);--a1:#2DE2C8;--a2:#A26BFF}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);font:400 16px/1.6 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at 12% 0%,#3b2a6b 0,transparent 45%),radial-gradient(circle at 90% 85%,#0d5d63 0,transparent 45%),var(--bg1);background-attachment:fixed;min-height:100vh}
.wrap{max-width:860px;margin:0 auto;padding:16px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;border-radius:22px;background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
header a.home{display:block;line-height:0}header nav a{color:var(--mut);text-decoration:none;font-weight:700;font-size:.9rem;padding:8px 12px;border-radius:12px;border:1px solid var(--stroke)}
h1{font:800 clamp(1.7rem,5vw,2.4rem)/1.15 Nunito,Inter,sans-serif;margin:28px 4px 6px}h1 em{font-style:italic;background:linear-gradient(90deg,var(--a1),var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{color:var(--mut);margin:0 4px 18px}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.toc a{color:var(--ink);text-decoration:none;font-weight:700;font-size:.9rem;padding:8px 14px;border-radius:999px;background:var(--glass);border:1px solid var(--stroke)}
.toc a:hover,.toc a:focus-visible{border-color:var(--a1);outline:none}
.card{background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.04));border:1px solid var(--stroke);border-radius:22px;padding:18px 20px;margin:0 0 14px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);scroll-margin-top:16px}
.card h2{font:800 1.25rem/1.3 Nunito,Inter,sans-serif;margin:0 0 8px;display:flex;align-items:center;gap:10px}
.card h3{font:800 1rem Nunito,Inter,sans-serif;margin:14px 0 4px;color:#d9f7f2}
.card p,.card li{color:#dfe5ef}.card ul{padding-left:20px;margin:6px 0}.card li{margin:3px 0}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:.94rem}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.1)}th{color:var(--mut);font-weight:700}
.pill{display:inline-block;padding:1px 9px;border-radius:999px;font-weight:800;font-size:.8rem;background:rgba(45,226,200,.18);border:1px solid rgba(45,226,200,.45);color:#c9fff6}
.note{font-size:.88rem;color:var(--mut)}a{color:#8ff5e6}
footer{margin:26px 4px 30px;color:var(--mut);font-size:.85rem;display:flex;flex-wrap:wrap;gap:6px 16px}footer a{color:var(--mut)}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
'''
def page(title,desc,body):
  return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — Motipop</title><meta name="description" content="{desc}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>{CSS}</style><script src="/d/icons.js" defer></script></head><body><div class="wrap">
<header><a class="home" href="/" aria-label="Motipop, retour à l'accueil"><span class="tlogo">{LOGO}</span></a><nav><a href="/">← Jouer</a></nav></header>
{body}
<footer><a href="/regles">Règles et jetons</a><a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/conditions">Conditions d'utilisation</a><span>© 2026 Motipop</span></footer>
</div></body></html>'''
