const {chromium}=require(process.env.PW||'playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];const c=await b.newContext({viewport:{width:1100,height:760}});await c.addInitScript(()=>localStorage.setItem('fl-tuto-culture','1'));const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:3999/culture?go=solo');await p.waitForTimeout(3500);
// première question à choix
for(let i=0;i<3;i++){const sond=await p.evaluate(()=>window.__t('curQ().k'));if(sond!=='sond')break;await p.evaluate(()=>window.__t('answer(0,"x")'));await p.waitForTimeout(500);await p.click('#cgNext').catch(()=>{});await p.waitForTimeout(800)}
await p.waitForTimeout(2200);await p.click('#cgA button');const t1=await p.textContent('#cgC'),w1=await p.evaluate(()=>document.getElementById('cgTl').style.width);
await p.waitForTimeout(3500);const t2=await p.textContent('#cgC'),w2=await p.evaluate(()=>document.getElementById('cgTl').style.width);
console.log('chrono après réponse',t1,w1,'→ 3,5 s plus tard',t2,w2, t1===t2&&w1===w2?'✅ figé':'❌ continue');
const src=await p.evaluate(()=>{const f=document.getElementById('cgFrom');return (f&&!f.hidden?f.textContent:'')+'|'+document.querySelector('#cgFig figcaption').textContent});console.log('sources affichées :',JSON.stringify(src));
await p.screenshot({path:'/tmp/cg_after.png'});console.log('err',errs);await b.close()})();
