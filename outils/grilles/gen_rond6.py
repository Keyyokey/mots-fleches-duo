# Tourniquet série 3 : on produit beaucoup de grilles au hasard, puis on choisit les 200 les plus variées par niveau.
import lex,random,collections,json,sys,time
L=lex.load();Z=lex.zipf_map()
BLACK=set(open('rond2_black.txt').read().split())
_s=open('/home/claude/fleches-site/public/d/rond-6502582c71.js').read();old=json.loads(_s[_s.index('=')+1:].rstrip().rstrip(';'))
oldset=collections.Counter(c['w'] for g in old for col in g['cols'] for c in col)
def wordset(lo):return sorted(w for w in L if len(w)==6 and w not in BLACK and Z.get(w,2.0)>=lo)
def build_idx(words):
    idx=collections.defaultdict(list)
    for w in words:
        for mask in range(8):
            idx[(w[0] if mask&1 else '.',w[4] if mask&2 else '.',w[5] if mask&4 else '.')].append(w)
    return idx
def gen(idx,rnd,steps=8000):
    G={};used=set();n=[0];cells=[(c,r) for c in range(6) for r in range(3)]
    def rec(i):
        n[0]+=1
        if n[0]>steps: raise TimeoutError
        if i==18: return True
        c,r=cells[i]
        k=(G[(c,r-1)][3] if r>0 else '.',G[(c-1,r)][2] if c>0 else '.',G[(c-1,r)][1] if c>0 else '.')
        lst=list(idx[k]);rnd.shuffle(lst)
        for w in lst[:80]:
            if w in used: continue
            G[(c,r)]=w;used.add(w)
            if rec(i+1): return True
            used.discard(w);del G[(c,r)]
        return False
    try: return dict(G) if rec(0) else None
    except TimeoutError: return None
N=int(sys.argv[1]);POOL=int(sys.argv[2]);TL=float(sys.argv[3])
rnd=random.Random(20261102);out=[];clue_n=collections.Counter();glob=collections.Counter()
NL={'facile':34,'moyen':33,'difficile':33};START={'facile':288,'moyen':288,'difficile':287}
BK=set(l.split('|')[0] for l in open('dict/livres.txt') if '|' in l and len(l.split('|')[0])==6)
for lv,pre,lo in [('facile','F',2.9),('moyen','M',2.4),('difficile','D',0)]:
    N=NL[lv]
    idx=build_idx(wordset(lo));pool=[];seen=set();t0=time.time()
    while len(pool)<POOL and time.time()-t0<TL:
        g=gen(idx,rnd)
        if not g: continue
        key=tuple(sorted(g.values()))
        if key in seen: continue
        seen.add(key);pool.append(g)
    print(lv,'réserve',len(pool),round(time.time()-t0),'s',file=sys.stderr,flush=True)
    lvuse=collections.Counter();hist=[];picked=[]
    while len(picked)<N and pool:
        recent=set().union(*hist[-6:]) if hist else set()
        best=None;bc=1e9
        for g in rnd.sample(pool,min(400,len(pool))):
            ws=list(g.values())
            c=sum(lvuse[w]**2 for w in ws)+0.5*sum(glob[w] for w in ws)+0.3*sum(oldset[w] for w in ws)+20*len(recent&set(ws))-6*len(BK&set(ws))
            if c<bc:bc=c;best=g
        pool.remove(best);picked.append(best);hist.append(set(best.values()))
        for w in best.values():lvuse[w]+=1;glob[w]+=1
    name={'facile':'Facile','moyen':'Moyen','difficile':'Difficile'}[lv]
    for i,g in enumerate(picked):
        cols=[]
        for c in range(6):
            col=[]
            for r in range(3):
                w=g[(c,r)];opts=L[w];col.append({"w":w,"c":opts[clue_n[w]%len(opts)]});clue_n[w]+=1
            cols.append(col)
        idn=START[lv]+i;out.append({"id":pre+str(idn).zfill(2),"lvl":lv,"name":f"{name} n°{idn}","cols":cols})
    print(lv,len(picked),'choisies, mot le plus répété :',lvuse.most_common(3),file=sys.stderr,flush=True)
json.dump(out,open('rond_s5.json','w'),ensure_ascii=False)
print(len(out),'grilles',len(glob),'mots distincts',glob.most_common(6))
