// ---------- carte de partage (texte en mosaïque + image) ----------
// opts : {game, title, subtitle, result, players:[{name,score,col}], rows:[[code]], round:false, link, extra}
// codes de case : 0..3 = joueur, "r" = révélé, "c" = case définition, "e" = vide
const SH_EMO=["🟦","🟧","🟩","🟪"],SH_EMO_R=["🔵","🟠","🟢","🟣"],SH_HEX=["#5ad8ff","#ffa45c","#7cf0a9","#c49bff"];
function shareMosaic(o){const solo=o.players.length===1;
  return o.rows.map(r=>r.map(c=>{if(c==="c")return o.round?"":"⬛";if(c==="r")return o.round?"⚪":"🟨";if(c==="e")return o.round?"⚫":"⬜";return solo?(o.round?"🟢":"🟩"):(o.round?SH_EMO_R[c]:SH_EMO[c])}).join("")).join("\n")}
function shText(o){const solo=o.players.length===1;
  let t="🧩 Mots Fléchés duo"+(o.game==="Mots fléchés"?"":" · "+o.game)+"\n"+o.title+(o.subtitle?" · "+o.subtitle:"")+"\n";
  t+=(solo?"✅ "+o.result:o.players.map((p,i)=>(SH_EMO_R[i]||"")+" "+p.name+" "+p.score).join("  ")+"\n🏆 "+o.result)+"\n";
  if(o.extra)t+=o.extra+"\n";
  return t+"\n"+shareMosaic(o)+"\n\n"+o.link}
function shareImage(o){const W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#16161b");g.addColorStop(1,"#0d1f24");x.fillStyle=g;x.fillRect(0,0,W,H);
  const F=(s,w)=>(w||700)+" "+s+"px Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  const tg=x.createLinearGradient(80,0,700,0);tg.addColorStop(0,"#00ADB5");tg.addColorStop(1,"#A26BFF");
  x.fillStyle=tg;x.font=F(64,800);x.fillText("MOTS FLÉCHÉS",80,130);x.fillStyle="#8B8C99";x.font=F(64,500);x.fillText("duo",80+x.measureText("MOTS FLÉCHÉS ").width+40,130);
  x.fillStyle="#ECEDF2";x.font=F(54,800);x.fillText((o.game==="Mots fléchés"?"":o.game+" · ")+o.title,80,220);
  x.fillStyle="#8B8C99";x.font=F(38,500);if(o.subtitle)x.fillText(o.subtitle,80,275);
  // résultat
  x.fillStyle="#3ddc97";x.font=F(52,800);x.fillText((o.players.length===1?"✓ ":"🏆 ")+o.result,80,345);
  // joueurs
  let px=80;o.players.forEach((p,i)=>{const col=o.players.length===1?"#3ddc97":SH_HEX[i];x.font=F(36,700);const label=p.name+"  "+p.score;const w=x.measureText(label).width+56;
    x.fillStyle="rgba(255,255,255,.06)";shRR(x,px,380,w,64,18);x.fill();x.fillStyle=col;x.beginPath();x.arc(px+28,412,10,0,7);x.fill();x.fillText(label,px+46,425);px+=w+16});
  // mosaïque
  const R=o.rows.length,C=Math.max(...o.rows.map(r=>r.length));const top=490,bot=H-150,avail=Math.min(W-160,bot-top);const s=Math.floor(Math.min((W-160)/C,(bot-top)/R));
  const ox=(W-s*C)/2,oy=top+((bot-top)-s*R)/2;
  o.rows.forEach((row,r)=>row.forEach((c,ci)=>{const cx=ox+ci*s,cy=oy+r*s;let fill;
    if(c==="c")fill=o.round?null:"#1a2a33";else if(c==="r")fill="#5b5d6b";else if(c==="e")fill="#2a2a33";else fill=o.players.length===1?"#3ddc97":SH_HEX[c];
    if(!fill)return;x.fillStyle=fill;if(o.round){x.beginPath();x.arc(cx+s/2,cy+s/2,s*.4,0,7);x.fill()}else{shRR(x,cx+3,cy+3,s-6,s-6,Math.max(3,s*.14));x.fill()}}));
  x.fillStyle="#8B8C99";x.font=F(32,600);x.fillText(o.link.replace(/^https?:\/\//,""),80,H-70);
  x.fillStyle="#00ADB5";x.font=F(32,800);const cta="À ton tour ?";x.fillText(cta,W-80-x.measureText(cta).width,H-70);
  return new Promise(res=>cv.toBlob(b=>res({blob:b,url:cv.toDataURL("image/png")}),"image/png"))}
function shRR(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
async function openShare(o){let ov=document.getElementById("shareBox");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="shareBox";ov.className="overlay";ov.style.zIndex="70";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Partager mon résultat");
  ov.innerHTML='<div class="sheet sharesheet"><h2 style="margin:0">Partager mon résultat</h2><img alt="Carte de résultat" style="width:100%;max-height:46vh;object-fit:contain;border-radius:14px;background:#0d0d10"><pre class="sharetxt"></pre>'
    +'<div class="sharebtns"><button type="button" class="primary" data-a="share">📤 Partager</button><button type="button" data-a="wa">WhatsApp</button><button type="button" data-a="copy">Copier le texte</button><button type="button" data-a="dl">Télécharger l\'image</button></div><button type="button" data-a="close">Fermer</button></div>';
  document.body.appendChild(ov);const txt=shText(o);ov.querySelector(".sharetxt").textContent=txt;
  const img=await shareImage(o);ov.querySelector("img").src=img.url;const file=new File([img.blob],"mots-fleches-duo.png",{type:"image/png"});
  const canFiles=!!(navigator.canShare&&navigator.canShare({files:[file]}));if(!navigator.share)ov.querySelector('[data-a="share"]').hidden=true;
  ov.addEventListener("click",async e=>{const a=e.target.closest("button")?.dataset.a;if(e.target===ov||a==="close"){ov.remove();return}
    if(a==="share"){try{await navigator.share(canFiles?{files:[file],text:txt}:{text:txt})}catch(err){}}
    else if(a==="wa")window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank");
    else if(a==="copy"){try{await navigator.clipboard.writeText(txt);e.target.textContent="Copié ✓"}catch(err){prompt("Copie ce texte :",txt)}}
    else if(a==="dl"){const l=document.createElement("a");l.href=img.url;l.download="mots-fleches-duo.png";document.body.appendChild(l);l.click();l.remove()}})}
