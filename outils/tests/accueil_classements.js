// Accueil après le retrait du bloc « Ton univers de jeux » (10/11/2026) : classement à onglets + joueurs connectés | Ma progression, puis Nos jeux, pied de page centré
const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');
const U='http://localhost:3100';const out=[];const ok=(c,l)=>{out.push(c);console.log((c?'✅ ':'❌ ')+l)};
const api=async(r,b)=>(await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'10.13.'+Math.floor(Math.random()*250)+'.4'},body:JSON.stringify(b)})).json();
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 const pg=async(w=1280)=>{const p=await (await br.newContext({viewport:{width:w,height:900},colorScheme:'dark'})).newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());return p};
 let p=await pg();await p.goto(U+'/');await p.waitForTimeout(1200);
 ok(!(await p.$('#heroT'))&&!(await p.$('#ctaPlay'))&&!/Ton univers de/.test(await p.textContent('body')),'bloc « Ton univers de jeux » retiré');
 ok(!(await p.$('.space'))&&!(await p.$('.salonbox')),'ancienne section « Mon espace » du bas retirée');
 ok(await p.evaluate(()=>{const d=document.querySelector('.dash'),g=document.querySelector('.games'),f=document.querySelector('.sitefoot');return !!(d.compareDocumentPosition(g)&4&&g.compareDocumentPosition(f)&4)}),'ordre : classements + progression → Nos jeux → pied de page');
 const al=await p.evaluate(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();const l=r('.dleft'),pr=r('.progcard');return{top:Math.abs(l.top-pr.top),bot:Math.abs(l.bottom-pr.bottom),side:l.right<pr.left}});ok(al.top<1&&al.bot<1&&al.side,'ordinateur : colonnes alignées (haut et bas) et côte à côte');
 ok(await p.evaluate(()=>!document.getElementById('cRank').hidden&&document.getElementById('cSalon').hidden),'onglet « Classement général » ouvert par défaut');
 await p.click('.rtabs [data-r=cSalon]');ok(await p.evaluate(()=>document.getElementById('cRank').hidden&&!document.getElementById('cSalon').hidden&&/salon/.test(document.getElementById('cSalon').textContent)),'onglet « Classement de ton salon » (hors salon : message)');
 const f=await p.evaluate(()=>{const e=document.querySelector('.sitefoot'),r=e.getBoundingClientRect();return{links:[...e.querySelectorAll('a')].map(a=>a.textContent),c:Math.abs((r.left+r.right)/2-innerWidth/2),last:e.getBoundingClientRect().bottom>=document.querySelector('.games').getBoundingClientRect().bottom}});ok(f.links.length===4&&f.c<20&&f.last,'pied de page centré tout en bas : '+f.links.join(' · '));
 // compte connecté dans un salon
 const n='Q'+[...String(Date.now()%10000)].map(d=>'ABCDEFGHIJ'[d]).join('');const A=await api('create',{name:n,pin:'1234'});const sl=await api('screate',{name:n,token:A.token,sname:'Esp '+n});
 p=await pg();await p.goto(U+'/');await p.evaluate(m=>localStorage.setItem('fl-me',JSON.stringify(m)),{name:n,token:A.token});await p.goto(U+'/'+sl.salon.code+'/');await p.waitForTimeout(2500);
 const k=await p.textContent('#cKpi');ok(/Points au total/.test(k)&&/Jetons/.test(k),'connecté : progression affichée');
 await p.click('.rtabs [data-r=cSalon]');await p.waitForTimeout(300);ok(!/dès que tu joues dans un salon/.test(await p.textContent('#cSalon')),'dans un salon : classement du salon affiché');
 const al2=await p.evaluate(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();const l=r('.dleft'),pr=r('.progcard');return Math.abs(l.bottom-pr.bottom)});ok(al2<1,'connecté (courbe affichée) : colonnes toujours alignées');
 for(const w of [320,375,768]){const m=await pg(w);await m.goto(U+'/');await m.waitForTimeout(800);const r=await m.evaluate(()=>{const t=[...document.querySelectorAll('.rtabs button')].map(b=>b.getBoundingClientRect());return{sx:document.documentElement.scrollWidth>innerWidth,row:Math.abs(t[0].top-t[1].top)<2}});ok(!r.sx&&r.row,w+' px : pas de défilement horizontal, onglets côte à côte');await m.close()}
 console.log(out.filter(Boolean).length+' ✅ / '+out.filter(x=>!x).length+' ❌ · erreurs JS',errs);await br.close()})();
