const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
for(const path of ["/","/fleches?go=solo"]){
await p.goto("http://localhost:3100"+path);await p.waitForTimeout(1800);
await p.click('button[aria-label*="enu"], .menubtn, #menuBtn, button.burger').catch(async()=>{await p.locator("header button").last().click()});await p.waitForTimeout(500);
const n=await p.locator('[data-act="icons"]').count();console.log(path,"bouton Icônes:",n,await p.locator('[data-act="icons"]').first().isVisible().catch(()=>false));
await p.screenshot({path:SP+"ic_menu"+(path==="/"?"_home":"_fl")+".png"});
await p.locator('[data-act="icons"]:visible').first().click();await p.waitForTimeout(300);await p.screenshot({path:SP+"ic_pick.png"});
await p.click('.icopt[data-m="b"]');await p.waitForTimeout(200);console.log("mode:",await p.evaluate(()=>document.documentElement.dataset.ic+" "+localStorage.getItem("fl-icons")));
await p.click('.icopt[data-m="e"]');await p.waitForTimeout(200);console.log("après emojis, svg.ic restants:",await p.locator("svg.ic:not(.icpick svg)").count());
await p.click('.icopt[data-m="b"]');await p.click(".icclose");await p.waitForTimeout(300);await p.screenshot({path:SP+"ic_b"+(path==="/"?"_home":"_fl")+".png"});
await p.evaluate(()=>localStorage.removeItem("fl-icons"));}
console.log("erreurs",errs);await b.close()})();
