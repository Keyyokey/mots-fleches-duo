# Tourniquet série 6 (14/11/2026) : grilles qui utilisent en priorité les nouveaux mots de dict/d11.txt
# (vocabulaire relevé dans les livres de Juvenal, définitions écrites à la main).
# usage : python3 gen_rond7.py FICHIER_ROND_ACTUEL NB_FACILE NB_MOYEN NB_DIFFICILE SECONDES_PAR_NIVEAU SORTIE
import lex,random,collections,json,sys,time,os
L=lex.load();Z=lex.zipf_map()
H=os.path.dirname(os.path.abspath(__file__))
BLACK=set(open(os.path.join(H,'..','tourniquet','rond2_black.txt')).read().split())
NEW=set(l.split('|')[0] for f in ('d11.txt','d12.txt') for l in open(os.path.join(H,'dict',f),encoding='utf8') if '|' in l)
_s=open(sys.argv[1]).read();old=json.loads(_s[_s.index('=')+1:].rstrip().rstrip(';'))
oldset=collections.Counter(c['w'] for g in old for col in g['cols'] for c in col)
oldkeys=set(tuple(sorted(c['w'] for col in g['cols'] for c in col)) for g in old)
def wordset(lo):return sorted(w for w in L if len(w)==6 and w not in BLACK and (Z.get(w,2.0)>=lo or (w in NEW and lo<2.9)))
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
MINNEW=int(os.environ.get("MINNEW","4"))
NB={'facile':int(sys.argv[2]),'moyen':int(sys.argv[3]),'difficile':int(sys.argv[4])};TL=float(sys.argv[5])
rnd=random.Random(20261114);out=[];clue_n=collections.Counter(oldset);glob=collections.Counter()
nlv=collections.Counter(g['lvl'] for g in old)
for lv,pre,lo in [('facile','F',2.9),('moyen','M',2.4),('difficile','D',0)]:
    if not NB[lv]: continue
    idx=build_idx(wordset(lo));pool=[];seen=set(oldkeys);t0=time.time()
    while time.time()-t0<TL:
        g=gen(idx,rnd)
        if not g: continue
        key=tuple(sorted(g.values()))
        if key in seen: continue
        seen.add(key)
        if sum(w in NEW for w in g.values())>=MINNEW: pool.append(g)
    print(lv,'réserve',len(pool),file=sys.stderr,flush=True)
    picked=[];use=collections.Counter()
    while len(picked)<NB[lv] and pool:
        def cost(g):
            ws=list(g.values());return sum(use[w]**2 for w in ws)*3+6*sum(glob[w]**2 for w in ws)+0.2*sum(oldset[w] for w in ws)-4*sum(w in NEW for w in ws)
        best=min(rnd.sample(pool,min(600,len(pool))),key=cost)
        pool.remove(best);picked.append(best)
        for w in best.values():use[w]+=1;glob[w]+=1
    name={'facile':'Facile','moyen':'Moyen','difficile':'Difficile'}[lv]
    for i,g in enumerate(picked):
        cols=[]
        for c in range(6):
            col=[]
            for r in range(3):
                w=g[(c,r)];opts=L[w];col.append({"w":w,"c":opts[clue_n[w]%len(opts)]});clue_n[w]+=1
            cols.append(col)
        idn=nlv[lv]+1+i;out.append({"id":pre+str(idn).zfill(2),"lvl":lv,"name":f"{name} n°{idn}","cols":cols})
    print(lv,len(picked),'grilles, nouveaux mots par grille :',[sum(w in NEW for w in g.values()) for g in picked],file=sys.stderr)
json.dump(out,open(sys.argv[6],'w'),ensure_ascii=False)
print(len(out),'grilles,',len({c['w'] for g in out for col in g['cols'] for c in col}&NEW),'nouveaux mots utilisés sur',len(NEW))
