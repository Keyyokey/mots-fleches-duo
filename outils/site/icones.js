// ---------- fenêtres et boutons : icônes « verre » à la place des émojis, croix de fermeture sur chaque fenêtre ----------
(function(){
// ---------- icônes « verre » de l'en-tête (relief, dégradé, reflet, halo) ----------
const ICO=(()=>{let n=0;
  // chaque appel crée des identifiants neufs (une icône cachée ne casse pas les autres) ; g : [clair, moyen, foncé] ; glow : couleur du halo ; body : formes (utilisent fill="url(#B)") ; gloss : formes recouvertes du reflet
  const mk=(g,glow,body,extra)=>()=>{const k="ic"+(n++);const B=k+"b",H=k+"h",F=k+"f";
    const b=body.replace(/url\(#B\)/g,"url(#"+B+")");
    return '<svg viewBox="0 0 48 48" aria-hidden="true" class="gico"><defs><linearGradient id="'+B+'" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="'+g[0]+'"/><stop offset=".55" stop-color="'+g[1]+'"/><stop offset="1" stop-color="'+g[2]+'"/></linearGradient>'
      +'<linearGradient id="'+H+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      +'<filter id="'+F+'" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="'+glow+'" flood-opacity=".55"/></filter></defs>'
      +'<g filter="url(#'+F+')">'+b+'</g><g fill="url(#'+H+')" style="mix-blend-mode:screen">'+b.replace(/fill="url\(#[^)]+\)"/g,"").replace(/stroke="url\(#[^)]+\)"/g,'stroke="none"')+'</g>'+(extra||"")+'</svg>'};
  const ORANGE=["#FFE27A","#FFAE34","#F0711C"];
  const moonP='<path fill="url(#B)" d="M29.5 7.5a17 17 0 1 0 11.2 26.6A12.5 12.5 0 0 1 29.5 7.5z"/>';
  const rays=[0,45,90,135,180,225,270,315].map(a=>'<rect fill="url(#B)" x="22" y="3.5" width="4" height="8" rx="2" transform="rotate('+a+' 24 24)"/>').join("");
  const spk='<path fill="url(#B)" d="M7 19a3 3 0 0 1 3-3h5.5l8.3-6.7c1.3-1 3.2-.1 3.2 1.6v26.2c0 1.7-1.9 2.6-3.2 1.6L15.5 32H10a3 3 0 0 1-3-3z"/>';
  return{
    moon:mk(ORANGE,"#FF9A2E",moonP,'<path d="M17 13.5a13.5 13.5 0 0 0-3.2 15" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>'),
    sun:mk(["#FFF19A","#FFC93C","#FF9420"],"#FFB020",rays+'<circle fill="url(#B)" cx="24" cy="24" r="9.5"/>'),
    snd:mk(["#C9F4FF","#6CC8F5","#3A7FE0"],"#4BA3F0",spk+'<path fill="none" stroke="url(#B)" stroke-width="3.4" stroke-linecap="round" d="M32 18.5a8 8 0 0 1 0 11M36.5 14a14 14 0 0 1 0 20"/>'),
    mute:mk(["#E6E9F2","#A9B2C8","#6E7894"],"#8A93AE",spk+'<path fill="none" stroke="url(#B)" stroke-width="3.6" stroke-linecap="round" d="M32 19l9 10M41 19l-9 10"/>'),
    pumpkin:mk(ORANGE,"#FF8A1E",'<ellipse fill="url(#B)" cx="15.5" cy="28" rx="9" ry="12"/><ellipse fill="url(#B)" cx="32.5" cy="28" rx="9" ry="12"/><ellipse fill="url(#B)" cx="24" cy="28" rx="9.5" ry="13"/>',
      '<path d="M24 15.5c0-4 1.5-7 4.5-8.5" fill="none" stroke="#3FAE5A" stroke-width="3.4" stroke-linecap="round"/><path d="M19.5 17q-4 11 0 22M28.5 17q4 11 0 22" fill="none" stroke="#B4500F" stroke-opacity=".45" stroke-width="1.4"/>'),
    tree:mk(["#9BF0A8","#3DC46A","#1D8146"],"#2FB45E",'<path fill="url(#B)" d="M24 6l9 11h-4l8 10h-5l8 11H8l8-11h-5l8-10h-4z"/>','<rect x="21.5" y="38" width="5" height="5" rx="1.2" fill="#9A6234"/><path d="M24 2.5l1.4 2.9 3.1.4-2.3 2.1.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.1 3.1-.4z" fill="#FFD84A"/>'),
    cheers:mk(["#FFF0B0","#F5C952","#D38F1C"],"#E8B33A",'<path fill="url(#B)" d="M9 8h10l-1 11a4 4 0 0 1-8 0z"/><path fill="url(#B)" d="M29 8h10l-1 11a4 4 0 0 1-8 0z"/>',
      '<path d="M14 23v13M10 37h8M34 23v13M30 37h8" stroke="#F5C952" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="24" cy="9" r="1.6" fill="#FFE58A"/><circle cx="21" cy="14" r="1.1" fill="#FFE58A"/><circle cx="27" cy="13" r="1.1" fill="#FFE58A"/>'),
    heart:mk(["#FFB3C7","#FF5C8A","#D92B5E"],"#FF4F80",'<path fill="url(#B)" d="M24 40S7 29.5 7 18.5A8.5 8.5 0 0 1 24 14a8.5 8.5 0 0 1 17 4.5C41 29.5 24 40 24 40z"/>'),
    // icônes des fenêtres et des boutons de jeu (mêmes reliefs, dégradés et reflets)
    party:mk(["#FFD3E8","#FF6FB1","#C2337A"],"#FF5FA8",'<path fill="url(#B)" d="M7 41l9-26 17 17z"/>',
      '<path d="M26 14c3-4 7-4 9-1M31 22c4-2 7 0 8 3" fill="none" stroke="#7BE0FF" stroke-width="2.4" stroke-linecap="round"/><circle cx="36" cy="8" r="2.2" fill="#FFE27A"/><circle cx="41" cy="16" r="1.8" fill="#9CF09F"/><circle cx="22" cy="9" r="1.8" fill="#B79CFF"/><rect x="38" y="30" width="3.4" height="3.4" rx=".8" fill="#FFE27A" transform="rotate(20 39.7 31.7)"/>'),
    trophy:mk(["#FFF0B0","#F5C952","#D38F1C"],"#E8B33A",'<path fill="url(#B)" d="M14 7h20v10a10 10 0 0 1-20 0z"/><rect fill="url(#B)" x="21" y="26" width="6" height="7" rx="1.5"/><rect fill="url(#B)" x="13" y="33" width="22" height="7" rx="3"/>',
      '<path d="M14 11H9.5a5 5 0 0 0 5.5 7.5M34 11h4.5a5 5 0 0 1-5.5 7.5" fill="none" stroke="#F5C952" stroke-width="2.6" stroke-linecap="round"/>'),
    replay:mk(["#B9F6FF","#3FC3E0","#1D79B8"],"#33B4E0",'<path fill="none" stroke="url(#B)" stroke-width="5.2" stroke-linecap="round" d="M37.5 25.5A13.5 13.5 0 1 1 33 14"/><path fill="url(#B)" d="M37 6.5v12.5H24.5z"/>'),
    dice:mk(["#E2D4FF","#A47CFF","#6A3FD6"],"#9468FF",'<rect fill="url(#B)" x="8" y="8" width="32" height="32" rx="9"/>','<circle cx="17" cy="17" r="3" fill="#fff" fill-opacity=".9"/><circle cx="24" cy="24" r="3" fill="#fff" fill-opacity=".9"/><circle cx="31" cy="31" r="3" fill="#fff" fill-opacity=".9"/>'),
    home:mk(["#B6F5EC","#3CC3BE","#16807F"],"#2DB3AE",'<path fill="url(#B)" d="M24 6 5.5 21.5H11V41h10V31h6v10h10V21.5h5.5z"/>'),
    pause:mk(["#FFE9A8","#FFB43C","#E07A12"],"#FFA030",'<rect fill="url(#B)" x="12" y="9" width="9" height="30" rx="3.5"/><rect fill="url(#B)" x="27" y="9" width="9" height="30" rx="3.5"/>'),
    play:mk(["#B9FFD2","#3FD98A","#169A5A"],"#33CC80",'<path fill="url(#B)" d="M15 9.5c0-2.3 2.5-3.7 4.5-2.5l19 12.5c1.8 1.2 1.8 3.8 0 5L19.5 37c-2 1.3-4.5-.2-4.5-2.5z"/>'),
    exit:mk(["#FFC9C2","#FF6E5E","#C9372A"],"#FF5B4B",'<rect fill="url(#B)" x="9" y="6" width="20" height="36" rx="3.5"/>','<circle cx="24" cy="25" r="1.8" fill="#fff" fill-opacity=".85"/><path d="M31 24h11m-4.5-4.5L42 24l-4.5 4.5" fill="none" stroke="#FF6E5E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
    coin:mk(["#FFF0B0","#F5C952","#D38F1C"],"#E8B33A",'<circle fill="url(#B)" cx="24" cy="24" r="17"/>','<circle cx="24" cy="24" r="11.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><path d="M24 17v14M20.5 20.5h5.5a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5h5.5" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>'),
    clock:mk(["#C9F4FF","#6CC8F5","#3A7FE0"],"#4BA3F0",'<circle fill="url(#B)" cx="24" cy="26" r="15.5"/><rect fill="url(#B)" x="20" y="4" width="8" height="5" rx="2"/>','<path d="M24 17v9l6 4" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="2.8" stroke-linecap="round"/>'),
    person:mk(["#B6F5EC","#3CC3BE","#16807F"],"#2DB3AE",'<circle fill="url(#B)" cx="24" cy="15" r="8"/><path fill="url(#B)" d="M9 40c0-8.3 6.7-14 15-14s15 5.7 15 14z"/>'),
    people:mk(["#E2D4FF","#A47CFF","#6A3FD6"],"#9468FF",'<circle fill="url(#B)" cx="17" cy="16" r="7"/><circle fill="url(#B)" cx="32" cy="17.5" r="6"/><path fill="url(#B)" d="M4 40c0-7.5 5.8-12.5 13-12.5S30 32.5 30 40z"/><path fill="url(#B)" d="M28 40c0-4-1.5-7.5-4-9.8 2.2-1.4 4.8-2.2 8-2.2 6.3 0 11 4.5 11 12z"/>'),
    eraser:mk(["#FFD3E8","#FF6FB1","#C2337A"],"#FF5FA8",'<path fill="url(#B)" d="M27.5 7.5 41 21 22 40H12l-5.5-5.5z"/>','<path d="M17.5 18 31 31.5" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><path d="M22 41h18" stroke="#FF8EC2" stroke-width="2.6" stroke-linecap="round"/>'),
    bulb:mk(["#FFF6B0","#FFD43C","#E89A12"],"#FFC830",'<path fill="url(#B)" d="M24 5a13 13 0 0 0-7.5 23.6c1.3 1 2 2.4 2 4V34h11v-1.4c0-1.6.7-3 2-4A13 13 0 0 0 24 5z"/>','<rect x="18.5" y="36" width="11" height="3.2" rx="1.6" fill="#B9C2D6"/><rect x="20" y="40.5" width="8" height="3" rx="1.5" fill="#B9C2D6"/>'),
    skip:mk(["#C9F4FF","#6CC8F5","#3A7FE0"],"#4BA3F0",'<path fill="url(#B)" d="M7 11.5c0-1.6 1.8-2.6 3.1-1.7l13.4 10.7c1 .8 1 2.4 0 3.2L10.1 34.2C8.8 35.1 7 34.1 7 32.5z"/><path fill="url(#B)" d="M21 11.5c0-1.6 1.8-2.6 3.1-1.7l13.4 10.7c1 .8 1 2.4 0 3.2L24.1 34.2c-1.3.9-3.1-.1-3.1-1.7z"/><rect fill="url(#B)" x="37" y="10" width="5" height="25" rx="2.5"/>'),
    swap:mk(["#B6F5EC","#3CC3BE","#16807F"],"#2DB3AE",'<path fill="none" stroke="url(#B)" stroke-width="4.4" stroke-linecap="round" d="M8 16h28M8 32h28"/><path fill="url(#B)" d="M33 8.5 42 16l-9 7.5zM15 24.5 6 32l9 7.5z"/>'),
    // saisons
    snow:mk(["#E6F7FF","#8FD3F5","#3C8FD6"],"#6CC0F0",[0,60,120].map(a=>'<rect fill="url(#B)" x="21.8" y="5" width="4.4" height="38" rx="2.2" transform="rotate('+a+' 24 24)"/>').join("")+[0,60,120,180,240,300].map(a=>'<path fill="url(#B)" d="M24 10.5l-5 -4.2 1.6-2 3.4 2.9 3.4-2.9 1.6 2z" transform="rotate('+a+' 24 24)"/>').join(""),'<circle cx="24" cy="24" r="3.2" fill="#fff" fill-opacity=".85"/>'),
    flower:mk(["#FFD6EC","#FF7EBF","#D63C8C"],"#FF6FB5",[0,72,144,216,288].map(a=>'<ellipse fill="url(#B)" cx="24" cy="13.5" rx="7" ry="9.5" transform="rotate('+a+' 24 24)"/>').join(""),'<circle cx="24" cy="24" r="5.4" fill="#FFD43C"/><circle cx="22.6" cy="22.6" r="1.6" fill="#fff" fill-opacity=".7"/>'),
    leaf:mk(["#FFD08A","#F58A2E","#B8461A"],"#F0782A",'<path fill="url(#B)" d="M40 7C22 7 9 15 9 29c0 4 1.2 7.4 3.2 10C15 26 23 19 31 15c-7 6-13 13-16.5 25 2.5 1.4 5.4 2 8.5 2C37 42 41 25 40 7z"/>'),
    grid:mk(["#A8F2EE","#3CC3BE","#16807F"],"#2DB3AE",'<rect fill="url(#B)" x="8" y="8" width="32" height="32" rx="8"/>','<path d="M18.7 12v24M29.3 12v24M12 18.7h24M12 29.3h24" stroke="#fff" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round"/>')
  }})();
// décor du moment : la saison du calendrier français (équinoxes et solstices, heure de Paris ; source : icalendrier.fr)
const SAISONS=[["2025-12-21T16:03","hiver"],["2026-03-20T15:45","printemps"],["2026-06-21T10:24","ete"],["2026-09-23T02:05","automne"],["2026-12-21T21:50","hiver"],
  ["2027-03-20T21:24","printemps"],["2027-06-21T16:10","ete"],["2027-09-23T08:01","automne"],["2027-12-22T03:42","hiver"],
  ["2028-03-20T03:17","printemps"],["2028-06-20T22:01","ete"],["2028-09-22T13:45","automne"],["2028-12-21T09:19","hiver"],
  ["2029-03-20T09:01","printemps"],["2029-06-21T03:48","ete"],["2029-09-22T19:38","automne"],["2029-12-21T15:13","hiver"],
  ["2030-03-20T14:51","printemps"],["2030-06-21T09:31","ete"],["2030-09-23T01:26","automne"],["2030-12-21T21:09","hiver"]];
const SAISON=(()=>{const now=new Date();let cur=null;for(const [d,k] of SAISONS){if(new Date(d+"+01:00")<=now)cur=k}
  if(!cur){const md=(now.getMonth()+1)*100+now.getDate();cur=md>=1221||md<320?"hiver":md<621?"printemps":md<923?"ete":"automne"}return cur})();
const SEASON_ICO={hiver:"snow",printemps:"flower",ete:"sun",automne:"leaf"}[SAISON];
try{document.documentElement.dataset.saison=SAISON;if(!document.getElementById("saison-css")){const st=document.createElement("style");st.id="saison-css";st.textContent=
  'html[data-saison=hiver] .b1{background:#7dd3fc}html[data-saison=hiver] .b2{background:#a5b4fc}html[data-saison=hiver] .b3{background:#e0f2fe}'
  +'html[data-saison=printemps] .b1{background:#4ade80}html[data-saison=printemps] .b2{background:#f472b6}html[data-saison=printemps] .b3{background:#fde047}'
  +'html[data-saison=ete] .b1{background:#22d3ee}html[data-saison=ete] .b2{background:#fbbf24}html[data-saison=ete] .b3{background:#fb923c}'
  +'html[data-saison=automne] .b1{background:#f97316}html[data-saison=automne] .b2{background:#b45309}html[data-saison=automne] .b3{background:#dc2626}';document.head.appendChild(st)}}catch(e){}

const MAP={"🎉":"party","🏆":"trophy","🔁":"replay","🎲":"dice","🏠":"home","⏸":"pause","▶":"play","🚪":"exit","🪙":"coin","⏱":"clock","👤":"person","👥":"people","🧹":"eraser","💡":"bulb","⏭":"skip","🤝":"cheers","⇄":"swap"};
const RE=new RegExp("("+Object.keys(MAP).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")\uFE0F?","g");
const ZONES=".overlay,.fbtns,.modes,.lvBtns,.cgfact";
function glass(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{RE.lastIndex=0;return RE.test(n.nodeValue)&&!(n.parentNode&&n.parentNode.closest&&n.parentNode.closest("input,textarea,.bico"))?1:2}});
  const list=[];while(w.nextNode())list.push(w.currentNode);
  list.forEach(n=>{const f=document.createDocumentFragment();let last=0;const s=n.nodeValue;RE.lastIndex=0;let m;
    while((m=RE.exec(s))){if(m.index>last)f.appendChild(document.createTextNode(s.slice(last,m.index)));const k=MAP[m[1]];const sp=document.createElement("span");sp.className="bico";sp.innerHTML=ICO[k]();f.appendChild(sp);last=m.index+m[0].length}
    let rest=s.slice(last);if(f.lastChild&&f.lastChild.className==="bico")rest=rest.replace(/^\s+/,"");if(rest)f.appendChild(document.createTextNode(rest));else if(f.lastChild&&f.lastChild.className==="bico"&&!(n.nextSibling&&String(n.nextSibling.textContent||"").trim()))f.lastChild.classList.add("only");
    // « 🔁 Rejouer » : l'icône garde un petit espace avec le texte (géré en CSS)
    if(n.parentNode)n.parentNode.replaceChild(f,n)})}
// croix de fermeture : ferme la fenêtre et laisse voir la page floutée derrière
function cross(ov){const sh=ov.querySelector(".sheet");if(!sh||sh.querySelector(":scope>.xbtn"))return;const b=document.createElement("button");b.className="xbtn";b.type="button";b.setAttribute("aria-label","Fermer");b.title="Fermer";
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  b.onclick=e=>{e.stopPropagation();const stay=ov.querySelector("#lvStay");if(stay){stay.click();return}ov.classList.remove("on");document.dispatchEvent(new CustomEvent("fl-closed",{detail:ov.id}))};sh.prepend(b)}
function scan(){document.querySelectorAll(ZONES).forEach(z=>glass(z));document.querySelectorAll(".overlay").forEach(cross)}
let busy=false;const mo=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{mo.disconnect();try{scan()}finally{busy=false;mo.observe(document.body,{subtree:true,childList:true,characterData:true})}})});
const st=document.createElement("style");st.textContent=".bico{display:inline-flex;width:1.35em;height:1.35em;vertical-align:-.32em;margin-right:.3em;flex:none}.bico svg{width:100%;height:100%;display:block}"
  +".bico.only{margin-right:0}h3 .bico{width:1.45em;height:1.45em;vertical-align:-.36em}"
  +".overlay .sheet{position:relative}.xbtn{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;padding:0;cursor:pointer;color:inherit;"
  +"background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 4px 12px rgba(0,0,0,.18);transition:transform .15s,background .2s;z-index:2}"
  +".xbtn:hover{transform:scale(1.08);background:rgba(255,255,255,.22)}.xbtn svg{width:16px;height:16px}"
  +"[data-theme=light] .xbtn{background:rgba(255,255,255,.7);border-color:rgba(15,25,40,.12);color:#1b2433}";
document.head.appendChild(st);
const go=()=>{scan();mo.observe(document.body,{subtree:true,childList:true,characterData:true})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();
