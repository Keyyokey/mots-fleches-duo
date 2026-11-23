// Audit du 23/11/2026 — restes des anciennes versions
// 1) les pages générées (mg.html, en-têtes partagés) sont à jour : relancer build_mg.py puis partage.py ne change rien
//    (avant : un style ajouté à la main dans mg.html disparaissait à la régénération)
// 2) la page des règles correspond aux jeux : Mot du jour aux points, mots fléchés et mots mêlés à plusieurs (2 à 4)
// 3) plus de code mort connu (accueil : NAMES/saveNames/newCode ; serveur : liveInfo)
// Lancer depuis la racine du dépôt, serveur local sur le port 3999 : node outils/tests/restes_anciennes_versions.js
const {execSync}=require("child_process");const fs=require("fs");
const {chromium}=require(process.env.PW||"/tmp/pw/node_modules/playwright");
const U="http://localhost:3999";let ok=0,ko=0;const t=(c,m)=>{c?ok++:ko++;console.log((c?"✅ ":"❌ ")+m)};
(async()=>{
 const before=execSync("git diff -- public/mg.html public/*.html").toString();
 execSync("python3 outils/magnetico/build_mg.py && python3 outils/site/partage.py",{stdio:"ignore"});
 const after=execSync("git diff -- public/mg.html public/*.html").toString();
 t(before===after,"pages générées à jour (build_mg.py + partage.py ne changent rien)");
 const mg=fs.readFileSync("public/mg.html","utf8");t(/#mgNsyl,#mgLvl,\.hpill\{font-size:\.88rem!important\}/.test(mg),"Magnético : textes lisibles sur mobile gardés après régénération");
 const acc=fs.readFileSync("public/accueil.html","utf8"),srv=fs.readFileSync("server.js","utf8");
 t(!/fl-salon-names|function newCode|function saveNames/.test(acc),"accueil : plus d'ancienne clé fl-salon-names ni de newCode");
 t(!/function liveInfo/.test(srv),"serveur : plus de liveInfo inutilisé");
 const br=await chromium.launch();const errs=[];
 for(const [w,h] of [[1280,900],[390,844]]){const p=await (await br.newContext({viewport:{width:w,height:h}})).newPage();p.on("pageerror",e=>errs.push(e.message));
  await p.goto(U+"/regles");await p.waitForTimeout(800);
  const s=await p.evaluate(()=>{const g=id=>(document.getElementById(id)||{}).innerText||"";return{md:g("motdujour")||[...document.querySelectorAll("section")].map(x=>x.innerText).find(x=>/Mot du jour/.test(x))||"",fl:g("fleches"),mm:g("meles"),sw:document.documentElement.scrollWidth}});
  t(/\+12/.test(s.md)&&/aux points/.test(s.md)&&!/nombre de mots du jour trouvés/.test(s.md),w+" px : règles du Mot du jour = barème à points et classement aux points");
  t(/À plusieurs \(2 à 4\)/.test(s.fl)&&!/À deux/.test(s.fl),w+" px : règles des mots fléchés à plusieurs (2 à 4)");
  t(/À plusieurs/.test(s.mm)&&!/À deux/.test(s.mm),w+" px : règles des mots mêlés à plusieurs");
  t(s.sw<=w,w+" px : la page des règles ne déborde pas ("+s.sw+")")}
 t(!errs.length,"aucune erreur JavaScript "+JSON.stringify(errs));
 console.log(ok+" ✅ / "+ko+" ❌");await br.close();process.exit(ko?1:0)})();
