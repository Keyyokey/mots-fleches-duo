import json,base64,collections
G=json.load(open('newgrids.json'))
bad=0;wc=collections.Counter();lens=collections.Counter();ids=set();rowsset=set()
for g in G:
    assert g['id'] not in ids; ids.add(g['id'])
    R=g['nr'];K=base64.b64decode(g['k']).decode()[::-1];rows=[K[i*10:(i+1)*10] for i in range(R)]
    assert len(K)==R*10
    rowsset.add(K)
    cov=collections.Counter()
    for k,cl in g['clues'].items():
        r,c=map(int,k.split(','));assert rows[r][c]=='#',(g['id'],k)
        assert 1<=len(cl)<=2
        for t,a in cl:
            sr,sc,dr,dc=r,c,0,0
            if a=='R':sc,dc=c+1,1
            elif a=='D':sr,dr=r+1,1
            elif a=='RD':sc,dr=c+1,1
            else:sr,dc=r+1,1
            cells=[];rr,cc=sr,sc
            while rr<R and cc<10 and rows[rr][cc]!='#': cells.append((rr,cc));rr+=dr;cc+=dc
            if len(cells)<2: print('short',g['id'],k,a,t);bad+=1
            for x in cells: cov[x]+=1
            wc[''.join(rows[a][b] for a,b in cells)]+=1;lens[len(cells)]+=1
    for r in range(R):
        for c in range(10):
            if rows[r][c]=='#' and f"{r},{c}" not in g['clues']: print('emptyclue',g['id'],r,c);bad+=1
            if rows[r][c]!='#' and not cov[(r,c)]: print('uncov',g['id'],r,c);bad+=1
    if g['myst']:
        m=''.join(rows[int(k.split(',')[0])][int(k.split(',')[1])] for k,v in sorted(g['nums'].items(),key=lambda x:x[1]))
        if m!=g['myst']: print('myst',g['id']);bad+=1
    # same word twice in a grid?
print(len(G),'grids, errors',bad,'distinct grids',len(rowsset),'distinct words',len(wc),'slots',sum(wc.values()))
print('lens',sorted(lens.items()))
print(collections.Counter(g['lvl'] for g in G), sum(1 for g in G if g['myst']),'with mystery')
