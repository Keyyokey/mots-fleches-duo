// ---------- tableau des scores du salon ----------
function renderSalonBoard(el,stats,meNames){if(!el)return;const ps=stats&&stats.players?Object.values(stats.players):[];
  el.innerHTML='<div class="sb-h"><span>🏆 Tableau du salon</span><span class="sb-n"></span></div>';
  if(!ps.length){const p=document.createElement("div");p.className="sb-empty";p.textContent="Terminez une partie à plusieurs : les victoires de chacun s'afficheront ici.";el.appendChild(p);return}
  el.querySelector(".sb-n").textContent=ps.reduce((a,p)=>a+p.games,0)/1>0?(stats.seen||[]).length+" partie"+((stats.seen||[]).length>1?"s":""):"";
  ps.sort((a,b)=>b.wins-a.wins||b.points-a.points);
  const t=document.createElement("div");t.className="sb-t";t.innerHTML='<span></span><span>Joueur</span><span title="Victoires">🏆</span><span title="Parties">Parties</span><span title="Points">Points</span>';
  ps.slice(0,8).forEach((p,i)=>{const medal=["🥇","🥈","🥉"][i]||String(i+1);const g=p.byGame||{};const det=[["fleches","fléchés"],["rond","Tourniquet"],["meles","mêlés"]].filter(([k])=>g[k]).map(([k,l])=>l+" "+g[k].w+"/"+g[k].g).join(" · ");
    [medal,null,p.wins,p.games,p.points].forEach((v,j)=>{const c=document.createElement("span");if(j===1){c.className="sb-name";const b=document.createElement("b");b.textContent=p.name;c.appendChild(b);if(det){const s=document.createElement("small");s.textContent=det;c.appendChild(s)}if((meNames||[]).map(x=>String(x).toLowerCase()).includes(p.name.toLowerCase()))c.classList.add("me")}else c.textContent=v;t.appendChild(c)})});
  el.appendChild(t)}
