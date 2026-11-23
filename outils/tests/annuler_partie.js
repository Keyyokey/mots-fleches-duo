const {chromium}=require(process.env.PW||'playwright');const U='http://localhost:3999';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const c=await b.newContext({viewport:{width:1100,height:800}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
// compte de test
const nm='Q'+Math.floor(Math.random()*90000+10000).toString(36).toUpperCase().slice(0,5);
let me=null;const r=await p.request.post(U+'/api/p/create',{data:{name:nm,pin:'1234'}});try{me=await r.json()}catch(e){}
if(!me||!me.token){const r2=await p.request.post(U+'/api/p/create',{data:{name:nm,code:'1234'}});try{me=await r2.json()}catch(e){};}
console.log('compte',nm,!!(me&&me.token),me&&Object.keys(me));
await c.addInitScript(([n,t])=>{localStorage.setItem('fl-me',JSON.stringify({name:n,token:t}));for(const k of ['fleches','rond','meles','magnetico','culture'])localStorage.setItem('fl-tuto-'+k,'1')},[nm,me&&me.token]);
for(const [g,u] of [['rond','/rond?go=solo&lvl=facile'],['fleches','/fleches?go=solo&lvl=facile'],['meles','/meles?go=solo&lvl=facile'],['culture','/culture?go=solo']]){
 await p.goto(U+u);await p.waitForTimeout(3500);
 await p.evaluate(()=>window.__t('save()'));await p.waitForTimeout(2200);
 const s1=await (await p.request.post(U+'/api/p/solo',{data:{name:nm,token:me.token,game:g,op:'get'}})).json();
 await p.click('.homebtn');await p.waitForTimeout(300);const lab=await p.textContent('#lvQuit');
 await Promise.all([p.waitForNavigation({timeout:5000}).catch(()=>{}),p.click('#lvQuit')]);await p.waitForTimeout(1500);
 const s2=await (await p.request.post(U+'/api/p/solo',{data:{name:nm,token:me.token,game:g,op:'get'}})).json();
 const resume=await p.evaluate(g=>!!document.querySelector('.tile[data-key="'+g+'"] [data-mode="resume"]'),g);
 console.log(g,'bouton:',lab,'| copie serveur avant',!!s1.doc,'après',!!s2.doc,'| Reprendre à l\'accueil :',resume)}
console.log('err',errs);await b.close()})();
