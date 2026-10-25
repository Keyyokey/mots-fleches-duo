import random, time
from collections import defaultdict
C=10
def forced_letter(r,c):
    return (r==1 and c%2==1) or (c==1 and r%2==1)
def fixed(r,c):
    if r==0: return '#' if c%2==0 else 'L'
    if c==0: return '#' if r%2==0 else 'L'
    return None
def slots_of(P):
    R=len(P); S=[]
    for r in range(R):
        c=0
        while c<C:
            if P[r][c]=='#': c+=1; continue
            sc=c
            while c<C and P[r][c]!='#': c+=1
            if c-sc>=2: S.append(('A',r,sc,c-sc,[(r,x) for x in range(sc,c)]))
    for c in range(C):
        r=0
        while r<R:
            if P[r][c]=='#': r+=1; continue
            sr=r
            while r<R and P[r][c]!='#': r+=1
            if r-sr>=2: S.append(('D',sr,c,r-sr,[(x,c) for x in range(sr,r)]))
    return S
def clue_cell(s):
    d,r,c,L,_=s
    if d=='A': return ((r,c-1),'R') if c>0 else ((r-1,0),'DR')
    return ((r-1,c),'D') if r>0 else ((0,c-1),'RD')
def valid_pattern(P, maxlen=8):
    R=len(P)
    S=slots_of(P)
    cov=defaultdict(int); cnt=defaultdict(int)
    for s in S:
        for x in s[4]: cov[x]+=1
        cl,_=clue_cell(s)
        if P[cl[0]][cl[1]]!='#': return False
        cnt[cl]+=1
        if s[3]>maxlen and not (s[1]==0 or s[2]==0): return False
    for r in range(R):
        for c in range(C):
            if P[r][c]=='#':
                if not (1<=cnt[(r,c)]<=2): return False
            elif cov[(r,c)]==0: return False
    return True
def random_pattern(R, rnd, density=0.2, maxlen=8, tries=5000):
    for _ in range(tries):
        P=[[None]*C for _ in range(R)]
        for r in range(R):
            for c in range(C):
                f=fixed(r,c)
                if f=='#': P[r][c]='#'
                elif f=='L': P[r][c]='.'
                elif forced_letter(r,c) or (r==R-1 and c==C-1): P[r][c]='.'
                else:
                    # avoid 2x2 clue blocks and adjacent horizontal clue pairs mostly
                    p=density
                    if P[r][c-1]=='#' : p*=0.15
                    if P[r-1][c]=='#': p*=0.15
                    # force break of long runs
                    runa=0; x=c-1
                    while x>=0 and P[r][x]=='.': runa+=1; x-=1
                    rund=0; y=r-1
                    while y>=0 and P[y][c]=='.': rund+=1; y-=1
                    if runa==2: p*=0.45
                    if rund==2: p*=0.45
                    if runa>=maxlen or rund>=maxlen: p=1
                    P[r][c]='#' if rnd.random()<p else '.'
        P=[''.join(row) for row in P]
        if valid_pattern(P,maxlen): return P
    return None
class Dict:
    def __init__(s, words, weight=None):
        s.bylen=defaultdict(list)
        for w in words: s.bylen[len(w)].append(w)
        s.idx={}  # (L,pos,ch)->bitset
        s.all={}
        for L,ws in s.bylen.items():
            s.all[L]=(1<<len(ws))-1
            for i,w in enumerate(ws):
                for p,ch in enumerate(w):
                    k=(L,p,ch); s.idx[k]=s.idx.get(k,0)|(1<<i)
        s.weight=weight or {}
    def cands(s,L,pat):
        b=s.all.get(L,0)
        for p,ch in enumerate(pat):
            if ch!='.':
                b&=s.idx.get((L,p,ch),0)
                if not b: return 0
        return b
def bits(b):
    while b:
        l=b&-b; yield l.bit_length()-1; b^=l
def popcount(b): return bin(b).count('1')
def fill(P, D, rnd, max_steps=20000, preferred=None):
    R=len(P)
    S=slots_of(P)
    G=[list(row) for row in P]
    cell_slots=defaultdict(list)
    for i,s in enumerate(S):
        for x in s[4]: cell_slots[x].append(i)
    assigned=[None]*len(S); used=set(); steps=[0]
    def pat(i): return ''.join(G[r][c] for r,c in S[i][4])
    def rec():
        steps[0]+=1
        if steps[0]>max_steps: raise TimeoutError
        best=None;bc=None;bn=1<<60
        for i,s in enumerate(S):
            if assigned[i] is not None: continue
            p=pat(i)
            if '.' not in p:
                if p in used: return False
                continue
            b=D.cands(s[3],p)
            n=popcount(b) if b else 0
            if n==0: return False
            if n<bn: bn=n;best=i;bc=b
        if best is None:
            # all filled: assign completed words, check uniqueness
            ws=[pat(i) for i in range(len(S))]
            if len(set(ws))!=len(ws): return False
            for i in range(len(S)): assigned[i]=ws[i]
            return True
        L=S[best][3]; lst=D.bylen[L]
        ids=list(bits(bc))
        rnd.shuffle(ids)
        if D.weight: ids.sort(key=lambda j: -D.weight.get(lst[j],0)*rnd.random())
        for j in ids[:40]:
            w=lst[j]
            if w in used: continue
            changed=[]
            for (r,c),ch in zip(S[best][4],w):
                if G[r][c]=='.': G[r][c]=ch; changed.append((r,c))
            # forward check crossing slots
            ok=True
            for x in changed:
                for k in cell_slots[x]:
                    if k==best: continue
                    if not D.cands(S[k][3],pat(k)): ok=False;break
                if not ok: break
            if ok:
                assigned[best]=w; used.add(w)
                if rec(): return True
                assigned[best]=None; used.discard(w)
            for r,c in changed: G[r][c]='.'
        return False
    try:
        if rec(): return [''.join(row) for row in G], S
    except TimeoutError: pass
    return None, S
