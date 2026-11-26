// ---------- invitations : un joueur du salon propose une partie → bandeau « Rejoindre la partie » chez les autres membres ----------
(function(){
const GAMES={fl:["fleches","mots fléchés"],rond:["rond","Tourniquet"],meles:["meles","mots mêlés"],cg:["culture","culture générale"],mg:["magnetico","Magnético"]};
const LV={facile:"Facile",normal:"Normal",moyen:"Normal",difficile:"Difficile"};
const SS={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};
const me=()=>{try{const m=JSON.parse(localStorage.getItem("fl-me")||"null");return m&&m.name?String(m.name).toUpperCase():null}catch(e){return null}};
const code=()=>((location.pathname.match(/^\/([A-Za-z0-9]{5})(?:\/|$)/)||[])[1]||"").toUpperCase();
function seen(gid,add){let s=[];try{s=JSON.parse(SS.get("fl-inv")||"[]")}catch(e){}if(add){if(!s.includes(gid))s.push(gid);SS.set("fl-inv",JSON.stringify(s.slice(-60)))}return s.includes(gid)}
let AC=null;function ding(){try{if(localStorage.getItem("fl-sound")==="off")return}catch(e){}try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();[[740,0],[1108,.11],[1480,.24]].forEach(([f,d])=>{const n=AC.currentTime+d,o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.14,n+.01);g.gain.exponentialRampToValueAtTime(.0001,n+.25);o.connect(g).connect(AC.destination);o.start(n);o.stop(n+.3)})}catch(e){}}
function css(){if(document.getElementById("inv-css"))return;const st=document.createElement("style");st.id="inv-css";st.textContent=
  ".invbanner{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;max-width:min(560px,calc(100vw - 24px));padding:12px 14px;border-radius:18px;"
  +"background:rgba(20,28,48,.72);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);box-shadow:0 18px 50px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.2);color:#eef2f7;animation:invIn .45s cubic-bezier(.2,1.4,.4,1)}"
  +".invbanner .it{flex:1 1 220px;font:600 .95rem Inter,Nunito,sans-serif;line-height:1.35}.invbanner .it b{color:#5eead4}"
  +".invbanner button{font:800 .9rem Nunito,Inter,sans-serif;padding:9px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:inherit;cursor:pointer}"
  +".invbanner button.go{background:linear-gradient(135deg,#00ADB5,#A26BFF);border-color:transparent;color:#fff;box-shadow:0 6px 18px rgba(0,173,181,.35)}"
  +".invbanner.out{opacity:0;transform:translate(-50%,20px);transition:.5s}[data-theme=light] .invbanner{background:rgba(255,255,255,.82);color:#1b2433;border-color:rgba(15,25,40,.12)}[data-theme=light] .invbanner .it b{color:#0f766e}"
  +"@keyframes invIn{from{opacity:0;transform:translate(-50%,30px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}";document.head.appendChild(st)}
function show(text,go,gid){css();const old=document.getElementById("invBanner");if(old)old.remove();const d=document.createElement("div");d.id="invBanner";d.className="invbanner";d.setAttribute("role","status");
  d.innerHTML='<span class="it"></span><button type="button" class="go">Rejoindre la partie</button><button type="button" class="no">Plus tard</button>';d.querySelector(".it").innerHTML=text;
  d.querySelector(".go").onclick=()=>{seen(gid,true);d.remove();go()};d.querySelector(".no").onclick=()=>{seen(gid,true);d.remove()};
  document.body.appendChild(d);ding();if(navigator.vibrate)try{navigator.vibrate([40,60,40])}catch(e){}
  setTimeout(()=>{if(d.isConnected)d.classList.add("out")},25000);setTimeout(()=>{if(d.isConnected){d.remove();seen(gid,true)}},25600)}
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// docs : documents du salon reçus en direct ; opt.gid : partie ouverte sur cette page (pas d'invitation pour elle)
window.FLINV=function(docs,opt){opt=opt||{};const M=me(),C=code();if(!M||!C||!docs)return;const now=Date.now();
  for(const id in GAMES){const d=docs[id];if(!d||!Array.isArray(d.players)||d.solo||d.done||!d.gid||d.gid===opt.gid)continue;
    const fresh=d.wait||(d.started&&now-d.started<180000);if(!fresh||seen(d.gid))continue;
    const names=d.players.map(p=>String(p.name||"").toUpperCase());const host=d.players[0]&&d.players[0].name;const mine=names.indexOf(M);
    if(mine===0)continue;                                             // c'est moi qui propose
    const lv=LV[d.level]?" ("+LV[d.level]+")":"";const [path,nm]=GAMES[id];let text=null;
    if(new RegExp("/"+path+"/?$").test(location.pathname))continue;   // déjà sur la page de ce jeu : la partie s'y rejoint toute seule (le bandeau cachait la grille)
    if(mine>0)text="<b>"+esc(host)+"</b> t'invite à une partie de "+nm+lv+". Tu viens ?";
    else if(names.includes("INVITÉ")||((id==="fl"||id==="meles"||id==="mg")&&d.wait&&names.length<4))text="<b>"+esc(host)+"</b> propose une partie de "+nm+lv+" : une place est libre. Tu viens ?";
    if(!text)continue;
    show(text,()=>{location.href="/"+C+"/"+path},d.gid);return}};
})();
