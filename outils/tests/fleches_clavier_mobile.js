// Mots fléchés, téléphone : le champ de saisie invisible suit la case en cours,
// pour que le clavier du téléphone ne fasse plus remonter la page à chaque lettre.
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 const c=await br.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'/');await p.evaluate(()=>['fleches','rond','meles','culture','poker'].forEach(k=>localStorage.setItem('fl-tuto-'+k,'1')));
 await p.goto(U+'/fleches?go=solo&lvl=facile');await p.waitForTimeout(5000);
 // une case vide en bas de la grille
 const box=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#grid .fc:not(.q)')].filter(e=>!e.textContent.trim());const e=cs[cs.length-1];e.id='cible';const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2+scrollY}});
 await p.setViewportSize({width:390,height:520});await p.waitForTimeout(300);await p.evaluate(()=>document.getElementById('cible').scrollIntoView({block:'center'}));await p.waitForTimeout(200);
 await p.tap('#cible');await p.waitForTimeout(300);
 const m=()=>p.evaluate(()=>{const k=document.getElementById('kb'),c=document.querySelector('#grid .fc.caret');const a=k.getBoundingClientRect(),b=c.getBoundingClientRect();return{dx:Math.abs(a.left-b.left),dy:Math.abs(a.top-b.top),foc:document.activeElement===k,sy:scrollY,ct:b.top,cb:b.bottom,ih:innerHeight}});
 let s=await m();ok(s.foc,'la saisie est active après le toucher d\'une case');ok(s.dx<2&&s.dy<2,'le champ invisible est posé sur la case en cours (écart '+s.dx.toFixed(1)+' / '+s.dy.toFixed(1)+')');
 const y0=s.sy;
 // le navigateur du téléphone ramène le champ à l'écran à chaque lettre : on le reproduit
 for(const l of 'ABC'){await p.evaluate(()=>document.getElementById('kb').focus());await p.keyboard.type(l);await p.waitForTimeout(150)}
 s=await m();ok(s.sy>y0-60,'la page ne remonte plus en tapant (défilement '+y0+' → '+s.sy+')');ok(s.dx<2&&s.dy<2,'le champ suit la case suivante');
 // clavier ouvert : la fenêtre visible rétrécit
 await p.setViewportSize({width:390,height:380});await p.waitForTimeout(400);await p.keyboard.type('D');await p.waitForTimeout(300);s=await m();
 ok(s.ct>=0&&s.cb<=s.ih,'avec le clavier ouvert, la case en cours reste visible ('+Math.round(s.ct)+'–'+Math.round(s.cb)+' sur '+s.ih+')');
 await p.screenshot({path:'/home/claude/t/clavier.png'});
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
