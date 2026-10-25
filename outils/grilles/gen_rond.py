import lex,random,json,collections,unicodedata
L=lex.load();Z=lex.zipf_map()
def short(c):  # définition la plus courte (tient dans le rond)
    return min(L[c],key=len)
w6=[w for w in L if len(w)==6 and len(short(w))<=34]
rnd=random.Random(7)
uses=collections.Counter()
def pool(minz): return [w for w in w6 if Z.get(w,0)>=minz]
LV=[('facile',40,3.6),('moyen',40,2.8),('difficile',30,0)]
out=[]
for lv,n,minz in LV:
    CAP={"facile":2,"moyen":2,"difficile":5}[lv]
    P=pool(minz);by0=collections.defaultdict(list)
    for w in P: by0[w[0]].append(w)
    k=0;tries=0
    while k<n and tries<20000:
        tries+=1
        cols=[];used=set();ok=True
        for c in range(6):
            got=None
            for _ in range(200):
                a=rnd.choice(P)
                if a in used or uses[a]>CAP: continue
                bs=[b for b in by0[a[3]] if b not in used and b!=a and uses[b]<=CAP]
                if not bs: continue
                b=rnd.choice(bs)
                cs=[x for x in by0[b[3]] if x not in used and x not in (a,b) and uses[x]<=CAP]
                if not cs: continue
                x=rnd.choice(cs);got=(a,b,x);break
            if not got: ok=False;break
            cols.append(got);used|=set(got)
        if not ok: continue
        for col in cols:
            for w in col: uses[w]+=1
        k+=1
        out.append({"id":lv[0].upper()+str(k).zfill(2),"lvl":lv,"name":{"facile":"Facile","moyen":"Moyen","difficile":"Difficile"}[lv]+" n°"+str(k),
          "cols":[[{"w":w,"c":rnd.choice(L[w]) if lv!='facile' else short(w)} for w in col] for col in cols]})
print(len(out),collections.Counter(o['lvl'] for o in out))
json.dump(out,open('rond.json','w'),ensure_ascii=False,separators=(',',':'))
print(json.dumps(out[0],ensure_ascii=False)[:600])
