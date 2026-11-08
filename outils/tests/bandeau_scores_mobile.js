const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');
const U='http://localhost:3100';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
const api=async(r,b)=>(await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'10.9.'+Math.floor(Math.random()*250)+'.7'},body:JSON.stringify(b)})).json();
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];const sfx=Math.floor(Math.random()*900+100);
 const A={name:'AN'+sfx},B={name:'BO'+sfx};A.token=(await api('create',{name:A.name,pin:'1357'})).token;B.token=(await api('create',{name:B.name,pin:'2468'})).token;
 const sl=await api('screate',{...A,sname:'SB '+sfx});await api('sjoin',{...B,sname:'SB '+sfx,scode:sl.salon.acode});const C=sl.salon.code;
 const mk=async(w,me)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},hasTouch:w<500});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(U+'/');await p.evaluate(m=>{localStorage.setItem('fl-me',JSON.stringify(m));['fleches','rond','meles','culture','poker'].forEach(k=>localStorage.setItem('fl-tuto-'+k,'1'))},me);return p};
 const st=p=>p.evaluate(()=>{const b=[...document.querySelectorAll('.scores2')].find(x=>x.offsetParent);if(!b)return null;const r=b.getBoundingClientRect(),a=b.querySelector('.sc1').getBoundingClientRect(),c=b.querySelector('.sc2').getBoundingClientRect();
   return{linked:b.classList.contains('linked'),vs:(b.querySelector('.vsb')||{}).textContent,sameRow:Math.abs(a.top-c.top)<2,inside:r.left>=0&&r.right<=innerWidth,act:[...b.querySelectorAll('.sc')].map(s=>s.classList.contains('turn')||s.classList.contains('lead')),sw:document.documentElement.scrollWidth<=innerWidth}});
 for(const g of ['fleches','rond','meles','culture']){
  const pa=await mk(375,A),pb=await mk(375,B);await pa.goto(U+'/'+C+'/'+g+'?go=multi&lvl=facile');await pa.waitForTimeout(1500);await pb.goto(U+'/'+C+'/'+g+'?go=multi&lvl=facile');await pb.waitForTimeout(g==='culture'?9000:6000);
  const s=await st(pa);ok(s&&s.linked&&s.sameRow&&s.inside&&s.sw,g+' à deux, téléphone : bandeau lié sur une ligne, écart au centre « '+(s&&s.vs)+' », actif '+JSON.stringify(s&&s.act));
  await pa.evaluate(()=>{const b=[...document.querySelectorAll('.scores2')].find(x=>x.offsetParent);b.scrollIntoView({block:'start'})});await pa.waitForTimeout(300);
  const el=await pa.$('.scores2.linked');await el.screenshot({path:'/home/claude/t/sb_'+g+'.png'});await pa.context().close();await pb.context().close()}
 // ordinateur : inchangé
 const pd=await mk(1280,A);await pd.goto(U+'/'+C+'/meles?go=multi&lvl=facile');await pd.waitForTimeout(2500);const sd=await st(pd);ok(sd&&!sd.linked,'ordinateur : affichage habituel conservé');
 // solo téléphone : inchangé
 const ps=await mk(375,A);await ps.goto(U+'/meles?go=solo&lvl=facile');await ps.waitForTimeout(2000);ok(await ps.evaluate(()=>!document.querySelector('.scores2.linked')),'solo téléphone : carte habituelle conservée');
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
