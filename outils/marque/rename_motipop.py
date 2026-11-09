# Tuilo -> Motipop : nouveau logo dans l'en-tête, nom dans les titres, partages, aperçus et serveur
import re,sys,json
logo=open('/home/claude/brand/logo-site.svg').read().replace('<svg ','<svg style="height:40px;width:auto;display:block;overflow:visible" ',1)
for f in sys.argv[1:]:
  s=open(f,encoding='utf8').read();o=s
  if f.endswith('.html'):
    # remplace le SVG du logo (forme normale et forme échappée dans les gabarits JS)
    s=re.sub(r'(<span class="tlogo"[^>]*>)<svg .*?</svg>(</span>)',lambda m:m.group(1)+logo+m.group(2),s,flags=re.S)
    s=re.sub(r'(<span class=\\"tlogo\\"[^>]*>)<svg .*?</svg>(</span>)',lambda m:m.group(1)+json.dumps(logo,ensure_ascii=True)[1:-1]+m.group(2),s,flags=re.S)
  for a,b in [(' — Tuilo</title>',' — Motipop</title>'),('<title>Tuilo — jeux de mots en ligne entre amis</title>','<title>Motipop — jeux de mots en ligne entre amis</title>'),
              ('title:"Tuilo"','title:"Motipop"'),('Viens jouer sur Tuilo avec moi','Viens jouer sur Motipop avec moi'),('aria-label="Tuilo, retour','aria-label="Motipop, retour'),
              ('content="Tuilo, jeux de mots entre amis','content="Motipop, jeux de mots entre amis'),('content="Tuilo">','content="Motipop">'),('|| "Tuilo";','|| "Motipop";'),
              ('// Tuilo (ex-Mots Fléchés Duo)','// Motipop (ex-Mots Fléchés Duo)'),('console.log("Tuilo en ligne','console.log("Motipop en ligne'),
              ('tuilo-512.png','motipop-512.png'),('tuilo-180.png','motipop-180.png'),('// icônes Tuilo','// icônes Motipop')]:
    s=s.replace(a,b)
  left=len(re.findall(r'Tuilo(?!_)',s))
  print(f,'modifié' if s!=o else 'inchangé','| "Tuilo" restant :',left)
  open(f,'w',encoding='utf8').write(s)
