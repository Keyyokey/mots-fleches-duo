const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
await p.goto("http://localhost:3100/poker?go=solo");await p.waitForTimeout(2500);await p.getByText("Lancer la partie").click();
for(let i=0;i<40;i++){await p.waitForTimeout(700);if(await p.$(".pkact.myturn"))break}
await p.waitForTimeout(1500);await p.click('.pkact [data-a="raise"]');await p.waitForTimeout(300);
console.log("relance :",(await p.textContent("#pkRaise .rzhead")).replace(/\s+/g," "),"| préréglage :",await p.$eval(".rzq .on",e=>e.textContent));
await p.click('.rzq [data-q="pot"]');console.log("pot :",(await p.textContent("#pkRaise .rzhead")).replace(/\s+/g," "));
await p.locator("#pkRaise").scrollIntoViewIfNeeded();await p.screenshot({path:SP+"pk_relance.png"});
await p.evaluate(()=>winFx(24));await p.waitForTimeout(700);await p.screenshot({path:SP+"pk_victoire.png"});
console.log("erreurs",errs);await b.close()})();
