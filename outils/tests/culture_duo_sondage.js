const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');
const U='http://localhost:3100';
const api=async(r,b)=>(await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'10.9.'+Math.floor(Math.random()*250)+'.7'},body:JSON.stringify(b)})).json();
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];const sfx=Math.floor(Math.random()*900+100);
 const A={name:'AN'+sfx},B={name:'BO'+sfx};A.token=(await api('create',{name:A.name,pin:'1357'})).token;B.token=(await api('create',{name:B.name,pin:'2468'})).token;
 const S=(await api('screate',{name:A.name,token:A.token,sname:'Test CG'})).salon;const C=S.code;const J=await api('sjoin',{name:B.name,token:B.token,sname:'Test CG',scode:S.acode});console.log('join',J.ok,J.msg||'');
 const mk=async me=>{const c=await br.newContext({viewport:{width:390,height:844}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/upload\.wikimedia|fonts\./,r=>r.abort());await p.goto(U+'/');await p.evaluate(m=>{localStorage.setItem('fl-me',JSON.stringify(m));localStorage.setItem('fl-tuto-culture','1')},me);return p};
 const pa=await mk(A),pb=await mk(B);await pa.goto(U+'/'+C+'/culture?go=multi');await pa.waitForTimeout(1500);await pb.goto(U+'/'+C+'/culture?go=multi');await pb.waitForTimeout(8000);
 console.log('url',pa.url(),C);const kinds=await pa.evaluate(()=>window.__t("G.qs.map(id=>KIND[id])"));console.log('types (tirage serveur):',kinds.join(' '));
 const same=await pa.evaluate(()=>window.__t("G.qs.join()"))===await pb.evaluate(()=>window.__t("G.qs.join()"));console.log('même série chez les deux :',same);
 const si=kinds.indexOf('sond');
 for(let i=0;i<=si;i++){
  const q=await pa.textContent('#cgQ'),qb=await pb.textContent('#cgQ');if(q!==qb)console.log('❌ question différente',i);
  if(i===si){const cq=await pa.evaluate(()=>window.__t("curQ()"));await pa.fill('#cgIn',cq.a[0].toLowerCase());await pa.press('#cgIn','Enter');await pb.fill('#cgIn','zzzz');await pb.click('#cgS form button');
    await pb.waitForSelector('#cgFact:not([hidden])',{timeout:8000});await pb.waitForTimeout(500);console.log('Q'+(i+1),'sondage :',q,'→ vu par B :',(await pb.textContent('#cgSL')).replace(/\s+/g,' ').trim());
    await pb.screenshot({path:'/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/cg_duo_sond.png'});break}
  await pa.evaluate(()=>window.__t("answer(0)"));await pb.evaluate(()=>window.__t("answer(0)"));await pa.waitForTimeout(500);await pa.evaluate(()=>window.__t("next()"));await pa.waitForTimeout(900);
 }
 console.log('scores :',await pa.evaluate(()=>window.__t("G.players.map(p=>p.name+' '+p.score).join(', ')")));
 console.log('erreurs :',errs);await br.close()})();
