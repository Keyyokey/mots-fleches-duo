// Construit public/d/icons.js à partir de set.js
const I=require("./set.js"),fs=require("fs");
const MAP={"🏠":"home","👤":"user","👥":"users","⚙":"gear","🪙":"coin","👋":"wave","🎭":"mask","⏱":"timer","🔒":"lock","💡":"bulb","🌙":"moon","☀":"sun","🎃":"pumpkin","🔊":"sound","🔇":"mute","🎯":"target","🏆":"trophy","🔁":"replay","🔤":"letters","✳":"share","🎮":"gamepad","🤖":"robot","🛋":"sofa","📤":"share","👆":"tap","👉":"point","⌨":"keyboard","🔢":"numbers","⭕":"ring","✍":"pen","🔎":"search","⚡":"bolt","❓":"help","🃏":"cards","⚠":"warning","🎉":"party","🎲":"dice","⏸":"pause","🚪":"exit","🧹":"broom","⏭":"skip","🤝":"handshake","🔔":"bell","✋":"hand","⏳":"hourglass","✅":"checkc","🧮":"calc","🧩":"puzzle","🗣":"speak","🙈":"eyeoff","🎰":"jackpot","🏁":"flag","📋":"clip","🔗":"link"};
for(const k in MAP)if(!I[MAP[k]])throw "manque "+MAP[k];
const P={};for(const k in I)P[k]=[I[k].f,I[k].d];
const js=`/* Icônes Mots Fléchés Duo : remplace les emojis de l'interface par des icônes dessinées (mêmes sur tous les appareils).
   Style au choix du joueur, gardé sur l'appareil : "a" trait doux, "b" duo-ton, "e" emojis du téléphone. Bouton « Icônes » ajouté au menu. */
(function(){"use strict";
var P=${JSON.stringify(P)},M=${JSON.stringify(MAP)};
var KEY="fl-icons",mode="a";try{mode=localStorage.getItem(KEY)||"a"}catch(e){}if(!/^[abe]$/.test(mode))mode="a";
var root=document.documentElement;root.setAttribute("data-ic",mode);
var RE=new RegExp("("+Object.keys(M).map(function(k){return k.replace(/[*+?^$|]/g,"\\\\$&")}).join("|")+")[\\\\uFE0E\\\\uFE0F]?","g");
var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1,SELECT:1,TITLE:1,NOSCRIPT:1};
var cache={};
function svg(k,e){var s=cache[k];if(!s){var p=P[k];s=cache[k]='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(p[0]?'<g class="icf">'+p[0]+'</g>':'')+'<g class="ics">'+p[1]+'</g></svg>'}
  var t=document.createElement("template");t.innerHTML=s;var n=t.content.firstChild;n.setAttribute("data-e",e);return n}
function skip(n){for(var p=n.parentNode;p&&p!==document.body;p=p.parentNode){if(SKIP[p.nodeName]||p.namespaceURI==="http://www.w3.org/2000/svg"||(p.hasAttribute&&p.hasAttribute("data-noic")))return true}return false}
function fix(t){var v=t.nodeValue;RE.lastIndex=0;if(!v||!RE.test(v)||skip(t))return;RE.lastIndex=0;var f=document.createDocumentFragment(),last=0,m;
  while((m=RE.exec(v))){if(m.index>last)f.appendChild(document.createTextNode(v.slice(last,m.index)));f.appendChild(svg(M[m[1]],m[0]));last=m.index+m[0].length}
  if(last<v.length)f.appendChild(document.createTextNode(v.slice(last)));t.parentNode.replaceChild(f,t)}
function scan(el){if(mode==="e"||!el)return;if(el.nodeType===3)return fix(el);if((el.nodeType!==1&&el.nodeType!==11)||SKIP[el.nodeName])return;
  var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),L=[],n;while((n=w.nextNode()))L.push(n);L.forEach(fix)}
function unscan(){var L=[].slice.call(document.querySelectorAll("svg.ic[data-e]"));roots().forEach(function(r){L=L.concat([].slice.call(r.querySelectorAll("svg.ic[data-e]")))});for(var i=0;i<L.length;i++)L[i].parentNode.replaceChild(document.createTextNode(L[i].getAttribute("data-e")),L[i])}
var css=".ic{width:1.15em;height:1.15em;display:inline-block;vertical-align:-.2em;flex:none;overflow:visible}"+
 ".ic .ics{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ic .icf{fill:url(#icg);stroke:none;opacity:0}"+
 ":host([data-ic=b]) .ic .icf{opacity:.8}[data-ic=b] .ic .icf{opacity:.8}.icopt[data-ic=b] .ic .icf{opacity:.8}.icopt[data-ic=a] .ic .icf{opacity:0}"+
 ".icpick{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(8,10,20,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:16px}"+
 ".icbox{width:min(380px,100%);border-radius:24px;padding:20px;color:#eef2f7;background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 20px 50px rgba(0,0,0,.4);font-family:Nunito,Inter,system-ui,sans-serif}"+
 ".icbox h3{margin:0 0 4px;font-size:1.15rem}.icbox p{margin:0 0 14px;opacity:.8;font-size:.9rem;font-weight:700}"+
 ".icopt{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 8px;padding:12px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:inherit;font:800 .98rem Nunito,Inter,sans-serif;cursor:pointer;text-align:left}"+
 ".icopt.on{border-color:transparent;background:linear-gradient(135deg,rgba(0,173,181,.55),rgba(162,107,255,.55))}.icopt .pv{margin-left:auto;display:flex;gap:6px;font-size:1.25rem}"+
 ".icclose{width:100%;margin-top:6px;padding:11px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:inherit;font:800 .95rem Nunito,Inter,sans-serif;cursor:pointer}";
var DEFS='<defs><linearGradient id="icg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2DE2C8"/><stop offset="1" stop-color="#A26BFF"/></linearGradient></defs>';
function equip(r,host){var st=document.createElement("style");st.textContent=css;(r.head||r).appendChild(st);
  var d=document.createElementNS("http://www.w3.org/2000/svg","svg");d.setAttribute("width","0");d.setAttribute("height","0");d.setAttribute("aria-hidden","true");d.style.position="absolute";d.innerHTML=DEFS;(r.body||r).appendChild(d)}
var obs=new MutationObserver(function(ms){var sh=false;for(var i=0;i<ms.length;i++){var m=ms[i];if(m.type==="characterData")scan(m.target);else for(var j=0;j<m.addedNodes.length;j++){var a=m.addedNodes[j];scan(a);if(a.nodeType===1){sh=true}}}if(sh){addBtn(document);shadows()}});
// menus des jeux : composant isolé (shadow DOM), à équiper à part
function shadows(){var L=document.querySelectorAll("*");for(var i=0;i<L.length;i++){var r=L[i].shadowRoot;if(r&&!r.__ic){r.__ic=1;L[i].setAttribute("data-ic",mode);equip(r);scan(r);addBtn(r);obs.observe(r,{childList:true,subtree:true,characterData:true})}}}
function boot(){equip(document);scan(document.body);addBtn(document);shadows();
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});setTimeout(shadows,1500)}
function setMode(m){mode=m;try{localStorage.setItem(KEY,m)}catch(e){}root.setAttribute("data-ic",m);roots().forEach(function(r){var h=r.host;if(h)h.setAttribute("data-ic",m)});if(m==="e")unscan();else{scan(document.body);roots().forEach(scan)}var b=document.querySelector(".icpick");if(b)draw(b.firstChild)}
var OPT=[["a","Trait doux","Fin et discret"],["b","Duo-ton","Aux couleurs du site"],["e","Emojis","Ceux de ton téléphone"]];
function draw(box){var pv=function(o){if(o==="e")return'<span data-noic>🏠🏆🔊🪙</span>';return["home","trophy","sound","coin"].map(function(k){var s=svg(k,"");return s.outerHTML}).join("")};
  box.innerHTML='<h3>Style des icônes</h3><p>Choisis l\\u2019allure des icônes du site. Ce choix est gardé sur cet appareil.</p>'+OPT.map(function(o){return'<button type="button" class="icopt'+(mode===o[0]?" on":"")+'" data-m="'+o[0]+'" data-ic="'+o[0]+'"><span><b>'+o[1]+'</b><br><small style="opacity:.75">'+o[2]+'</small></span><span class="pv"'+(o[0]==="e"?" data-noic":"")+'>'+pv(o[0])+'</span></button>'}).join("")+'<button type="button" class="icclose">Fermer</button>';
  box.onclick=function(e){var b=e.target.closest("[data-m]");if(b)return setMode(b.getAttribute("data-m"));if(e.target.closest(".icclose"))box.parentNode.remove()}}
function openPick(){var o=document.createElement("div");o.className="icpick";o.setAttribute("data-noic","");o.innerHTML='<div class="icbox" role="dialog" aria-label="Style des icônes"></div>';o.onclick=function(e){if(e.target===o)o.remove()};document.body.appendChild(o);draw(o.firstChild)}
function roots(){var o=[],L=document.querySelectorAll("*");for(var i=0;i<L.length;i++)if(L[i].shadowRoot&&L[i].shadowRoot.__ic)o.push(L[i].shadowRoot);return o}
function addBtn(r){var L=(r||document).querySelectorAll('[data-act="deco"]');for(var i=0;i<L.length;i++){var d=L[i];if(d.parentNode.querySelector('[data-act="icons"]'))continue;var b=document.createElement("button");b.type="button";b.className=d.className;b.setAttribute("data-act","icons");b.textContent="✍️ Icônes";
  b.addEventListener("click",function(e){e.stopPropagation();e.preventDefault();openPick()});d.parentNode.insertBefore(b,d.nextSibling);scan(b)}}
window.flIcons={open:openPick,set:setMode,get mode(){return mode}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
`;
fs.writeFileSync(process.argv[2],js);console.log(js.length);
