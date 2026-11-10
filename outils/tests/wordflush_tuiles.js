// Wordflush v3 : dock d'actions en bas (téléphone), mot composé en tuiles sans clavier, saisie directe au clavier (ordinateur)
// Lancer : serveur local sur le port 3100 (SOLO_MIN_MS=2000), puis `node wordflush_tuiles.js`
const {chromium}=require(process.env.PW||"/tmp/claude-0/-home-claude/8d6d2643-6576-5f68-8c95-f3700fc6f9e7/scratchpad/node_modules/playwright");
let ok=0,ko=0;const T=(c,m)=>{c?ok++:ko++;console.log((c?"✅ ":"❌ ")+m)};
async function partie(b,mobile){const p=await b.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.route(/fonts\./,r=>r.abort());
  await p.goto("http://localhost:3100/poker?go=solo");await p.waitForTimeout(2500);await p.getByText("Lancer la partie").click().catch(()=>{});const L=mobile?"téléphone":"ordinateur";const vu={};
  for(let i=0;i<200&&!(vu.mise&&vu.mot&&vu.res);i++){await p.waitForTimeout(600);const s=await p.evaluate(()=>({ph:ST&&ST.started?ST.phase:"",my:!!ST&&ST.phase==="mise"&&ST.turn===ST.me}));
    if(s.ph==="mise"&&s.my&&!vu.mise){vu.mise=1;await p.waitForTimeout(400);
      const d=await p.evaluate(()=>{const c=document.querySelector(".pkleft>.pkcard"),r=c.getBoundingClientRect(),me=document.querySelector("#pkMe .seat").getBoundingClientRect(),vis=e=>{const q=e.getBoundingClientRect();return q.width>0&&q.top>=0&&q.bottom<=innerHeight+1};
        return{pos:getComputedStyle(c).position,bas:Math.round(innerHeight-r.bottom),haut:r.top,moi:me.bottom,btn:[...document.querySelectorAll(".pkact .btn")].map(e=>[e.dataset.a,vis(e),e.disabled]),barre:document.querySelector("#wfBar").classList.contains("on"),ph:document.body.dataset.ph}});
      if(mobile){T(d.pos==="fixed"&&d.bas===0,L+" : les actions sont collées en bas de l'écran ("+d.pos+", écart "+d.bas+")");T(d.moi<=d.haut,L+" : mes lettres restent visibles au-dessus des actions ("+Math.round(d.moi)+" ≤ "+Math.round(d.haut)+")");
        T(d.btn.filter(x=>x[1]).map(x=>x[0]).join()==="fold,call,raise",L+" : 3 boutons visibles sans défiler, Tapis rangé dans la relance ("+d.btn.filter(x=>x[1]).map(x=>x[0])+")")}
      else T(d.btn.filter(x=>x[1]).length===4,L+" : 4 boutons visibles dont Tapis");
      T(d.barre&&d.ph==="mise",L+" : barre de temps active à mon tour");
      await p.click('.pkact [data-a="raise"]');await p.waitForTimeout(300);await p.click('.rzq [data-q="max"]');const t=await p.textContent("#rzOk"),cache=await p.evaluate(()=>getComputedStyle(document.querySelector(".pkact")).display);
      T(/^Tapis · \d+$/.test(t)&&cache==="none",L+" : relance au maximum = « "+t+" », les 3 boutons laissent la place au réglage");await p.click("#rzCancel")}
    if(s.ph==="mise"&&s.my)await p.click('.pkact [data-a="call"]').catch(()=>{});
    if(s.ph==="mot"&&!vu.mot){vu.mot=1;await p.waitForTimeout(2600);const rack=await p.$$eval("#pkWL button",x=>x.map(e=>e.dataset.l));T(rack.length===7,L+" : 7 tuiles (2 à moi + 5 communes) : "+rack.join(""));
      if(mobile){const m=await p.evaluate(()=>{const c=document.querySelector("#pkWordCard"),r=c.getBoundingClientRect();return{im:document.querySelector("#pkIn").getAttribute("inputmode"),foc:document.activeElement&&document.activeElement.id,pos:getComputedStyle(c).position,bas:Math.round(innerHeight-r.bottom),ligne:new Set([...document.querySelectorAll("#pkWL button")].map(e=>Math.round(e.getBoundingClientRect().top))).size}});
        T(m.im==="none"&&m.foc!=="pkIn",L+" : aucun clavier ne s'ouvre (inputmode "+m.im+", focus « "+(m.foc||"aucun")+" »)");T(m.pos==="fixed"&&m.bas===0&&m.ligne===1,L+" : le compositeur est collé en bas, tuiles sur une seule ligne");
        for(let k=0;k<4;k++){await p.click("#pkWL button:not(.used)");await p.waitForTimeout(120)}
        let v=await p.inputValue("#pkIn");const used=await p.$$eval("#pkWL button.used",x=>x.length),pleins=await p.$$eval("#wfSlots .ws.f",x=>x.map(e=>e.firstChild.textContent).join(""));T(v.length===4&&used===4&&pleins===v,L+" : 4 touchers → mot « "+v+" », 4 tuiles grisées, 4 cases remplies");
        await p.click("#wfSlots .ws.f >> nth=1");await p.waitForTimeout(150);let v2=await p.inputValue("#pkIn");T(v2===v[0]+v.slice(2),L+" : toucher une case retire sa lettre (« "+v2+" »)");
        await p.click("#wfBack");await p.waitForTimeout(100);T((await p.inputValue("#pkIn"))===v2.slice(0,-1),L+" : ⌫ retire la dernière lettre");
        await p.click("#wfMix");await p.waitForTimeout(100);const rack2=await p.$$eval("#pkWL button",x=>x.map(e=>e.dataset.l));T(rack2.slice().sort().join("")===rack.slice().sort().join("")&&rack2.slice(0,2).join("")===rack.slice(0,2).join(""),L+" : « Mélanger » garde les mêmes lettres, les miennes restent devant");
        await p.click("#wfClr");await p.waitForTimeout(100);T((await p.inputValue("#pkIn"))===""&&(await p.$$eval("#pkWL button.used",x=>x.length))===0,L+" : « Effacer » vide le mot");
        for(let k=0;k<3;k++){await p.click("#pkWL button:not(.used)");await p.waitForTimeout(120)}}
      else{await p.evaluate(()=>document.activeElement&&document.activeElement.blur());for(const c of rack.slice(0,4))await p.keyboard.press(c.toLowerCase());await p.waitForTimeout(200);let v=await p.inputValue("#pkIn");T(v===rack.slice(0,4).join(""),L+" : on tape directement au clavier, sans cliquer dans un champ (« "+v+" »)");
        await p.keyboard.press("Backspace");await p.waitForTimeout(150);T((await p.inputValue("#pkIn"))===rack.slice(0,3).join(""),L+" : Retour arrière retire une lettre");}
      const w=await p.inputValue("#pkIn");if(mobile)await p.click("#pkBest");else await p.keyboard.press("Enter");await p.waitForTimeout(900);
      const l=await p.evaluate(()=>({t:document.querySelector("#pkBest").textContent,lock:document.querySelector("#wfSlots").classList.contains("lock"),mot:[...document.querySelectorAll("#wfSlots .ws.f")].map(e=>e.firstChild.textContent).join(""),ph:ST.phase}));
      T(/verrouillé/.test(l.t)&&(l.ph!=="mot"||(l.lock&&l.mot===w)),L+" : « "+w+" » verrouillé"+(mobile?"":" avec Entrée")+" ("+l.t.trim()+")")}
    if(s.ph==="abattage"&&vu.mot&&!vu.res){vu.res=1;await p.waitForTimeout(800);const a=await p.evaluate(()=>({act:getComputedStyle(document.querySelector(".pkact")).display,carte:getComputedStyle(document.querySelector(".pkleft>.pkcard")).display,res:!document.querySelector("#pkRes").hidden}));
      T(a.act==="none"&&a.res&&(!mobile||a.carte==="none"),L+" : au résultat, plus aucun bouton de mise affiché")}}
  T(vu.mise&&vu.mot&&vu.res,L+" : les 3 phases ont été jouées");T(errs.length===0,L+" : aucune erreur JavaScript "+JSON.stringify(errs));await p.close()}
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});await partie(b,true);await partie(b,false);console.log(ok+" ✅ / "+ko+" ❌");await b.close();process.exit(ko?1:0)})();
