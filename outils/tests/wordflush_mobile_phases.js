const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";const tag=process.argv[2]||"avant";
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
await p.goto("http://localhost:3100/poker?go=solo");await p.waitForTimeout(2500);await p.getByText("Lancer la partie").click().catch(()=>{});
const shot={};for(let i=0;i<120;i++){await p.waitForTimeout(800);const st=await p.evaluate(()=>({ph:ST&&ST.phase,my:document.querySelector(".pkact.myturn")!==null,me:ST&&ST.seats&&ST.seats[ST.me]&&ST.seats[ST.me].hand}));
 if(st.ph==="mise"&&st.my&&!shot.mise){await p.waitForTimeout(600);await p.screenshot({path:SP+"pk_"+tag+"_mise.png"});await p.screenshot({path:SP+"pk_"+tag+"_mise_full.png",fullPage:true});shot.mise=1}
 if(st.ph==="mise"&&st.my){await p.click('.pkact [data-a="call"]').catch(()=>{})}
 if(st.ph==="mot"&&!shot.mot){await p.waitForTimeout(500);await p.screenshot({path:SP+"pk_"+tag+"_mot.png"});
   const inp=await p.$("#pkIn");if(inp){await inp.focus();await p.setViewportSize({width:390,height:470});await p.waitForTimeout(400);await p.evaluate(()=>document.getElementById("pkWordCard").scrollIntoView({block:"end"}));await p.waitForTimeout(400);await p.screenshot({path:SP+"pk_"+tag+"_clavier.png"});await p.setViewportSize({width:390,height:844})}shot.mot=1}
 if(st.ph&&/abat|show|fin|result/.test(st.ph)&&!shot.res){await p.waitForTimeout(800);await p.screenshot({path:SP+"pk_"+tag+"_resultat.png"});shot.res=1}
 if(st.ph==='mise'&&shot.res&&!shot.next){await p.waitForTimeout(1500);const stale=await p.evaluate(()=>{const r=document.getElementById('pkRes');return getComputedStyle(r).display!=='none'&&r.innerText.trim()});console.log('message du coup précédent encore visible :',JSON.stringify(stale));await p.screenshot({path:SP+'pk_'+tag+'_coup2.png'});shot.next=1}
 if(shot.mise&&shot.mot&&shot.res&&shot.next)break}
console.log(Object.keys(shot),errs);const phs=await p.evaluate(()=>ST.phase);console.log("phase finale",phs);await b.close()})();
