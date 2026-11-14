// Tourniquet, téléphone : le champ de saisie invisible est posé sur les cases de réponse,
// pour que le clavier du téléphone ne fasse plus remonter la page à chaque lettre.
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 const c=await br.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'/');await p.evaluate(()=>['fleches','rond','meles','culture','poker'].forEach(k=>localStorage.setItem('fl-tuto-'+k,'1')));
 await p.goto(U+'/rond?go=solo&lvl=facile');await p.waitForTimeout(5000);
 await p.setViewportSize({width:390,height:520});await p.waitForTimeout(300);
 await p.evaluate(()=>{const q=[...document.querySelectorAll('.rq')].filter(e=>e.offsetParent).pop();q.id='cible';q.scrollIntoView({block:'center'})});await p.waitForTimeout(200);
 await p.tap('#cible');await p.waitForTimeout(400);
 const m=()=>p.evaluate(()=>{const k=document.getElementById('kb'),t=document.getElementById('rSlots');const a=k.getBoundingClientRect(),b=t.getBoundingClientRect();return{dx:Math.abs(a.left-b.left),dy:Math.abs(a.top-b.top),foc:document.activeElement===k,sy:scrollY,tt:b.top,tb:b.bottom,ih:innerHeight,txt:t.textContent}});
 let s=await m();ok(s.foc,'la saisie est active après le toucher d\'une définition');ok(s.dx<2&&s.dy<2,'le champ invisible est posé sur les cases de réponse (écart '+s.dx.toFixed(1)+' / '+s.dy.toFixed(1)+')');
 const y0=s.sy;
 for(const l of 'ABC'){await p.evaluate(()=>document.getElementById('kb').focus());await p.keyboard.type(l);await p.waitForTimeout(150)}
 s=await m();ok(s.txt.startsWith('ABC'),'les lettres arrivent dans les cases ('+s.txt+')');ok(Math.abs(s.sy-y0)<80||s.tb<=s.ih,'la page ne remonte pas en haut en tapant (défilement '+y0+' → '+s.sy+')');
 await p.setViewportSize({width:390,height:380});await p.waitForTimeout(400);await p.keyboard.type('D');await p.waitForTimeout(300);s=await m();
 ok(s.tt>=0&&s.tb<=s.ih,'avec le clavier ouvert, les cases de réponse restent visibles ('+Math.round(s.tt)+'–'+Math.round(s.tb)+' sur '+s.ih+')');
 await p.screenshot({path:'/home/claude/t/tourniquet_clavier.png'});
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs.slice(0,3)));console.log(res.join('\n'));await br.close()})();
