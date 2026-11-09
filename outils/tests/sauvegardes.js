// Sauvegardes : création, liste, téléchargement, perte de données, restauration (serveur branché sur le faux Upstash)
const U="http://localhost:3100",R="http://localhost:3999",K="cle-admin-de-test-123456";let ok=0,ko=0;
const t=(c,m)=>{c?ok++:ko++;console.log((c?"✅ ":"❌ ")+m)};
const api=async(r,b)=>(await fetch(U+"/api/p/"+r,{method:"POST",headers:{"content-type":"application/json","x-forwarded-for":"10.7."+Math.floor(Math.random()*200)+".1"},body:JSON.stringify(b)})).json();
const rd=async c=>(await (await fetch(R,{method:"POST",body:JSON.stringify(c)})).json()).result;
(async()=>{
 const sfx=Math.floor(Math.random()*900+100),A={name:"Sauv"+sfx};const c=await api("create",{name:A.name,pin:"4826"});A.token=c.token;t(!!A.token,"compte créé");
 const sk=await api("skin",{name:A.name,token:A.token,skin:"professeure/classique"});t(sk.ok!==false,"skin choisi");
 await rd(["ZADD","rank:test",42,A.name]);await rd(["SET","tmp:ttl","x","EX","3600"]);
 t((await fetch(U+"/admin/sauvegardes?key=mauvaise")).status===404,"mauvaise clé → 404");
 t((await fetch(U+"/admin/sauvegardes")).status===404,"sans clé → 404");
 const s=await (await fetch(U+"/admin/sauvegarder?key="+K,{method:"POST"})).json();t(s.keys>=3,"sauvegarde immédiate : "+s.keys+" clés, "+s.bytes+" octets ("+s.tag+")");
 const L=await (await fetch(U+"/admin/sauvegardes?key="+K)).json();t(L.sauvegardes.some(x=>x.tag===s.tag),"listée ("+L.sauvegardes.map(x=>x.tag).join(", ")+")");
 const dl=await fetch(U+"/admin/telecharger?key="+K+"&date="+s.tag);const j=await dl.json();t(dl.headers.get("content-disposition").includes("motipop-sauvegarde")&&j.keys["pl:"+A.name.toLowerCase()]||Object.keys(j.keys).some(k=>k.startsWith("pl:")),"téléchargement JSON avec les comptes");
 t(!Object.keys(j.keys).some(k=>/^(bak:|salon:)/.test(k)),"ni sauvegardes ni parties en cours dans la copie");
 // catastrophe : on efface le compte, le skin et le classement
 const plk=(await rd(["SCAN","0","MATCH","pl:*"]))[1];for(const k of plk)await rd(["DEL",k]);await rd(["DEL","skins"]);await rd(["DEL","rank:test"]);await rd(["DEL","tmp:ttl"]);
 const lost=await api("login",{name:A.name,pin:"4826"});
 t((await fetch(U+"/admin/restaurer?key="+K+"&date="+s.tag,{method:"POST"})).status===400,"restauration refusée sans confirmer=RESTAURER");
 const r=await (await fetch(U+"/admin/restaurer?key="+K+"&date="+s.tag+"&confirmer=RESTAURER",{method:"POST"})).json();t(r.restored>=3&&/^avant-/.test(r.safety),"restauration : "+r.restored+" clés, état précédent gardé dans "+r.safety);
 // le serveur garde les comptes en mémoire : on vérifie dans Redis
 t((await rd(["SCAN","0","MATCH","pl:*"]))[1].length===plk.length,"comptes revenus dans la base");
 t((await rd(["HMGET","skins",A.name]))[0]==="professeure/classique"||(await rd(["HGETALL","skins"])).includes("professeure/classique"),"skin revenu");
 t((await rd(["ZSCORE","rank:test",A.name]))==="42","classement revenu (42 pts)");
 const ttl=await rd(["PTTL","tmp:ttl"]);t(ttl>3000000&&ttl<=3600000,"durée de vie conservée ("+Math.round(ttl/1000)+" s)");
 const L2=await (await fetch(U+"/admin/sauvegardes?key="+K)).json();t(L2.sauvegardes.some(x=>/^avant-/.test(x.tag)),"copie de sécurité « avant » listée");
 const me=await (await fetch(U+"/api/p/me",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:A.name,token:A.token})})).json();t(me&&me.ok!==false&&!me.error,"après restauration, le joueur est reconnu (relu depuis la base)");
 console.log(ok+" ✅ / "+ko+" ❌");})();
// après restauration, la connexion doit marcher en relisant la base
setTimeout(async()=>{},0);
