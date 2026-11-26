// ===== Magnético — jeu de Motipop : reformer le mot avec les syllabes qui s'entrechoquent =====
(function(){
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const Q=new URLSearchParams(location.search);
const CODE=((location.pathname.match(/^\/([A-Za-z0-9]{5})\//)||[])[1]||"").toUpperCase()||null;
const HOME=CODE?"/"+CODE:"/";
let ME=null;try{ME=JSON.parse(LS.get("fl-me")||"null")}catch(e){}if(ME&&!/^(?:[A-Z0-9@#_]{2,7}|INVITE\d{4,5})$/.test(ME.name||""))ME=null;
const DOC="mg",GAME="magnetico",MAXP=4,NWORDS=10,TIME=30,NEXT=10,GAP=1000,R=36,VMAX=1.4,VMIN=0.5,NOISE=0.06;
const LVLN={facile:"Facile",normal:"Normal",difficile:"Difficile"},TRAPS={facile:0,normal:1,difficile:2};
const PCOL=["#34d399","#fb7185","#a78bfa","#ff9a3c"],PBG=["rgba(16,185,129,.22)","rgba(244,63,94,.18)","rgba(167,139,250,.2)","rgba(255,154,60,.16)"];
const NOTES=[523,659,784,988,1175,1319];
let G=null,ws=null,docs={},peers=[],reqN=0,acks={};

/* ---------- sons (synthétisés, aucun fichier ; coupés si le son du site est coupé) ---------- */
let AC=null,NB=null;const sndOff=()=>LS.get("fl-sound")==="off";
function audio(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume()}catch(e){AC=null}}
function tone(f,d,type,vol,f2,delay){if(!AC||sndOff())return;try{const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type||"sine";o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol||.2,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.03)}catch(e){}}
function noise(d,f1,f2,vol,delay){if(!AC||sndOff())return;try{if(!NB){NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}const t=AC.currentTime+(delay||0),s=AC.createBufferSource(),bp=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NB;bp.type="bandpass";bp.Q.value=1.4;bp.frequency.setValueAtTime(f1,t);bp.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+d*.4);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(bp);bp.connect(g);g.connect(AC.destination);s.start(t);s.stop(t+d+.03)}catch(e){}}
const SFX={enter:()=>{noise(.55,1800,700,.06);tone(330,.35,"sine",.05,520)},
  pop:k=>{tone(480,.1,"sine",.26,1300);noise(.06,2600,5000,.06);tone(NOTES[k%6],.3,"triangle",.14,0,.08)},
  back:()=>tone(700,.12,"sine",.1,350),bump:v=>{tone(380+v*90,.11,"triangle",.13+v*.03,220);noise(.035,2200,4200,.05)},   // choc entre syllabes : « toc » de verre, audible sur téléphone
   pass:(r,v)=>{const f=Math.max(900,1700-r*28)+v*120;tone(f,.08,"sine",.07+Math.min(.07,v*.035),f*.6);noise(.025,3500,6500,.03)},   // choc d'une petite bulle de passage : « plic » plus aigu

  lock:()=>{tone(880,.14,"triangle",.11);tone(1320,.18,"triangle",.07,0,.08)},
  ok:()=>{[523,659,784,1047].forEach((f,j)=>tone(f,.24,"triangle",.17,0,j*.09));tone(2093,.5,"sine",.05,0,.36)},
  bad:()=>{tone(440,.17,"square",.07);tone(330,.24,"square",.07,0,.18);tone(220,.32,"sawtooth",.04,170,.18)},
  tick:()=>tone(1100,.05,"square",.04),over:()=>{tone(500,.16,"triangle",.11,1100);tone(1100,.12,"sine",.05,0,.14)},
  time:()=>{tone(392,.25,"triangle",.13);tone(311,.4,"triangle",.13,0,.22)},rival:()=>{tone(660,.12,"sine",.06);tone(990,.14,"sine",.04,0,.09)}};
// vrais sons (banque de sons, 21/11) : utilisés dès qu'ils sont chargés, sinon le petit son fabriqué ci-dessus
(m=>Object.keys(m).forEach(k=>{const f=SFX[k];if(typeof f==="function")SFX[k]=function(){return(window.MotipopSons&&window.MotipopSons.play(m[k]))||f.apply(this,arguments)}}))({pop:"pop",ok:"mot",bad:"faux",tick:"tic"});
document.addEventListener("pointerdown",audio,{capture:true});
function toast(ic,html){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";document.body.appendChild(t)}t.innerHTML="<span class='ti'>"+ic+"</span><span>"+html+"</span>";t.classList.remove("on");void t.offsetWidth;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),3200)}

/* ---------- les mots ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
let POOL=null;function pool(lvl){POOL=POOL||{};if(POOL[lvl])return POOL[lvl];const s=new Set();(window.MG_MOTS[lvl]||[]).forEach(e=>e.split("|")[0].split("-").forEach(x=>s.add(x)));return POOL[lvl]=[...s]}
// un mot de la partie : syllabes, définition, rareté, et ses syllabes pièges (les mêmes pour tous les joueurs)
const WC={};function word(k){const ck=G.gid+":"+k;if(WC[ck])return WC[ck];return WC[ck]=word0(k)}
function word0(k){if(typeof G.words[k]==="string")return calcItem(+G.words[k].slice(1)||1,rng((G.seed|0)+k*7919));const e=window.MG_MOTS[G.level][G.words[k]].split("|");const s=e[0].split("-");const n=TRAPS[G.level]||0;const r=rng((G.seed|0)+k*7919);const P=pool(G.level);const tr=[];
  for(let t=0;t<200&&tr.length<n;t++){const base=s[Math.floor(r()*s.length)],c=P[Math.floor(r()*P.length)];
    if(!c||s.includes(c)||tr.includes(c)||Math.abs(c.length-base.length)>1)continue;if(t<120&&c[0]!==base[0]&&c.slice(-1)!==base.slice(-1))continue;tr.push(c)}
  return{s,def:e[1],rar:+e[2]||1,traps:tr,word:s.join("")}}
// ---------- calculs (23/11, demande de Juvenal) : « 2 + … = 7 », le nombre qui manque circule parmi les bulles ----------
// palier 1 : + et − jusqu'à 10 · 2 : jusqu'à 20, tables de 2, 5, 10 · 3 : jusqu'à 50, tables de 2 à 6, divisions simples · 4 : jusqu'à 100, tables jusqu'à 9
const CALC_RAR=[0,2,2.5,3,3.5],CALC_TRAPS=[0,3,4,5,5];
function calcItem(t,r){const I=(a,b)=>a+Math.floor(r()*(b-a+1));let a,b,c,op;
  const kind=t===1?(r()<.55?"+":"-"):t===2?(r()<.35?"x":r()<.6?"+":"-"):(r()<.3?"x":r()<.5?"/":r()<.75?"+":"-");
  const M=[0,10,20,50,100][t];
  if(kind==="+"){c=I(t===1?3:6,M);a=I(1,c-1);b=c-a;op="+"}
  else if(kind==="-"){a=I(t===1?3:8,M);b=I(1,a-1);c=a-b;op="−"}
  else if(kind==="x"){const T=t===2?[2,5,10]:t===3?[2,3,4,5,6]:[3,4,6,7,8,9];a=T[I(0,T.length-1)];b=I(2,t===2?10:9);c=a*b;if(r()<.5){const z=a;a=b;b=z}op="×"}
  else{b=I(2,t===3?5:9);c=I(2,t===3?8:10);a=b*c;op="÷"}
  const gap=t===1?(r()<.5?2:I(0,1)):I(0,2),vals=[a,b,c],ans=vals[gap];
  const ex=vals.map((v,i)=>i===gap?"…":String(v));const eq=ex[0]+" "+op+" "+ex[1]+" = "+ex[2];
  const cand=[ans+1,ans-1,ans+2,ans-2,ans+10,ans-10,a+b,Math.abs(a-b),...vals,ans*2,Math.floor(ans/2)];
  if(ans>=10){const d=String(ans).split("").reverse().join("");cand.unshift(+d)}
  const tr=[];for(let i=0;i<60&&tr.length<CALC_TRAPS[t];i++){const v=cand[Math.floor(r()*cand.length)];if(v>=0&&v!==ans&&!tr.includes(String(v)))tr.push(String(v))}
  return{s:[String(ans)],def:"Le nombre qui manquait : "+ans,rar:CALC_RAR[t],traps:tr,word:a+" "+op+" "+b+" = "+c,math:true,eq,gap,tier:t}}
// où tombent les calculs et quel palier : facile 3 sur 10, normal 4, difficile 5 ; la difficulté monte, le dernier est facile (récompense)
const CALC_PLAN={facile:[[2,1],[5,2],[9,1]],normal:[[1,1],[4,2],[6,3],[9,1]],difficile:[[1,2],[3,3],[5,3],[7,4],[9,1]]};
function mixPlan(lvl,idx){const L=window.MG_MOTS[lvl]||[],P=CALC_PLAN[lvl]||[];const diff=i=>{const e=(L[i]||"").split("|");return e[0].split("-").length*10+(+e[2]||1)};
  const w=idx.slice(0,NWORDS-P.length).sort((x,y)=>diff(x)-diff(y)),out=[];let j=0;
  for(let k=0;k<NWORDS;k++){const m=P.find(p=>p[0]===k);out.push(m?"m"+m[1]:w[j++])}
  // sans calcul en dernière place, le dernier mot est le plus facile
  return out}
// 25/11 : vers la fin de la partie, des mots plus longs (3 puis 4 syllabes selon le niveau) ; en solo, un joueur qui a déjà
// beaucoup joué à ce niveau (6 parties et plus) reçoit plus tôt les mots longs
function sylTarget(lvl,j,m,prog){if(lvl==="facile")return j>=m-(prog?4:2)?3:2;
  if(lvl==="normal")return j>=m-(prog?3:1)?4:j>=m-(prog?5:4)?3:2;
  return j>=m-(prog?2:1)?5:4}
function mgProgress(lvl,pl){let n=0;for(const k in pl)if(k.indexOf(lvl)===0&&/^\d+$/.test(k.slice(lvl.length)))n++;return Math.floor(n/7)}
function pickWords(lvl,seed,solo){const L=window.MG_MOTS[lvl]||[];let pl={};try{pl=JSON.parse(LS.get("fl2-played-mg")||"{}")}catch(e){}const r=rng(seed),out=[];
  const m=NWORDS-(CALC_PLAN[lvl]||[]).length,prog=solo!==false&&mgProgress(lvl,pl)>=6,nsyl=i=>(L[i]||"").split("|")[0].split("-").length;
  for(let j=0;j<m;j++){const want=sylTarget(lvl,j,m,prog);let got=-1;
    for(let pass=0;pass<3&&got<0;pass++)for(let t=0;t<3000&&got<0;t++){const i=Math.floor(r()*L.length);if(out.includes(i)||/\|a$/.test(L[i])||(pass<2&&pl[lvl+i]))continue;const d=Math.abs(nsyl(i)-want);if(d===0||(pass===2&&d<=1))got=i}
    if(got<0)for(let t=0;t<4000&&got<0;t++){const i=Math.floor(r()*L.length);if(!out.includes(i)&&!/\|a$/.test(L[i]))got=i}
    out.push(got)}
  return mixPlan(lvl,out)}
function markPlayed(){try{const pl=JSON.parse(LS.get("fl2-played-mg")||"{}");G.words.forEach(i=>{if(typeof i==="number")pl[G.level+i]=1});const k=Object.keys(pl);if(k.length>3000)k.slice(0,k.length-3000).forEach(x=>delete pl[x]);LS.set("fl2-played-mg",JSON.stringify(pl))}catch(e){}}

/* ---------- joueurs, salon ---------- */
function mySeat(){if(!G)return null;if(G.solo)return 0;if(!ME)return null;const i=G.players.findIndex(p=>String(p.name).toUpperCase()===ME.name);return i<0?null:i}
function np(){return G&&(!G.solo||G.bot)?G.players.length:1}
function isOut(i){return !!(G&&!G.solo&&G.out&&G.out[i])}
function active(){return G.players.map((p,i)=>i).filter(i=>!isOut(i))}
function connect(){if(!CODE)return;ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/ws");
  ws.onopen=()=>{ws.send(JSON.stringify({t:"join",room:CODE,name:ME?ME.name:"",token:ME?ME.token:"",k:Q.get("k")||""}));announce()};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}
    if(m.t==="error"&&(m.code==="auth"||m.code==="forbidden")){ws.onclose=null;ws.close();location.replace(m.code==="auth"?HOME:"/?open=salon");return}
    if(m.t==="room"){window.SK_ROOM=m;window.dispatchEvent(new Event("sk-room"));return}
    if(m.t==="snap"){window.__snapped=1;docs={};(m.docs||[]).forEach(d=>docs[d.id]=d.data);if(window.FLINV)setTimeout(()=>FLINV(docs,{gid:G&&G.gid}),0);LS.set("fl-salon-"+CODE,JSON.stringify({docs}));
      const d=docs[DOC];if(G&&!G.solo&&d){if(d.gid===G.gid){G=d;render()}else if(d.prev===G.gid){open(d);toast("🔁","Nouvelle partie pour le salon")}}}
    else if(m.t==="peers"){peers=m.peers||[];if(G&&!G.solo){waitCheck();render()}}
    else if(m.t==="ack"&&acks[m.req]){acks[m.req](m);delete acks[m.req]}};
  ws.onclose=()=>setTimeout(connect,1500)}
function send(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}
function req(o){return new Promise((ok,ko)=>{const n=++reqN;o.req=n;acks[n]=m=>m.ok?ok(m):ko(m.code);send(o);setTimeout(()=>{if(acks[n]){delete acks[n];ko("timeout")}},6000)})}
function save(){if(!G||G.bot)return;if(G.solo){LS.set("fl2-solo-mg",JSON.stringify(G));return}send({t:"set",id:DOC,data:JSON.parse(JSON.stringify(G)),req:++reqN})}
// écriture atomique d'un champ de la partie (course : le premier qui écrit garde la place)
function patch(field,key,value,o){o=o||{};return req({t:"patch",id:DOC,gid:G.gid,field,key:String(key),value,ifAbsent:!!o.ifAbsent,score:o.score,extra:o.extra})}
function announce(){send({t:"presence",presence:{name:ME?ME.name:"",page:GAME,gid:G?G.gid:null,seat:mySeat()}})}
function seatsHere(){const s=new Set();const me=mySeat();if(me!==null)s.add(me);peers.forEach(p=>{const pr=p.presence||{};if(pr.gid===G.gid&&pr.seat!=null&&pr.page===GAME)s.add(Number(pr.seat))});return s}
function waitCheck(){if(!G||G.solo||G.done||!G.wait)return;if(mySeat()===null){joinWait();return}const s=seatsHere();if(G.blocked)return;if(window.SK_ROOM&&SK_ROOM.temp&&G.players.length>=2&&G.players.every((p,i)=>s.has(i)&&p.name!=="Invité")&&presentSeats()[0]===mySeat()){if(!waitCheck.at)waitCheck.at=Date.now();if(Date.now()-waitCheck.at>1500){waitCheck.at=0;launchNow()}return}if(G.players.length>=MAXP&&G.players.every((p,i)=>s.has(i))&&presentSeats()[0]===mySeat())launchNow()}
let joinTry="";function joinWait(){if(!ME||!G||!G.wait||G.done||mySeat()!==null||joinTry===G.gid)return;
  const i=G.players.findIndex(p=>p.name==="Invité");if(i>=0)G.players[i].name=ME.name;else if(G.players.length<MAXP)G.players.push({name:ME.name,score:0});else return;
  joinTry=G.gid;save();announce();render()}
function presentSeats(){const s=seatsHere();return G.players.map((p,i)=>i).filter(i=>s.has(i)&&G.players[i].name!=="Invité")}
let lastLaunch=0;function askLaunch(){if(Date.now()-lastLaunch<1500)return;lastLaunch=Date.now();send({t:"launch",id:DOC,gid:G.gid})}
function launchNow(){if(!G||!G.wait||G.done||mySeat()===null)return;const keep=presentSeats().map(i=>G.players[i]);if(keep.length<2){toast("⏳","Il faut au moins 2 joueurs présents pour lancer.");return}
  if(keep.length!==G.players.length)G.players=keep.map(p=>({name:p.name,score:0}));save();setTimeout(askLaunch,350)}
function quitGame(){if(!G||G.done)return;if(G.solo){LS.del("fl2-solo-mg");LS.del("fl-paused-magnetico");G=null;return}const s=mySeat();if(s===null)return;patch("out",s,1,{score:{i:s,add:-(G.players[s].score||0)}}).catch(()=>{})}
// connexion perdue plus d'1 minute : le joueur sort de la partie avec 0 point (règle de Motipop)
const seenAt={};function lostCheck(){if(!G||G.solo||G.done||G.wait)return;const now=Date.now(),here=seatsHere();
  G.players.forEach((p,i)=>{if(here.has(i)||seenAt[G.gid+":"+i]===undefined)seenAt[G.gid+":"+i]=now});
  const me=mySeat(),act=active().filter(i=>here.has(i));if(me===null||act[0]!==me)return;
  active().filter(i=>now-seenAt[G.gid+":"+i]>60000).forEach(i=>{seenAt[G.gid+":"+i]=now;patch("out",i,1,{score:{i,add:-(G.players[i].score||0)}}).catch(()=>{})})}

/* ---------- tempo commun : le jeu donne le rythme à tout le monde ---------- */
// chaque mot : entrée des syllabes (1 s chacune), 30 s de chrono (arrêté plus tôt si tous ont fini), puis 10 s de résultat
const nItems=k=>{const w=word(k);return w.s.length+w.traps.length};
const entryMs=k=>nItems(k)*GAP+700;
function sched(now){let t=G.go||G.started;const L=G.words.length;
  for(let k=0;k<L;k++){const c0=t+entryMs(k);let c1=c0+TIME*1000;const cut=G.cut&&G.cut[k];if(cut)c1=Math.max(c0,Math.min(c1,cut));const nx=c1+NEXT*1000;
    if(now<c0)return{i:k,ph:"entry",start:t,c0,c1,nx};if(now<c1)return{i:k,ph:"play",start:t,c0,c1,nx};if(now<nx)return{i:k,ph:"res",start:t,c0,c1,nx};t=nx}
  return{i:L-1,ph:"end"}}
function fKey(k,s){return k+"_"+s}
function resolved(k,s){return !!((G.f&&G.f[fKey(k,s)])||(G.p&&G.p[fKey(k,s)]))}

/* ---------- état local du mot affiché ---------- */
const field=$("#mgField");let W=0,H=0;
let cur=-1,balls=[],queue=[],placed=[],locked=[],ent=null,bursts=[],lastBump=0,lastTick=-1,phase="idle",koT=0,errN=0,wStart=0,t0=null,sentF=false,solo={};
function size(){W=field.clientWidth;H=field.clientHeight}
addEventListener("resize",size);
for(let k=0;k<6;k++){const b=document.createElement("span");b.className="mgburst";field.appendChild(b);bursts.push({el:b,t:-1e9,x:0,y:0})}
function randn(){const u=1-Math.random(),v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function setupWord(k,startAt){size();balls.forEach(b=>b.el.remove());cur=k;const w=word(k);
  const all=w.s.map((t,j)=>({id:"s"+j,t})).concat(w.traps.map((t,j)=>({id:"t"+j,t})));const r=rng((G.seed|0)+k*31);
  for(let j=all.length-1;j>0;j--){const q=Math.floor(r()*(j+1)),x=all[j];all[j]=all[q];all[q]=x}
  balls=all.map((a,j)=>{const el=document.createElement("button");el.type="button";el.className="mgball";el.setAttribute("aria-label",(w.math?"Nombre ":"Syllabe ")+a.t);el.style.display="none";
    const c=(j+k)%4,core=document.createElement("span");core.className="mgcore c"+c+" l"+Math.min(5,a.t.length);const sp=document.createElement("span");sp.textContent=a.t;core.appendChild(sp);el.appendChild(core);
    const b={id:a.id,t:a.t,c,x:-200,y:-200,vx:0,vy:0,on:false,entering:false,hit:-1e9,el,core,rot:0};el.addEventListener("pointerdown",e=>{e.preventDefault();pick(b)});field.insertBefore(el,$("#mgRes"));return b});
  queue=balls.slice();placed=w.s.map(()=>null);locked=w.s.map(()=>false);ent=null;lastTick=-1;errN=0;sentF=false;wStart=startAt||performance.now();
  phase="play";$("#mgRes").style.display="none";$("#mgMsg").textContent="";boxState("");$("#mgBtns").classList.remove("off");field.classList.remove("flash");
  $("#mgNum").textContent=(w.math?"Calcul ":"Mot ")+(k+1)+" / "+G.words.length;$("#mgLvl").textContent=LVLN[G.level]+" · "+(w.traps.length?w.traps.length+(w.traps.length>1?" pièges":" piège"):"aucun piège");
  $("#mgNsyl").textContent=w.math?"Touche le nombre qui manque":"Touche les "+w.s.length+" syllabes dans l'ordre";$("#mgBox").classList.toggle("calc",!!w.math);slots()}
let side=0;
function startEntry(b,now){side=(side+1)%4;const u=.25+Math.random()*.5;let P,n;
  if(side===0){P={x:u*W,y:0};n={x:0,y:1}}else if(side===1){P={x:W,y:u*H};n={x:-1,y:0}}else if(side===2){P={x:u*W,y:H};n={x:0,y:-1}}else{P={x:0,y:u*H};n={x:1,y:0}}
  const a=(Math.random()*50-25)*Math.PI/180,d={x:n.x*Math.cos(a)-n.y*Math.sin(a),y:n.x*Math.sin(a)+n.y*Math.cos(a)};
  b.x=P.x-d.x*(R+2);b.y=P.y-d.y*(R+2);b.vx=d.x*4.2;b.vy=d.y*4.2;b.on=true;b.entering=true;b.el.style.display="";ent={b};
  const col=getComputedStyle(b.core).getPropertyValue("--g").trim()||"#19e3ec",gt=document.createElement("span");gt.className="mggate";gt.style.background="radial-gradient(circle,"+col+" 0%,rgba(255,255,255,0) 65%)";field.insertBefore(gt,$("#mgRes"));
  gt.animate([{transform:"translate("+P.x+"px,"+P.y+"px) scale(.4)",opacity:0},{transform:"translate("+P.x+"px,"+P.y+"px) scale(1)",opacity:.75,offset:.35},{transform:"translate("+P.x+"px,"+P.y+"px) scale(1.25)",opacity:0}],{duration:900,easing:"ease-out"}).onfinish=()=>gt.remove();
  SFX.enter()}
function placeNow(b){const u=.2+Math.random()*.6,v=.2+Math.random()*.6;b.x=R+u*(W-2*R);b.y=R+v*(H-2*R);const a=Math.random()*Math.PI*2;b.vx=Math.cos(a)*VMAX;b.vy=Math.sin(a)*VMAX;b.on=true;b.entering=false;b.el.style.display=""}
function updEntry(dt){if(!ent)return;const b=ent.b;if(!b.on){ent=null;return}
  const s=Math.hypot(b.vx,b.vy)||.01;if(s>VMAX){const f=Math.max(VMAX/s,.975);b.vx*=f;b.vy*=f}b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x>R+2&&b.x<W-R-2&&b.y>R+2&&b.y<H-R-2){b.entering=false;ent=null}}
function step(dt,now){const on=balls.filter(b=>b.on);
  on.forEach(b=>{if(b.entering)return;b.vx+=randn()*NOISE*dt;b.vy+=randn()*NOISE*dt;const s=Math.hypot(b.vx,b.vy)||.01;
    if(s>VMAX){const f=Math.max(VMAX/s,.985);b.vx*=f;b.vy*=f}else if(s<VMIN){b.vx*=VMIN/s;b.vy*=VMIN/s}
    b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<R){b.x=R;b.vx=Math.abs(b.vx)}if(b.x>W-R){b.x=W-R;b.vx=-Math.abs(b.vx)}if(b.y<R){b.y=R;b.vy=Math.abs(b.vy)}if(b.y>H-R){b.y=H-R;b.vy=-Math.abs(b.vy)}});
  for(let p=0;p<on.length;p++)for(let q=p+1;q<on.length;q++){const a=on[p],c=on[q],dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy);if(d>=2*R||d===0)continue;
    const nx=dx/d,ny=dy/d,ov=2*R-d,rel=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;
    if(a.entering||c.entering){const o=a.entering?c:a,sg=a.entering?1:-1,vn=o.vx*nx*sg+o.vy*ny*sg;if(vn<0){o.vx-=2*vn*nx*sg;o.vy-=2*vn*ny*sg}o.x+=nx*sg*ov;o.y+=ny*sg*ov;continue}
    if(rel>0){a.vx-=rel*nx;a.vy-=rel*ny;c.vx+=rel*nx;c.vy+=rel*ny;
      if(now-lastBump>110){lastBump=now;const bb=bursts.reduce((m,x)=>x.t<m.t?x:m);bb.t=now;bb.x=(a.x+c.x)/2;bb.y=(a.y+c.y)/2;SFX.bump(Math.min(2,rel))}
      [a,c].forEach(z=>{if(now-z.hit>200){z.core.classList.remove("hit");void z.core.offsetWidth;z.core.classList.add("hit")}z.hit=now})}
    a.x-=nx*ov/2;a.y-=ny*ov/2;c.x+=nx*ov/2;c.y+=ny*ov/2}}
function draw(now){balls.forEach(b=>{if(!b.on)return;b.rot+=(Math.max(-10,Math.min(10,b.vx*5))-b.rot)*.06;b.el.style.transform="translate("+(b.x-R).toFixed(1)+"px,"+(b.y-R).toFixed(1)+"px) rotate("+b.rot.toFixed(1)+"deg)"});
  bursts.forEach(u=>{const a=(now-u.t)/340;if(a>=1){u.el.style.opacity=0;return}u.el.style.opacity=(1-a).toFixed(2);u.el.style.transform="translate("+u.x.toFixed(1)+"px,"+u.y.toFixed(1)+"px) scale("+(0.5+a*1.5).toFixed(2)+")"})}
function bar(left){const b=$("#mgBar");b.style.width=Math.max(0,left/TIME*100)+"%";const col=left>10?"#19e3ec":left>5?"#ffc857":"#ff5d7a";b.style.background=col;b.style.boxShadow="0 0 10px "+col;
  if(t0!=null&&left<=5&&left>0&&phase==="play"){const s=Math.ceil(left);if(s!==lastTick){lastTick=s;SFX.tick()}}}

/* ---------- encadré du mot ---------- */
let slotEls=[];
// état de la boîte réponse (ok / ko) sans perdre « calc »
function boxState(s){const b=$("#mgBox");b.classList.remove("ok","ko");if(s)b.classList.add(s)}
function slots(){const w=word(cur),box=$("#mgSlots");box.innerHTML="";slotEls=[];const reveal=phase==="res"||phase==="timeout";
  if(w.math){const b=placed[0],txt=reveal?w.s[0]:(b?b.t:"");const parts=w.eq.split(" ");parts.forEach(p=>{if(p!=="…"){const e=document.createElement("span");e.className=/^[0-9]+$/.test(p)?"mgeq mgnum mgknown":"mgeq mgop";e.textContent=p;box.appendChild(e);return}
      if(!txt){const e=document.createElement("div");e.className="mgempty mgnum";box.appendChild(e);slotEls.push(e);return}
      const el=document.createElement("button");el.type="button";el.className="mgslot mgnum"+(locked[0]?" lock":"");el.textContent=txt;
      el.onclick=()=>{if(phase!=="play"||locked[0]||!placed[0])return;queue.push(placed[0]);placed[0]=null;SFX.back();slots()};box.appendChild(el);slotEls.push(el)});
    $("#mgOk").style.opacity=placed.indexOf(null)<0?1:.5;return}
  w.s.forEach((t,k)=>{const b=placed[k],txt=reveal?t:(b?b.t:"");
    if(!txt){const e=document.createElement("div");e.className="mgempty";box.appendChild(e);slotEls.push(e);return}
    const el=document.createElement("button");el.type="button";el.className="mgslot"+(locked[k]?" lock":"");el.textContent=txt;el.style.fontSize=w.s.length>=6?"13px":w.s.length===5?"16px":"19px";
    el.onclick=()=>{if(phase!=="play"||locked[k]||!placed[k])return;queue.push(placed[k]);placed[k]=null;SFX.back();slots()};box.appendChild(el);slotEls.push(el)});
  $("#mgOk").style.opacity=placed.indexOf(null)<0?1:.5}
function particles(x,y,col,n,spread,host,fixed){for(let i=0;i<n;i++){const s=document.createElement("span");s.className="mgpt";if(fixed){s.style.position="fixed";s.style.zIndex=61}
  s.style.background=i%3?col:"#fff";s.style.boxShadow="0 0 8px "+col;host.appendChild(s);const a=i/n*2*Math.PI+Math.random()*.5,d=spread*(.6+Math.random()*.7),sz=.6+Math.random()*.9;
  s.animate([{transform:"translate("+(x-4)+"px,"+(y-4)+"px) scale("+sz+")",opacity:1},{transform:"translate("+(x-4+Math.cos(a)*d)+"px,"+(y-4+Math.sin(a)*d)+"px) scale(.1)",opacity:0}],{duration:520+Math.random()*260,easing:"cubic-bezier(.15,.7,.3,1)"}).onfinish=()=>s.remove()}}
function canPlay(){if(!G||G.done)return false;if(G.solo)return true;const s=mySeat();return s!==null&&!isOut(s)&&!resolved(cur,s)}
// une bulle qui entre se touche dès que son centre est dans le cadre (avant : 1 à 2 s sans réaction au premier clic)
function pick(b){if(phase!=="play"||!b.on||(b.entering&&!(b.x>0&&b.x<W&&b.y>0&&b.y<H))||!canPlay())return;const k=placed.indexOf(null);if(k<0)return;
  const r0=b.el.getBoundingClientRect(),col=getComputedStyle(b.core).getPropertyValue("--g").trim()||"#19e3ec";placed[k]=b;b.on=false;b.el.style.display="none";$("#mgMsg").textContent="";
  const ring=document.createElement("span");ring.className="mgring";ring.style.borderColor=col;ring.style.boxShadow="0 0 18px "+col;field.appendChild(ring);
  ring.animate([{transform:"translate("+(b.x-R)+"px,"+(b.y-R)+"px) scale(.8)",opacity:1},{transform:"translate("+(b.x-R)+"px,"+(b.y-R)+"px) scale(2)",opacity:0}],{duration:420,easing:"ease-out"}).onfinish=()=>ring.remove();
  particles(b.x,b.y,col,14,70,field,false);slots();const tgt=slotEls[k],tr=tgt.getBoundingClientRect();tgt.style.visibility="hidden";
  const fly=document.createElement("div");fly.className="mgfly";fly.innerHTML='<span class="'+b.core.className.replace(" hit","")+'"><span>'+esc(b.t)+"</span></span>";document.body.appendChild(fly);
  const x1=tr.left+tr.width/2-36,y1=tr.top+tr.height/2-36,xm=(r0.left+x1)/2,ym=Math.min(r0.top,y1)-30;
  fly.animate([{transform:"translate("+r0.left+"px,"+r0.top+"px) scale(1)"},{transform:"translate("+r0.left+"px,"+r0.top+"px) scale(1.3)",offset:.15},{transform:"translate("+xm+"px,"+ym+"px) scale(.95) rotate(180deg)",offset:.55},{transform:"translate("+x1+"px,"+y1+"px) scale(.6) rotate(360deg)",opacity:.9}],{duration:560,easing:"cubic-bezier(.4,.1,.3,1)"}).onfinish=()=>{
    fly.remove();tgt.style.visibility="";tgt.classList.add("land");particles(tr.left+tr.width/2,tr.top+tr.height/2,col,8,34,document.body,true)};
  SFX.pop(k)}
function leftNow(){return t0==null?TIME:Math.max(0,TIME-(performance.now()-t0)/1000)}
function validate(){const w=word(cur);if(phase!=="play"||!canPlay()||placed.indexOf(null)>=0)return;const s=G.solo?0:mySeat();
  const good=placed.map((b,k)=>b.t===w.s[k]),newly=good.filter((g,k)=>g&&!locked[k]).length;
  if(good.every(Boolean)){const left=leftNow(),base=Math.round(w.s.length*10*w.rar),bonus=Math.round(10*left/TIME),pts=base+bonus+newly;
    phase="ok";boxState("ok");SFX.ok();const br=$("#mgBox").getBoundingClientRect();particles(br.left+br.width/2,br.top+br.height/2,"#3ddc97",26,140,document.body,true);
    const l={base,bonus,good:newly,pts,first:0};
    if(G.solo){G.players[0].score+=pts;G.found=(G.found||0)+1;save();showRes(true,l);render();return}
    sentF=true;patch("f",fKey(cur,s),{t:Date.now(),p:pts},{ifAbsent:true,score:{i:s,add:pts}}).then(()=>patch("fb",cur,s,{ifAbsent:true})).then(()=>{l.first=5;l.pts+=5;showRes(true,l);return patch("fs",cur,s,{score:{i:s,add:5}})}).catch(()=>{});
    showRes(true,l);return}
  placed=placed.map((b,k)=>{if(good[k])return b;queue.push(b);return null});locked=good.map((g,k)=>g||locked[k]);
  const add=newly-5;if(G.solo){G.players[0].score+=add;save();render()}else patch("e",fKey(cur,s)+"_"+(++errN),1,{score:{i:s,add}}).catch(()=>{});
  SFX.bad();if(newly)setTimeout(SFX.lock,450);const m=$("#mgMsg");m.textContent=(newly?"+"+newly+" bien placée"+(newly>1?"s":"")+" · ":"")+"−5";m.style.color="#ff8fa3";
  const bx=$("#mgBox");boxState("");void bx.offsetWidth;boxState("ko");field.classList.add("flash");phase="ko";koT=performance.now()+650;slots()}
function passWord(){if(phase!=="play"||!canPlay())return;if(G.solo){finishSolo("Mot passé");return}const s=mySeat();phase="timeout";patch("p",fKey(cur,s),1).catch(()=>{});slots();showRes(false,null,"Mot passé")}
function finishSolo(why){phase="timeout";SFX.time();slots();showRes(false,null,why)}
function showRes(ok,l,why){balls.forEach(b=>b.el.style.display="none");ent=null;bursts.forEach(u=>u.el.style.opacity=0);$("#mgBtns").classList.add("off");
  const w=word(cur),r=$("#mgRes"),col=ok?"#3ddc97":"#ffc857",last=cur===G.words.length-1;
  r.innerHTML='<div class="ttl" style="color:'+col+'">'+(ok?"Bien joué !":esc(why||""))+'</div><div class="wd" style="text-shadow:0 0 14px '+col+'">'+esc(w.word)+'</div><div class="def">'+esc(w.def)+"</div>"+
    (ok?'<div class="rows"><div><span>'+(w.math?"Calcul niveau "+w.tier+" × 10 × ":w.s.length+" syllabes × 10 × ")+String(w.rar).replace(".",",")+'</span><b>'+l.base+'</b></div><div><span>'+(w.math?"Bonne réponse":"Syllabes bien placées")+'</span><b>+'+l.good+'</b></div><div><span>Bonus vitesse</span><b>+'+l.bonus+"</b></div>"+(l.first?'<div><span>Premier à trouver</span><b>+5</b></div>':"")+'<div class="tot"><span>Total</span><b>+'+l.pts+"</b></div></div>":"")+
    (G.solo?'<button class="btn primary" id="mgNext" type="button">'+(last?"Voir le score":"Mot suivant")+"</button>":'<div class="cd" id="mgCd"><span class="w">En attente des autres joueurs…</span><span class="n"></span><i></i></div>');
  r.style.display="flex";if(G.solo)$("#mgNext").onclick=nextSolo}
function nextSolo(){if(cur>=G.words.length-1){G.done=true;G.ended=Date.now();save();render();return}G.i=cur+1;save();setupWord(G.i);t0=null}

/* ---------- multijoueur hors salon (26/11) : table rejointe, robot, défi différé ---------- */
// table hors salon (partie rapide, invitation) : l'adversaire prépare la partie, on l'attend ici (20 s au plus)
function tableWait(){mjReady(()=>MJ.tableWait(()=>{const d=docs[DOC];if(!G&&d&&d.players&&!d.solo)open(d);return !!G},m=>{$("#endT").textContent="Ton adversaire n'est pas arrivé";$("#endB").textContent="Reviens à l'accueil et relance une partie rapide."}))}
// robot de secours : partie sur cet appareil, Robot Pop trouve certains mots au bout d'un moment (rien n'est envoyé sauf le score final, compté comme en solo)
const BOT={facile:{p:.6,a:.5,b:.95},normal:{p:.7,a:.4,b:.9},difficile:{p:.8,a:.3,b:.8}};let botW=null;
function botStart(lvl){const g=newGame([ME?ME.name:"Toi","Robot Pop"],true,lvl);g.bot=1;open(g);toast("🤖","Partie contre <b>Robot Pop</b> : trouve chaque mot avant lui !")}
function botCheck(){const c=BOT[G.level]||BOT.facile;if(!botW||botW.k!==cur+":"+G.gid)botW={k:cur+":"+G.gid,at:Math.random()<c.p?TIME*(c.a+Math.random()*(c.b-c.a)):null};
  if(botW.at==null||TIME-leftNow()<botW.at)return;const w=word(cur);G.players[1].score+=Math.round(w.s.length*10*w.rar)+Math.round(10*leftNow()/TIME);
  phase="timeout";SFX.time();slots();showRes(false,null,"🤖 Robot Pop a trouvé !");render()}
// défi différé : mêmes mots (graine + liste), chacun joue quand il veut, les scores sont comparés
const DUELT={facile:"Facile",normal:"Normal",difficile:"Difficile"};
// le code commun (MJ, outils/site/mj.js) arrive juste après la page
const mjReady=f=>{(function w(){window.MJ?f():setTimeout(w,30)})()};
const api2=(u,b)=>new Promise(ok=>mjReady(()=>MJ.api(u,b).then(ok)));
function duelBoot(id){api2("/api/duel/get",{id}).then(r=>{const o=r&&r.duel;const m=o&&String(o.ref).match(/^(\d{1,10})\|([A-Za-z0-9,]{1,300})$/);
  if(!o||o.game!==GAME||!m||!LVLN[o.level]){document.body.classList.remove("booting");$("#endT").textContent="Ce défi n'existe plus";$("#endB").innerHTML="Il est peut-être trop ancien (30 jours).";$("#endWin").classList.add("on");return}
  const g=newGame([ME?ME.name:"Toi"],true,o.level);g.seed=+m[1];g.words=m[2].split(",").map(x=>/^\d+$/.test(x)?+x:x);g.duel=o.id;g.duelBy=o.by;open(g);
  toast("⚔️","Défi de <b>"+esc(o.by)+"</b> · "+(o.res.length?"meilleur score : <b>"+Math.max(...o.res.map(x=>x.s))+"</b>":"à toi de jouer"))})}
function duelEnd(){if(!G||!G.solo||G.bot||G.duelSent)return;G.duelSent=1;const sc=Number(G.players[0].score)||0,secs=Math.round(((G.ended||Date.now())-G.started)/1000);
  if(G.duel)api2("/api/duel/res",{id:G.duel,score:sc,secs}).then(r=>{if(r&&r.duel){G.duelRes=r.duel;duelPaint()}});else if(G.duelNew)duelNew()}
function duelNew(){const b=$("#endDuel");if(b){b.disabled=true;b.textContent="Préparation du défi…"}const sc=Number(G.players[0].score)||0,secs=Math.round(((G.ended||Date.now())-G.started)/1000);
  api2("/api/duel/new",{game:GAME,ref:G.seed+"|"+G.words.join(","),level:G.level,score:sc,secs}).then(r=>{if(b){b.disabled=false;b.textContent="⚔️ Défier un proche sur ces mots"}
    if(!r||!r.id){toast("⚠️","Impossible de créer le défi. Réessaie.");return}G.duel=r.id;G.duelRes={by:ME?ME.name:"Toi",res:[{n:ME?ME.name:"Toi",s:sc,t:secs}]};G.duelMine=1;if(b)b.style.display="none";duelPaint()})}
function duelPaint(){if(!G||!G.duel||!G.done||!window.MJ)return;const o=G.duelRes||{res:[]},txt=G.duelMine?"J'ai fait "+G.players[0].score+" points à Magnético ("+DUELT[G.level]+"). Tu fais mieux sur les mêmes mots ? ":"Moi aussi j'ai relevé ce défi Magnético. À ton tour : ";MJ.duelPaint({id:G.duel,res:o.res,mine:G.duelMine,by:G.duelBy||o.by,txt})}
function duelStart(lvl){const g=newGame([ME?ME.name:"Toi"],true,lvl);g.duelNew=1;open(g);toast("⏳","Défi différé : finis la partie, puis envoie-la à un proche.")}
window.FLMJ={playing:()=>!!(G&&!G.done&&!G.wait),robot:lvl=>botStart(lvl),duel:lvl=>duelStart(lvl),busy:()=>!!(G&&!G.solo&&!G.done)};
/* ---------- boucle d'animation ---------- */
let lt=performance.now();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(2,(now-lt)/16.67);lt=now;if(!G||G.wait||G.done)return;
  if(G.solo)return soloFrame(now,dt);
  const S=sched(Date.now());if(S.ph==="end"){endMulti();return}
  if(S.i!==cur){setupWord(S.i,now-(Date.now()-S.start));t0=null;
    // arrivée en cours de mot : les syllabes déjà lancées sont posées directement
    const late=Math.floor((Date.now()-S.start)/GAP);for(let j=0;j<Math.min(late,queue.length);j++)placeNow(queue[j]);queue=queue.slice(Math.min(late,queue.length))}
  const me=mySeat();
  if(S.ph==="entry"||S.ph==="play"){if(S.ph==="play"&&t0==null)t0=now-(Date.now()-S.c0);
    if(phase==="play"||phase==="ko"){if(!ent&&queue.length&&now-(wStart+(balls.length-queue.length)*GAP)>=0)startEntry(queue.shift(),now);updEntry(dt);step(dt,now);draw(now);
      if(phase==="ko"&&now>koT){phase="play";boxState("");field.classList.remove("flash")}}
    bar(S.ph==="play"?(S.c1-Date.now())/1000:TIME);
    // tout le monde a trouvé ou passé : le mot se ferme pour tous
    if(S.ph==="play"&&!(G.cut&&G.cut[S.i])&&active().every(i=>resolved(S.i,i)))patch("cut",S.i,Date.now(),{ifAbsent:true}).catch(()=>{})}
  else if(S.ph==="res"){bar(0);if(phase==="play"||phase==="ko"){SFX.time();phase="timeout";slots();showRes(false,null,me===null?"Solution":"Temps écoulé")}
    const cd=$("#mgCd");if(cd){const left=Math.max(0,(S.nx-Date.now())/1000);cd.querySelector(".w").textContent="";cd.querySelector(".n").textContent=(S.i===G.words.length-1?"Classement final":"Mot suivant")+" dans "+Math.ceil(left)+" s";cd.querySelector("i").style.width=(left/NEXT*100)+"%"}}
  if(active().length<2&&!G.done)endMulti()}
function soloFrame(now,dt){if(cur!==G.i){setupWord(G.i,now);t0=null}
  if(phase==="play"||phase==="ko"){if(!ent&&queue.length&&now-(wStart+(balls.length-queue.length)*GAP)>=0)startEntry(queue.shift(),now);
    if(!ent&&!queue.length&&t0==null)t0=now;updEntry(dt);step(dt,now);draw(now);if(phase==="ko"&&now>koT){phase="play";boxState("");field.classList.remove("flash")}
    bar(leftNow());if(t0!=null&&phase==="play"&&leftNow()<=0)finishSolo("Temps écoulé");else if(G.bot&&t0!=null&&phase==="play")botCheck()}}
function endMulti(){if(G.done)return;if(endMulti.g===G.gid&&Date.now()-endMulti.t<4000)return;endMulti.g=G.gid;endMulti.t=Date.now();
  patch("z","end",1,{ifAbsent:true,extra:{done:true,ended:Date.now()}}).catch(()=>{})}

/* ---------- affichage ---------- */
let shownEnd=null;
function rankBar(){const box=$("#mgRank");if((G.solo&&!G.bot)||np()<2)return;const w=(box.clientWidth-18)/4;
  let els=box._els;if(!els||els.gid!==G.gid||els.n!==G.players.length){box.querySelectorAll(".mgpc").forEach(e=>e.remove());els=G.players.map((p,i)=>{const e=document.createElement("div");e.className="mgpc";e.style.borderColor=PCOL[i];e.style.background=PBG[i];e.innerHTML='<span class="mgn" style="color:'+PCOL[i]+'"></span><span class="mgs"></span><span class="mgt"></span>';box.appendChild(e);return e});els.gid=G.gid;els.n=G.players.length;box._els=els;box._rk=null}
  const me=mySeat(),order=G.players.map((p,i)=>i).sort((a,b)=>(isOut(a)-isOut(b))||((G.players[b].score||0)-(G.players[a].score||0))||a-b);let jumped=false;const prev=box._rk||{};
  order.forEach((i,r)=>{const e=els[i],p=G.players[i];if(prev[i]!=null&&r<prev[i]){e.classList.remove("leap");void e.offsetWidth;e.classList.add("leap");jumped=true}
    const sc=String(p.score||0);if(e.querySelector(".mgs").textContent!==sc&&e.querySelector(".mgs").textContent!==""){e.classList.remove("gain");void e.offsetWidth;e.classList.add("gain")}
    e.style.width=w+"px";e.style.left=(r*(w+6))+"px";e.classList.toggle("me",i===me);e.classList.toggle("out",isOut(i));e.querySelector(".mgn").textContent=p.name+(i===me?" · toi":"");e.querySelector(".mgs").textContent=sc;
    e.querySelector(".mgt").textContent=isOut(i)?"sorti":G.wait?"":G.f&&G.f[fKey(cur,i)]?"trouvé ✓":G.p&&G.p[fKey(cur,i)]?"a passé":"cherche…";prev[i]=r});
  box._rk=prev;$("#mgStar").style.left=(w/2-9)+"px";if(jumped&&!G.wait)SFX.over()}
let rivals={};
function render(){document.body.classList.remove("booting");if(!G)return;const s=mySeat();
  $(".gname").innerHTML='<span style="background:linear-gradient(90deg,#a78bfa,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent">Magnético</span> '+(G.bot?"contre le robot":G.solo?"Solo":np()>2?np()+" joueurs":"Duo")+' <span class="hpill">'+LVLN[G.level]+"</span>";
  $(".mg2").classList.toggle("multi",(!G.solo||G.bot)&&np()>=2);$(".mg2").classList.toggle("waiting",!!G.wait&&!G.solo);$("#mgScore").textContent=G.players[s===null?0:s]?G.players[s===null?0:s].score||0:0;rankBar();
  if(!G.solo&&cur>=0&&G.f){Object.keys(G.f).forEach(k=>{if(!rivals[G.gid+k]){rivals[G.gid+k]=1;const [w,i]=k.split("_").map(Number);if(w===cur&&i!==s)SFX.rival()}})}
  let sp=$("#mgSpec");const spec=!G.solo&&!G.done&&s===null&&(!G.wait||G.players.length>=MAXP);if(spec&&!sp){sp=document.createElement("div");sp.id="mgSpec";sp.className="glass mgspec";$(".mg2").prepend(sp)}if(sp){sp.style.display=spec?"":"none";if(spec)sp.innerHTML="<b>"+(G.wait?"Partie complète":"Partie déjà lancée")+" · tu regardes.</b> Reste sur la page : tu joueras la prochaine partie s'il reste une place."}
  if(G.done&&shownEnd!==G.gid){shownEnd=G.gid;markPlayed();scoreSrv();if(!G.solo)tally();if(G.duel||G.duelNew)setTimeout(duelEnd,50);const r=G.players.map((p,i)=>({p,i})).sort((a,b)=>(isOut(a.i)-isOut(b.i))||(b.p.score-a.p.score));
    balls.forEach(b=>b.el.style.display="none");$("#mgRes").style.display="none";
    $("#endT").textContent=G.bot?"🏆 "+(r[0].i===0?"Tu bats le robot !":"Robot Pop gagne !"):G.solo?"Partie terminée : "+(G.players[0].score||0)+" points":"🏆 "+(r[0].i===s?"Tu gagnes !":r[0].p.name+" gagne !");
    $("#endB").innerHTML=(G.solo&&!G.bot?"<div class='note'>"+(G.found||0)+" mots trouvés sur "+G.words.length+"</div>":r.map(({p,i},k)=>'<div class="endrow"><b class="rk">'+(k+1)+'</b><span class="pi" style="background:'+PCOL[i]+';color:#0b1d2a">'+esc(p.name[0])+"</span><b>"+esc(p.name)+(isOut(i)?" (sorti)":"")+'</b><span class="sv">'+(isOut(i)?0:(Number(p.score)||0))+"</span></div>").join(""));
    const dz=$("#endDuel");if(dz)dz.style.display=G.solo&&!G.bot&&!G.duel&&!G.duelNew?"":"none";endSound();$("#endWin").classList.add("on");duelPaint()}
  tick()}
let cdShown="";
function tick(){if(!G)return;const now=Date.now();if(!G.solo&&!G.done){waitCheck();lostCheck()}
  const wb=$("#waitBox"),cd=$("#count");if(G.solo||G.done){wb.style.display="none";cd.classList.remove("on");tj();return}
  if(G.wait){wb.style.display="";lobby()}else wb.style.display="none";
  if(G.go&&now<G.go+1200){cd.classList.add("on");const left=Math.ceil((G.go-now)/1000);const k=left>0?String(Math.min(5,left)):"go";if(cdShown!==k){cdShown=k;const n=$("#countN");n.className=k==="go"?"go":"";void n.offsetWidth;n.textContent=k==="go"?"C'est parti !":k;tone(k==="go"?880:520,.15,"sine",.12)}}else cd.classList.remove("on");
  tj()}
function lobby(){const here=seatsHere(),me=mySeat(),pres=presentSeats();$("#waitTxt").textContent="Salle d'attente · "+G.players.length+" / "+MAXP;
  let L=$("#lobbyList");if(!L){L=document.createElement("div");L.id="lobbyList";L.className="lobby";const t=$("#waitTxt");t.parentNode.insertBefore(L,t.nextSibling);
    const b=document.createElement("button");b.id="launchBtn";b.className="btn primary";b.onclick=launchNow;L.parentNode.insertBefore(b,L.nextSibling)}
  const sig=JSON.stringify([G.players.map(p=>p.name),[...here],me]);if(L.dataset.sig!==sig){L.dataset.sig=sig;
    L.innerHTML=G.players.map((p,i)=>'<div class="lrow'+(here.has(i)?"":" off")+'"><span class="pi" style="background:'+PCOL[i]+'">'+esc((p.name||"?")[0])+"</span><b>"+esc(p.name)+(i===me?" · toi":"")+'</b><span class="ls">'+(p.name==="Invité"?"place libre":here.has(i)?"présent":"en route…")+"</span></div>").join("")
      +(G.players.length<MAXP?'<div class="lrow free"><span class="pi">+</span><b>Place libre</b><span class="ls">'+(MAXP-G.players.length)+" restante"+(MAXP-G.players.length>1?"s":"")+"</span></div>":"")}
  const b=$("#launchBtn");b.style.display=me===null?"none":"";b.disabled=pres.length<2;b.textContent=pres.length<2?"En attente d'un 2e joueur…":"Lancer la partie · "+pres.length+" joueurs";
  const nt=$("#waitBox .note");if(nt)nt.textContent=me===null?"La partie est complète : tu regardes.":"Jusqu'à "+MAXP+" joueurs. N'importe quel joueur présent peut lancer."}
setInterval(()=>{if(G)tick()},500);
function tjOn(){return matchMedia("(pointer:coarse)").matches&&innerWidth<=620}
function tj(){const on=tjOn()&&G&&!G.done&&(G.solo||!G.wait);document.body.classList.toggle("tj",!!on)}
function endSound(){const s=G.solo?0:mySeat();const best=Math.max(...G.players.map(p=>p.score||0));const win=G.solo||s===null||(G.players[s]&&(G.players[s].score||0)>=best);
  if(win){[523,659,784,1046].forEach((f,i)=>tone(f,.3,"triangle",.15,0,i*.12));[784,988,1175,1568].forEach((f,i)=>tone(f,.35,"sine",.1,0,.55+i*.07))}else{[659,587,523,440].forEach((f,i)=>tone(f,.35,"sine",.11,0,i*.16))}}
function tally(){send({t:"tally",gid:G.gid,game:GAME,results:G.players.map((p,i)=>({name:p.name,score:isOut(i)?0:p.score}))})}
function scoreSrv(){try{if(!ME||!ME.token)return;const i=G.solo?0:mySeat();const k="fl-sc-mg"+G.gid;if(i===null||LS.get(k))return;LS.set(k,"1");
  fetch("/api/p/score",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:ME.name,token:ME.token,game:GAME,gid:String(G.gid),pts:G.players[i].score,solo:!!G.solo,level:G.level,started:G.started})}).then(r=>r.json()).then(r=>{const b=document.getElementById("endB");if(!b||!r||!r.ok||!(r.add>0)||!r.pts||document.getElementById("mgScoreNote"))return;b.insertAdjacentHTML("beforeend",'<div id="mgScoreNote" class="note" style="margin-top:8px"><b>+'+String(r.add).replace(".",",")+"</b> au score Motipop : <b>"+Math.floor(r.pts.tot)+"</b> / 2 500.</div>")}).catch(()=>{})}catch(e){}}
