const {chromium}=require(process.env.PW||'playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];const c=await b.newContext({viewport:{width:420,height:800},deviceScaleFactor:2});await c.addInitScript(()=>localStorage.setItem('fl-tuto-magnetico','1'));const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:3999/magnetico?go=solo&lvl=normal');
const counts=[];for(let i=0;i<12;i++){await p.waitForTimeout(1000);counts.push(await p.$$eval('.mgpass',x=>x.filter(e=>+e.style.opacity>0.05).length))}
console.log('bulles de passage visibles chaque seconde :',counts.join(' '));
const pe=await p.$eval('.mgpass',e=>getComputedStyle(e).pointerEvents);console.log('clic bloqué :',pe);
await p.screenshot({path:'/tmp/mg_pass.png'});
// le jeu reste jouable : toucher une vraie bulle
const ok=await p.evaluate(()=>{const b=[...document.querySelectorAll('.mgball')].find(x=>x.style.display!=='none');if(!b)return 'aucune';const r=b.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el&&el.closest('.mgball')?'la vraie bulle reçoit le toucher':'autre : '+(el&&el.className)});console.log(ok);
console.log('err',errs);await b.close()})();