// ---------- tutoriel animé (30 secondes) ----------
const TUTO={
 fleches:[
  {t:"Les définitions sont dans les cases bleues",d:"La flèche indique où va le mot : vers la droite ou vers le bas.",h:'<div class="tg tg-f"><div class="tq">CAPITALE<br>FRANÇAISE ▶</div><div class="tc a1">P</div><div class="tc a2">A</div><div class="tc a3">R</div><div class="tc a4">I</div><div class="tc a5">S</div></div><div class="hand h-f">👆</div>'},
  {t:"Touche une case, écris, puis Valider",d:"Lettres justes : des points et tu rejoues. Une erreur : la main passe à l'autre joueur.",h:'<div class="tg"><div class="tc ok1">R</div><div class="tc ok2">E</div><div class="tc ok3">V</div><div class="tc ok4">O</div><div class="tc ok5">I</div><div class="tc ok6">R</div></div><div class="tbtn pulse">✓ Valider</div>'},
  {t:"Chaque joueur a sa couleur",d:"Les mots trouvés prennent la couleur de celui qui les a trouvés. Finir la grille rapporte +20 points.",h:'<div class="tg"><div class="tc p0">L</div><div class="tc p0">U</div><div class="tc p0">N</div><div class="tc p1">E</div><div class="tc p1">S</div><div class="tc p1">T</div></div><div class="tduo"><span class="d0">Juvenal 24</span><span class="d1">Cherry 17</span></div>'}],
 rond:[
  {t:"Six lettres autour de chaque rond",d:"La première lettre est sous le triangle, puis on tourne dans le sens des aiguilles d'une montre.",h:'<div class="tr"><div class="trc">OUTILS<br><small>accessoires ouvriers</small></div>'+[0,60,120,180,240,300].map((a,i)=>'<div class="trb rb'+i+'" style="--a:'+a+'deg;--i:'+i+'">'+"OUTILS"[i]+'</div>').join("")+'</div>'},
  {t:"Les ronds voisins partagent leurs lettres",d:"En haut, en bas et sur les côtés : chaque mot trouvé donne des lettres aux mots autour.",h:'<div class="tr2"><div class="trc s">OUTILS</div><div class="trc s r">DÉVÊTU</div><div class="trb sh1">U</div><div class="trb sh2">T</div></div>'},
  {t:"À plusieurs : chacun son tour",d:"Mot juste : +10 et tu rejoues. Mot faux : la main passe. Le mode course : tout le monde en même temps contre la montre.",h:'<div class="tduo big"><span class="d0">À toi, Juvenal !</span></div>'}],
 meles:[
  {t:"Trouve les mots cachés",d:"Glisse le doigt de la première à la dernière lettre (ou touche les deux). En ligne, en colonne, en diagonale, parfois à l'envers.",h:'<div class="tm">'+"CHATXOLIONZPOUMA".split("").map((c,i)=>'<span class="'+(i<4?"sw":"")+'" style="--i:'+i+'">'+c+'</span>').join("")+'</div><div class="hand h-m">👆</div>'},
  {t:"C'est une course",d:"Tout le monde cherche en même temps. Le premier qui trouve un mot le prend à sa couleur : une lettre = un point.",h:'<div class="tm">'+"LIONCHATPUMAOURS".split("").map((c,i)=>'<span class="'+(i<4?"m0":i<8?"m1":"")+'">'+c+'</span>').join("")+'</div><div class="tduo"><span class="d0">Juvenal 4</span><span class="d1">Cherry 4</span></div>'}]
};
function showTuto(kind,force){const key="fl-tuto-"+kind;if(!force){try{if(localStorage.getItem(key))return}catch(e){}}
  if(!document.getElementById("tutoCss")){const st=document.createElement("style");st.id="tutoCss";st.textContent=`
.tuto{max-width:400px}.tuto .stage{height:170px;position:relative;display:grid;place-items:center;background:var(--bg);border-radius:14px;overflow:hidden}
.tuto .dots{display:flex;gap:6px;justify-content:center}.tuto .dots i{width:8px;height:8px;border-radius:50%;background:var(--line)}.tuto .dots i.on{background:var(--accent)}
.tuto h3{margin:0;font-size:1.1rem}.tuto p{margin:0;color:var(--muted);line-height:1.45;font-size:.94rem}.tuto .row{display:flex;gap:8px}.tuto .row button{flex:1}
.tg{display:flex;gap:4px;align-items:center}.tq{background:var(--clue,#1a2a33);color:var(--clue-ink,#bfe9ec);font-size:10px;font-weight:600;line-height:1.1;padding:6px;border-radius:7px;height:44px;display:grid;place-items:center;text-align:center}
.tc{width:44px;height:44px;border-radius:8px;background:var(--cellbg,#2a2a33);display:grid;place-items:center;font-weight:800;font-size:1.4rem;color:transparent}
.tg-f .tc{animation:tIn 3.6s infinite}.tg-f .a1{animation-delay:.6s}.tg-f .a2{animation-delay:.9s}.tg-f .a3{animation-delay:1.2s}.tg-f .a4{animation-delay:1.5s}.tg-f .a5{animation-delay:1.8s}
@keyframes tIn{0%,10%{color:transparent;transform:scale(.6)}20%,85%{color:var(--ink);transform:scale(1)}100%{color:transparent}}
.tc[class*="ok"]{color:var(--ink);animation:tOk 3s infinite}.ok2{animation-delay:.08s!important}.ok3{animation-delay:.16s!important}.ok4{animation-delay:.24s!important}.ok5{animation-delay:.32s!important}.ok6{animation-delay:.4s!important}
@keyframes tOk{0%,40%{background:var(--cellbg,#2a2a33)}50%{transform:scale(1.2);background:#3ddc97}60%,100%{transform:scale(1);background:color-mix(in srgb,#5ad8ff 25%,#2a2a33);color:#5ad8ff}}
.tc.p0{color:#5ad8ff;background:color-mix(in srgb,#5ad8ff 18%,#2a2a33)}.tc.p1{color:#ffa45c;background:color-mix(in srgb,#ffa45c 18%,#2a2a33)}
.tbtn{position:absolute;bottom:14px;right:16px;background:linear-gradient(135deg,#00ADB5,#0a8f96);color:#041b1d;font-weight:800;padding:8px 14px;border-radius:10px}.pulse{animation:tP 3s infinite}@keyframes tP{35%,45%{transform:scale(1.12)}}
.hand{position:absolute;font-size:30px;pointer-events:none}.h-f{animation:tH 3.6s infinite;left:20%;top:55%}@keyframes tH{0%{transform:translate(0,30px);opacity:0}15%{opacity:1;transform:translate(0,0)}25%{transform:translate(0,0) scale(.9)}100%{transform:translate(220px,0);opacity:0}}
.tduo{position:absolute;bottom:12px;display:flex;gap:10px;font-weight:800}.tduo.big{position:static;font-size:1.4rem}.d0{color:#5ad8ff}.d1{color:#ffa45c}.tduo span{background:var(--card);padding:6px 12px;border-radius:999px;border:1px solid var(--line)}
.tr{position:relative;width:150px;height:150px}.trc{position:absolute;left:50%;top:50%;width:84px;height:84px;transform:translate(-50%,-50%);border-radius:50%;background:var(--clue,#1a2a33);color:var(--clue-ink,#bfe9ec);display:grid;place-items:center;text-align:center;font-weight:800;font-size:.8rem;line-height:1.1}
.trc small{font-size:.58rem;font-weight:500}
.trb{position:absolute;width:32px;height:32px;border-radius:50%;background:var(--cellbg,#2a2a33);border:1px solid var(--line);display:grid;place-items:center;font-weight:800;left:50%;top:50%;transform:translate(-50%,-50%) rotate(var(--a)) translateY(-62px) rotate(calc(-1*var(--a)));color:transparent;animation:tR 4.2s infinite;animation-delay:calc(var(--i)*.35s)}
@keyframes tR{0%,8%{color:transparent;background:var(--cellbg,#2a2a33)}14%,85%{color:#041b1d;background:#5ad8ff}100%{color:transparent}}
.tr2{position:relative;width:280px;height:130px}.tr2 .trc.s{left:25%;width:96px;height:96px}.tr2 .trc.s.r{left:75%}.tr2 .sh1,.tr2 .sh2{left:51%;color:#041b1d;background:#ffc857;animation:tP 2s infinite;transform:translate(-50%,-50%)}.tr2 .sh1{top:28%}.tr2 .sh2{top:72%}
.tm{display:grid;grid-template-columns:repeat(4,38px);gap:3px}.tm span{height:38px;border-radius:7px;background:var(--cellbg,#2a2a33);display:grid;place-items:center;font-weight:800}
.tm .sw{animation:tS 3s infinite;animation-delay:calc(var(--i)*.25s)}@keyframes tS{0%,10%{background:var(--cellbg,#2a2a33)}20%,80%{background:#00ADB5;color:#041b1d}100%{background:var(--cellbg,#2a2a33)}}
.tm .m0{background:color-mix(in srgb,#5ad8ff 30%,#2a2a33);color:#5ad8ff}.tm .m1{background:color-mix(in srgb,#ffa45c 30%,#2a2a33);color:#ffa45c}
.h-m{animation:tHm 3s infinite;left:22%;top:20%}@keyframes tHm{0%{transform:translate(0,0);opacity:0}10%{opacity:1}60%{transform:translate(125px,0)}100%{transform:translate(125px,0);opacity:0}}
@media (prefers-reduced-motion:reduce){.tuto *{animation:none!important}}`;document.head.appendChild(st)}
  const S=TUTO[kind];if(!S)return;let i=0;const ov=document.createElement("div");ov.className="overlay";ov.style.zIndex="75";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Comment jouer");
  ov.innerHTML='<div class="sheet tuto"><div class="stage"></div><div class="dots"></div><h3></h3><p></p><div class="row"><button type="button" data-a="skip">Passer</button><button type="button" class="primary" data-a="next">Suivant</button></div></div>';document.body.appendChild(ov);
  const draw=()=>{const s=S[i];ov.querySelector(".stage").innerHTML=s.h;ov.querySelector("h3").textContent=s.t;ov.querySelector("p").textContent=s.d;ov.querySelector(".dots").innerHTML=S.map((_,j)=>'<i class="'+(j===i?"on":"")+'"></i>').join("");ov.querySelector('[data-a="next"]').textContent=i===S.length-1?"J'ai compris ✓":"Suivant"};
  const close=()=>{try{localStorage.setItem(key,"1")}catch(e){}ov.remove()};
  ov.addEventListener("click",e=>{const a=e.target.closest("button")?.dataset.a;if(a==="skip"||e.target===ov)close();else if(a==="next"){if(i<S.length-1){i++;draw()}else close()}});draw()}
