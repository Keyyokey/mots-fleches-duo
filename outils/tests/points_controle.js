const U='http://localhost:3100';const api=async(r,b)=>(await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)})).json();
const res=[];const ok=(c,l)=>res.push((c?'✅ ':'❌ ')+l);const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const nm='P0'+Math.floor(Math.random()*9000+1000);const a=await api('create',{name:nm,pin:'4321'});const T={name:nm,token:a.token};
const tot=async()=>((await api('me',T)).pts||{}).tot||0;
let r=await api('score',{...T,game:'fleches',gid:'fake01',pts:800,solo:true,level:'facile'});ok(r.add===0,'solo inventé (jamais vu par le serveur) : 0 point ('+r.refus+')');
r=await api('score',{...T,game:'rond',gid:'fake02',pts:800});ok(r.add===0,'multi inventé : 0 point ('+r.refus+')');
r=await api('score',{...T,game:'poker',gid:'fake03',pts:800});ok(r.add===0,'poker par cette voie : 0 point');
r=await api('score',{...T,game:'mot',gid:'fake04',pts:800});ok(r.add===0,'mot du jour par cette voie : 0 point');
const doc={gid:'ab12cd34',game:'meles',solo:true,done:false,started:Date.now(),players:[{name:nm,score:0}]};
await api('solo',{...T,game:'meles',op:'put',doc});
r=await api('score',{...T,game:'meles',gid:'ab12cd34',pts:60,solo:true,level:'facile'});ok(r.add===0,'solo terminé trop vite (< durée minimale) : 0 point');
await W(2200);
const before=await tot();
const [r1,r2]=await Promise.all([api('score',{...T,game:'meles',gid:'ab12cd34',pts:60,solo:true,level:'facile'}),api('score',{...T,game:'meles',gid:'ab12cd34',pts:60,solo:true,level:'facile'})]);
const after=await tot();ok((r1.add>0)!==(r2.add>0)&&after-before===60,'vraie partie solo : points comptés une seule fois malgré 2 envois simultanés (+'+(after-before)+')');
r=await api('score',{...T,game:'meles',gid:'ab12cd34',pts:60,solo:true,level:'facile'});ok(r.dup||r.add===0,'renvoi de la même partie : refusé');
let n=0;for(let i=0;i<45;i++){const r=await api('solo',{...T,game:'rond',op:'put',doc:{gid:'z'+i+'xx',solo:true,done:false}});}
await W(2200);for(let i=0;i<45;i++){const r=await api('score',{...T,game:'rond',gid:'z'+i+'xx',pts:10,solo:true});if(r.add>0)n++}
ok(n<=40,'au plus 40 parties solo comptées par heure ('+n+'/45)');
const cv=await api('conv',{...T,pts:4000});ok(cv.error,'conversion au-delà du solde : refusée');
console.log(res.join('\n'));console.log(res.filter(x=>x[0]==='✅').length+' ✅ / '+res.filter(x=>x[0]==='❌').length+' ❌')})();
