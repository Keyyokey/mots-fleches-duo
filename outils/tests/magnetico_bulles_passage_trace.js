const {chromium}=require(process.env.PW||'playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const c=await b.newContext({viewport:{width:420,height:800}});await c.addInitScript(()=>localStorage.setItem('fl-tuto-magnetico','1'));const p=await c.newPage();
await p.goto('http://localhost:3999/magnetico?go=solo&lvl=difficile');
for(let i=0;i<8;i++){await p.waitForTimeout(1500);console.log(await p.evaluate(()=>{const F=document.getElementById('mgField');return F.clientWidth+'x'+F.clientHeight+' '+[...document.querySelectorAll('.mgpass')].map(e=>e.style.opacity+'@'+e.style.transform.replace(/translate|px/g,'')).join(' ')}))}
await b.close()})();
