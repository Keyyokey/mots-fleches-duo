const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');
const U='http://localhost:3100';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
const api=async(r,b)=>{const x=await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return {status:x.status,...await x.json()}};
(async()=>{const nm='SK'+Math.floor(Math.random()*9000+1000);const a=await api('create',{name:nm,pin:'2468'});const T={name:nm,token:a.token};
 let r=await api('skin',{...T,skin:'leo/dore'});ok(r.status===403,'serveur : habillage légendaire refusé à 0 point ('+r.error+')');
 r=await api('skin',{...T,skin:'inconnu/x'});ok(r.status===400,'serveur : habillage inconnu refusé');
 r=await api('skin',{...T,skin:'patineuse/classique'});ok(r.status===(new Date().getMonth()===11?200:403),'serveur : série Hiver seulement en décembre');
 r=await api('skin',{name:nm,token:'faux',skin:'leo/classique'});ok(r.status===401,'serveur : sans le bon jeton, refusé');
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 for(const [w,h] of [[1280,900],[375,812]]){const p=await (await br.newContext({viewport:{width:w,height:h}})).newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U+'/');await p.evaluate(m=>localStorage.setItem('fl-me',JSON.stringify(m)),T);await p.goto(U+'/');await p.waitForTimeout(1500);
  const pill=w<=620?'#mBtn':'.me-pill';await p.click(pill);await p.waitForTimeout(400);
  if(w<=620){const mm=await p.$('#mMe');if(mm&&await mm.isVisible()){await mm.click();await p.waitForTimeout(400)}}
  ok(await p.isVisible('#meSkin'),w+' px : le profil propose « 🎭 Mon skin »');
  await p.click('#meSkin');await p.waitForTimeout(400);
  const st=await p.evaluate(()=>({on:document.getElementById('skins').classList.contains('on'),tiles:document.querySelectorAll('.sktile').length,lock:document.querySelectorAll('.sktile.lock').length,sub:document.getElementById('skSub').textContent,sw:document.documentElement.scrollWidth,box:document.querySelector('.skbox').getBoundingClientRect().right}));
  ok(st.on&&st.tiles===70,w+' px : casier ouvert, 70 habillages ('+st.sub+')');ok(st.box<=w&&st.sw<=w,w+' px : le casier tient dans l\'écran');
  await p.click('.sktile[data-id="leo/dore"]',{force:true});await p.waitForTimeout(300);ok(/5[\s\u202f\u00a0]?000 points/.test(await p.textContent('#skErr')),w+' px : habillage verrouillé → condition affichée');
  const pick=w===1280?'leo/classique':'chat/classique';await p.click('.sktile[data-id="'+pick+'"]');await p.waitForTimeout(800);
  const after=await p.evaluate(()=>({me:JSON.parse(localStorage.getItem('fl-me')).skin,pill:document.querySelector('.me-pill .av-me').className,on:document.querySelector('.sktile.on')&&document.querySelector('.sktile.on').dataset.id}));
  ok(after.me===pick&&after.on===pick&&/hasskin/.test(after.pill),w+' px : skin choisi et affiché sur la pastille du profil ('+pick+')');
  await p.screenshot({path:'/home/claude/t/skins_'+w+'.png'});
  await p.reload();await p.waitForTimeout(1500);const me=await api('me',T);ok(me.skin===pick,w+' px : le skin est gardé par le serveur (me → '+me.skin+')')}
 const rk=await api('rank',{name:nm});ok(true,'classement : '+JSON.stringify(rk.me||rk.top&&rk.top.find(x=>x.name===nm)||'pas encore classé'));
 ok(!errs.length,'aucune erreur JavaScript '+JSON.stringify(errs));console.log(res.join('\n'));await br.close()})();
