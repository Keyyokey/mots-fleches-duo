import glob,collections,sys
sys.path.insert(0,__import__('os').path.dirname(__file__))
from gen import norm
def load():
    D=collections.defaultdict(list)
    for f in sorted(glob.glob(__import__('os').path.join(__import__('os').path.dirname(__file__),'dict','*.txt'))):
        for line in open(f,encoding='utf8'):
            line=line.strip()
            if not line or '|' not in line: continue
            w,c=line.split('|',1); w=norm(w.strip()); c=c.strip()
            if not c or not w.isalpha() or not (2<=len(w)<=10): continue
            if c not in D[w]: D[w].append(c)
    return D
_Z=None
def zipf_map():
    global _Z
    if _Z is None:
        import pickle,os
        p=__import__('os').path.join(__import__('os').path.dirname(__file__),'zmap.pkl')
        if os.path.exists(p): _Z=pickle.load(open(p,'rb'))
        else:
            from wordfreq import top_n_list, zipf_frequency
            _Z={}
            for w in top_n_list('fr',300000):
                n=norm(w)
                if n.isalpha():
                    z=zipf_frequency(w,'fr')
                    if z>_Z.get(n,0): _Z[n]=z
            pickle.dump(_Z,open(p,'wb'))
    return _Z
