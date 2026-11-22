# 23/11/2026 : +100 grilles 8 × 8 par niveau (TF151…TF250, TM151…, TD151…), ajoutées à tel.json sans toucher aux 150 premières.
# Usage : python3 gen_tel_plus.py 100   puis   python3 publier_tel.py
import sys,json
import fill
fill.C=8
import generate_all as ga
N=int(sys.argv[1]) if len(sys.argv)>1 else 100
ga.LEVELS={
 'facile':   dict(R=8,maxlen=6,density=0.25,minz=3.0,max2=5,prefix='TF'),
 'moyen':    dict(R=8,maxlen=7,density=0.25,minz=2.3,max2=7,prefix='TM'),
 'difficile':dict(R=8,maxlen=7,density=0.27,minz=0.0,max2=8,prefix='TD'),
}
old=json.load(open('tel.json'))
sig=lambda g:g.get('k')
seen={sig(g) for g in old}
out=list(old)
for lv,seed in (('facile',9111),('moyen',9222),('difficile',9333)):
    have=[g for g in old if g['lvl']==lv];start=len(have)
    name={'facile':'Facile','moyen':'Moyen','difficile':'Difficile'}[lv];pre=ga.LEVELS[lv]['prefix']
    gs=[g for g in ga.gen_level(lv,seed=seed,count=N+20) if sig(g) not in seen][:N]
    for i,g in enumerate(gs):
        n=start+i+1;g['id']=f"{pre}{n:03d}";g['page']=f"{pre}{n}";g['name']=f"{name} n°{n}";g['fmt']='t';seen.add(sig(g))
    out+=gs;print(lv,len(gs),'nouvelles')
json.dump(out,open('tel.json','w'),ensure_ascii=False)
print(len(out),'grilles téléphone au total')
