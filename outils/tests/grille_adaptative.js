// Mots fléchés : moteur de grille adaptative (25/11).
// Tailles 8×8, 10×13, 12×12, 15×15 (+ vraies grilles 10×10, 13×10, 15×10), écrans de 360 à 3840 px,
// rotation, clavier du téléphone, zoom du navigateur, zoom interne, clavier, toucher, changement de grille,
// mode concentration, et aucun recalcul pendant la saisie ou le chronomètre.
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
// grille fabriquée : définitions simples, doubles, longues, flèches droites, bas et coudées
function fake(nr,nc,seed){let x=seed||7;const rnd=()=>(x=(x*1103515245+12345)%2147483648)/2147483648;
  const isQ=(r,c)=>(r===0&&c%2===0)||(c===0&&r%2===0)||(r>1&&c>1&&(r*7+c*3)%11===0);
  const T=['CHAT','OISEAU DES\nANTILLES','GRANDE\nPROMENADE DU\nDIMANCHE MATIN','ÉPOUVANTABLEMENT','PAYS DU\nSOLEIL-LE-\nVANT','SUR','LONGUE DÉFINITION QUI NE TIENT JAMAIS DANS UNE SEULE CASE','ALLER-RET-\nOUR','MÉDICAMENT','RIRE'];
  let K='';const clues={};
  for(let r=0;r<nr;r++)for(let c=0;c<nc;c++)K+=isQ(r,c)?'#':String.fromCharCode(65+Math.floor(rnd()*26));
  const L=(r,c)=>r<nr&&c<nc&&!isQ(r,c);
  for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){if(!isQ(r,c))continue;const cl=[];const t=()=>T[Math.floor(rnd()*T.length)];
    if(L(r,c+1))cl.push([t(),'R']);else if(L(r+1,c+1)&&r+1<nr)cl.push([t(),'DR']);
    if(L(r+1,c))cl.push([t(),'D']);else if(L(r,c+1)&&cl.length===0)cl.push([t(),'RD']);
    if(r===0&&c===0){cl.length=0;cl.push([t(),'RD'],[t(),'DR'])}
    if(cl.length)clues[r+','+c]=cl.slice(0,2)}
  return {id:'X'+nr+'x'+nc,page:'X',name:'Test '+nr+'×'+nc,lvl:'facile',hint:'',myst:'',nums:{},nr,nc,k:Buffer.from(K.split('').reverse().join(''),'latin1').toString('base64'),clues}}
