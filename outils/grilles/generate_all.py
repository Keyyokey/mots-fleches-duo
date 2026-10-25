import sys,random,json,base64,time,collections
import os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import fill,lex
L=lex.load();Z=lex.zipf_map()
SHORT_OK={w for w in L if len(w)==2}
LEVELS={
 'facile':   dict(n=70,R=10,maxlen=6,density=0.25,minz=3.0,max2=7,prefix='F'),
 'moyen':    dict(n=70,R=13,maxlen=7,density=0.25,minz=2.3,max2=11,prefix='M'),
 'difficile':dict(n=60,R=15,maxlen=8,density=0.27,minz=0.0,max2=13,prefix='D'),
}
uses=collections.Counter()
def wrap(t,width=10):
    t=t.upper().replace("’","'")
    out=[];line=""
    for w in t.split():
        while len(w)>width:
            if line: out.append(line); line=""
            out.append(w[:width-1]+"-"); w=w[width-1:]
        if not line: line=w
        elif len(line)+1+len(w)<=width: line+=" "+w
        else: out.append(line); line=w
    if line: out.append(line)
    return "\n".join(out)
ORDER={'R':0,'RD':0,'D':1,'DR':1}
def make_def(P,G,S,level,idx,rnd,cfg):
    R=len(G)
    clues=collections.defaultdict(list)
    for s in S:
        w=''.join(G[r][c] for r,c in s[4])
        cl,arrow=fill.clue_cell(s)
        opts=L[w]; txt=rnd.choice(opts)
        clues[cl].append((ORDER[arrow],[wrap(txt),arrow],w))
        uses[w]+=1
    cd={}
    for (r,c),lst in clues.items():
        lst.sort(key=lambda x:x[0]); cd[f"{r},{c}"]=[x[1] for x in lst]
    letters=[(r,c) for r in range(R) for c in range(10) if G[r][c]!='#']
    # mystery word
    myst="";hint="";nums={}
    if rnd.random()<0.65:
        cands=[w for w in L if 5<=len(w)<=8 and Z.get(w,0)>=3.6]
        rnd.shuffle(cands)
        for w in cands[:300]:
            pool=collections.defaultdict(list)
            for (r,c) in letters: pool[G[r][c]].append((r,c))
            pick=[];ok=True;usedc=set()
            for i,ch in enumerate(w):
                opts=[x for x in pool[ch] if x not in usedc]
                if not opts: ok=False;break
                x=rnd.choice(opts);usedc.add(x);pick.append(x)
            if ok:
                myst=w;hint="Indice : "+rnd.choice(L[w]).rstrip('.').lower()+"."
                nums={f"{r},{c}":i+1 for i,(r,c) in enumerate(pick)}
                break
    # paper letters (only used at Facile): ~14% of letters, avoid completing words
    paper=[]
    k=max(4,int(len(letters)*0.14))
    for (r,c) in rnd.sample(letters,len(letters)):
        if len(paper)>=k: break
        if f"{r},{c}" in nums: continue
        paper.append(f"{r},{c}")
    flat=''.join(G)
    kk=base64.b64encode(flat[::-1].encode()).decode()
    name={'facile':'Facile','moyen':'Moyenne','difficile':'Difficile'}[level]
    return dict(id=cfg['prefix']+str(idx).zfill(3),page=f"{cfg['prefix']}{idx}",name=f"{name} n°{idx}",lvl=level,hint=hint,myst=myst,clues=cd,nums=nums,paper=paper,alt={},dash=[],nr=R,k=kk)
def gen_level(level,seed=1,count=None):
    cfg=LEVELS[level];rnd=random.Random(seed)
    words=[w for w in L if len(w)==2 or Z.get(w,0)>=cfg['minz']]
    out=[];tries=0;t0=time.time()
    n=count or cfg['n']
    while len(out)<n:
        tries+=1
        D=fill.Dict(words,weight={w:max(0.5,Z.get(w,2.5) if len(w)>2 else 2.0)/(1+0.6*uses[w]) for w in words})
        for _ in range(12):
            P=fill.random_pattern(cfg['R'],rnd,density=cfg['density'],maxlen=cfg['maxlen'])
            if not P: continue
            S=fill.slots_of(P)
            if sum(1 for s in S if s[3]==2)>cfg['max2']: continue
            G,S=fill.fill(P,D,rnd,max_steps=3000)
            if G:
                out.append(make_def(P,G,S,level,len(out)+1,rnd,cfg))
                break
    print(level,len(out),'grids',tries,'rounds',round(time.time()-t0,1),'s',file=sys.stderr)
    return out
if __name__=='__main__':
    lv=sys.argv[1]
    allg=gen_level(lv,seed={'facile':11,'moyen':22,'difficile':33}[lv])
    json.dump(allg,open(f'new_{lv}.json','w'),ensure_ascii=False)
    print(len(allg), 'top uses', uses.most_common(25))
