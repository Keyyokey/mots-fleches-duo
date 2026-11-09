const {chromium}=require("/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
const SP="/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/";
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const errs=[];
for(const [path,name] of [["/","accueil"],["/fleches?go=solo","fl"],["/rond?go=solo","rd"],["/meles?go=solo","mm"],["/culture?go=solo","cg"],["/poker","poker"]]){
 const p=await ctx.newPage();p.on("pageerror",e=>errs.push(name+": "+e.message));await p.route(/upload\.wikimedia|fonts\./,r=>r.abort());
 await p.goto("http://localhost:3100"+path);await p.waitForTimeout(2200);
 const r=await p.evaluate(()=>{const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/u;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,left=[];while((n=w.nextNode()))if(re.test(n.nodeValue)&&!/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName))left.push(n.nodeValue.trim().slice(0,30));return{ic:document.querySelectorAll("svg.ic").length,left:[...new Set(left)].slice(0,12)}});
 console.log(name,"icônes:",r.ic,"| emojis restants:",JSON.stringify(r.left));
 await p.screenshot({path:SP+"ic_"+name+".png"});await p.close()}
console.log("erreurs:",errs);await b.close()})();