const sizes=[[8,8],[10,13],[12,12],[15,15]];
const screens=[[360,640,true],[390,844,true],[768,1024,true],[1024,768,false],[1366,768,false],[1920,1080,false],[2560,1440,false],[3840,2160,false]];
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
 async function open(w,h,mob,dsf){const c=await br.newContext({viewport:{width:w,height:h},isMobile:!!mob,hasTouch:!!mob,deviceScaleFactor:dsf||1});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
   await p.goto(U+'/');await p.evaluate(()=>['fleches','rond','meles','culture','poker'].forEach(k=>localStorage.setItem('fl-tuto-'+k,'1')));
   await p.goto(U+'/fleches?go=solo&lvl=facile');await p.waitForFunction(()=>document.querySelectorAll('#grid .fc').length>0&&window.__t,null,{timeout:15000});await p.waitForTimeout(600);return {c,p}}
 const load=(p,g)=>p.evaluate(g=>{window.__t('prep('+JSON.stringify(g)+');render()')},g);
 // mesures : cases carrées, débordements, police, chevauchement flèche / texte
 const measure=p=>p.evaluate(()=>{const g=document.getElementById('grid'),box=document.querySelector('.flboard');const cells=[...g.querySelectorAll('.fc')];
   let sq=0;cells.forEach(e=>{const r=e.getBoundingClientRect();sq=Math.max(sq,Math.abs(r.width-r.height))});
   const minF=window.__t('ABE.minFont');let small=0,overlap=0,hidden=0;
   g.querySelectorAll('.fc.q').forEach(q=>{const hs=[...q.querySelectorAll('.h')];hs.forEach(h=>{if(parseFloat(h.style.fontSize)<minF-.05)small++;const t=h.querySelector('.ht');if(!h.classList.contains('abe-cut')&&t&&(t.offsetHeight>h.clientHeight+1||t.scrollWidth>t.clientWidth+1))hidden++});
     q.querySelectorAll('.ar').forEach(a=>{const ar=a.getBoundingClientRect();const pad=1;hs.forEach(h=>{const t=h.querySelector('.ht');if(!t||!t.firstChild)return;const h1=h.getBoundingClientRect(),t1=t.getBoundingClientRect(),hr={left:Math.max(h1.left,t1.left),right:Math.min(h1.right,t1.right),top:Math.max(h1.top,t1.top),bottom:Math.min(h1.bottom,t1.bottom)};const rg=document.createRange();rg.selectNodeContents(t);
       // seule la partie visible du texte compte (le reste est masqué par la case)
       [...rg.getClientRects()].forEach(r0=>{const r={left:Math.max(r0.left,hr.left),right:Math.min(r0.right,hr.right),top:Math.max(r0.top,hr.top),bottom:Math.min(r0.bottom,hr.bottom)};if(r.right<=r.left||r.bottom<=r.top)return;const ix=Math.min(r.right,ar.right-pad)-Math.max(r.left,ar.left+pad),iy=Math.min(r.bottom,ar.bottom-pad)-Math.max(r.top,ar.top+pad);if(ix>0.5&&iy>0.5)overlap++})})})});
   const bs=box.getBoundingClientRect(),gr=g.getBoundingClientRect();
   return {s:parseFloat(g.style.getPropertyValue('--s')),sq,docW:document.documentElement.scrollWidth,vw:innerWidth,small,overlap,hidden,cut:window.__t('ABE.cut'),scroll:box.classList.contains('abe-scroll'),
     fitsW:gr.width<=bs.width+1,fitsH:gr.bottom<=innerHeight+2||box.classList.contains('abe-scroll'),nr:window.__t('NR'),nc:window.__t('NC')}});
 // 1. toutes les tailles sur tous les écrans
 const sAt={};
 for(const [w,h,mob] of screens){const {c,p}=await open(w,h,mob);let bad=[];
   for(const [nr,nc] of sizes){await load(p,fake(nr,nc,nr*31+nc));await p.waitForTimeout(250);const m=await measure(p);sAt[w+'-'+nr+'x'+nc]=m.s;
     if(m.sq>0.6)bad.push(nr+'×'+nc+' cases non carrées ('+m.sq.toFixed(2)+')');if(m.docW>m.vw)bad.push(nr+'×'+nc+' page qui déborde ('+m.docW+')');
     if(m.small)bad.push(nr+'×'+nc+' '+m.small+' police(s) sous le minimum');if(m.overlap)bad.push(nr+'×'+nc+' '+m.overlap+' flèche(s) sur du texte');
     if(m.hidden)bad.push(nr+'×'+nc+' '+m.hidden+' texte(s) coupé(s) sans « … »');if(!m.fitsW&&!m.scroll)bad.push(nr+'×'+nc+' grille trop large sans défilement');if(!m.fitsH)bad.push(nr+'×'+nc+' grille trop haute sans défilement');}
   ok(!bad.length,w+'×'+h+' : 8×8, 10×13, 12×12, 15×15 carrées, sans débordement ni chevauchement'+(bad.length?' — '+bad.slice(0,3).join(' ; '):''));
   if(w===390){// vraies grilles du jeu
     const real=await p.evaluate(()=>{const o={};(window.__GRIDS||[]).forEach(g=>{const k=(g.nr||10)+'x'+(g.nc||10);if(!o[k])o[k]=g});return Object.values(o)});
     let rb=[];for(const g of real){await load(p,g);await p.waitForTimeout(250);const m=await measure(p);if(m.sq>0.6||m.docW>m.vw||m.small||m.overlap||m.hidden)rb.push(m.nr+'×'+m.nc+JSON.stringify(m))}
     ok(real.length&&!rb.length,'vraies grilles ('+real.map(g=>(g.nr||10)+'×'+(g.nc||10)).join(', ')+') sur téléphone : propres'+(rb.length?' — '+rb[0]:''))}
   await c.close()}
 ok(sAt['3840-12x12']>sAt['1366-12x12']*1.6&&sAt['2560-15x15']>sAt['1366-15x15'],'grand écran : la grille s\'agrandit ('+sAt['1366-12x12']+' px → '+sAt['3840-12x12']+' px par case en 12×12)');
 // 2. téléphone : rotation, clavier ouvert, zoom interne, toucher, doubles définitions
 {const {c,p}=await open(390,844,true);const g10=fake(10,13,5);await load(p,g10);await p.waitForTimeout(300);const s0=(await measure(p)).s;
  await p.setViewportSize({width:844,height:390});await p.waitForTimeout(500);let m=await measure(p);
  ok(m.docW<=m.vw&&m.sq<=0.6&&(m.fitsW||m.scroll),'rotation en paysage : grille recalculée ('+m.s+' px), page sans débordement'+(m.scroll?', défilement dans la grille seulement':''));
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);m=await measure(p);ok(Math.abs(m.s-s0)<=1,'retour en portrait : même taille qu\'au départ ('+s0+' → '+m.s+' px)');
  // clavier du téléphone : la fenêtre rétrécit, la grille ne bouge pas
  const empty=await p.evaluate(()=>{const e=[...document.querySelectorAll('#grid .fc:not(.q):not(.pic)')][3];e.id='abeCellA';return true});
  await p.tap('#abeCellA');await p.waitForTimeout(200);await p.setViewportSize({width:390,height:470});await p.waitForTimeout(500);m=await measure(p);
  ok(Math.abs(m.s-s0)<=1,'clavier ouvert (fenêtre 844 → 470 px) : la grille garde sa taille ('+m.s+' px)');
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);
  // une double définition : chaque moitié choisit son propre mot, un seul déclenchement par toucher
  await p.evaluate(()=>window.__t('window.__pk=0;pick=(o=>function(k){window.__pk++;return o(k)})(pick)'));
  const dbl=await p.evaluate(()=>{const q=[...document.querySelectorAll('#grid .fc.q')].find(q=>q.querySelectorAll('.h').length===2);q.id='dq';const hs=q.querySelectorAll('.h');hs[0].id='h0';hs[1].id='h1';return true});
  await p.tap('#h0');await p.waitForTimeout(250);const a0=await p.evaluate(()=>({sel:document.getElementById('h0').classList.contains('qsel'),clue:document.getElementById('fClue').textContent,pk:window.__pk}));
  await p.tap('#h1');await p.waitForTimeout(250);const a1=await p.evaluate(()=>({sel:document.getElementById('h1').classList.contains('qsel'),other:document.getElementById('h0').classList.contains('qsel'),clue:document.getElementById('fClue').textContent,pk:window.__pk}));
  ok(a0.sel&&a1.sel&&!a1.other&&a0.clue!==a1.clue,'double définition : les deux moitiés se choisissent séparément'+(a0.sel&&a1.sel?'':' '+JSON.stringify([a0,a1])));ok(a0.pk===1&&a1.pk===2,'un toucher = une seule sélection (pas de double déclenchement : '+a0.pk+', '+a1.pk+')');
  // une définition coupée se lit en entier dans le panneau
  const full=await p.evaluate(()=>{const h=document.querySelector('#grid .fc.q .h.abe-cut');if(!h)return {none:true};h.click();return {clue:document.getElementById('fClue').textContent,title:h.title,vis:document.getElementById('fClue').scrollHeight<=document.getElementById('fClue').clientHeight+2}});
  ok(full.none||(full.clue.replace(/\s+/g,' ').trim()===full.title.replace(/\s+/g,' ').trim()&&full.vis)||(full.clue.replace(/\s+/g,' ').trim()===full.title&&full.vis),full.none?'aucune définition coupée sur ce format':'définition coupée dans la case : lue en entier dans le panneau (« '+(full.clue||'').slice(0,40)+' »)');
  // zoom interne 100 → 250 %
  for(let i=0;i<6;i++){await p.tap('#abeIn');await p.waitForTimeout(120)}m=await measure(p);const z=await p.evaluate(()=>({z:window.__t('ABE.z'),fit:window.__t('ABE.fitS'),lab:document.getElementById('abeZ').textContent,dis:document.getElementById('abeIn').disabled}));
  ok(z.z===2.5&&z.lab==='250 %'&&z.dis&&Math.abs(m.s-Math.round(Math.max(22,z.fit)*2.5))<=1,'zoom interne jusqu\'à 250 % ('+m.s+' px par case), bouton + grisé au maximum');
  ok(m.scroll&&m.docW<=m.vw,'zoomé : seule la zone de grille défile, la page ne déborde pas');
  await p.tap('#abeZ');await p.waitForTimeout(300);m=await measure(p);ok(Math.abs(m.s-s0)<=1&&!m.scroll,'toucher « 250 % » : retour à 100 %');
  await c.close()}
 // 3. ordinateur : clavier, concentration, plein écran, changement de grille, aucun recalcul pendant la saisie
 {const {c,p}=await open(1440,900,false);await load(p,fake(12,12,9));await p.waitForTimeout(400);const s0=(await measure(p)).s;
  await p.evaluate(()=>{document.querySelector('#grid .fc.q .h').focus()});await p.keyboard.press('Enter');await p.waitForTimeout(200);
  const k1=await p.evaluate(()=>({sel:document.querySelector('#grid .fc.q .h').classList.contains('qsel'),cur:document.querySelectorAll('#grid .fc.cur').length}));
  ok(k1.sel&&k1.cur>0,'clavier : Tab jusqu\'à une définition puis Entrée choisit son mot');
  const st0=await p.evaluate(()=>window.__t('JSON.stringify(ABE.stats)'));
  await p.keyboard.type('ABCDE');await p.keyboard.press('ArrowLeft');await p.keyboard.press('Backspace');await p.waitForTimeout(3200);
  const st1=await p.evaluate(()=>window.__t('JSON.stringify(ABE.stats)'));const a=JSON.parse(st0),b=JSON.parse(st1);
  ok(b.typo===a.typo,'saisie de 5 lettres + 3 s de chronomètre : aucun recalcul des définitions ('+a.typo+' → '+b.typo+')');
  const pend=await p.evaluate(()=>document.querySelectorAll('#grid .fc.pend').length);ok(pend>=3,'les lettres tapées s\'affichent toujours ('+pend+' en attente)');
  // concentration
  await p.click('#abeFocus');await p.waitForTimeout(400);let f=await p.evaluate(()=>({hdr:getComputedStyle(document.getElementById('skTop')).display,clue:!!document.getElementById('fClue').offsetParent,s:parseFloat(document.getElementById('grid').style.getPropertyValue('--s'))}));
  ok(f.hdr==='none'&&f.clue&&f.s>=s0,'mode concentration : en-tête caché, panneau « Définition » toujours là, grille '+s0+' → '+f.s+' px');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);f=await p.evaluate(()=>document.body.classList.contains('abe-focus'));ok(!f,'Échap quitte le mode concentration');
  const fs=await p.evaluate(()=>({btn:!!document.getElementById('abeFs'),en:!!document.fullscreenEnabled}));ok(fs.btn===fs.en,'bouton plein écran présent seulement si le navigateur le permet');
  // changement de grille sans recharger
  await load(p,fake(15,15,3));await p.waitForTimeout(400);let m=await measure(p);ok(m.nr===15&&m.sq<=0.6&&!m.small&&!m.overlap&&m.docW<=m.vw,'changement de grille sans recharger (12×12 → 15×15) : tout est recalculé'+(m.overlap||m.small?' '+JSON.stringify(m):''));
  // flèches conservées : même nombre de flèches de chaque sorte que les définitions
  const arr=await p.evaluate(()=>{const c={};document.querySelectorAll('#grid .ar').forEach(a=>c[a.dataset.d]=(c[a.dataset.d]||0)+1);const want={};const cl=window.__t('cur.clues');Object.values(cl).forEach(l=>l.forEach(([t,d])=>want[d]=(want[d]||0)+1));return {c,want}});
  ok(JSON.stringify(Object.entries(arr.c).sort())===JSON.stringify(Object.entries(arr.want).sort()),'flèches droites, bas et coudées conservées '+JSON.stringify(arr.c));
  await c.close()}
 // 4. zoom du navigateur 125 %, 150 %, 200 % (fenêtre de 1440 px)
 for(const z of [1.25,1.5,2]){const {c,p}=await open(Math.round(1440/z),Math.round(900/z),false,z);await load(p,fake(10,13,4));await p.waitForTimeout(300);const m=await measure(p);
   ok(m.sq<=0.6&&m.docW<=m.vw&&!m.small&&!m.overlap&&(m.fitsW||m.scroll),'zoom du navigateur '+Math.round(z*100)+' % : grille propre ('+m.s+' px)');await c.close()}
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
