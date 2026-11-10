// ===== Wordflush v3 : mot composé en tuiles (sans clavier sur téléphone), jetons animés, barres de temps =====
const WF={mixN:0,len:0,wmax:0};
function wfFocus(){if(matchMedia("(pointer:fine)").matches)try{$("#pkIn").focus({preventScroll:true})}catch(e){}}
function wfRack(){const st=ST,me=st&&st.seats&&st.me>=0?st.seats[st.me]:null;if(!me||!me.hand)return[];return me.hand.map(c=>({c,mine:true})).concat((st.board||[]).slice(0,st.shown||0).map(c=>({c,mine:false})))}
function wfAssign(v,rack){const used=rack.map(()=>false);const idx=[...v].map(ch=>{let k=rack.findIndex((t,i)=>!used[i]&&t.c===ch&&t.mine);if(k<0)k=rack.findIndex((t,i)=>!used[i]&&t.c===ch);if(k>=0)used[k]=true;return k});return{idx,used}}
function wfSlots(){const el=$("#wfSlots");if(!el)return;const v=LOCKED||$("#pkIn").value,rack=wfRack(),a=wfAssign(v,rack),key=v+"|"+rack.map(t=>t.c).join("")+"|"+(LOCKED?1:0);
  if(el.dataset.h!==key){el.dataset.h=key;let h="";for(let i=0;i<7;i++){const ch=v[i];if(ch){const k=a.idx[i];h+='<button type="button" class="ws f'+(k<0?" x":rack[k].mine?" m":"")+(i===v.length-1&&v.length>WF.len?" new":"")+'" data-i="'+i+'" aria-label="Retirer la lettre '+ch+'">'+ch+'<i>'+(LV[ch]||"")+'</i></button>'}else h+='<span class="ws'+(i===v.length&&!LOCKED?" cur":"")+'"></span>'}
    el.innerHTML=h;if(v.length>WF.len&&SOUND&&!LOCKED)tone(520+v.length*60,.06,.04);WF.len=v.length}
  el.classList.toggle("lock",!!LOCKED);$$("#pkWL button").forEach(b=>b.classList.toggle("used",!!a.used[+b.dataset.k]));
  const off=!!LOCKED||$("#pkIn").disabled;$$("#wfTools .wtb").forEach(b=>b.disabled=off||(b.id!=="wfMix"&&!v))}
function wfPts(e){const s=$("#wfSlots"),p=$("#wfPts"),g=$("#wfBadges");if(!s||!p)return;s.dataset.v=e?(e.valid?"ok":"ko"):"";const ok=!!(e&&e.valid);p.hidden=!ok;if(ok)p.textContent=e.total_score+" pts";
  if(g)g.innerHTML=ok?(e.full_hand_bonus?"<em>Main Pleine +"+e.full_hand_bonus+"</em>":"")+($("#pkIn").value.length>=6?"<em>Cagnotte</em>":""):""}
document.addEventListener("click",e=>{const t=e.target.closest("#wfSlots .ws.f,#wfBack,#wfClr,#wfMix,#wfSlots");if(!t)return;const i=$("#pkIn");
  if(t.id==="wfMix"){WF.mixN++;if(ST)lettersShow(ST,ST.seats&&ST.me>=0?ST.seats[ST.me]:null);return}
  if(LOCKED||i.disabled)return;
  if(t.id==="wfBack")i.value=i.value.slice(0,-1);else if(t.id==="wfClr")i.value="";else if(t.classList.contains("f")){const k=+t.dataset.i;i.value=i.value.slice(0,k)+i.value.slice(k+1)}else{wfFocus();return}
  typed();wfFocus()});
// au clavier (ordinateur) : on tape directement, sans cliquer dans un champ
document.addEventListener("keydown",e=>{if(e.ctrlKey||e.metaKey||e.altKey||!ST)return;const t=e.target;if(t&&t.matches&&t.matches("input,textarea,select,[contenteditable]"))return;const i=$("#pkIn");if(LOCKED||i.disabled)return;
  const me=ST.seats&&ST.me>=0?ST.seats[ST.me]:null;if(!me||me.folded||!(ST.phase==="mot"||$("#pkWordCard").classList.contains("prep")))return;
  if(/^[a-zA-ZÀ-ÿ]$/.test(e.key)){i.value=(i.value+e.key).slice(0,7);typed()}else if(e.key==="Backspace"){i.value=i.value.slice(0,-1);typed();e.preventDefault()}else if(e.key==="Enter"&&!(t&&t.matches&&t.matches("button,a")))$("#pkBest").click()});