function soloTicket(){if(!G||!G.solo||!ME||!ME.token)return;fetch("/api/p/solo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:ME.name,token:ME.token,game:GAME,op:"put",doc:{gid:G.gid,solo:true,done:false,level:G.level}})}).catch(()=>{})}

/* ---------- commandes ---------- */
$("#mgOk").onclick=validate;$("#mgPass").onclick=passWord;
$("#mgClear").onclick=()=>{if(phase!=="play")return;let n=0;placed=placed.map((b,k)=>{if(b&&!locked[k]){queue.push(b);n++;return null}return b});if(n)SFX.back();slots()};
$(".homebtn").onclick=()=>{if(!G||G.done||G.bot||mySeat()===null){location.href=HOME;return}$("#lvQuit").textContent=G.solo?"Annuler la partie":"Quitter la partie (0 point)";$("#leave").classList.add("on")};
$("#lvQuit").onclick=()=>{const solo=!!(G&&G.solo);quitGame();setTimeout(()=>location.href=solo?"/":HOME,350)};$("#lvStay").onclick=()=>$("#leave").classList.remove("on");
$("#endHome").onclick=()=>{location.href=HOME};$("#endDuel").onclick=()=>{if(G&&G.solo&&G.done&&!G.bot)duelNew()};$("#endAgain").onclick=e=>{if(e.target.closest("[data-lv]"))return;$("#endWin").classList.remove("on");again()};document.querySelectorAll("#endAgain [data-lv]").forEach(b=>b.onclick=e=>{e.stopPropagation();$("#endWin").classList.remove("on");again(b.dataset.lv)});new MutationObserver(()=>{if($("#endWin").classList.contains("on")&&G)document.querySelectorAll("#endAgain [data-lv]").forEach(b=>b.classList.toggle("on",b.dataset.lv===G.level))}).observe($("#endWin"),{attributes:true,attributeFilter:["class"]});

/* ---------- lancement ---------- */
function newGame(names,isSolo,level){const seed=Math.floor(Math.random()*2147483646)+1;level=LVLN[level]?level:"facile";
  return{gid:Math.random().toString(36).slice(2,10),game:GAME,solo:isSolo,level,seed,words:pickWords(level,seed,isSolo),i:0,started:Date.now(),players:names.map(x=>({name:x,score:0})),found:0,done:false,wait:!isSolo,f:{},p:{},cut:{},out:{}}}
function open(g){G=g;cur=-1;phase="idle";balls.forEach(b=>b.el.remove());balls=[];$("#mgRes").style.display="none";$("#endWin").classList.remove("on");
  if(!G.solo){joinWait()}else soloTicket();render();announce();history.replaceState(null,"",location.pathname)}
function again(lv){const o=G,LVL=lv||G.level;if(o.bot){botStart(LVL);return}if(o.solo){open(newGame(o.players.map(p=>p.name),true,LVL));save();return}
  const ng=newGame(o.players.filter((p,i)=>!isOut(i)).map(p=>p.name),false,LVL);ng.prev=o.gid;open(ng);save()}
// une partie du salon encore active n'est jamais écrasée par « Jouer » : on la rejoint ou on la regarde
function live(d){return !!(d&&!d.done&&!d.solo&&d.players&&Date.now()-Math.max(d.go||0,d.started||0)<15*60e3)}
function boot(){const go=Q.get("go"),lvl=Q.get("lvl")||"facile";
  if(Q.get("duel")){duelBoot(Q.get("duel"));return}
  if(go==="solo"||!CODE){open(newGame([ME?ME.name:"Toi"],true,lvl));save();return}
  if(!ME){if(Q.get("k")||go==="join"){/* 26/11 : sans compte, on entre à la table comme invité (INVITE + chiffres) */fetch("/api/p/guest",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}).then(r=>r.json()).then(r=>{if(!r||!r.token)throw 0;localStorage.setItem("fl-me",JSON.stringify({name:r.name,token:r.token,guest:1}));location.reload()}).catch(()=>{try{sessionStorage.setItem("fl-back",location.pathname+location.search)}catch(e){}location.replace("/?need=pseudo")});return}location.replace(HOME+"?need=pseudo");return}
  connect();const t0_=Date.now();const iv=setInterval(()=>{if(G){clearInterval(iv);return}if(window.__snapped||Object.keys(docs).length||Date.now()-t0_>2500){clearInterval(iv);const d=docs[DOC];
    if(go==="multi"&&!live(d)){let opp=Q.get("opp")||"Invité";if(opp.toUpperCase()===ME.name)opp="Invité";open(newGame([ME.name,opp],false,lvl));save();return}
    if(d&&d.players&&!d.solo){open(d);return}if(go==="join"||Q.get("k")){tableWait();return}location.replace(HOME)}},100)}
function start(){if(window.MG_MOTS)return boot();const t=setInterval(()=>{if(window.MG_MOTS){clearInterval(t);boot()}},50)}
// accès réservé aux tests automatiques sur la copie locale (jamais sur le site en ligne)
window.__mgOn=()=>({R,balls:balls.filter(b=>b.on&&!b.entering)});
let lastPass=0;window.__mgFx=(r,v,x,y)=>{const now=performance.now();if(now-lastPass<70)return;lastPass=now;SFX.pass(r,v);const bb=bursts.reduce((m,z)=>z.t<m.t?z:m);bb.t=now;bb.x=x;bb.y=y};   // son + petite étincelle au choc d'une bulle de passage   // pour les bulles de passage (chocs)
if(location.hostname==="localhost")window.__t=c=>eval(c);
requestAnimationFrame(loop);start();
})();

