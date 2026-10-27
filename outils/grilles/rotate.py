# Fait tourner les définitions des mots fréquents pour éviter les répétitions d'une grille à l'autre.
import sys,json,collections,unicodedata
import base64
NC=10
def pairs(g):
    K=base64.b64decode(g['k']).decode('latin1')[::-1];NR=int(g['nr'])
    isQ=lambda r,c:K[r*NC+c] in '#@'
    out=[]
    for k,lst in g['clues'].items():
        r,c=map(int,k.split(','))
        for i,(t,a) in enumerate(lst):
            sr,sc,dr,dc=r,c,0,0
            if a=='R':sc,dc=c+1,1
            elif a=='D':sr,dr=r+1,1
            elif a=='RD':sc,dr=c+1,1
            else:sr,dc=r+1,1
            w='';rr,cc=sr,sc
            while rr<NR and cc<NC and not isQ(rr,cc):w+=K[rr*NC+cc];rr+=dr;cc+=dc
            out.append((w,t.replace('-\n','').replace('\n',' '),k,i))
    return out
from pools import P
from generate_all import wrap
def plain(s):return ''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)!='Mn').upper()
def ok(ans,clue):return ans not in plain(clue).replace("'"," ").replace("-"," ").split()
def rotate(grids):
    occ=collections.Counter();changed=0
    order=sorted([g for g in grids if g.get('lvl') in('facile','moyen','difficile')],key=lambda g:({'facile':0,'moyen':1,'difficile':2}[g['lvl']],grids.index(g)))
    for g in order:
        for w,t,k,i in pairs(g):
            pool=[c for c in P.get(w,[]) if ok(w,c)]
            if len(pool)<2:continue
            two=len(g['clues'][k])>1
            n=occ[w];occ[w]+=1
            for j in range(len(pool)):
                c=pool[(n+j)%len(pool)];wt=wrap(c)
                if wt.count('\n')<(2 if two else 4):
                    if wt!=g['clues'][k][i][0]:g['clues'][k][i][0]=wt;changed+=1
                    break
    return changed
if __name__=='__main__':
    p=sys.argv[1];G=json.load(open(p));n=rotate(G);json.dump(G,open(p,'w'),ensure_ascii=False,separators=(',',':'));print('définitions variées :',n)
