import lex,random,collections,json,sys
L=lex.load();Z=lex.zipf_map()
dico=set()
for w in open('frwords.txt',encoding='utf8'):
    w=w.strip()
    if w and w.isalpha() and w.islower():
        n=lex.norm(w)
        if len(n)==6: dico.add(n)
BLACK=set(open('rond2_black.txt').read().split())
def wordset(minz):
    return sorted(w for w in dico|{x for x in L if len(x)==6} if w not in BLACK and ((w in L and Z.get(w,0)>=minz-0.8) or (w in dico and Z.get(w,0)>=minz)))
def build_idx(words):
    idx=collections.defaultdict(list)
    for w in words:
        for mask in range(8):
            idx[(w[0] if mask&1 else '.',w[4] if mask&2 else '.',w[5] if mask&4 else '.')].append(w)
    return idx
uses=collections.Counter()
def gen(idx,rnd,C=6,R=3,steps=30000):
    G={};used=set();n=[0];cells=[(c,r) for c in range(C) for r in range(R)]
    def rec(i):
        n[0]+=1
        if n[0]>steps: raise TimeoutError
        if i==len(cells): return True
        c,r=cells[i]
        k=(G[(c,r-1)][3] if r>0 else '.',G[(c-1,r)][2] if c>0 else '.',G[(c-1,r)][1] if c>0 else '.')
        lst=list(idx[k]);rnd.shuffle(lst)
        lst.sort(key=lambda w:(0 if w in L else 1)+0.4*uses[w]+rnd.random()*.3)
        for w in lst[:50]:
            if w in used: continue
            G[(c,r)]=w;used.add(w)
            if rec(i+1): return True
            used.discard(w);del G[(c,r)]
        return False
    try:
        return dict(G) if rec(0) else None
    except TimeoutError: return None
out=[];rnd=random.Random(11)
for lv,n,minz in [('facile',20,3.6),('moyen',20,3.0),('difficile',20,2.4)]:
    idx=build_idx(wordset(minz));k=0
    while k<n:
        g=gen(idx,rnd)
        if not g: continue
        for w in g.values(): uses[w]+=1
        k+=1;out.append({"lvl":lv,"k":k,"g":[[g[(c,r)] for r in range(3)] for c in range(6)]})
allw=collections.Counter(w for o in out for col in o['g'] for w in col)
missing=sorted(w for w in allw if w not in L)
print(len(out),'grilles',len(allw),'mots distincts',len(missing),'sans définition')
json.dump(out,open('rond2_raw.json','w'))
open('rond2_missing.txt','w').write('\n'.join(missing))
