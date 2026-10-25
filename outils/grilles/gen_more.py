import sys,json,base64
import generate_all as ga
lv=sys.argv[1];n=int(sys.argv[2]);start=int(sys.argv[3])
# poids : éviter les mots déjà très utilisés dans les 200 premières grilles
for f in ['new_facile.json','new_moyen.json','new_difficile.json']:
    for g in json.load(open(f)):
        R=g['nr'];K=base64.b64decode(g['k']).decode()[::-1]
        for k,cl in g['clues'].items():
            r,c=map(int,k.split(','))
            for t,a in cl:
                sr,sc,dr,dc=r,c,0,0
                if a=='R':sc,dc=c+1,1
                elif a=='D':sr,dr=r+1,1
                elif a=='RD':sc,dr=c+1,1
                else:sr,dc=r+1,1
                w='';rr,cc=sr,sc
                while rr<R and cc<10 and K[rr*10+cc]!='#': w+=K[rr*10+cc];rr+=dr;cc+=dc
                ga.uses[w]+=1
out=ga.gen_level(lv,seed={'facile':111,'moyen':222,'difficile':333}[lv],count=n)
pre=ga.LEVELS[lv]['prefix'];name={'facile':'Facile','moyen':'Moyenne','difficile':'Difficile'}[lv]
for i,g in enumerate(out):
    idx=start+i;g['id']=pre+str(idx).zfill(3);g['page']=pre+str(idx);g['name']=f"{name} n°{idx}"
json.dump(out,open(f'more_{lv}.json','w'),ensure_ascii=False)
