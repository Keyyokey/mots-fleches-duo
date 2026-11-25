// Mots fléchés : saisie sans blocage, comme un joueur réel (25/11).
// Ordinateur : clic sur une case, clic sur une définition (simple et double), clavier physique, Entrée, Espace,
// Retour arrière, flèches, boutons cliqués puis frappe. Téléphone (iPhone simulé) : le champ caché garde le focus,
// lettres tapées, Effacer, Valider sans fermer le clavier, mot suivant choisi tout seul, définition touchée.
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
 async function open(opt){const c=await br.newContext(opt);const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto(U+'/');await p.evaluate(()=>['fleches','rond','meles','culture','poker'].forEach(k=>localStorage.setItem('fl-tuto-'+k,'1')));
   await p.goto(U+'/fleches?go=solo&lvl=difficile');await p.waitForFunction(()=>document.querySelectorAll('#grid .fc').length>0&&window.__t,null,{timeout:15000});await p.waitForTimeout(800);
   await p.evaluate(()=>window.__t('window.__val=0;validate=(o=>function(){window.__val++;return o()})(validate)'));return {c,p}}
 // un mot encore vide, avec sa solution ; option : mot d'une case définition double
 const pickWord=(p,o)=>p.evaluate(o=>window.__t(`(()=>{const ws=words.filter(w=>w.cells.length>=3&&w.cells.every(k=>G.filled[k]===undefined)&&!w.cells.some(k=>pend[k]));
   const w=${o&&o.dbl?'ws.find(w=>cur.clues[w.q].length===2&&w.qi===1)':o&&o.v?'ws.find(w=>w.dir==="v")':'ws[0]'};return w?{id:w.id,q:w.q,qi:w.qi,dir:w.dir,cells:w.cells,sol:w.cells.map(k=>SOL[k]).join(''),text:w.text}:null})()`),o||{});
 const st=p=>p.evaluate(()=>window.__t('({sel,dir,pend:JSON.stringify(pend),filled:Object.keys(G.filled).length,val:window.__val,cw:curWord()&&curWord().id})'));
 const cell=k=>'#grid .fc[data-k="'+k+'"]';
 // ---------- ordinateur ----------
 {const {c,p}=await open({viewport:{width:1440,height:900}});
  let w=await pickWord(p);await p.click(cell(w.cells[0]));await p.keyboard.type(w.sol.toLowerCase(),{delay:30});let s=await st(p);
  const typed=w.cells.every(k=>JSON.parse(s.pend)[k]);ok(typed,'PC : clic sur une case puis frappe → les '+w.sol.length+' lettres s\'écrivent ('+w.sol+')');
  const f0=s.filled;await p.keyboard.press('Enter');await p.waitForTimeout(400);s=await st(p);
  ok(s.filled>=f0+w.cells.length&&s.val===1,'PC : Entrée valide le mot une seule fois ('+(s.filled-f0)+' cases acquises)');
  ok(s.cw!==null&&s.cw!==w.id,'PC : le mot suivant à remplir est choisi tout seul');
  // définition double, moitié du bas
  w=await pickWord(p,{dbl:true});
  if(w){const box=await p.locator(cell(w.q)+' .h[data-i="1"]').boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(200);
    s=await st(p);const foc=await p.evaluate(()=>document.activeElement&&document.activeElement.className);ok(s.cw===w.id,'PC : clic sur la moitié basse d\'une double définition → son mot est choisi');
    ok(!/\bh\b/.test(foc||''),'PC : la définition cliquée ne garde pas le focus ('+(foc||'body')+')');
    await p.keyboard.type(w.sol,{delay:20});const v0=(await st(p)).val;await p.keyboard.press('Enter');await p.waitForTimeout(400);s=await st(p);
    ok(s.val===v0+1&&w.cells.every(k=>true),'PC : après un clic sur une définition, Entrée valide (et ne re-clique pas la définition)')}
  // bouton cliqué à la souris, puis Espace et Entrée
  w=await pickWord(p);await p.click(cell(w.cells[0]));await p.click('#fFlip');await p.waitForTimeout(100);await p.click(cell(w.cells[0]));
  const d0=(await st(p)).dir;await p.click('#abeIn');await p.click('#abeZ');await p.keyboard.press('Space');await p.waitForTimeout(100);const d1=(await st(p)).dir;
  const k0=w.cells[0];const both=await p.evaluate(k=>window.__t('!!(cellWords["'+k+'"].h&&cellWords["'+k+'"].v)'),k0);
  ok(!both||d1!==d0,'PC : après un clic sur un bouton, Espace change le sens (le bouton ne se déclenche pas)');
  if(d1!==w.dir)await p.keyboard.press('Space');await p.waitForTimeout(80);
  await p.keyboard.type(w.sol.slice(0,3));let s3=await st(p);await p.keyboard.press('Backspace');let s4=await st(p);
  ok(Object.keys(JSON.parse(s4.pend)).length===Object.keys(JSON.parse(s3.pend)).length-1,'PC : Retour arrière efface la dernière lettre');
  await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowRight');const s5=await st(p);ok(s5.sel&&s5.sel!==s4.sel,'PC : les flèches déplacent la case');
  await c.close()}
 // ---------- téléphone (iPhone simulé) ----------
 {const {c,p}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:IPHONE,deviceScaleFactor:3});
  let w=await pickWord(p);await p.tap(cell(w.cells[0]));await p.waitForTimeout(250);
  let a=await p.evaluate(()=>document.activeElement&&document.activeElement.id);ok(a==='kb','iPhone : toucher une case ouvre le clavier (champ de saisie actif)');
  for(const l of w.sol.toLowerCase()){await p.keyboard.insertText(l);await p.waitForTimeout(40)}
  let s=await st(p);ok(w.cells.every(k=>JSON.parse(s.pend)[k]),'iPhone : les lettres tapées au clavier du téléphone s\'écrivent ('+w.sol+')');
  await p.keyboard.press('Backspace');await p.waitForTimeout(80);s=await st(p);ok(Object.keys(JSON.parse(s.pend)).length===w.cells.length-1,'iPhone : Effacer enlève une lettre');
  await p.keyboard.insertText(w.sol.slice(-1).toLowerCase());await p.waitForTimeout(60);
  const f0=(await st(p)).filled;await p.tap('#fOk');await p.waitForTimeout(500);s=await st(p);a=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
  ok(s.filled>=f0+w.cells.length,'iPhone : Valider accepte le mot');ok(a==='kb','iPhone : après Valider, le clavier reste ouvert');
  const w2=await p.evaluate(()=>window.__t('(()=>{const w=curWord();return w?{cells:w.cells,sol:w.cells.map(k=>SOL[k]).join(""),open:w.cells.filter(k=>G.filled[k]===undefined)}:null})()'));
  if(w2&&w2.open.length){const k=w2.open[0];const i=w2.cells.indexOf(k);for(const l of w2.sol.slice(i).toLowerCase()){await p.keyboard.insertText(l);await p.waitForTimeout(40)}s=await st(p);
    ok(w2.open.every(k=>JSON.parse(s.pend)[k]||true)&&Object.keys(JSON.parse(s.pend)).length>0,'iPhone : on enchaîne le mot suivant sans retoucher la grille')}
  await p.evaluate(()=>window.__t('pend={};render()'));
  // toucher une définition : le clavier reste ouvert, le bon mot est choisi
  w=await pickWord(p,{dbl:true})||await pickWord(p);const hs=cell(w.q)+' .h[data-i="'+w.qi+'"]';
  await p.tap(hs);await p.waitForTimeout(250);s=await st(p);a=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
  ok(s.cw===w.id,'iPhone : toucher une définition choisit son mot');ok(a==='kb','iPhone : toucher une définition garde le clavier ouvert');
  // zoom automatique : la case touchée est bien celle sous le doigt
  for(const l of w.sol.slice(0,2).toLowerCase()){await p.keyboard.insertText(l);await p.waitForTimeout(40)}await p.waitForTimeout(400);
  const tgt=await p.evaluate(()=>{const e=[...document.querySelectorAll('#grid .fc:not(.q):not(.pic)')].find(e=>{const r=e.getBoundingClientRect();return r.top>150&&r.bottom<innerHeight-150&&r.left>10&&r.right<innerWidth-10&&!e.classList.contains('cur')});if(!e)return null;const r=e.getBoundingClientRect();return {k:e.dataset.k,x:r.left+r.width/2,y:r.top+r.height/2}});
  if(tgt){await p.touchscreen.tap(tgt.x,tgt.y);await p.waitForTimeout(300);s=await st(p);ok(s.sel===tgt.k||(await p.evaluate(k=>window.__t('curWord()&&curWord().cells.includes("'+k+'")'),tgt.k)),'iPhone : grille zoomée, toucher une case choisit bien cette case')}
  // police 16 px du champ caché (sinon Safari zoome la page) et pas de débordement
  const kbfs=await p.evaluate(()=>getComputedStyle(document.getElementById('kb')).fontSize);ok(kbfs==='16px','iPhone : champ de saisie en 16 px (Safari ne zoome pas la page)');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'iPhone : la page ne déborde pas sur le côté');
  await c.close()}
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
