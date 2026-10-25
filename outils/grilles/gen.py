import random, unicodedata, sys, time
def norm(w):
    w=unicodedata.normalize('NFD',w.upper())
    w=''.join(ch for ch in w if unicodedata.category(ch)!='Mn').replace('Œ','OE').replace('Æ','AE')
    return w
class Trie:
    __slots__=('k','end')
    def __init__(s): s.k={}; s.end=False
def build(words):
    root=Trie()
    for w in words:
        n=root
        for ch in w: n=n.k.setdefault(ch,Trie())
        n.end=True
    return root
FREQ="EASITNRULOMDPCBGHVFQJXYZKW"
def generate(words, R, C=10, seed=None, clue_p=0.18, max_steps=200000, used_penalty=None):
    rnd=random.Random(seed)
    root=build(words)
    G=[[None]*C for _ in range(R)]   # '#' or letter
    acr=[[None]*C for _ in range(R)] # (startc, node) for letters
    dwn=[[None]*C for _ in range(R)]
    cnt={}  # clue cell -> count
    used=set()
    cells=[(r,c) for r in range(R) for c in range(C)]
    steps=[0]
    def fixed(r,c):
        if r==0: return '#' if c%2==0 else 'L'
        if c==0: return '#' if r%2==0 else 'L'
        return None
    def run_word(r,c,dr,dc,length):
        return ''.join(G[r+i*dr][c+i*dc] for i in range(length))
    def clue_of_across(r,sc):
        return (r,sc-1) if sc>0 else (r-1,0)
    def clue_of_down(sr,c):
        return (sr-1,c) if sr>0 else (0,c-1)
    def close_across(r,c):  # run ends just before column c ; returns token or False
        if c==0 or G[r][c-1]=='#': return ()
        sc,node=acr[r][c-1]; L=c-sc
        if L==1: return ('a1',)
        if not node.end: return False
        w=run_word(r,sc,0,1,L)
        if w in used: return False
        cl=clue_of_across(r,sc)
        if G[cl[0]][cl[1]]!='#' or cnt.get(cl,0)>=2: return False
        return ('a',cl,w)
    def close_down(r,c):
        if r==0 or G[r-1][c]=='#': return ()
        sr,node=dwn[r-1][c]; L=r-sr
        if L==1: return ('d1',)
        if not node.end: return False
        w=run_word(sr,c,1,0,L)
        if w in used: return False
        cl=clue_of_down(sr,c)
        if G[cl[0]][cl[1]]!='#' or cnt.get(cl,0)>=2: return False
        return ('d',cl,w)
    def apply(tok):
        if tok and tok[0] in 'ad':
            cnt[tok[1]]=cnt.get(tok[1],0)+1; used.add(tok[2])
    def undo(tok):
        if tok and tok[0] in 'ad':
            cnt[tok[1]]-=1; used.discard(tok[2])
    single={}  # cells with 1-length runs: track to forbid both directions single
    res=[None]
    def rec(i):
        steps[0]+=1
        if steps[0]>max_steps: raise TimeoutError
        if i==len(cells):
            # close final runs at bottom and right handled already
            return final_check()
        r,c=cells[i]
        f=fixed(r,c)
        opts=[]
        # across node / down node
        if c>0 and G[r][c-1]!='#': sc,an=acr[r][c-1]
        else: sc,an=c,root
        if r>0 and G[r-1][c]!='#': sr,dn=dwn[r-1][c]
        else: sr,dn=r,root
        letters=[ch for ch in an.k if ch in dn.k]
        rnd.shuffle(letters)
        letters.sort(key=lambda ch: -(len(an.k[ch].k)+len(dn.k[ch].k))*rnd.random())
        want_clue = f=='#' or (f is None and r>0 and c>0)
        if f=='#': opts=['#']
        elif f=='L': opts=letters
        else:
            opts=list(letters)
            # clue option position
            if rnd.random()<clue_p: opts.insert(0,'#')
            else: opts.insert(min(len(opts),rnd.randint(1,3)),'#')
            # forbid clue at bottom-right corner
            if (r==R-1 and c==C-1) or (r==1 and c%2==1) or (c==1 and r%2==1): opts=[o for o in opts if o!='#']
        for o in opts:
            if o=='#':
                if r==R-1 and c==C-1: continue
                ta=close_across(r,c)
                if ta is False: continue
                td=close_down(r,c)
                if td is False: continue
                # cell left both-single check
                apply(ta); apply(td)
                bad=False
                for tok,(rr,cc) in ((ta,(r,c-1)),(td,(r-1,c))):
                    pass
                if not bad:
                    G[r][c]='#'
                    if ok_singles(r,c) and rec(i+1): return True
                    G[r][c]=None
                undo(td); undo(ta)
            else:
                na=an.k[o]; nd=dn.k[o]
                # end-of-row / end-of-col must terminate
                G[r][c]=o; acr[r][c]=(sc,na); dwn[r][c]=(sr,nd)
                toks=[]
                okk=True
                if c==C-1:
                    t=close_across(r,C)
                    if t is False: okk=False
                    else: toks.append(t); apply(t)
                if okk and r==R-1:
                    t=close_down(R,c)
                    if t is False: okk=False
                    else: toks.append(t); apply(t)
                if okk and r+1<R and ((r+1==1 and c%2==1) or (c==1 and (r+1)%2==1) or (r+1==R-1 and c==C-1)) and not nd.k: okk=False
                if okk and c+1<C and (c+1==1 and r%2==1) and not na.k: okk=False
                if okk and ok_singles(r,c) and rec(i+1): return True
                for t in reversed(toks): undo(t)
                G[r][c]=None; acr[r][c]=None; dwn[r][c]=None
        return False
    def runlen(r,c,dr,dc):
        if G[r][c] in (None,'#'): return 0
        L=1; rr,cc=r-dr,c-dc
        while 0<=rr and 0<=cc and G[rr][cc] not in (None,'#'): L+=1; rr-=dr; cc-=dc
        rr,cc=r+dr,c+dc
        while rr<R and cc<C and G[rr][cc] not in (None,'#'): L+=1; rr+=dr; cc+=dc
        return L, (rr<R and cc<C and G[rr][cc] is None)
    def ok_singles(r,c):
        # check cells (r,c-1) & (r-1,c) neighbours that may now be fully closed singles in both directions
        for (rr,cc) in ((r,c-1),(r-1,c),(r,c)):
            if rr<0 or cc<0 or G[rr][cc] in (None,'#'): continue
            a=runlen(rr,cc,0,1); d=runlen(rr,cc,1,0)
            if a[0]==1 and not a[1] and d[0]==1 and not d[1]: return False
        # clue cell with zero clues: check (r-1,c-1)... simple: a clue whose right & below are clues
        for (rr,cc) in ((r-1,c),(r,c-1)):
            if rr<0 or cc<0 or G[rr][cc]!='#': continue
            right='#' if cc+1>=C else G[rr][cc+1]
            below='#' if rr+1>=R else G[rr+1][cc]
            if right=='#' and below=='#': return False
        return True
    def final_check():
        clues={}
        # recompute all runs
        for r in range(R):
            c=0
            while c<C:
                if G[r][c]=='#': c+=1; continue
                sc=c
                while c<C and G[r][c]!='#': c+=1
                if c-sc>=2:
                    cl=clue_of_across(r,sc); clues.setdefault(cl,[]).append(('A',r,sc,run_word(r,sc,0,1,c-sc)))
        for c in range(C):
            r=0
            while r<R:
                if G[r][c]=='#': r+=1; continue
                sr=r
                while r<R and G[r][c]!='#': r+=1
                if r-sr>=2:
                    cl=clue_of_down(sr,c); clues.setdefault(cl,[]).append(('D',sr,c,run_word(sr,c,1,0,r-sr)))
        for r in range(R):
            for c in range(C):
                if G[r][c]=='#':
                    n=len(clues.get((r,c),[]))
                    if n==0 or n>2: return False
        res[0]=clues
        return True
    try:
        if rec(0): return [''.join(row) for row in G], res[0], steps[0]
    except TimeoutError: pass
    return None, None, steps[0]
if __name__=='__main__':
    from wordfreq import top_n_list
    N=int(sys.argv[1]); R=int(sys.argv[2])
    ws=set()
    for w in top_n_list('fr',N*2):
        n=norm(w)
        if n.isalpha() and n.isascii() and 2<=len(n)<=10: ws.add(n)
        if len(ws)>=N: break
    ws=sorted(ws)
    print(len(ws),'words')
    ok=0
    for s in range(10):
        t=time.time()
        g,cl,st=generate(ws,R,seed=s,max_steps=300000)
        print(s, 'OK' if g else 'fail', st, round(time.time()-t,1))
        if g: ok+=1; print('\n'.join(g)) if s<2 else None
    print('success',ok)
