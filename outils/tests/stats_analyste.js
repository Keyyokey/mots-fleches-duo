// Statistiques « analyste » (25/11) : vrais visiteurs par provenance (Facebook, TikTok… même dans leur appli),
// robots et aperçus de lien écartés, appareil du propriétaire écarté, une personne = une fois par jour, et ce que font
// les visiteurs venus sans lien de suivi (x-facebook…).
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999',KEY=process.env.ADMIN_KEY||'test1234567890abcdef';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
const FB_APP='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/490.0.0.38.105;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBCR/;FBID/phone;FBLC/fr_FR;FBOP/5]';
const TT_APP='Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36 trill_370103 BytedanceWebview/d8a21c6';
const PC='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const stats=async()=>{const j=await (await fetch(U+'/admin/stats?key='+KEY+'&format=json',{headers:{'user-agent':PC}})).json();return ((j.jours||[])[0]||{}).compteurs||{}};
const get=async(path,ua,extra={})=>{const r=await fetch(U+path,{headers:{'user-agent':ua,...extra},redirect:'manual'});return {r,ck:(r.headers.getSetCookie?r.headers.getSetCookie():[]).map(c=>c.split(';')[0]).join('; ')}};
(async()=>{
  const c0=await stats(),d=(c,k)=>(+c[k]||0)-(+c0[k]||0);
  // Facebook (appli) : 2 pages vues par la même personne = 1 vrai visiteur
  const a=await get('/',FB_APP);await get('/motdujour',FB_APP,{cookie:a.ck});
  // Facebook depuis le site (lien sortant) et TikTok (appli)
  await get('/fleches',PC,{referer:'https://l.facebook.com/'});await get('/',TT_APP);
  // aperçu de lien Facebook et robot Google : écartés
  await get('/',"facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)");await get('/','Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
  // lien de suivi TikTok
  const t=await get('/tmd1',PC);await get(t.r.headers.get('location'),PC);
  // appareil du propriétaire : ouvrir les stats le marque, ses visites sont écartées
  const m=await fetch(U+'/admin/stats?key='+KEY,{headers:{'user-agent':PC}});const moiCk=(m.headers.getSetCookie?m.headers.getSetCookie():[]).map(c=>c.split(';')[0]).join('; ');
  await get('/',PC,{cookie:moiCk});await get('/fleches',PC,{cookie:moiCk});
  const c1=await stats();
  ok(d(c1,'u:facebook')===2,'Facebook : 2 vrais visiteurs (appli + lien sortant), pas 3 pages ('+d(c1,'u:facebook')+')');
  ok(d(c1,'u:tiktok')===2,'TikTok : appli reconnue + lien de suivi /tmd1 ('+d(c1,'u:tiktok')+')');
  ok(d(c1,'v:robot:facebook')===1&&d(c1,'v:robot')>=1,'aperçu de lien Facebook et robot Google écartés ('+d(c1,'v:robot:facebook')+' + '+d(c1,'v:robot')+')');
  ok(d(c1,'v:moi')===2&&d(c1,'u:direct')===0,'tes 2 pages vues sont écartées (moi : '+d(c1,'v:moi')+')');
  ok(d(c1,'u:tous')===4,'total du jour : 4 vrais visiteurs ('+d(c1,'u:tous')+')');
  const html=await (await fetch(U+'/admin/stats?key='+KEY,{headers:{'user-agent':PC,cookie:moiCk}})).text();
  ok(/D'où viennent les vrais visiteurs/.test(html)&&/<td>Facebook<\/td><td>\d+/.test(html)&&/reconnu comme <b>le tien<\/b>/.test(html),'page des stats : tableau des provenances et appareil reconnu comme le tien');
  // visiteur Facebook sans lien de suivi qui joue au Mot du jour → « Facebook (sans lien de suivi) · a joué »
  const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const cx=await br.newContext({userAgent:FB_APP,viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await cx.newPage();
  await p.goto(U+'/motdujour');await p.waitForTimeout(2500);const src=await p.evaluate(()=>localStorage.getItem('fl-src'));
  await p.tap('#mdGrid');await p.keyboard.insertText('a');await p.waitForTimeout(800);await br.close();
  const c2=await stats();ok(/x-facebook/.test(src||'')&&d(c2,'suivi:x-facebook:arrive')>=1&&d(c2,'suivi:x-facebook:joue')>=1,'visiteur Facebook sans lien : arrivée et « a joué » comptés ('+d(c2,'suivi:x-facebook:joue')+')');
  console.log(res.join('\n'))})();
