const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const errs=[];
for(const vw of [[390,844,"mobile"],[1280,800,"pc"]]){const ctx=await b.newContext({viewport:{width:vw[0],height:vw[1]},deviceScaleFactor:vw[2]==="mobile"?2:1});
for(const [path,name] of [["/","accueil"],["/fleches?go=solo","fl"],["/rond?go=solo","rd"],["/meles?go=solo","mm"],["/culture?go=solo","cg"],["/poker","poker"]]){
 const p=await ctx.newPage();p.on("pageerror",e=>errs.push(name+": "+e.message));await p.route(/upload\.wikimedia|fonts\./,r=>r.abort());
 await p.goto("http://localhost:3100"+path);await p.waitForTimeout(1800);
 const r=await p.evaluate(()=>{const find=r=>{const x=r.querySelector(".tlogo svg");if(x)return x;for(const e of r.querySelectorAll("*"))if(e.shadowRoot){const y=find(e.shadowRoot);if(y)return y}};const s=find(document);if(!s)return{ok:false};const bb=s.getBoundingClientRect();return{ok:true,w:Math.round(bb.width),h:Math.round(bb.height),x:Math.round(bb.x),y:Math.round(bb.y),anim:s.getAnimations?s.getAnimations({subtree:true}).length:-1,title:document.title,fav:(document.querySelector('link[rel=icon]')||{}).href}});
 console.log(vw[2],name,JSON.stringify(r));
 if(name==="accueil"||name==="fl"||name==="poker")await p.screenshot({path:SP+"tu_"+vw[2]+"_"+name+".png",clip:{x:0,y:0,width:vw[0],height:Math.min(260,vw[1])}});await p.close()}
 await ctx.close()}
for(const u of ["/favicon.svg","/apple-touch-icon.png","/d/tuilo-512.png"]){const r=await fetch("http://localhost:3100"+u);console.log(u,r.status,r.headers.get("content-type"),(await r.arrayBuffer()).byteLength)}
const h=await (await fetch("http://localhost:3100/")).text();console.log("og:",(h.match(/og:site_name" content="[^"]*"|og:image" content="[^"]*"/g)||[]).join(" | "));
console.log("erreurs",errs);await b.close()})();
