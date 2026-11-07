const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');
const U='http://localhost:3100';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 const p=await (await br.newContext({viewport:{width:1280,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));const NV=[];p.on('framenavigated',f=>{if(f===p.mainFrame())NV.push(f.url())});const LU=()=>NV.filter(u=>/go=/.test(u)).pop()||p.url();
 const home=async()=>{NV.length=0;await p.goto(U+'/');await p.waitForTimeout(900)};
 const mode=async(k,sel)=>{await p.hover('.tile[data-key='+k+']');await p.waitForTimeout(700);await p.click('.tile[data-key='+k+'] '+sel);await p.waitForTimeout(1200)};
 await home();await mode('meles','[data-mode=solo]');ok(/\/meles\?go=solo&lvl=facile$/.test(LU()),'Mots mêlés → Solo : partie lancée en 1 clic ('+LU().replace(U,'')+')');
 await home();await p.evaluate(()=>localStorage.setItem('fl-cfg-lvl-fleches','2'));await home();await mode('fleches','[data-mode=solo]');ok(/\/fleches\?go=solo&lvl=difficile/.test(LU()),'le dernier niveau choisi est repris ('+LU().replace(U,'')+')');
 await home();await mode('culture','[data-mode=solo]');ok(/\/culture\?go=solo$/.test(LU()),'Culture G → Solo : lancée directement');
 await home();await mode('poker','[data-mode=solo]');ok(/\/poker\?go=solo&fmt=10&mise=20&dec=30&lvl=inter/.test(LU()),'Poker → Solo : réglages par défaut ('+LU().replace(U,'')+')');
 await home();await mode('rond','[data-cfg]');ok(await p.evaluate(()=>document.querySelector('#cfg').classList.contains('on')&&getComputedStyle(document.querySelector('#cfgMode')).display!=='none'),'« Réglages » ouvre la fenêtre avec le choix Solo / À plusieurs');
 await p.click('#cfgMode [data-m=multi]');await p.waitForTimeout(300);ok(await p.evaluate(()=>document.querySelector('#need').classList.contains('on')),'sans compte, « À plusieurs » propose de se connecter');
 await home();await mode('meles','[data-mode=multi]');ok(await p.evaluate(()=>document.querySelector('#need').classList.contains('on'))&&!NV.some(u=>/go=/.test(u)),'Multijoueurs sans compte : connexion demandée, pas de lancement');
 await home();await p.click('#ctaPlay');await p.waitForTimeout(400);await p.click('#pickL [data-k=rond]');await p.waitForTimeout(1200);ok(/\/rond\?go=solo/.test(LU()),'« Jouer maintenant » → jeu choisi → partie lancée');
 // téléphone : tuile touchée → boutons → lancement
 const m=await (await br.newContext({viewport:{width:375,height:812},hasTouch:true})).newPage();m.on('pageerror',e=>errs.push(e.message));const MV=[];m.on('framenavigated',f=>{if(f===m.mainFrame())MV.push(f.url())});await m.goto(U+'/');await m.waitForTimeout(900);
 await m.tap('.tile[data-key=meles]');await m.waitForTimeout(700);await m.tap('.tile[data-key=meles] [data-mode=solo]');await m.waitForTimeout(1200);ok(MV.some(u=>/\/meles\?go=solo/.test(u)),'téléphone : toucher la tuile puis Solo lance la partie');
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs));console.log(res.join('\n'));await br.close()})();
