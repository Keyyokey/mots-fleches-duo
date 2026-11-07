// répartition des sens et dispersion spatiale des mots, sur toutes les grilles de chaque niveau
const vm=require('vm'),fs=require('fs');const f=process.argv[2];const c={norm:s=>String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'')};vm.createContext(c);
vm.runInContext(fs.readFileSync(f,'utf8')+';this.melesDef=melesDef;this.makeMeles=makeMeles;this.NMELES=NMELES;',c);
const fam=(dr,dc)=>dr===0?'H':dc===0?'V':(dr===dc?'D↘':'D↗');
for(const lv of ['facile','moyen','difficile']){const F={},REV={n:0,t:0};let maxShare=0,sumMax=0,chi=0,quadCV=0,N=0,words=0,fail=0;
 for(let k=1;k<=c.NMELES;k++){const d=c.melesDef('n'+k,lv);let m;try{m=c.makeMeles(d.theme,lv,d.seed)}catch(e){fail++;continue}N++;
  const g={};for(const w of m.words){const fa=fam(w.dr,w.dc);g[fa]=(g[fa]||0)+1;F[fa]=(F[fa]||0)+1;words++;REV.t++;if(w.dc<0||(w.dc===0&&w.dr<0))REV.n++}
  const fams=lv==='facile'?['H','V','D↘']:['H','V','D↘','D↗'];const e=m.words.length/fams.length;
  const mx=Math.max(...Object.values(g))/m.words.length;sumMax+=mx;maxShare=Math.max(maxShare,mx);
  chi+=fams.reduce((a,x)=>a+((g[x]||0)-e)**2/e,0);
  // occupation des 4 quarts de la grille par les lettres des mots
  const q=[0,0,0,0],h=m.size/2;for(const w of m.words)for(let i=0;i<w.w.length;i++){const r=w.r+w.dr*i,cc=w.c+w.dc*i;q[(r>=h?2:0)+(cc>=h?1:0)]++}
  const mu=q.reduce((a,b)=>a+b)/4;quadCV+=Math.sqrt(q.reduce((a,b)=>a+(b-mu)**2,0)/4)/mu}
 const pct=Object.fromEntries(Object.entries(F).map(([k,v])=>[k,(100*v/words).toFixed(1)+'%']));
 console.log(lv,'grilles',N,'échecs',fail,'| sens',JSON.stringify(pct),'| à l\'envers',(100*REV.n/REV.t).toFixed(0)+'%','| part du sens dominant : moyenne',(100*sumMax/N).toFixed(0)+'%','pire',(100*maxShare).toFixed(0)+'%','| χ² moyen',(chi/N).toFixed(2),'| écart des quarts (CV)',(quadCV/N).toFixed(2))}
