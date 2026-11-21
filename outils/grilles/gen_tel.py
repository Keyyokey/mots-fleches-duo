# Série « format téléphone » (21/11/2026) : grilles 8 × 8, pensées pour l'écran d'un téléphone
# (cases plus grandes, définitions lisibles). Mêmes dictionnaires que les grilles 10 colonnes.
# Usage : python3 gen_tel.py 150   → écrit tel.json (Facile TF…, Moyen TM…, Difficile TD…)
import sys,json
import fill
fill.C=8
import generate_all as ga
N=int(sys.argv[1]) if len(sys.argv)>1 else 150
ga.LEVELS={
 'facile':   dict(R=8,maxlen=6,density=0.25,minz=3.0,max2=5,prefix='TF'),
 'moyen':    dict(R=8,maxlen=7,density=0.25,minz=2.3,max2=7,prefix='TM'),
 'difficile':dict(R=8,maxlen=7,density=0.27,minz=0.0,max2=8,prefix='TD'),
}
out=[]
for lv,seed in (('facile',811),('moyen',822),('difficile',833)):
    gs=ga.gen_level(lv,seed=seed,count=N)
    name={'facile':'Facile','moyen':'Moyen','difficile':'Difficile'}[lv]
    for i,g in enumerate(gs):
        g['name']=f"{name} n°{i+1}";g['fmt']='t'
    out+=gs
json.dump(out,open('tel.json','w'),ensure_ascii=False)
print(len(out),'grilles téléphone')
