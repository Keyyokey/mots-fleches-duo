// Recensement des sens dans les 891 grilles de mots mêlés (297 par niveau) : node outils/tests/meles_sens_recensement.js
// Règle du 19/11/2026 : 4 axes dans chaque grille, endroit + envers, aucun axe au-delà de 40 %, répartition tirée au hasard.
const fs=require("fs"),path=require("path"),vm=require("vm");
const s=fs.readFileSync(path.join(__dirname,"../../public/mm.html"),"utf8");const i=s.indexOf("function makeMeles");
const a=s.indexOf(">",s.lastIndexOf("<script",i))+1,b=s.indexOf("</script>",i);
const ctx={norm:x=>String(x||"").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z]/g,""),window:{}};vm.createContext(ctx);
vm.runInContext(s.slice(a,b)+";this.makeMeles=makeMeles;this.melesDef=melesDef;",ctx);
const fam=w=>w.dr===0?"H":w.dc===0?"V":w.dr===w.dc?"D":"A",rev=w=>{const f=fam(w);return f==="H"?w.dc<0:f==="V"?w.dr<0:f==="D"?w.dr<0:w.dr>0};
let bad=0;for(const lv of ["facile","moyen","difficile"]){const agg={H:0,V:0,D:0,A:0};let pire=0,rv=0,n=0,profils=new Set();
  for(let k=1;k<=297;k++){const d=ctx.melesDef("n"+k,lv),m=ctx.makeMeles(d.theme,lv,d.seed),c={H:0,V:0,D:0,A:0};let r=0;m.words.forEach(w=>{c[fam(w)]++;agg[fam(w)]++;if(rev(w))r++});
    const mx=Math.max(...Object.values(c))/m.words.length;pire=Math.max(pire,mx);rv+=r/m.words.length;n++;profils.add(Object.values(c).sort().join("-"));
    if(Object.values(c).some(v=>v===0)||mx>.4001||r===0||r===m.words.length){bad++;console.log("❌",lv,"grille",k,JSON.stringify(c),"envers",r)}}
  console.log("✅",lv,": 297 grilles, répartition",JSON.stringify(agg),"· axe le plus chargé au pire",Math.round(pire*100)+"%","· envers en moyenne",Math.round(rv/n*100)+"%","·",profils.size,"profils de répartition différents")}
console.log(bad?"❌ "+bad+" grilles hors règle":"✅ toutes les grilles respectent la règle");
