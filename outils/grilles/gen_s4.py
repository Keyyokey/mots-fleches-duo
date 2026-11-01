# 4e série (1/11/2026) : nouvelles grilles qui évitent les mots déjà très utilisés dans les 917 grilles en ligne
import sys,json,base64,re
import generate_all as ga
lv=sys.argv[1];n=int(sys.argv[2]);start=int(sys.argv[3]);num0=int(sys.argv[4]);seed=int(sys.argv[5])
s=open('/home/claude/fleches-site/public/d/grilles-57e875d450.js').read();ALL=json.loads(s[s.index('=')+1:].rstrip().rstrip(';'))
for g in ALL:
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
            while 0<=rr<R and 0<=cc<10 and K[rr*10+cc]!='#': w+=K[rr*10+cc];rr+=dr;cc+=dc
            ga.uses[w]+=1
out=ga.gen_level(lv,seed=seed,count=n)
pre=ga.LEVELS[lv]['prefix'];name={'facile':'Facile','moyen':'Moyen','difficile':'Difficile'}[lv]
for i,g in enumerate(out):
    g['id']=pre+str(start+i).zfill(3);g['page']=pre+str(start+i);g['name']=f"{name} n°{num0+i}"
json.dump(out,open(f's4_{lv}.json','w'),ensure_ascii=False)
print(lv,len(out),'ok')
