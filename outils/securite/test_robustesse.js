// Tests de robustesse / sécurité sur la copie locale (http://localhost:3100) — jamais sur le site en ligne
const WS=require('/home/claude/fleches-site/node_modules/ws');const net=require('net');
const U='http://localhost:'+(process.env.P||3100),WU=U.replace('http','ws')+'/ws';const out=[];const R=(ok,l)=>{out.push((ok?'✅ ':'❌ ')+l);console.log((ok?'✅ ':'❌ ')+l)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const post=async(r,b,ip,raw)=>{const res=await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':ip||'10.1.1.1'},body:raw!==undefined?raw:JSON.stringify(b)});let j=null;try{j=await res.json()}catch(e){}return{st:res.status,j}};
const alive=async()=>{const t=Date.now();try{const r=await fetch(U+'/healthz',{signal:AbortSignal.timeout(8000)});return {ok:r.status===200,ms:Date.now()-t}}catch(e){return{ok:false,ms:Date.now()-t}}};
const mem=async()=>{try{const m=require('fs').readFileSync('/proc/'+process.env.SPID+'/status','utf8').match(/VmRSS:\s+(\d+)/);return Math.round(m[1]/1024)+' Mo'}catch(e){return 'serveur arrêté'}};
const open=(n)=>new Promise(res=>{const w=new WS(WU);w.on('open',()=>res(w));w.on('error',()=>res(null));setTimeout(()=>res(null),5000)});
const letters=n=>[...String(n)].map(d=>'ABCDEFGHIJ'[d]).join('');
(async()=>{
 const T=process.argv[2]||'all';const on=k=>T==='all'||T.split(',').includes(k);
 if(on('http')){
  let r=await post('create',null,'10.2.0.1','{"name":"'+'A'.repeat(6000)+'"}');R(r.st===413,'corps HTTP trop gros → '+r.st);
  r=await post('create',null,'10.2.0.2','{pas du json');R(r.st===400,'JSON invalide → '+r.st);
  r=await post('create',null,'10.2.0.3','[1,2,3]');R(r.st>=400&&r.st<500,'tableau au lieu d\'objet → '+r.st);
  r=await post('create',{name:{"$gt":""},pin:['1']},'10.2.0.4');R(r.st>=400&&r.st<500,'types inattendus (objet, tableau) → '+r.st);
  r=await post('../../etc/passwd',{}, '10.2.0.5');R(r.st===404||r.st===400,'route inconnue / chemin → '+r.st);
  for(const p of ['/d/../server.js','/d/%2e%2e%2fserver.js','/d/..%2fserver.js','//etc/passwd','/d/culture-9193766b56.js%00.svg','/public/../server.js','/.env','/players.json']){const x=await fetch(U+p);const t=await x.text();R(!/require\(|REDIS|scrypt|root:/.test(t),'chemin '+p+' → '+x.status)}
  R((await alive()).ok,'serveur vivant après les requêtes HTTP piégées');
 }
 if(on('xss')){
  const nm='X'+letters(Date.now()%10000).slice(0,5);const a=await post('create',{name:nm,pin:'1234'},'10.3.0.'+(Date.now()%200));
  const s=await post('screate',{name:nm,token:a.j&&a.j.token,sname:'<img src=x onerror=alert(1)>"\'><script>alert(2)</script>'},'10.3.0.9');
  R(s.st===200||s.st===400,'nom de salon avec balises → '+s.st+' '+(s.j&&s.j.salon?JSON.stringify(s.j.salon.name):(s.j&&s.j.msg)));
  const {chromium}=require('/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright');const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await (await br.newContext()).newPage();let dlg=0;p.on('dialog',d=>{dlg++;d.dismiss()});
  await p.goto(U+'/');await p.evaluate(m=>localStorage.setItem('fl-me',JSON.stringify(m)),{name:nm,token:a.j.token});
  if(s.j&&s.j.salon){await p.goto(U+'/'+s.j.salon.code+'/');await p.waitForTimeout(2500);await p.click('.salon-pill').catch(()=>{});await p.waitForTimeout(800)}
  R(dlg===0&&!(await p.$('img[src="x"]')),'aucun script exécuté à l\'affichage du salon (alertes : '+dlg+')');
  // présence et tableau des scores piégés
  const w=await open();if(w){w.send(JSON.stringify({t:'join',room:s.j.salon.code,name:nm,token:a.j.token}));await sleep(500);
   w.send(JSON.stringify({t:'presence',presence:{name:'<img src=x onerror=alert(3)>',page:'<b>x</b>'}}));
   w.send(JSON.stringify({t:'tally',gid:'abcd1234',game:'<svg onload=alert(4)>',results:[{name:'<img src=x onerror=alert(5)>',score:5},{name:'B',score:1}]}));await sleep(1500);w.close()}
  await p.reload();await p.waitForTimeout(2500);R(dlg===0&&!(await p.$('img[src="x"]')),'présence et scores piégés : rien d\'exécuté (alertes : '+dlg+')');await br.close();
 }
 if(on('wsbad')){
  const w=await open();const msgs=['xx','null','1','[]','{"t":"set"}','{"t":"set","id":"a","data":"x"}','{"t":"patch","id":"__proto__","field":"constructor","key":"x","value":1}','{"t":"join","room":{"a":1}}','{"t":"pk","name":{"x":1}}','{"t":"tally","results":"x"}','{"t":"presence","presence":"'+'x'.repeat(10000)+'"}','{"__proto__":{"t":"set"}}'];
  for(const m of msgs)w.send(m);let deep='['.repeat(150000)+']'.repeat(150000);w.send(deep);await sleep(800);
  R((await alive()).ok,'messages WebSocket malformés et JSON très imbriqué : serveur vivant');w.close();
 }
 if(on('solomem')){
  // une connexion « solo » (sans compte) qui remplit la mémoire avec des parties
  const before=await mem();const ws=[];for(let i=0;i<20;i++){const w=await open();if(!w)break;w.send(JSON.stringify({t:'join',solo:true}));ws.push(w)}
  await sleep(300);const big={x:'y'.repeat(290*1024)};let sent=0;
  for(const w of ws)for(let k=0;k<40;k++){w.send(JSON.stringify({t:'set',id:'d'+k,data:big}));sent++}
  await sleep(6000);const after=await mem();const a=await alive();
  R(true,'connexions solo sans compte : '+ws.length+' × 40 parties de 290 Ko envoyées ; mémoire avant '+before+' / après '+after+' ; réponse '+a.ms+' ms');
  ws.forEach(w=>w.close());
 }
 if(on('flood')){
  const w=await open();w.send(JSON.stringify({t:'join',solo:true}));await sleep(200);const t0=Date.now();let n=0;
  const tick=setInterval(()=>{for(let i=0;i<2000;i++){if(w.readyState===1){w.send('{"t":"presence","presence":{"page":"x"}}');n++}}},10);
  await sleep(4000);clearInterval(tick);const a=await alive();R(a.ok&&a.ms<1500,'rafale de '+n+' messages en 4 s sur une connexion : santé '+a.ms+' ms, connexion '+(w.readyState===1?'toujours ouverte':'fermée par le serveur'));try{w.close()}catch(e){}
 }
 if(on('conns')){
  const ws=[];const t0=Date.now();for(let i=0;i<1500;i++){const w=new WS(WU,{headers:{'x-forwarded-for':'10.77.0.1'}});w.on('error',()=>{});ws.push(w)}
  await sleep(5000);const openN=ws.filter(w=>w.readyState===1).length;const a=await alive();
  R(a.ok,'1500 connexions WebSocket depuis une même adresse : '+openN+' acceptées, santé '+a.ms+' ms, mémoire '+(await mem()));ws.forEach(w=>{try{w.terminate()}catch(e){}});await sleep(1000);
 }
 if(on('slow')){
  const socks=[];for(let i=0;i<300;i++){const s=net.connect(+(process.env.P||3100),'127.0.0.1',()=>s.write('GET / HTTP/1.1\r\nHost: x\r\n'));s.on('error',()=>{});socks.push(s)}
  await sleep(3000);const a=await alive();R(a.ok,'300 connexions lentes (en-têtes jamais finis) : santé '+a.ms+' ms');socks.forEach(s=>s.destroy());
 }
 if(on('patch')){
  const nm='P'+letters(Date.now()%10000).slice(0,5);const a=await post('create',{name:nm,pin:'1234'},'10.4.0.'+(Date.now()%200));
  const s=await post('screate',{name:nm,token:a.j.token,sname:'Patch '+nm},'10.4.0.9');const code=s.j.salon.code;
  const w=await open();w.send(JSON.stringify({t:'join',room:code,name:nm,token:a.j.token}));await sleep(500);
  w.send(JSON.stringify({t:'set',id:'notes',data:{a:1}}));await sleep(300);
  let snap=null,acks={};w.on('message',m=>{const o=JSON.parse(m);if(o.t==='snap')snap=o;if(o.t==='ack')acks[o.ok+':'+(o.code||'')]=(acks[o.ok+':'+(o.code||'')]||0)+1});
  const v='z'.repeat(1900);for(let k=0;k<400;k++)w.send(JSON.stringify({t:'patch',id:'notes',field:'found',key:'k'+k,value:v}));
  await sleep(3000);const d=snap&&snap.docs.find(x=>x.id==='notes');const size=d?JSON.stringify(d.data).length:0;
  R(size<=300*1024,'« patch » répété : taille de la partie '+Math.round(size/1024)+' Ko (limite prévue 300 Ko) '+JSON.stringify(acks));
  w.send(JSON.stringify({t:'patch',id:'meta',field:'evil',key:'x',value:1}));await sleep(500);w.close();
 }
 if(on('brute')){
  const nm='Z'+letters(Date.now()%10000).slice(0,5);await post('create',{name:nm,pin:'4321'},'10.5.0.1');
  let lockedAt=-1;for(let i=0;i<40;i++){const r=await post('login',{name:nm,pin:String(1000+i)},'10.5.'+i+'.'+i);if(r.st===429){lockedAt=i;break}}
  R(lockedAt>=0&&lockedAt<=12,'devinette du code à 4 chiffres en changeant d\'adresse IP : bloqué après '+(lockedAt<0?'jamais (40 essais)':lockedAt+' essais'));
  let created=0;for(let i=0;i<30;i++){const r=await post('create',{name:'Q'+letters(i+100*(Date.now()%97)).slice(0,6),pin:'1111'},'198.51.'+i+'.1');if(r.st===200)created++}
  R(true,'création de comptes en rafale avec une adresse IP différente à chaque fois (en-tête X-Forwarded-For) : '+created+'/30 créés');
 }
 console.log('\nRésumé : '+out.filter(x=>x[0]==='✅').length+' ✅ / '+out.filter(x=>x[0]==='❌').length+' ❌');process.exit(0)
})();
