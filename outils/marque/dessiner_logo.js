const opentype=require("opentype.js"),fs=require("fs");
const b=fs.readFileSync("node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff");const font=opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));
const ICON=process.argv[2]==="icon";const WORD=["M","o","t","i","p","o","p"];const L=ICON?["M"]:WORD,S=118,rot=ICON?[-6]:[-7,4,-3,5,-6,3,-4],dy=ICON?[0]:[4,-6,2,-4,6,-3,3],step=112;
const W=ICON?S+60:step*(L.length-1)+S+60,H=S+70;
let back="",tiles="",per=[];
L.forEach((ch,i)=>{const cx=30+S/2+i*step,cy=H/2+dy[i]-4;const tf=`rotate(${rot[i]} ${cx} ${cy})`;
  const x=cx-S/2,y=cy-S/2;
  const rim=`<rect x="${x-7}" y="${y-7}" width="${S+14}" height="${S+20}" rx="26" transform="${tf}"/>`;back+=rim;
  // lettre centrée
  const size=ch===ch.toUpperCase()?92:100;const p=font.getPath(ch,0,0,size),bb=p.getBoundingBox();
  const lw=bb.x2-bb.x1,lh=bb.y2-bb.y1;const ox=cx-lw/2-bb.x1,oy=cy-lh/2-bb.y1+2;
  const d=font.getPath(ch,ox,oy,size).toPathData(2);
  const one=`<g transform="${tf}">
   <rect x="${x}" y="${y+8}" width="${S}" height="${S}" rx="20" fill="#B8894A"/>
   <rect x="${x}" y="${y}" width="${S}" height="${S}" rx="20" fill="url(#wood)"/>
   <rect x="${x+5}" y="${y+4}" width="${S-10}" height="${S*0.42}" rx="16" fill="#fff" opacity=".22"/>
   <path d="${d}" fill="#6b4a20" opacity=".5" transform="translate(0 -2)"/>
   <path d="${d}" fill="#fff" opacity=".55" transform="translate(0 2)"/>
   <path d="${d}" fill="url(#ink)"/>
  </g>`;per.push(`<g class="t" style="animation-delay:${(i*0.14).toFixed(2)}s"><g fill="url(#rim)" opacity=".55" filter="url(#glow)">${rim}</g><g fill="#fff" fill-opacity=".14" stroke="url(#rim)" stroke-width="3.5">${rim}</g><g fill="url(#gl)">${rim}</g>${one}</g>`);});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Motipop">
<defs>
<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE9C2"/><stop offset="1" stop-color="#E9C688"/></linearGradient>
<linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#11857F"/><stop offset=".55" stop-color="#2E4F9C"/><stop offset="1" stop-color="#5A2AA6"/></linearGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2DE2C8"/><stop offset="1" stop-color="#A26BFF"/></linearGradient>
<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="glow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<style>.t{transform-box:fill-box;transform-origin:50% 60%;animation:tw 2.6s ease-in-out infinite}
@keyframes tw{0%,100%{transform:translate(0,0) rotate(0)}20%{transform:translate(-3px,-5px) rotate(-3deg)}40%{transform:translate(3px,0) rotate(2deg)}60%{transform:translate(0,0) rotate(0)}}
@media (prefers-reduced-motion:reduce){.t{animation:none}}</style>
${per.join("")}</svg>`;
fs.writeFileSync(ICON?"/home/claude/brand/tuilo-icon.svg":"/home/claude/brand/tuilo-logo.svg",ICON?svg.replace(/viewBox="[^"]+"/,`viewBox="-2 -6 ${S+64} ${S+64}"`):svg);console.log(W,H,svg.length);
