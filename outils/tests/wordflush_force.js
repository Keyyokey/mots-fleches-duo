const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
await p.goto("http://localhost:3100/poker?go=solo");await p.waitForTimeout(3000);await p.getByText("Lancer la partie").click();
const seen=[];for(let i=0;i<80;i++){await p.waitForTimeout(1000);const r=await p.evaluate(()=>{const f=document.querySelector("#pkForce");return f&&!f.hidden?f.innerText.replace(/\s+/g," "):""});if(r&&!seen.includes(r)){seen.push(r);console.log(r);if(seen.length===1)await p.screenshot({path:SP+"pk_force.png"})}
 const myturn=await p.evaluate(()=>document.querySelector(".pkact.myturn")!==null);if(myturn){await p.click('.pkact [data-a="call"]').catch(()=>{})}
 if(seen.length>=3)break}
await p.click("#pkForce").catch(()=>{});await p.waitForTimeout(300);console.log("masquée :",await p.evaluate(()=>document.querySelector("#pkForce").innerText.replace(/\s+/g," ")));
console.log("erreurs",errs);await b.close()})();
