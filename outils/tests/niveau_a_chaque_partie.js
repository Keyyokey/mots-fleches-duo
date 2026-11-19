const {chromium}=require('/tmp/pw/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];let ok=0,ko=0;const chk=(c,m)=>{console.log((c?'✅ ':'❌ ')+m);c?ok++:ko++};
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.addInitScript(()=>{for(const k of ['fleches','rond','meles','magnetico','poker','culture'])localStorage.setItem('fl-tuto-'+k,'1')});
const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
for(const [k,lv,lab,ln] of [['fleches','difficile','Difficile','normal'],['rond','moyen','Normal','facile'],['meles','difficile','Difficile','moyen'],['magnetico','normal','Normal','difficile']]){
 await p.goto('http://localhost:3999/');await p.waitForTimeout(800);
 await p.evaluate(k=>{document.querySelector('.tile[data-key="'+k+'"] .abtn[data-mode="solo"]').click()},k);await p.waitForTimeout(300);
 chk(await p.$eval('#cfg',e=>e.classList.contains('on')),k+' : Solo ouvre la fenêtre de réglage');
 await p.evaluate(lab=>[...document.querySelectorAll('#lvl button')].find(x=>x.textContent===lab).click(),lab);
 await Promise.all([p.waitForNavigation(),p.click('#cfgGo')]);
 
 await p.waitForTimeout(2500);
 const lvl=await p.evaluate(()=>{try{return window.__t('G.level')}catch(e){return 'err '+e.message}});chk(lvl===lv,k+' : G.level = '+lvl);
 await p.evaluate(()=>window.__t('document.getElementById("endWin").classList.add("on")'));await p.waitForTimeout(200);
 const btns=await p.$$eval('#endAgain [data-lv]',x=>x.map(b=>b.textContent+(b.classList.contains('on')?'*':'')));chk(btns.length===3,k+' : fin de partie propose '+btns.join(' / '));
 if(k==='fleches')await p.screenshot({path:'/tmp/fin_niveau.png'});
 await p.click('#endAgain [data-lv="'+ln+'"]');await p.waitForTimeout(3500);
 const l2=await p.evaluate(()=>window.__t('G.level'));chk(l2===ln,k+' : nouvelle partie au niveau '+l2);
}
// retour accueil : Solo redemande le réglage, niveau précédent présélectionné
await p.goto('http://localhost:3999/');await p.waitForTimeout(800);
await p.evaluate(()=>document.querySelector('.tile[data-key="fleches"] .abtn[data-mode="solo"]').click());await p.waitForTimeout(300);
chk(await p.$eval('#cfg',e=>e.classList.contains('on')),'2e partie : la fenêtre de réglage revient');
console.log('présélection :',await p.$eval('#lvl .on',e=>e.textContent));
console.log(ok,'ok',ko,'ko','erreurs',errs);await b.close()})();
