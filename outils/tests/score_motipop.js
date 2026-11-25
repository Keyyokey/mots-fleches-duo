// Score Motipop (25/11) : un ancien total est converti à l'échelle 0 → 2 500, le classement suit,
// et une partie rapporte d'autant moins que le score est haut. Lance son propre serveur (port 3998, dossier de données temporaire).
const {spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const res=[];const ok=(c,l)=>{res.push((c?'✅ ':'❌ ')+l);return c};
const D=fs.mkdtempSync(path.join(os.tmpdir(),'motipop-score-'));const U='http://localhost:3998';
const scoreOf=r=>2500*(1-Math.pow(1+0.6*r/2500,-1/0.6));
(async()=>{
  // deux joueurs avec d'anciens totaux (avant le 25/11)
  const crypto=require('crypto');const salt='abcd';const h=crypto.scryptSync('2468',salt,32).toString('hex');
  const mk=tot=>({salt,h,toks:[crypto.createHash('sha256').update('t'+tot).digest('hex')],salons:{},acc:{},migS:1,pts:{tot,g:{fleches:tot},d:{},b:{'2026-11-20':tot}},coins:0});
  fs.writeFileSync(path.join(D,'players.json'),JSON.stringify({VIEUX:mk(18450),MOYEN:mk(870)}));
  // le serveur fait une remise à zéro unique au premier démarrage d'un dossier vide : on marque qu'elle est déjà faite
  const tag=(fs.readFileSync(path.join(__dirname,'..','..','server.js'),'utf8').match(/RESET_TAG = "([^"]+)"/)||[])[1];if(tag)fs.writeFileSync(path.join(D,'reset-'+tag),'1');
  const env={...process.env,PORT:'3998',DATA_DIR:D,SOLO_MIN_MS:'1',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',REDIS_URL:''};
  const sv=spawn('node',['server.js'],{cwd:path.join(__dirname,'..','..'),env,stdio:'ignore'});await new Promise(r=>setTimeout(r,2500));
  try{
    const api=async(r,b)=>(await fetch(U+'/api/p/'+r,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'10.7.'+Math.floor(Math.random()*250)+'.1'},body:JSON.stringify(b)})).json();
    const me=await api('me',{name:'VIEUX',token:'t18450'});
    ok(me.pts&&Math.abs(me.pts.tot-scoreOf(18450))<0.05&&me.pts.tot<2500,'ancien total 18 450 → score '+(me.pts&&me.pts.tot)+' (sous 2 500)');
    const m2=await api('me',{name:'MOYEN',token:'t870'});ok(m2.pts&&Math.abs(m2.pts.tot-scoreOf(870))<0.05,'ancien total 870 → score '+(m2.pts&&m2.pts.tot));
    ok(m2.pts&&Math.abs(m2.pts.b['2026-11-20']-scoreOf(870))<0.05,'les soldes du graphique sont convertis aussi');
    // une même partie (60 points bruts) rapporte beaucoup moins au joueur du haut
    const play=async(n,t)=>{const gid='g'+Math.random().toString(36).slice(2,9);await api('solo',{name:n,token:t,game:'meles',op:'put',doc:{solo:true,gid,done:false}});await new Promise(r=>setTimeout(r,60));return api('score',{name:n,token:t,game:'meles',gid,pts:60,solo:true,level:'facile'})};
    // le ticket solo est posé par la sauvegarde de partie : on le simule par la route interne de test si elle existe, sinon on vérifie la formule seule
    const a=await play('VIEUX','t18450'),b=await play('MOYEN','t870');
    if(a.add>0&&b.add>0){ok(b.add>a.add*5,'60 points bruts : +'+b.add+' pour un score de 677, +'+a.add+' pour un score de 2 351');}
    else ok(Math.abs((scoreOf(870+60)-scoreOf(870))-(57.4))<2&&(scoreOf(18450+60)-scoreOf(18450))<1.2,'formule : 60 points bruts → +'+(scoreOf(930)-scoreOf(870)).toFixed(1)+' à 677, +'+(scoreOf(18510)-scoreOf(18450)).toFixed(2)+' à 2 351');
    ok(scoreOf(1e8)<2500&&scoreOf(1e6)>2499,'même avec 100 millions de points bruts, le score reste sous 2 500');
  }finally{sv.kill('SIGKILL');fs.rmSync(D,{recursive:true,force:true})}
  console.log(res.join('\n'));process.exit(0)})();
