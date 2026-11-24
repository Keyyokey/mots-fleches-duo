// Liens de suivi (24/11) : /tmd1 → /motdujour?ref=t-md-1 ; le visiteur est suivi : arrive, joue, fini, revient (un autre jour).
const PW=process.env.PW||'playwright';const {chromium}=require(PW);const U=process.env.U||'http://localhost:3999';const KEY=process.env.ADMIN_KEY||'test1234567890abcdef';
const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
(async()=>{
 for(const [p,d] of [['/tmd1','/motdujour?ref=t-md-1'],['/ffl3','/fleches?ref=f-fl-3'],['/wac','/?ref=w-ac'],['/qmg','/magnetico?ref=q-mg'],['/Tmd2','/motdujour?ref=t-md-2']]){const r=await fetch(U+p,{redirect:'manual'});ok(r.status===302&&r.headers.get('location')===d,p+' → '+r.headers.get('location'))}
 ok((await fetch(U+'/tzz1',{redirect:'manual'})).status!==302,'un lien inconnu ne redirige pas');
 const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const p=await c.newPage();await p.goto(U+'/tmd1');await p.waitForTimeout(2500);
 const o=await p.evaluate(()=>JSON.parse(localStorage.getItem('fl-src')||'null'));ok(o&&o.r==='t-md-1','le visiteur garde le lien (t-md-1)');
 for(const L of 'NFANT')await p.tap('#mdKeys span:text-is("'+L+'")').catch(()=>{});await p.tap('#mdOk').catch(()=>{});await p.waitForTimeout(1500);
 // « revient » : on simule le lendemain
 await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem('fl-src'));o.d=o.d-1;localStorage.setItem('fl-src',JSON.stringify(o))});await p.goto(U+'/');await p.waitForTimeout(1500);
 await p.reload();await p.waitForTimeout(1000);
 const h=await (await fetch(U+'/admin/stats?key='+KEY)).text();const row=(h.match(/TikTok · Mot du jour · n° 1[\s\S]*?<\/tr>/)||[''])[0].replace(/<[^>]+>/g,' ').replace(/\(\d+ %\)/g,'').replace(/\s+/g,' ');
 const n=(row.match(/t-md-1 (\d+) (\d+) (\d+) (\d+)/)||[]).slice(1).map(Number);
 ok(n[0]===1,'stats : 1 arrivé ('+row.trim()+')');ok(n[1]===1,'stats : a joué = 1');ok(n[3]===1,'stats : revenu = 1 (compté une seule fois malgré 2 visites)');
 await b.close();console.log(res.join('\n'));process.exit(res.some(r=>r.startsWith('❌'))?1:0)})();
