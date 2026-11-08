const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const ctx=await b.newContext({viewport:{width:420,height:860}});const p=await ctx.newPage();
const req=[];p.on("request",r=>req.push(r.url()));const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.route(/upload\.wikimedia/,r=>r.abort());
const t0=Date.now();await p.goto("http://localhost:3100/culture?go=solo");await p.waitForFunction(()=>{const q=document.querySelector("#cgQ");return q&&q.textContent&&!/Chargement/.test(q.textContent)},null,{timeout:10000});
console.log("1re question affichée en",Date.now()-t0,"ms");
console.log("banque complète téléchargée ?",req.some(u=>/culture-[0-9a-f]+\.js/.test(u)));console.log("requêtes cg:",req.filter(u=>/cg-index|api\/cg/.test(u)).map(u=>u.replace("http://localhost:3100","")).join(" | ").slice(0,200));
const kinds=await p.evaluate(()=>window.__t("G.qs.map(id=>KIND[id])"));console.log("types:",kinds.join(" "));
// plusieurs tirages pour voir la répartition
const dist=await p.evaluate(()=>window.__t("(()=>{const c={};for(let i=0;i<200;i++)pickQs(new Set()).forEach(id=>c[KIND[id]]=(c[KIND[id]]||0)+1);return c})()"));console.log("200 parties:",JSON.stringify(dist));
// question « sondage » en tête
await p.evaluate(()=>window.__t("(()=>{const s=IDX.sond.find(id=>1);G.qs[G.i]=s;G.qStart=Date.now();drawn='';render();})()"));await p.waitForSelector("#cgIn",{timeout:5000});
console.log("question:",await p.textContent("#cgQ"),"| thème:",await p.textContent("#cgTheme"));
await p.screenshot({path:"/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/cg_sond1.png"});
const q=await p.evaluate(()=>window.__t("curQ()"));const orig=q.o[0];
await p.fill("#cgIn",orig.toUpperCase()+"s");await p.press("#cgIn","Enter");await p.waitForTimeout(400);
console.log("réponse:",JSON.stringify(await p.evaluate(()=>window.__t("ansOf(G.i,0)"))));
await p.waitForSelector("#cgFact:not([hidden])",{timeout:5000});console.log("révélé:",(await p.textContent("#cgSL")).trim(),"|",(await p.textContent("#cgX")).slice(0,160));
await p.screenshot({path:"/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/cg_sond2.png"});
// question calcul
await p.evaluate(()=>window.__t("(()=>{G.i=1;G.qs[1]=IDX.calc[3];G.qStart=Date.now();drawn='';render();})()"));await p.waitForTimeout(500);
console.log("calcul:",await p.textContent("#cgTheme"),"|",await p.textContent("#cgQ"),"| boutons:",await p.$$eval("#cgA button",b=>b.map(x=>x.textContent).join(" / ")),"| champ caché:",await p.$eval("#cgS",e=>e.hidden));
await p.screenshot({path:"/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/cg_calc.png"});
// matcher
console.log("tests réponses:",JSON.stringify(await p.evaluate(()=>window.__t(`(()=>{const q={a:["Côte d'Ivoire","Fraise"],o:["Pastèque"]};return ["cote d ivoire","la cote divoire","fraises","FRAIZE","pasteque","pomme",""].map(x=>[x,sondMatch(q,x)])})()`))));
console.log("erreurs:",errs);await b.close()})();