if(matchMedia("(pointer:coarse)").matches)$("#pkIn").setAttribute("inputmode","none");
function wfFly(from,to,n){if(!from||!to||matchMedia("(prefers-reduced-motion:reduce)").matches)return;const a=from.getBoundingClientRect(),z=to.getBoundingClientRect();if(!a.width||!z.width)return;
  for(let j=0;j<n;j++){const c=document.createElement("i");c.className="wfchip";c.style.left=(a.left+a.width/2-9)+"px";c.style.top=(a.top+a.height/2-9)+"px";document.body.appendChild(c);
    setTimeout(()=>{c.style.transform="translate("+Math.round(z.left+z.width/2-a.left-a.width/2+(j-(n-1)/2)*7)+"px,"+Math.round(z.top+z.height/2-a.top-a.height/2)+"px)"},30+j*80);setTimeout(()=>{c.style.opacity="0"},520+j*80);setTimeout(()=>c.remove(),760+j*80)}
  if(SOUND)for(let j=0;j<Math.min(n,3);j++)tone(1500+j*240,.05,.03,.45+j*.07)}
function wfSeatEl(i){return document.querySelector('.seat[data-i="'+i+'"] .ava')}
function wfRender(st,me,myTurn){const b=document.body;b.classList.toggle("wf-in",!!(me&&!me.gone&&!me.out));const fold=!!(me&&me.folded&&st.phase==="mise"&&st.started);b.classList.toggle("wf-fold",fold);
  if(fold)$("#pkRisk").innerHTML="Tu es couché : tu reviens au prochain coup.";
  if(!PREV||PREV.hand!==st.hand){WF.mixN=0;WF.len=0}
  if(PREV&&PREV.seats&&PREV.hand===st.hand&&st.started){st.seats.forEach((s,i)=>{const p=PREV.seats[i],d=(s.inPot||0)-((p&&p.inPot)||0);if(d>0)wfFly(wfSeatEl(i),$("#pkPot"),Math.min(5,Math.max(2,Math.ceil(d/3))))});
    if(PREV.pot!==st.pot){const p=$("#pkPot");p.classList.remove("bump");void p.offsetWidth;p.classList.add("bump")}}
  if(PREV&&PREV.phase!=="abattage"&&st.phase==="abattage"&&st.results){const opp=st.seats.filter((x,i)=>i!==st.me&&x.hand).length*2,base=st.results.length>1?1600+opp*650+500:300;
    st.results.forEach((x,j)=>{if(!(x.win&&x.gain))return;const i=st.seats.findIndex(s=>s.name===x.name);if(i>=0)setTimeout(()=>wfFly($("#pkPot"),wfSeatEl(i),5),base+j*900+250)})}
  if(myTurn&&(!PREV||PREV.turn!==st.turn||PREV.phase!==st.phase)&&navigator.vibrate)try{navigator.vibrate(20)}catch(e){}
  wfSlots()}
function wfTick(left){const mt=ST.phase==="mise"&&ST.turn===ST.me&&ST.started,b=$("#wfBar");if(b){b.classList.toggle("on",!!mt);b.classList.toggle("low",mt&&left<=10500);if(mt)b.firstChild.style.transform="scaleX("+Math.max(0,Math.min(1,left/(ST.dec*1000))).toFixed(3)+")"}
  const w=$("#wfWBar");if(w){const on=ST.phase==="mot"&&!LOCKED;if(on)WF.wmax=Math.max(WF.wmax,left);else WF.wmax=0;w.classList.toggle("on",on);w.classList.toggle("low",on&&left<=10500);if(on)w.firstChild.style.transform="scaleX("+Math.max(0,Math.min(1,left/(WF.wmax||1))).toFixed(3)+")"}}
