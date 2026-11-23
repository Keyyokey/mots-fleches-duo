// Nouveau visiteur sur téléphone (23/11, après le bug du Mot du jour : on arrivait de Facebook,
// on touchait les lettres, rien ne se passait, et aucune consigne n'était visible).
// Pour chaque page où mènent les liens courts et les jeux : téléphone neuf (rien en mémoire),
// navigateur intégré de Facebook. On vérifie :
//  1. aucune erreur JavaScript, rien qui dépasse sur le côté ;
//  2. une consigne ou un tutoriel est visible sur le premier écran ;
//  3. ce qui ressemble à une touche réagit quand on la touche (les tuiles d'une seule lettre) ;
//  4. Mot du jour : toucher les lettres écrit le mot, Effacer enlève une lettre, Valider répond.
// Lancer : serveur local (PORT=3999 node server.js), puis node outils/tests/nouveau_visiteur_mobile.js
const PW=process.env.PW||'playwright';const {chromium}=require(PW);
const U=process.env.U||'http://localhost:3999';const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
const UA='Mozilla/5.0 (Linux; Android 13; SM-A136B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0]';
const PAGES=[['Mot du jour','/motdujour?ref=facebook'],['Accueil','/?ref=whatsapp'],['Mots fléchés','/fleches'],['Mots mêlés','/meles'],
 ['Tourniquet','/rond'],['Culture G','/culture'],['Magnético','/magnetico?go=solo&lvl=facile'],['Wordflush','/poker']];
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 for(const [nom,url] of PAGES){
  const c=await br.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:UA});const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U+url);await p.waitForTimeout(4000);
  const info=await p.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>4&&r.height>4&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&+s.opacity>.2&&s.display!=='none'};
   // texte de consigne : une phrase d'au moins 4 mots avec un verbe d'action (touche, glisse, tape, devine…) ou une question posée au joueur (Culture G) visible sur le premier écran (hors en-tête)
   const words=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&vis(e)&&!e.closest('header,#skTop,.skph')).map(e=>e.textContent.trim()).filter(t=>t.split(/\s+/).length>=4&&(/\b(touche|fais glisser|glisse|tape|devine|trouve|choisis|appuie|assieds|joue|réponds)/i.test(t)||/\?\s*$/.test(t)));
   const over=document.documentElement.scrollWidth-innerWidth;
   // tuiles d'une seule lettre, assez grandes (exclues : avatars .pi ; cases des mots mêlés .mc, qu'on fait glisser,
   // écoutées par le document ; lettres déjà posées du Tourniquet .rb2, qui ne sont pas des touches) pour qu'on ait envie de les toucher, et pas décoratives
   const tiles=[...document.querySelectorAll('span,div,button,b')].filter(e=>/^[A-Z]$/.test(e.textContent.trim())&&e.children.length===0&&vis(e)&&getComputedStyle(e).pointerEvents!=='none'&&!e.matches('.pi,.av,.avatar,.mc,.rb2')).filter(e=>{const r=e.getBoundingClientRect();return r.width>=20&&r.width<=70&&r.height>=20&&r.height<=70});
   tiles.forEach((e,i)=>e.setAttribute('data-nv',i));
   return{consigne:words.slice(0,2),over,tiles:tiles.length}});
  if(process.env.NV_DEBUG)await p.screenshot({path:'/tmp/nv-'+nom.replace(/\W/g,'')+'.png'});
  ok(!errs.length,nom+' : aucune erreur JavaScript '+(errs.length?JSON.stringify(errs.slice(0,2)):''));
  ok(info.over<=1,nom+' : rien ne dépasse sur le côté ('+info.over+' px)');
  ok(info.consigne.length>0,nom+' : une consigne est visible sur le premier écran'+(info.consigne[0]?' (« '+info.consigne[0].slice(0,60)+' »)':''));
  // chaque tuile-lettre doit écouter le toucher (elle-même ou un parent proche, hors body/html/document)
  const cdp=await c.newCDPSession(p);const n=Math.min(info.tiles,6);let mortes=0;
  for(let i=0;i<n;i++){let found=false,lab='';
   for(let up=0;up<12&&!found;up++){const r=await cdp.send('Runtime.evaluate',{expression:'(()=>{let e=document.querySelector(\'[data-nv="'+i+'"]\');for(let k=0;k<'+up+'&&e;k++)e=e.parentElement;return e&&e!==document.body&&e!==document.documentElement?e:null})()'});
    if(!r.result.objectId)break;if(up===0)lab=r.result.description;
    const L=await cdp.send('DOMDebugger.getEventListeners',{objectId:r.result.objectId});
    if(L.listeners.some(x=>/^(click|pointerdown|pointerup|touchstart|touchend|mousedown)$/.test(x.type)))found=true;
    else{const h=await cdp.send('Runtime.callFunctionOn',{objectId:r.result.objectId,functionDeclaration:'function(){return !!(this.onclick||this.onpointerdown||this.ontouchstart||this.getAttribute("onclick")||this.tagName==="BUTTON"||this.tagName==="A"||this.tagName==="INPUT"||this.tagName==="LABEL")}',returnByValue:true});if(h.result.value)found=true}}
   if(!found){mortes++;if(process.env.NV_DEBUG)console.log(nom,'sans effet :',lab)}}
  if(n)ok(mortes===0,nom+' : les '+n+' tuiles-lettres testées répondent au toucher ('+mortes+' inertes)');
  if(nom==='Mot du jour'){
   const first=await p.evaluate(()=>document.querySelector('#mdKeys span')?1:0);
   if(ok(first,'Mot du jour : les lettres sont affichées')){
    const L=['B','R','O'];for(const x of L)await p.tap('#mdKeys span:text-is("'+x+'")',{timeout:3000}).catch(()=>{});await p.waitForTimeout(300);
    const v1=await p.evaluate(()=>document.getElementById('mdIn').value);
    ok(/BRO$/.test(v1),'Mot du jour : toucher B, R, O écrit le mot ('+v1+')');
    if(!ok(!!await p.$('#mdDel'),'Mot du jour : il y a un bouton Effacer')){await c.close();continue}
    await p.tap('#mdDel');const v2=await p.evaluate(()=>document.getElementById('mdIn').value);
    ok(v2===v1.slice(0,-1),'Mot du jour : Effacer enlève la dernière lettre ('+v2+')');
    ok(await p.evaluate(()=>document.activeElement!==document.getElementById('mdIn')),'Mot du jour : le clavier du téléphone ne s\'ouvre pas quand on touche les lettres');
    await p.tap('#mdOk');await p.waitForTimeout(800);
    ok((await p.evaluate(()=>document.getElementById('mdMsg').textContent.trim())).length>0,'Mot du jour : Valider répond quelque chose');
    ok(await p.evaluate(()=>{const n=document.getElementById('mdNote');return !!n&&n.getBoundingClientRect().height>0}),'Mot du jour : la consigne « touche les lettres » est visible');
   }}
  await c.close()}
 await br.close();console.log(res.join('\n'));const ko=res.filter(r=>r.startsWith('❌')).length;console.log(ko?ko+' problème(s)':'tout est bon');process.exit(ko?1:0)})();
