# Questions de culture générale : atlas (59) + images Wikimedia (104) + livres de Juvenal + drapeaux + OpenQuizzDB (CC BY-SA)
import json,hashlib,glob,os
A=json.load(open('/home/claude/newsite/culture_q.json'));B=json.load(open('/home/claude/newsite/culture_img.json'))+json.load(open('/home/claude/newsite/culture_livres.json'))+json.load(open('/home/claude/newsite/culture_flags.json'))+json.load(open('/home/claude/newsite/culture_wd.json'))+json.load(open('/home/claude/newsite/culture_oqdb.json'))
out=[];ids=set()
for q in A+B:
    assert len(q['a'])==4 and len(set(q['a']))==4,q['q']
    h='c'+hashlib.sha1((q['q']+'|'+q.get('img','')).encode()).hexdigest()[:8]
    assert h not in ids;ids.add(h)
    o={'id':h,'t':q['t'],'q':q['q'],'a':q['a'],'x':q['x'],'s':q['s']}
    for k in ('img','cr','src'):
        if q.get(k):o[k]=q[k]
    out.append(o)
js='window.__CG='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';'
d='/home/claude/fleches-site/public/d/'
for f in glob.glob(d+'culture-*.js'):os.remove(f)
f=d+'culture-'+hashlib.sha1(js.encode()).hexdigest()[:10]+'.js';open(f,'w').write(js);print(f,len(out),sum(1 for x in out if 'img' in x))
