// Audit de la charte D : liste, page par page (téléphone 390 px, thème sombre), les objets visibles dont la couleur, le dégradé, le bord ou l icône sort de la palette D, et les restes de verre (voile semi-transparent, flou).
// Usage : serveur local sur 3999, puis PW=<module playwright> node outils/site/audit_charte.js   — objectif : 0 objet hors charte à la fin de la bascule.
const {chromium}=require(process.env.PW||'playwright');
const P=[['accueil','/'],['motdujour','/motdujour'],['fleches','/fleches'],['magnetico','/magnetico'],['sudoku','/sudoku'],['motlibre','/motlibre?mode=prog'],['meles','/meles'],['rond','/rond'],['culture','/culture'],['poker','/poker']];
const PAL=['#24113d','#3b1d5c','#45265f','#4a2a6e','#55327a','#6c4691','#fff3df','#5b2a91','#e2b97a','#ffd23f','#2a0f1a','#c79a00','#2ec4b6','#08302c','#1a8f84','#7d6a92','#efe6f7','#5d4c70','#ff6b6b','#e2d3f2','#ffffff','#a77bd6','#1a0b2e','#ffe88a','#0b6b60','#b0124f','#d6336c','#000000','#c9b6e0','#8b6bb0'];
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const c=await br.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.addInitScript(()=>{try{localStorage.setItem('fl-tuto-vu','1');localStorage.setItem('fl-tuto','1')}catch(e){}});
const all={};
for(const [n,u] of P){const p=await c.newPage();await p.goto('http://localhost:3999'+u);await p.waitForTimeout(2500);
const r=await p.evaluate((PAL)=>{const hex=h=>{h=h.slice(1);return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};const pal=PAL.map(hex);
const parse=s=>{const m=s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);return m?{c:[+m[1],+m[2],+m[3]],a:m[4]===undefined?1:+m[4]}:null};
const off=s=>{const p=parse(s);if(!p||p.a<.12)return null;const d=Math.min(...pal.map(q=>Math.hypot(q[0]-p.c[0],q[1]-p.c[1],q[2]-p.c[2])));return d>38?s:null};
const out={};const roots=[document];const sk=document.getElementById('skTop');if(sk&&sk.shadowRoot)roots.push(sk.shadowRoot);
for(const R of roots)for(const e of R.querySelectorAll('*')){const b=e.getBoundingClientRect();if(!b.width||!b.height)continue;const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)continue;
const tag=e.tagName.toLowerCase();if(['script','style','html','head'].includes(tag))continue;
const k=(e.id?'#'+e.id:tag)+([...e.classList].slice(0,3).map(x=>'.'+x).join(''));const pb=[];
const bg=off(s.backgroundColor);if(bg)pb.push('fond '+bg);else{const q=parse(s.backgroundColor);if(q&&q.a>=.03&&q.a<.95)pb.push('voile '+s.backgroundColor)}
if(s.backgroundImage.includes('gradient')){const cols=s.backgroundImage.match(/rgba?\([^)]*\)/g)||[];const bad=cols.filter(off);if(bad.length)pb.push('dégradé '+bad.slice(0,2).join(' '))}
if(e.childNodes.length&&[...e.childNodes].some(x=>x.nodeType===3&&x.textContent.trim())){const t=off(s.color);if(t)pb.push('texte '+t)}
if(parseFloat(s.borderTopWidth)>0){const bc=off(s.borderTopColor);if(bc)pb.push('bord '+bc)}
if(s.backdropFilter&&s.backdropFilter!=='none')pb.push('flou');
if(tag==='svg'||tag==='path'||tag==='circle'||tag==='rect'){for(const a of ['fill','stroke']){const v=s[a];if(v&&v.startsWith('rgb')){const o=off(v);if(o)pb.push('icône '+a+' '+o)}}}
if(pb.length){const key=k+' → '+pb.join(' ; ');out[key]=(out[key]||0)+1}}
return out},PAL);
all[n]=r;await p.close()}
for(const n in all){const ks=Object.keys(all[n]);console.log(`\n===== ${n} : ${ks.length} objets hors charte`);ks.sort().forEach(k=>console.log('  ',all[n][k]>1?`(${all[n][k]}×)`:'',k.slice(0,170)))}
await br.close()})();
