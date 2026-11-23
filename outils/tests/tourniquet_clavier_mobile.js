// Tourniquet, téléphone : le champ de saisie invisible est posé sur la définition choisie dans le cercle,
// pour que le clavier du téléphone garde le joueur en face du cercle (la page ne descend plus vers les cases de réponse).
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
 const c=await br.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'/');await p.evaluate(()=>['fleches','rond','meles','culture','poker'].forEach(k=>localStorage.setItem('fl-tuto-'+k,'1')));
 await p.goto(U+'/rond?go=solo&lvl=facile');await p.waitForTimeout(5000);
 await p.setViewportSize({width:390,height:520});await p.waitForTimeout(300);
 await p.evaluate(()=>{const q=[...document.querySelectorAll('.rq')].filter(e=>e.offsetParent).pop();q.id='cible';q.scrollIntoView({block:'center'})});await p.waitForTimeout(200);
 await p.tap('#cible');await p.waitForTimeout(400);
 const m=()=>p.evaluate(()=>{const k=document.getElementById('kb'),t=document.querySelector('#rring .rq.sel'),sl=document.getElementById('rSlots');const a=k.getBoundingClientRect(),b=t.getBoundingClientRect();return{dx:Math.abs(a.left-b.left),dy:Math.abs(a.top-b.top),foc:document.activeElement===k,sy:scrollY,tt:b.top,tb:b.bottom,ih:innerHeight,txt:sl.textContent}});
 let s=await m();ok(s.foc,'la saisie est active après le toucher d\'une définition');ok(s.dx<2&&s.dy<2,'le champ invisible est posé sur le cercle choisi (écart '+s.dx.toFixed(1)+' / '+s.dy.toFixed(1)+')');
 const y0=s.sy;
 for(const l of 'ABC'){await p.evaluate(()=>document.getElementById('kb').focus());await p.keyboard.type(l);await p.waitForTimeout(150)}
 s=await m();ok(s.txt.startsWith('ABC'),'les lettres arrivent dans les cases ('+s.txt+')');ok(s.sy===y0&&s.tt>=0&&s.tb<=s.ih,'la page reste en face du cercle en tapant (défilement '+y0+' → '+s.sy+')');
 // touche Effacer d'Android : le caractère invisible disparaît du champ → une lettre est effacée
 const t0=await p.evaluate(()=>window.__t('typ'));await p.evaluate(()=>{const k=document.getElementById('kb');k.value='';k.dispatchEvent(new Event('input'))});await p.waitForTimeout(150);
 const t1=await p.evaluate(()=>window.__t('typ'));ok(t1===t0.slice(0,-1),'touche Effacer du clavier Android : une lettre effacée ('+t0+' → '+t1+')');
 await p.evaluate(()=>{const k=document.getElementById('kb');k.value='\u200bD';k.dispatchEvent(new Event('input'))});await p.waitForTimeout(150);
 await p.setViewportSize({width:390,height:380});await p.waitForTimeout(400);await p.keyboard.type('D');await p.waitForTimeout(300);s=await m();
 ok(s.tt>=0&&s.tb<=s.ih,'avec le clavier ouvert, le cercle choisi reste visible ('+Math.round(s.tt)+'–'+Math.round(s.tb)+' sur '+s.ih+')');
 await p.screenshot({path:'/home/claude/t/tourniquet_clavier.png'});
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
