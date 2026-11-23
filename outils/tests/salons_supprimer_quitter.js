const {chromium}=require(process.env.PW||'playwright');const U='http://localhost:3999';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];let ok=0,ko=0;const chk=(c,m)=>{console.log((c?'✅ ':'❌ ')+m);c?ok++:ko++};
const c=await b.newContext({viewport:{width:1100,height:800}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
const mk=async()=>{const nm='S'+Math.random().toString(36).slice(2,7).toUpperCase();const r=await p.request.post(U+'/api/p/create',{data:{name:nm,pin:'1234'}});const j=await r.json();return {nm,tok:j.token}};
const A=await mk(),B=await mk();const api=(who,route,d)=>p.request.post(U+'/api/p/'+route,{data:Object.assign({name:who.nm,token:who.tok},d)}).then(r=>r.json());
const s1=await api(A,'screate',{sname:'Salon de '+A.nm}),s2=await api(A,'screate',{sname:'Atelier'});
const sB=await api(B,'screate',{sname:'Club B'});await api(A,'sjoin',{sname:'Club B',scode:sB.salon.acode});
await api(B,'sjoin',{sname:'Atelier',scode:s2.salon.acode});
await c.addInitScript(([n,t])=>localStorage.setItem('fl-me',JSON.stringify({name:n,token:t})),[A.nm,A.tok]);
await p.goto(U+'/');await p.waitForTimeout(1200);await p.click('.salon-pill');await p.waitForTimeout(900);
const rows=await p.$$eval('#popSalon .slm',x=>x.map(e=>e.innerText.replace(/\s+/g,' ')));console.log(rows);chk(rows.length===3,'3 salons listés avec une action');
await p.screenshot({path:'/tmp/sal1.png',clip:{x:450,y:0,width:650,height:500}});
// supprimer « Atelier » (A responsable, B membre)
await p.click('#popSalon .slx[data-x="'+s2.salon.code+'"]');await p.waitForTimeout(300);chk(await p.isVisible('#dlYes'),'confirmation de suppression');
await p.screenshot({path:'/tmp/sal2.png',clip:{x:450,y:0,width:650,height:400}});
await p.click('#dlYes');await p.waitForTimeout(900);
const rows2=await p.$$eval('#popSalon .slm',x=>x.map(e=>e.innerText.replace(/\s+/g,' ')));chk(rows2.length===2&&!rows2.join().includes('Atelier'),'Atelier supprimé : '+rows2.join(' | '));
const lb=await api(B,'salons',{});chk(!lb.salons.some(x=>x.code===s2.salon.code),'B n\'y a plus accès');
const jr=await api(B,'sjoin',{sname:'Atelier',scode:s2.salon.acode});chk(!jr.salon,'l\'ancien code ne marche plus ('+jr.msg+')');
// quitter « Club B » (A membre)
await p.click('#popSalon .slx[data-x="'+sB.salon.code+'"]');await p.waitForTimeout(300);chk(await p.isVisible('#lvYes'),'confirmation pour quitter');
await p.click('#lvYes');await p.waitForTimeout(900);const rows3=await p.$$eval('#popSalon .slm',x=>x.map(e=>e.innerText.replace(/\s+/g,' ')));chk(rows3.length===1,'Club B quitté, reste : '+rows3.join());
// partie à plusieurs depuis l'accueil sans salon : on reprend « Salon de A »
await p.goto(U+'/');await p.waitForTimeout(800);
await p.evaluate(()=>{localStorage.setItem('fl-tuto-meles','1');document.querySelector('.tile[data-key="meles"] .abtn[data-mode="multi"]').click()});await p.waitForTimeout(400);
await Promise.all([p.waitForNavigation({timeout:8000}).catch(()=>{}),p.click('#cfgGo')]);chk(p.url().includes('/'+s1.salon.code+'/'),'multi sans salon → son salon existant ('+p.url().replace(U,'')+')');
const la=await api(A,'salons',{});chk(la.salons.length===1,'aucun nouveau salon créé ('+la.salons.length+')');
// en-tête d'une page de jeu : même liste
await p.goto(U+'/rond?go=solo&lvl=facile');await p.waitForTimeout(1500);
const hasRows=await p.evaluate(async()=>{const h=[...document.querySelectorAll('*')].find(e=>e.shadowRoot&&e.shadowRoot.querySelector('.salon-pill'));h.shadowRoot.querySelector('.salon-pill').click();await new Promise(r=>setTimeout(r,1200));return h.shadowRoot.querySelectorAll('#popSalon .slm, #popSalon .sl').length});chk(hasRows>0,'en-tête des jeux : fenêtre des salons ('+hasRows+')');
console.log(ok,'ok',ko,'ko','err',errs);await b.close()})();
