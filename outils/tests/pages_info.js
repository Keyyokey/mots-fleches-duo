const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";const U="http://localhost:3100";let ok=0,ko=0;const t=(c,m)=>{c?ok++:ko++;console.log((c?"✅ ":"❌ ")+m)};
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const errs=[];
for(const [w,h,n] of [[375,812,"mobile"],[1280,900,"pc"]]){const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:n==="mobile"?2:1});p.on("pageerror",e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
 for(const path of ["/regles","/mentions-legales","/confidentialite","/conditions"]){const r=await p.goto(U+path);t(r.status()===200,n+" "+path+" 200");await p.waitForTimeout(400);
  const info=await p.evaluate(()=>({sx:document.documentElement.scrollWidth>innerWidth+1,ph:document.body.innerText.includes("{{"),y:scrollY,title:document.title,logo:!!document.querySelector(".tlogo svg")}));
  t(!info.sx&&!info.ph&&info.logo,n+" "+path+" : pas de débordement, pas de champ vide, logo ("+info.title+")");
  if(path==="/confidentialite"||path==="/conditions")t(info.y>200,n+" "+path+" ouvre la bonne section (défilé à "+info.y+" px)");
  if(n==="mobile"&&(path==="/regles"||path==="/mentions-legales"))await p.screenshot({path:SP+"pg_"+path.slice(1)+".png",fullPage:false});}
 await p.goto(U+"/");await p.waitForTimeout(1200);const links=await p.$$eval(".sitefoot a",a=>a.map(x=>x.getAttribute("href")));t(links.length===4,n+" pied de page de l'accueil : "+links.join(" "));
 await p.close()}
const sm=await (await fetch(U+"/sitemap.xml")).text();t(sm.includes("/regles")&&sm.includes("/mentions-legales"),"sitemap contient les nouvelles pages");
const lg=await (await fetch(U+"/mentions-legales")).text();console.log("   contact affiché :",(lg.match(/Contact : ([^<]*<[^>]*>[^<]*)/)||[])[1]);t(lg.includes('rel="canonical" href="'),"adresse canonique");
console.log("erreurs JS",errs);console.log(ok+" ✅ / "+ko+" ❌");await b.close()})();
