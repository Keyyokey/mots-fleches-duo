# Passe le site au nom Tuilo (logo animé, titres, partage, icônes). Usage : python3 rebrand.py fichier.html [...]
import re,sys,json
logo=open('/home/claude/brand/logo-site.svg').read().replace('<svg ','<svg style="height:40px;width:auto;display:block;overflow:visible" ',1)
TAG='<small style="display:block;margin:3px 0 0 4px;font:800 .62rem Nunito,Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;opacity:.75;color:#e6ecf5;-webkit-text-fill-color:#e6ecf5;background:none">jeux de mots entre amis</small>'
SPAN='<span class="tlogo" style="display:block;line-height:0;margin:0;padding:0;opacity:1;background:none;-webkit-text-fill-color:initial">'+logo+'</span>'
for f in sys.argv[1:]:
  s=open(f,encoding='utf8').read();o=s;home='id="logoHome"' in s
  plain=re.compile(r'<svg class="mascot".*?</svg><b>MOTS FLÉCHÉS</b><span>duo</span>',re.S)
  s=plain.sub(lambda m:SPAN+(TAG if home else ''),s)
  esc=re.compile(r'<svg class=\\"mascot\\".*?</svg><b>MOTS FL\\u00c9CH\\u00c9S</b><span>duo</span>',re.S)
  s=esc.sub(lambda m:json.dumps(SPAN,ensure_ascii=True)[1:-1],s)
  s=s.replace(' — Mots Fléchés Duo</title>',' — Tuilo</title>').replace('<title>Mots Fléchés Duo</title>','<title>Tuilo — jeux de mots en ligne entre amis</title>')
  s=s.replace('title:"Mots Fléchés Duo"','title:"Tuilo"').replace('"Viens jouer aux mots fléchés avec moi : "','"Viens jouer sur Tuilo avec moi : "')
  s=s.replace('aria-label="Mots Fléchés Duo, retour à l\'accueil"','aria-label="Tuilo, retour à l\'accueil"')
  s=re.sub(r'<link rel="icon" href="data:image/svg\+xml[^"]*">','<link rel="icon" href="/favicon.svg" type="image/svg+xml">',s)
  s=s.replace('<link rel="icon" href="/favicon.ico">','<link rel="icon" href="/favicon.svg" type="image/svg+xml">')
  if 'apple-touch-icon' not in s: s=s.replace('<link rel="icon" href="/favicon.svg" type="image/svg+xml">','<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">',1)
  s=s.replace('<meta name="description" content="Mots fléchés, Tourniquet','<meta name="description" content="Tuilo, jeux de mots entre amis : mots fléchés, Tourniquet',1)
  print(f, 'modifié' if s!=o else 'inchangé', '| ancien logo restant :', len(plain.findall(s))+len(esc.findall(s)), '| Tuilo :', s.count('tlogo'))
  open(f,'w',encoding='utf8').write(s)
