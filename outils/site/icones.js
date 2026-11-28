// ---------- croix de fermeture sur chaque fenêtre ; décor de saison ----------
// 28/11 (style D) : les icônes « verre » sont retirées ; une seule famille d'icônes, au trait, gérée par public/d/icons.js
(function(){
// décor du moment : la saison du calendrier français (équinoxes et solstices, heure de Paris ; source : icalendrier.fr)
const SAISONS=[["2025-12-21T16:03","hiver"],["2026-03-20T15:45","printemps"],["2026-06-21T10:24","ete"],["2026-09-23T02:05","automne"],["2026-12-21T21:50","hiver"],
  ["2027-03-20T21:24","printemps"],["2027-06-21T16:10","ete"],["2027-09-23T08:01","automne"],["2027-12-22T03:42","hiver"],
  ["2028-03-20T03:17","printemps"],["2028-06-20T22:01","ete"],["2028-09-22T13:45","automne"],["2028-12-21T09:19","hiver"],
  ["2029-03-20T09:01","printemps"],["2029-06-21T03:48","ete"],["2029-09-22T19:38","automne"],["2029-12-21T15:13","hiver"],
  ["2030-03-20T14:51","printemps"],["2030-06-21T09:31","ete"],["2030-09-23T01:26","automne"],["2030-12-21T21:09","hiver"]];
const SAISON=(()=>{const now=new Date();let cur=null;for(const [d,k] of SAISONS){if(new Date(d+"+01:00")<=now)cur=k}
  if(!cur){const md=(now.getMonth()+1)*100+now.getDate();cur=md>=1221||md<320?"hiver":md<621?"printemps":md<923?"ete":"automne"}return cur})();
try{document.documentElement.dataset.saison=SAISON;if(!document.getElementById("saison-css")){const st=document.createElement("style");st.id="saison-css";st.textContent=
  'html[data-saison=hiver] .b1{background:#7dd3fc}html[data-saison=hiver] .b2{background:#a5b4fc}html[data-saison=hiver] .b3{background:#e0f2fe}'
  +'html[data-saison=printemps] .b1{background:#4ade80}html[data-saison=printemps] .b2{background:#f472b6}html[data-saison=printemps] .b3{background:#fde047}'
  +'html[data-saison=ete] .b1{background:#22d3ee}html[data-saison=ete] .b2{background:#fbbf24}html[data-saison=ete] .b3{background:#fb923c}'
  +'html[data-saison=automne] .b1{background:#f97316}html[data-saison=automne] .b2{background:#b45309}html[data-saison=automne] .b3{background:#dc2626}';document.head.appendChild(st)}}catch(e){}

// croix de fermeture : ferme la fenêtre et laisse voir la page floutée derrière
// 26/11 : pas de croix quand la fenêtre a déjà un bouton qui la ferme (Fermer, Annuler, Continuer à jouer) : un seul moyen par action
const CLOSE_RE=/^(Fermer|Annuler|Continuer à jouer)$/;
function cross(ov){const sh=ov.querySelector(".sheet");if(!sh||sh.querySelector(":scope>.xbtn"))return;if([...sh.querySelectorAll("button")].some(b=>CLOSE_RE.test(b.textContent.trim())))return;const b=document.createElement("button");b.className="xbtn";b.type="button";b.setAttribute("aria-label","Fermer");b.title="Fermer";
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  b.onclick=e=>{e.stopPropagation();const stay=ov.querySelector("#lvStay");if(stay){stay.click();return}ov.classList.remove("on");document.dispatchEvent(new CustomEvent("fl-closed",{detail:ov.id}))};sh.prepend(b)}
function scan(){document.querySelectorAll(".overlay").forEach(cross)}
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