/* ---------- bulles de passage (20/11, demande de Juvenal) : 2 à 5 petites bulles sans syllabe traversent la zone ;
   elles COGNENT les syllabes (et entre elles) en rebondissant, mais aux bords du cadre elles sortent et ne reviennent pas ---------- */
(function(){const F=document.getElementById("mgField");if(!F)return;const calm=matchMedia("(prefers-reduced-motion:reduce)").matches;
  const COL=["#19e3ec","#c4a2ff","#ffd166","#ff8cc0","#7cf3ff"],pool=[];let want=2+Math.floor(Math.random()*4),nextAt=0,last=performance.now();
  for(let i=0;i<5;i++){const e=document.createElement("span");e.className="mgpass";e.setAttribute("aria-hidden","true");F.insertBefore(e,F.firstChild);pool.push({e,on:false})}
  function spawn(){const p=pool.find(x=>!x.on);if(!p)return;const w=F.clientWidth,h=F.clientHeight;if(w<60||h<60)return;
    const r=12+Math.random()*14,side=Math.floor(Math.random()*4),sp=(calm?.5:.9)+Math.random()*1.2;let x,y,tx,ty;
    if(side===0){x=-r;y=r+Math.random()*(h-2*r);tx=w;ty=Math.random()*h}else if(side===1){x=w+r;y=r+Math.random()*(h-2*r);tx=0;ty=Math.random()*h}
    else if(side===2){x=r+Math.random()*(w-2*r);y=-r;tx=Math.random()*w;ty=h}else{x=r+Math.random()*(w-2*r);y=h+r;tx=Math.random()*w;ty=0}
    const d=Math.hypot(tx-x,ty-y)||1;Object.assign(p,{on:true,x,y,vx:(tx-x)/d*sp,vy:(ty-y)/d*sp,r,inside:false,born:performance.now()});
    p.e.style.width=p.e.style.height=2*r+"px";p.e.style.setProperty("--g",COL[Math.floor(Math.random()*COL.length)]);p.e.style.opacity=.7}
  // choc élastique entre deux disques de masses proportionnelles à leur surface
  function hit(a,b,ra,rb,ma,mb){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=ra+rb||d<.01)return false;const nx=dx/d,ny=dy/d,rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
    const ov=ra+rb-d,ta=mb/(ma+mb),tb=ma/(ma+mb);a.x-=nx*ov*ta;a.y-=ny*ov*ta;b.x+=nx*ov*tb;b.y+=ny*ov*tb;if(rel<=0)return false;
    const j=2*rel/(ma+mb);a.vx-=j*mb*nx;a.vy-=j*mb*ny;b.vx+=j*ma*nx;b.vy+=j*ma*ny;return true}
  function frame(now){requestAnimationFrame(frame);const dt=Math.min(3,(now-last)/16.67);last=now;if(document.hidden)return;const w=F.clientWidth,h=F.clientHeight;
    const act=pool.filter(p=>p.on);if(now>=nextAt&&act.length<want){spawn();nextAt=now+900+Math.random()*2600;if(Math.random()<.25)want=2+Math.floor(Math.random()*4)}
    const S=window.__mgOn?window.__mgOn():{R:36,balls:[]};
    act.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;
      // chocs avec les syllabes : la petite bulle rebondit, la syllabe reçoit une petite poussée (masse plus forte)
      S.balls.forEach(b=>{const vr=Math.hypot(p.vx-b.vx,p.vy-b.vy);if(hit(p,b,p.r,S.R,p.r*p.r,S.R*S.R)){window.__mgPassHits=(window.__mgPassHits||0)+1;if(window.__mgFx){const d=Math.hypot(b.x-p.x,b.y-p.y)||1;window.__mgFx(p.r,Math.min(2,vr),p.x+(b.x-p.x)/d*p.r,p.y+(b.y-p.y)/d*p.r)}if(b.core){b.core.classList.remove("hit");void b.core.offsetWidth;b.core.classList.add("hit")}}});
      // la vitesse reste vive après un choc
      const sp=Math.hypot(p.vx,p.vy);if(sp<.7){p.vx*=.7/(sp||1);p.vy*=.7/(sp||1)}else if(sp>2.6){p.vx*=2.6/sp;p.vy*=2.6/sp}});
    for(let i=0;i<act.length;i++)for(let k=i+1;k<act.length;k++){const A=act[i],B=act[k],vr=Math.hypot(A.vx-B.vx,A.vy-B.vy);if(hit(A,B,A.r,B.r,A.r*A.r,B.r*B.r)&&window.__mgFx)window.__mgFx(Math.min(A.r,B.r),Math.min(2,vr),(A.x+B.x)/2,(A.y+B.y)/2)}
    act.forEach(p=>{const out=p.x<-p.r-2||p.x>w+p.r+2||p.y<-p.r-2||p.y>h+p.r+2;   // aux bords : elle sort, sans rebond, et ne revient pas
      if(out&&(p.inside||now-p.born>4000)){p.on=false;p.e.style.opacity=0;return}if(!out&&p.x>p.r&&p.x<w-p.r&&p.y>p.r&&p.y<h-p.r)p.inside=true;
      p.e.style.transform="translate("+(p.x-p.r).toFixed(1)+"px,"+(p.y-p.r).toFixed(1)+"px)"})}
  requestAnimationFrame(frame)})();
