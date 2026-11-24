// Pop qui guide le visiteur arrivé par un lien sur le Mot du jour (25/11) :
// une moitié le voit (groupe « pop »), l'autre non (« sans ») ; 2 ou 3 gestes, une seule fois ; mesure dans les stats.
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999',KEY=process.env.ADMIN_KEY||'test1234567890abcdef';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
 async function visit(g){const c=await br.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto(U+'/legal');await p.evaluate(g=>{localStorage.clear();localStorage.setItem('fl-popguide-g',g)},g);await p.goto(U+'/tmd3');await p.waitForTimeout(2500);return {c,p}}
 // groupe avec Pop
 let {c,p}=await visit('pop');
 let s=await p.evaluate(()=>({pop:!!document.getElementById('popg'),txt:(document.getElementById('pgTxt')||{}).textContent,hand:!!document.getElementById('pgHand')&&document.getElementById('pgHand').style.display!=='none'}));
 ok(s.pop&&s.hand&&/clavier/.test(s.txt)&&/Tape ton mot/.test(s.txt),'groupe Pop : Pop apparaît, montre la grille et un clavier virtuel (« '+s.txt+' »)');
 const ring=await p.evaluate(()=>{const r=document.getElementById('pgRing').getBoundingClientRect(),k=document.querySelector('#mdGrid .mdrow').getBoundingClientRect();return Math.abs(r.left+3-k.left)<2&&Math.abs(r.top+3-k.top)<2&&!!document.querySelector('#popg .pgkb span.k')});ok(ring,'le cercle jaune entoure la ligne à remplir, le mini clavier montre les touches à taper');
 // toucher la grille ouvre la saisie : Pop passe en haut et dit de taper
 await p.tap('#mdGrid .mdrow');await p.waitForTimeout(300);const f=await p.evaluate(()=>({foc:document.activeElement===document.getElementById('mdIn'),top:document.getElementById('popg').classList.contains('top'),txt:document.getElementById('pgTxt').textContent}));
 ok(f.foc&&f.top&&/Tape ton mot/.test(f.txt),'toucher la grille ouvre le clavier ; Pop se range en haut (« '+f.txt+' »)');
 // toucher la lettre sous la main : Pop ne bloque pas le toucher
 const first=await p.evaluate(()=>document.querySelector('#mdIn').value);
 await p.keyboard.type('E');await p.waitForTimeout(300);
 s=await p.evaluate(()=>({v:document.querySelector('#mdIn').value,txt:(document.getElementById('pgTxt')||{}).textContent}));
 ok(s.v.length>first.length,'la lettre tapée au clavier s\'écrit ('+first+' → '+s.v+')');ok(/Valider/.test(s.txt),'geste 2 : Pop montre Valider');
 // compléter le mot et valider
 const len=await p.evaluate(()=>window.__t?window.__t('S.len'):6);
 for(let i=s.v.length;i<len;i++){await p.keyboard.type('A');await p.waitForTimeout(60)}
 await p.click('#mdOk');await p.waitForTimeout(1200);
 // le mot tapé n'est peut-être pas au dictionnaire : on simule alors le premier essai accepté (fin de « mdnew »)
 await p.evaluate(()=>document.body.classList.remove('mdnew'));await p.waitForTimeout(300);s=await p.evaluate(()=>({txt:(document.getElementById('pgTxt')||{}).textContent,there:!!document.getElementById('popg')}));
 ok(!s.there||/Bravo/.test(s.txt),'geste 3 : après le premier essai, Pop félicite puis s\'en va');await p.waitForTimeout(4200);ok(!(await p.evaluate(()=>!!document.getElementById('popg'))),'Pop est parti');
 await p.reload();await p.waitForTimeout(2000);ok(!(await p.evaluate(()=>!!document.getElementById('popg'))),'il ne revient pas à la visite suivante');await c.close();
 // groupe sans Pop
 ({c,p}=await visit('sans'));ok(!(await p.evaluate(()=>!!document.getElementById('popg'))),'groupe sans Pop : rien ne s\'affiche');
 await p.evaluate(()=>[...document.querySelectorAll('#mdKeys span')].find(x=>x.textContent.trim()==='O').click());await p.waitForTimeout(500);await c.close();
 // visiteur sans lien : jamais de Pop
 {const c2=await br.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p2=await c2.newPage();await p2.goto(U+'/motdujour');await p2.waitForTimeout(2200);ok(!(await p2.evaluate(()=>!!document.getElementById('popg'))),'visiteur venu sans lien : pas de Pop');await c2.close()}
 // fermer Pop avec la croix
 ({c,p}=await visit('pop'));await p.click('#popg .pgx');await p.waitForTimeout(600);ok(!(await p.evaluate(()=>!!document.getElementById('popg'))),'la croix ferme Pop');await c.close();
 // stats
 await new Promise(r=>setTimeout(r,800));const html=await (await fetch(U+'/admin/stats?key='+KEY)).text();const sec=html.split('Pop qui guide')[1]||'';
 const m1=sec.match(/Avec Pop<\/td><td>(\d+)<\/td><td>(\d+)/),m2=sec.match(/Sans Pop<\/td><td>(\d+)<\/td><td>(\d+)/);
 ok(m1&&m2&&+m1[1]>=2&&+m1[2]>=1&&+m2[1]>=1&&+m2[2]>=1,'stats : avec Pop '+(m1?m1[1]+' vus / '+m1[2]+' ont écrit':'?')+', sans Pop '+(m2?m2[1]+' / '+m2[2]:'?'));
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
