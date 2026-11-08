const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');
const U='http://localhost:3100';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 for(const w of [1280,320]){const p=await (await br.newContext({viewport:{width:w,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'/');await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>({txt:document.body.innerText,defi:document.querySelector('#cDefi').innerText.replace(/\s+/g,' '),href:document.querySelector('#cDefi a').getAttribute('href'),motLinks:[...document.querySelectorAll('a')].filter(a=>/\/mot\b/.test(a.getAttribute('href')||'')).length,sw:document.documentElement.scrollWidth}));
 ok(!/mot du jour/i.test(r.txt)&&r.motLinks===0,w+' px : plus aucune mention ni lien vers le mot du jour');
 ok(/^\/fleches\?go=solo&lvl=normal&n=\d+$/.test(r.href),w+' px : Défi du jour → '+r.defi.slice(0,90)+' ('+r.href+')');ok(r.sw<=w,w+' px : pas de défilement de côté');
 if(w===1280){const NV=[];p.on('framenavigated',f=>{if(f===p.mainFrame())NV.push(f.url())});await p.click('#cDefi a');await p.waitForTimeout(2500);
  const id=await p.evaluate(()=>document.title);ok(NV.some(u=>u.includes(r.href)),'le bouton ouvre la grille du jour ('+id+')');
  await p.screenshot({path:'/home/claude/t/defi_grille.png'})}
 if(w===320)await p.screenshot({path:'/home/claude/t/defi320.png',fullPage:true})}
 const r=await fetch(U+'/mot',{redirect:'manual'});ok(r.status===301&&r.headers.get('location')==='/','ancienne adresse /mot → accueil (301)');
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs));console.log(res.join('\n'));await br.close()})();
