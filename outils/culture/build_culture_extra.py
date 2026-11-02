# Culture G, série 2 (2/11/2026) :
#  - questions OpenQuizzDB (openquizzdb.org, licence CC BY-SA 4.0, copie github.com/Zeuh/OpenQuizzDB)
#  - drapeaux des 193 pays de l'ONU (dessins flag-icons, licence MIT ; noms français : world-countries, ODbL)
import json,glob,random,re,os,shutil,collections
R=random.Random(20261102)
def clean(s):return re.sub(r'\s+',' ',str(s).replace('\x92',"'").replace('\xa0',' ').replace('’',"'")).strip()
BAN=re.compile(r"Actu people|People ?:|Potins|Traci Lords|Jenna Jameson|Playboy|Clara Morgane|Pamela Anderson|Wags|Belles du cinéma|Rétrospective|C'était en 2019|Omicron|COVID|Donald Trump|Meghan Markle|Britney Spears|Charlize Theron|Stars mondiales|Célébrités",re.I)
BADW=re.compile(r"\b(porn\w*|sexe|sexy|sexuel\w*|érotique\w*|nu(e|es)?\b|strip\w*)",re.I)
out=[];seen=set();th_n=collections.Counter()
for f in sorted(glob.glob('/home/claude/zeuh/openquizzdb/data/*.json')):
    try:d=json.load(open(f))
    except Exception:continue
    th=clean(d.get('thème',''));
    if not th or BAN.search(th):continue
    short=re.sub(r'\s*\(.*$','',th).strip()
    qz=d.get('quizz',{})
    if isinstance(qz,dict) and 'fr' in qz:qz=qz['fr']
    if not isinstance(qz,dict):continue
    for lv,take in (('débutant',5),('confirmé',5),('expert',4)):
        L=[q for q in qz.get(lv,[]) if isinstance(q,dict)]
        R.shuffle(L);k=0
        for q in L:
            if k>=take:break
            P=[clean(p) for p in q.get('propositions',[])];a=clean(q.get('réponse',''));qq=clean(q.get('question',''))
            if len(P)!=4 or len(set(P))!=4 or a not in P or not qq or len(qq)>200 or max(map(len,P))>48:continue
            if BADW.search(qq+' '+' '.join(P)+' '+q.get('anecdote','')):continue
            key=qq.lower()
            if key in seen:continue
            seen.add(key);k+=1
            out.append({"t":short[:40],"q":qq,"a":[a]+[p for p in P if p!=a],"x":clean(q.get('anecdote',''))[:320],"s":"OpenQuizzDB · CC BY-SA 4.0","src":"https://www.openquizzdb.org/"})
            th_n[short]+=1
json.dump(out,open('/home/claude/newsite/culture_oqdb.json','w'),ensure_ascii=False)
print('OpenQuizzDB',len(out),'questions,',len(th_n),'thèmes')
# drapeaux
C=json.load(open('/home/claude/dl/npm/world-countries-5.1.0/package/countries.json'))
U=[c for c in C if c['unMember']]
name={c['cca2']:clean(c['translations']['fra']['common']) for c in U}
fl=[];D='/home/claude/fleches-site/public/d/'
for f in glob.glob(D+'flag-*.svg'):os.remove(f)
for c in U:
    cc=c['cca2'];same=[x['cca2'] for x in U if x['cca2']!=cc and x['subregion']==c['subregion']]
    reg=[x['cca2'] for x in U if x['cca2']!=cc and x['region']==c['region'] and x['cca2'] not in same]
    R.shuffle(same);R.shuffle(reg);pool=(same+reg)[:3]
    if len(pool)<3:pool+=R.sample([x['cca2'] for x in U if x['cca2'] not in pool+[cc]],3-len(pool))
    shutil.copy('/home/claude/dl/npm/flag-icons-7.2.3/package/flags/4x3/'+cc.lower()+'.svg',D+'flag-'+cc.lower()+'.svg')
    cap=', '.join(c.get('capital') or [])
    fl.append({"t":"Drapeaux","q":"À quel pays appartient ce drapeau ?","a":[name[cc]]+[name[x] for x in pool],
      "x":name[cc]+(" — capitale : "+cap if cap else "")+". Région : "+{'Africa':'Afrique','Americas':'Amériques','Asia':'Asie','Europe':'Europe','Oceania':'Océanie'}.get(c['region'],c['region'])+".",
      "img":"/d/flag-"+cc.lower()+".svg","cr":"Drapeau · flag-icons (MIT)","s":"flag-icons · world-countries"})
json.dump(fl,open('/home/claude/newsite/culture_flags.json','w'),ensure_ascii=False)
print('Drapeaux',len(fl))
