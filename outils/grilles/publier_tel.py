# Publie la série « format téléphone » (tel.json) dans les fichiers du site :
# public/d/grilles-*.js (toutes les grilles, lu par le serveur), public/d/gl-<niveau>-*.js (chargés par la page)
# et la table __GLX + noms de fichiers dans public/fl.html. Relançable : les anciennes grilles T… sont remplacées.
import os,re,json,glob,hashlib
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))));D=os.path.join(ROOT,'public','d')
TEL=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'tel.json')))
def one(prefix):
    f=[x for x in glob.glob(os.path.join(D,prefix+'*.js'))];assert len(f)==1,f;return f[0]
def parse(s):
    i=s.index('[{');j=s.rindex(']');return json.loads(s[i:j+1])
def emit(prefix,head,arr,tail):
    body=head+json.dumps(arr,ensure_ascii=False,separators=(',',':'))+tail
    h=hashlib.sha1(body.encode()).hexdigest()[:10];old=one(prefix);new=os.path.join(D,prefix+h+'.js')
    if old!=new: os.remove(old)
    open(new,'w',encoding='utf8').write(body);return os.path.basename(old),os.path.basename(new)
ren={}
f=one('grilles-');s=open(f,encoding='utf8').read();A=[g for g in parse(s) if not g['id'].startswith('T')]+TEL
o,n=emit('grilles-','window.__GRIDS=',A,';');ren[o]=n
LV={'facile':'f','moyen':'m','difficile':'d'}
for lv in LV:
    f=one('gl-'+lv+'-');s=open(f,encoding='utf8').read();A=[g for g in parse(s) if not g['id'].startswith('T')]+[g for g in TEL if g['lvl']==lv]
    o,n=emit('gl-'+lv+'-','window.__GRIDS=window.__GRIDS||[];window.__GRIDS.push.apply(window.__GRIDS,',A,');');ren[o]=n
p=os.path.join(ROOT,'public','fl.html');h=open(p,encoding='utf8').read()
for o,n in ren.items(): h=h.replace('/d/'+o,'/d/'+n)
m=re.search(r'window\.__GLX=(\{.*?\});',h);X=json.loads(m.group(1))
X={k:v for k,v in X.items() if not k.startswith('T')};X.update({g['id']:LV[g['lvl']] for g in TEL})
h=h[:m.start(1)]+json.dumps(X,separators=(',',':'))+h[m.end(1):]
open(p,'w',encoding='utf8').write(h)
print(ren,len(TEL),'grilles téléphone publiées')
