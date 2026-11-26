/* Fenêtres Pseudo et Salon (Mes salons, Rejoindre, Gérer) : code unique, chargé par l'accueil et par l'en-tête des jeux (sk.js). 26/11 : sorti des deux copies. */
window.makeAcctUI=function makeAcctUI(env){
  const RE=/^(?:[A-Z0-9@#_]{2,7}|INVITE\d{4,5})$/,ACODE=/^[A-HJ-NP-Z2-9]{6}$/;
  const esc=env.esc;
  const clean=v=>String(v||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z0-9@#_]/g,"").slice(0,7);
  const cleanCode=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  const say=r=>esc(r.msg||"Serveur injoignable. Réessaie.")+(r.detail?"<br>"+esc(r.detail):"");
  const CHECK="Vérifie les informations saisies.";
  const pinIn=el=>{el.oninput=e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,4)}};
  let LIST=null;
  // parties jouées sans compte : reprises dans le compte créé ou ouvert
  function guestUpload(name,token){try{const h=JSON.parse(localStorage.getItem("fl-guest-h")||"[]");if(!h.length)return;const by={};h.forEach(x=>(by[x.game]=by[x.game]||[]).push({ref:x.ref,ev:x.ev}));
    Promise.all(Object.entries(by).map(([game,items])=>env.call("hist",{name,token,game,items:items.slice(-50)}))).then(rs=>{if(rs.every(r=>r.status===200)){["fl-guest-h","fl-guest-g","fl-guest-asked"].forEach(k=>localStorage.removeItem(k))}})}catch(e){}}                                   // dernière liste reçue du serveur
  function rows(L){return L.map(x=>'<button class="sl'+(x.code===env.code()?" here":"")+'" data-c="'+x.code+'"><span class="nm2">'+esc(x.name||"Salon")+'</span>'+(x.role==="owner"?'<span class="live" title="Tu es responsable de ce salon">★</span>':"")+(x.live?'<span class="live">'+x.live+' en ligne</span>':"")+'<span class="code" style="margin-left:auto;letter-spacing:.02em">Ouvrir ›</span></button>').join("")}
  const openRoom=id=>{if(env.open)return env.open(id);location.href="/"+id};
  // liste avec action : le responsable peut supprimer son salon, un membre peut le quitter (19/11/2026)
  function rowsMng(L){return L.map(x=>'<div class="sl slm'+(x.code===env.code()?" here":"")+'"><button type="button" class="slo" data-c="'+x.code+'"><span class="nm2">'+esc(x.name||"Salon")+'</span>'+(x.role==="owner"?'<span class="live" title="Tu es responsable de ce salon">★</span>':"")+(x.live?'<span class="live">'+x.live+' en ligne</span>':"")+'<span class="code" style="margin-left:auto;letter-spacing:.02em">Ouvrir ›</span></button><button type="button" class="slx" data-x="'+x.code+'" title="'+(x.role==="owner"?"Supprimer ce salon":"Quitter ce salon")+'" aria-label="'+(x.role==="owner"?"Supprimer ":"Quitter ")+esc(x.name||"le salon")+'">'+(x.role==="owner"?"Supprimer":"Quitter")+'</button></div>').join("")}
  function delForm(p,btn,s){const ME=env.getME();const n=(s.members||[]).length;
    p.innerHTML='<h4>Supprimer le salon</h4><div class="note">« <b>'+esc(s.name)+'</b> » sera supprimé pour de bon'+(n>2?' : ses '+(n-1)+' autres membres n\'y auront plus accès':n===2?' : son autre membre n\'y aura plus accès':'')+'. Son code d\'accès ne marchera plus.</div><div class="err" id="dlErr"></div><div style="display:flex;gap:8px"><button class="btn" id="dlNo" style="flex:1">Annuler</button><button class="btn primary" id="dlYes" style="flex:1">Supprimer</button></div>';
    p.querySelector("#dlNo").onclick=()=>drawList(p,btn);
    p.querySelector("#dlYes").onclick=async e=>{e.target.disabled=true;const r=await env.call("sdelete",{name:ME.name,token:ME.token,salon:s.code});e.target.disabled=false;
      if(r.status===200){LIST=r.salons||[];ME.salons=LIST;env.setME(ME);if(s.code===env.code()){try{sessionStorage.setItem("fl-flash",r.msg||"Salon supprimé.")}catch(x){}location.href="/";return}drawList.all=true;drawList(p,btn,r.msg||"Salon supprimé.");drawList.all=false}
      else if(r.status===401){ME.stale=true;env.setME(ME);openMe(btn)}else p.querySelector("#dlErr").innerHTML=say(r)}}

  // ----- Pseudo -----
  function openMe(btn){const p=env.q("#popMe");const ME=env.getME();
    const GU=ME&&ME.guest&&!ME.stale?{guest:ME.name,gtoken:ME.token}:{};   // compte invité de cet appareil : repris dans le compte
    if(ME&&ME.guest&&!ME.stale&&!openMe.login){openMe.login=0;
      p.innerHTML='<h4>Tu joues en invité</h4><div class="note">Nom : <b>'+esc(ME.name)+'</b>. Crée ton compte pour garder tes parties et voir tes stats.</div><button class="btn primary" id="guNew">Créer mon compte</button><button class="lnk" id="guLog">J\'ai déjà un compte</button>';
      p.querySelector("#guLog").onclick=()=>{openMe.login=1;openMe(btn);openMe.login=0};
      env.hide(env.q("#popSalon"));env.place(p,btn);env.show(p);p.querySelector("#guNew").onclick=()=>{openMe.login=1;openMe(btn);openMe.login=0;const n=p.querySelector("#meNew");if(n)n.click()};return}
    if(!ME||ME.stale||ME.guest){const pre=ME&&!ME.guest?ME.name:"";
      p.innerHTML='<h4>'+(ME&&!ME.guest?"Reconnecte-toi":"Accéder à ma page")+'</h4><input class="in" id="meName" maxlength="7" placeholder="PSEUDO" autocomplete="username" value="'+esc(pre)+'"><input class="in pin" id="mePin" type="password" inputmode="numeric" maxlength="4" placeholder="CODE · 4 CHIFFRES" autocomplete="current-password"><div class="err" id="meErr"></div><button class="btn primary" id="meGo">Entrer</button><button class="lnk" id="meNew">Créer mon pseudo</button>';
      const n=p.querySelector("#meName"),c=p.querySelector("#mePin"),er=p.querySelector("#meErr");n.oninput=e=>{e.target.value=clean(e.target.value)};pinIn(c);
      const go=async()=>{if(!RE.test(n.value)){er.innerHTML=CHECK+"<br>Pseudo : 2 à 7 caractères, lettres A-Z, chiffres et @ # _ (sans espace).";n.focus();return}
        if(!/^\d{4}$/.test(c.value)){er.innerHTML=CHECK+"<br>Code secret : exactement 4 chiffres.";c.focus();return}
        const b=p.querySelector("#meGo");b.disabled=true;const r=await env.call("login",Object.assign({name:n.value,pin:c.value},GU));b.disabled=false;
        if(r.status===200){env.setME({name:r.name||n.value,token:r.token,salons:r.salons||[]});guestUpload(r.name||n.value,r.token);env.onLogin();openMe(btn)}else{er.innerHTML=say(r);c.value="";c.focus()}};
      p.querySelector("#meGo").onclick=go;c.onkeydown=e=>{if(e.key==="Enter")go()};
      p.querySelector("#meNew").onclick=()=>{
        p.innerHTML='<h4>Créer mon pseudo</h4><input class="in" id="nwName" maxlength="7" placeholder="PSEUDO (2 À 7)" autocomplete="username"><input class="in pin" id="nwPin" type="password" inputmode="numeric" maxlength="4" placeholder="CODE · 4 CHIFFRES" autocomplete="new-password"><div class="note">Ton pseudo te suit sur tous tes appareils. Il ne change plus ensuite.</div><div class="err" id="nwErr"></div><button class="btn primary" id="nwGo">Créer</button><button class="lnk" id="nwBack">J\'ai déjà un pseudo</button>';
        const nn=p.querySelector("#nwName"),nc=p.querySelector("#nwPin"),er2=p.querySelector("#nwErr");nn.oninput=e=>{e.target.value=clean(e.target.value)};pinIn(nc);
        p.querySelector("#nwBack").onclick=()=>openMe(btn);
        const go2=async()=>{if(!RE.test(nn.value)){er2.innerHTML=CHECK+"<br>Pseudo : 2 à 7 caractères, lettres A-Z, chiffres et @ # _ (sans espace).";nn.focus();return}
          if(!/^\d{4}$/.test(nc.value)){er2.innerHTML=CHECK+"<br>Code secret : exactement 4 chiffres.";nc.focus();return}
          const b=p.querySelector("#nwGo");b.disabled=true;const r=await env.call("create",Object.assign({name:nn.value,pin:nc.value},GU));b.disabled=false;
          if(r.status===200){env.setME({name:r.name||nn.value,token:r.token,salons:[]});guestUpload(r.name||nn.value,r.token);env.onLogin();openMe(btn);env.toast("👋","Bienvenue <b>"+esc(r.name||nn.value)+"</b> !"+(r.merged?" Tes parties d'invité sont dans ton compte.":""))}
          else{er2.innerHTML=say(r);(r.field==="pin"?nc:nn).focus()}};
        p.querySelector("#nwGo").onclick=go2;nc.onkeydown=e=>{if(e.key==="Enter")go2()};setTimeout(()=>nn.focus(),50)}}
    else{const L=ME.salons||[];
      p.innerHTML='<h4>Bonjour '+esc(ME.name)+' 👋</h4>'+(env.skins?'<button class="btn skbtn" id="meSkin" type="button">'+env.skins.av()+'<span>🎭 Mon skin<small>'+env.skins.label()+'</small></span></button>':'')+'<div class="note">Mes salons</div><div class="list">'+(L.length?rows(L):'<div class="note">Tu n\'as accès à aucun salon pour le moment.</div>')+'</div>'+(env.homeUrl?'<button class="btn" id="meHome">🏠 Accueil</button>':"")+'<button class="lnk" id="meOut">Se déconnecter</button>';
      p.querySelectorAll(".sl").forEach(b=>b.onclick=()=>openRoom(b.dataset.c));
      const sk=p.querySelector("#meSkin");if(sk)sk.onclick=()=>{env.hide(p);env.skins.open()};
      const h=p.querySelector("#meHome");if(h)h.onclick=()=>{location.href=env.homeUrl()};
      p.querySelector("#meOut").onclick=async()=>{await env.call("logout",{name:ME.name,token:ME.token});env.setME(null);env.hide(p);env.onLogout()}}
    env.hide(env.q("#popSalon"));env.place(p,btn);env.show(p);const f=p.querySelector("input");if(f)setTimeout(()=>f.focus(),50)}

  // ----- Salon -----
  function openSalon(btn,flash){const p=env.q("#popSalon");const ME=env.getME();
    env.hide(env.q("#popMe"));env.place(p,btn);env.show(p);
    if(!ME||ME.stale){p.innerHTML='<h4>Mes salons</h4><div class="note">Connecte-toi pour consulter tes salons personnels.</div><button class="btn primary" id="slLog">Se connecter</button>';
      p.querySelector("#slLog").onclick=()=>openMe(btn);return}
    p.innerHTML='<h4>Mes salons</h4><div class="note">Chargement…</div>';
    env.call("salons",{name:ME.name,token:ME.token}).then(r=>{
      if(r.status===401){ME.stale=true;env.setME(ME);openSalon(btn);return}
      if(r.status!==200||!Array.isArray(r.salons)){p.innerHTML='<h4>Mes salons</h4><div class="err">Impossible de charger tes salons. Réessaie.</div><button class="btn" id="slRe">Réessayer</button>';p.querySelector("#slRe").onclick=()=>openSalon(btn);return}
      LIST=r.salons;ME.salons=r.salons;env.setME(ME);drawList(p,btn,flash)})}
  function drawList(p,btn,flash){const L=LIST||[];const here=L.find(x=>x.code===env.code());
    // dans un salon : le salon actuel, « Changer de salon » (aller dans un autre) et « Quitter le salon » (ne plus en être membre)
    if(here&&!drawList.all){
      p.innerHTML='<h4>Mes salons</h4>'+(flash?'<div class="note" style="color:var(--accent);font-weight:700">'+esc(flash)+'</div>':"")
        +'<div class="note">Salon actuel</div><div class="sl here" style="cursor:default"><span class="nm2">'+esc(here.name||"Salon")+'</span>'+(here.role==="owner"?'<span class="live" title="Tu es responsable de ce salon">★</span>':"")+'</div>'
        +'<div style="display:flex;gap:8px"><button class="btn primary" id="slSwitch" style="flex:1">Changer de salon</button>'+(here.role==="owner"?'':'<button class="btn" id="slLeave" style="flex:1">Quitter le salon</button>')+'</div>'
        +(here.role==="owner"?'<button class="lnk" id="slMng">Gérer ce salon'+((here.pend||[]).length?' · '+here.pend.length+' demande'+(here.pend.length>1?'s':''):'')+'</button>':"");
      p.querySelector("#slSwitch").onclick=()=>{drawList.all=true;drawList(p,btn);drawList.all=false};
      const lv=p.querySelector("#slLeave");if(lv)lv.onclick=()=>leaveForm(p,btn,here);
      const mg=p.querySelector("#slMng");if(mg)mg.onclick=()=>manage(p,btn,here);return}
    const cur=L.find(x=>x.code===env.code()&&x.role==="owner");
    p.innerHTML='<h4>Mes salons</h4>'+(flash?'<div class="note" style="color:var(--accent);font-weight:700">'+esc(flash)+'</div>':"")
      +(L.length?'<div class="list" style="max-height:min(46vh,320px);overflow:auto">'+rowsMng(L)+'</div>':'<div class="note">Aucun salon pour l\'instant. Rejoins-en un avec son nom et son code.</div>')
      +'<div style="display:flex;gap:8px"><button class="btn primary" id="slJoin" style="flex:1">Rejoindre un salon</button><button class="btn" id="slNew" style="flex:1">Créer un salon</button></div>'
      +(cur?'<button class="lnk" id="slMng">Gérer ce salon'+((cur.pend||[]).length?' · '+cur.pend.length+' demande'+(cur.pend.length>1?'s':''):'')+'</button>':"");
    p.querySelectorAll(".slo").forEach(b=>b.onclick=()=>openRoom(b.dataset.c));
    p.querySelectorAll(".slx").forEach(b=>b.onclick=e=>{e.stopPropagation();const s=L.find(x=>x.code===b.dataset.x);if(!s)return;if(s.role==="owner")delForm(p,btn,s);else leaveForm(p,btn,s)});
    p.querySelector("#slJoin").onclick=()=>joinForm(p,btn);p.querySelector("#slNew").onclick=()=>createForm(p,btn);
    if(cur)p.querySelector("#slMng").onclick=()=>manage(p,btn,cur);
    if(here){p.insertAdjacentHTML("beforeend",'<button class="lnk" id="slBack">Retour</button>');p.querySelector("#slBack").onclick=()=>drawList(p,btn)}}
  function leaveForm(p,btn,s){const ME=env.getME();
    p.innerHTML='<h4>Quitter le salon</h4><div class="note">Tu ne seras plus membre de « <b>'+esc(s.name)+'</b> ». Pour revenir, il te faudra son nom et son code d\'accès, ou le lien d\'invitation du responsable.</div><div class="err" id="lvErr"></div><div style="display:flex;gap:8px"><button class="btn" id="lvNo" style="flex:1">Annuler</button><button class="btn primary" id="lvYes" style="flex:1">Quitter le salon</button></div>';
    p.querySelector("#lvNo").onclick=()=>drawList(p,btn);
    p.querySelector("#lvYes").onclick=async e=>{e.target.disabled=true;const r=await env.call("sleave",{name:ME.name,token:ME.token,salon:s.code});e.target.disabled=false;
      if(r.status===200){LIST=r.salons||[];ME.salons=LIST;env.setME(ME);if(s.code!==env.code()){drawList.all=true;drawList(p,btn,r.msg||"Tu as quitté le salon.");drawList.all=false;return}try{sessionStorage.setItem("fl-flash",r.msg||"Tu as quitté le salon.")}catch(x){}location.href="/"}
      else if(r.status===401){ME.stale=true;env.setME(ME);openMe(btn)}else p.querySelector("#lvErr").innerHTML=say(r)}}
  function joinForm(p,btn,pre){const ME=env.getME();
    p.innerHTML='<h4>Rejoindre un salon</h4><input class="in" id="jnName" maxlength="40" placeholder="NOM DU SALON" autocomplete="off" style="letter-spacing:.04em"><input class="in" id="jnCode" maxlength="7" placeholder="CODE D\'ACCÈS · 6 CARACTÈRES" autocomplete="off" style="letter-spacing:.2em"><div class="err" id="jnErr"></div><button class="btn primary" id="jnGo">Rejoindre</button><button class="lnk" id="jnBack">Retour</button>';
    const N=p.querySelector("#jnName"),C=p.querySelector("#jnCode"),er=p.querySelector("#jnErr");C.oninput=e=>{e.target.value=cleanCode(e.target.value)};
    if(pre){N.value=pre.name||"";C.value=cleanCode(pre.code||"");p.querySelector("h4").textContent="Invitation à rejoindre un salon"}
    p.querySelector("#jnBack").onclick=()=>drawList(p,btn);
    const go=async()=>{const n=N.value.trim();
      if(!n){er.innerHTML=CHECK+"<br>Nom du salon : 1 à 40 caractères.";N.focus();return}
      if(!ACODE.test(C.value)){er.innerHTML=CHECK+"<br>Code d'accès : 6 caractères (lettres et chiffres).";C.focus();return}
      const b=p.querySelector("#jnGo");b.disabled=true;const r=await env.call("sjoin",{name:ME.name,token:ME.token,sname:n,scode:C.value});b.disabled=false;
      if(r.status===200){LIST=r.salons||LIST;ME.salons=LIST;env.setME(ME);if(pre&&r.salon)return openRoom(r.salon.code);drawList.all=true;drawList(p,btn,r.msg);drawList.all=false}
      else if(r.status===401){ME.stale=true;env.setME(ME);openMe(btn)}
      else{er.innerHTML=say(r);if(r.field==="scode")C.focus();else if(r.field==="sname")N.focus()}};
    p.querySelector("#jnGo").onclick=go;C.onkeydown=e=>{if(e.key==="Enter")go()};setTimeout(()=>N.focus(),50)}
  function createForm(p,btn){const ME=env.getME();
    p.innerHTML='<h4>Créer un salon</h4><input class="in" id="nsName" maxlength="40" placeholder="NOM DU SALON" style="letter-spacing:.04em"><div class="note">Un code d\'accès est créé. Donne le nom et le code à tes amis.</div><div class="err" id="nsErr"></div><button class="btn primary" id="nsGo">Créer le salon</button><button class="lnk" id="nsBack">Retour</button>';
    const N=p.querySelector("#nsName"),er=p.querySelector("#nsErr");p.querySelector("#nsBack").onclick=()=>drawList(p,btn);
    const go=async()=>{const n=N.value.trim();if(!n){er.innerHTML=CHECK+"<br>Nom du salon : 1 à 40 caractères.";N.focus();return}
      const b=p.querySelector("#nsGo");b.disabled=true;const r=await env.call("screate",{name:ME.name,token:ME.token,sname:n});b.disabled=false;
      if(r.status!==200){er.innerHTML=say(r);return}
      LIST=r.salons||LIST;ME.salons=LIST;env.setME(ME);const s=r.salon;
      p.innerHTML='<h4>Salon créé ✓</h4><div class="note">Nom : <b>'+esc(s.name)+'</b></div><div class="note">Code d\'accès : <b style="letter-spacing:.2em;font-size:1.15em">'+esc(s.acode)+'</b></div><div class="note">Tes amis entrent ce nom et ce code dans « Rejoindre un salon ».</div><button class="btn primary" id="nsOpen">Ouvrir le salon</button>';
      p.querySelector("#nsOpen").onclick=()=>openRoom(s.code)};
    p.querySelector("#nsGo").onclick=go;N.onkeydown=e=>{if(e.key==="Enter")go()};setTimeout(()=>N.focus(),50)}
  function manage(p,btn,s,flash){const ME=env.getME();
    p.innerHTML='<h4>'+esc(s.name)+'</h4>'+(flash?'<div class="note" style="font-weight:700">'+esc(flash)+'</div>':"")+'<div class="note">Code d\'accès : <b style="letter-spacing:.2em;font-size:1.1em">'+esc(s.acode)+'</b></div><button class="btn primary" id="mgLink">Copier le lien d\'invitation</button><div class="note" id="mgLinkTxt" style="word-break:break-all"></div><button class="btn" id="mgCode">Créer un nouveau code</button>'+((s.pend||[]).length?'<div class="note" style="font-weight:700">Demandes d\'entrée</div><div class="list">'+s.pend.map(m=>'<div class="sl"><span class="nm2">'+esc(m)+'</span><button class="lnk" data-ok="'+esc(m)+'" style="margin-left:auto">Accepter</button><button class="lnk" data-no="'+esc(m)+'">Refuser</button></div>').join("")+'</div>':"")+'<div class="note">Membres</div><div class="list" style="max-height:200px;overflow:auto">'
      +(s.members||[]).map(m=>'<div class="sl"><span class="nm2">'+esc(m)+(m===ME.name?" (toi)":"")+'</span>'+(m===ME.name?"":'<button class="lnk" data-m="'+esc(m)+'" style="margin-left:auto">Retirer</button>')+'</div>').join("")+'</div><div class="err" id="mgErr"></div><button class="btn" id="mgDel">Supprimer ce salon</button><button class="lnk" id="mgBack">Retour</button>';
    p.querySelector("#mgBack").onclick=()=>drawList(p,btn);p.querySelector("#mgDel").onclick=()=>delForm(p,btn,s);
    // lien d'invitation : le nom et le code sont après « # » (jamais envoyés au serveur ni gardés dans ses journaux)
    p.querySelector("#mgLink").onclick=e=>{const link=location.origin+"/#rejoindre="+encodeURIComponent(s.name)+"&code="+encodeURIComponent(s.acode);const t=p.querySelector("#mgLinkTxt");
      (navigator.clipboard?navigator.clipboard.writeText(link):Promise.reject()).then(()=>{e.target.textContent="Lien copié ✓";t.textContent=link},()=>{t.textContent=link})};
    p.querySelector("#mgCode").onclick=async()=>{const r=await env.call("scode",{name:ME.name,token:ME.token,salon:s.code});if(r.status===200){s.acode=r.acode;manage(p,btn,s,r.msg)}else p.querySelector("#mgErr").innerHTML=say(r)};
    p.querySelectorAll("[data-ok],[data-no]").forEach(b=>b.onclick=async()=>{const ok=b.hasAttribute("data-ok");b.disabled=true;const r=await env.call("sdecide",{name:ME.name,token:ME.token,salon:s.code,member:b.dataset.ok||b.dataset.no,ok});if(r.status===200){s.members=r.members;s.pend=r.pend;manage(p,btn,s,r.msg)}else{b.disabled=false;p.querySelector("#mgErr").innerHTML=say(r)}});
    p.querySelectorAll("[data-m]").forEach(b=>b.onclick=async()=>{const r=await env.call("skick",{name:ME.name,token:ME.token,salon:s.code,member:b.dataset.m});if(r.status===200){s.members=r.members;manage(p,btn,s,r.msg)}else p.querySelector("#mgErr").innerHTML=say(r)})}
  // lien d'invitation reçu : fenêtre « Rejoindre » déjà remplie (connexion d'abord si besoin)
  function openJoin(btn,inv){const ME=env.getME();if(!ME||ME.stale){try{sessionStorage.setItem("fl-invite",JSON.stringify(inv))}catch(e){}openMe(btn);env.toast("👋","Connecte-toi ou crée ton pseudo pour rejoindre le salon « <b>"+esc(inv.name)+"</b> ».");return}
    try{sessionStorage.removeItem("fl-invite")}catch(e){}const p=env.q("#popSalon");env.hide(env.q("#popMe"));env.place(p,btn);env.show(p);joinForm(p,btn,inv)}
  return{openMe,openSalon,openJoin,list:()=>LIST};
};
