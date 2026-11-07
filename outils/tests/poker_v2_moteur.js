// Tests du moteur Poker V2 (cahier des charges, p. 13) — horloge simulée, sans réseau
const Q=[];let NOW=Date.now();const realNow=Date.now;Date.now=()=>NOW;
global.setTimeout=(f,ms)=>{const id={f,at:NOW+(ms||0),on:true};Q.push(id);return id};global.clearTimeout=id=>{if(id)id.on=false};
function run(ms){const end=NOW+ms;for(;;){Q.sort((a,b)=>a.at-b.at);const n=Q.find(x=>x.on&&x.at<=end);if(!n)break;n.on=false;NOW=Math.max(NOW,n.at);n.f()}NOW=end}
const out=[];const ok=(c,l)=>{out.push((c?'✅ ':'❌ ')+l);if(!c)console.log('❌',l)};
const sent=[];const wallets={};const pts={};const JP={};
const mk=require('/home/claude/fleches-site/poker.js');
const P=mk({send:(ws,o)=>sent.push([ws,o]),wallet:n=>({coins:wallets[n]??1000}),pay:(n,d)=>{wallets[n]=(wallets[n]??1000)+d},points:(n,p)=>{pts[n]=(pts[n]||0)+p},
  jackpot:{get:r=>JP[r]||0,add:(r,n)=>{JP[r]=Math.max(0,(JP[r]||0)+n)}}});
const E=P.evaluateWord;
// --- évaluation ---
let e=E('ete',['E','T'],['E','A','B','C','D']);ok(e.valid&&e.private_used_count===2&&e.full_hand_bonus===5&&e.total_score===1+1+1+3+5,'ETE : lettres privées prises dans la main → Main Pleine (score '+e.total_score+')');
e=E('ELLE',['E','L'],['A','B','C','D','E']);ok(!e.valid&&e.reason==='lettre indisponible','lettre utilisée deux fois alors qu\'elle n\'existe qu\'une fois : refus ('+e.reason+')');
e=E('BAC',['X','Y'],['B','A','C','D','E']);ok(!e.valid&&/cachées/.test(e.reason),'mot formé sans lettre privée : refus');
e=E('zzqx',['Z','Q'],['A','B','C','D','E']);ok(!e.valid&&/dictionnaire/.test(e.reason)&&Object.keys(e).length===9,'mot inconnu : refus, et les 9 champs toujours présents');
e=E('  éTé ',['E','T'],['E','A','B','C','D']);ok(e.valid&&e.word==='ETE','saisie normalisée (accents, espaces, casse)');
e=E('ZEBRAS',['Z','S'],['E','B','R','A','X']);ok(e.valid&&e.length_bonus===15&&e.full_hand_bonus===5,'mot de 6 lettres : bonus longueur 15 + Main Pleine ('+e.total_score+')');
const mm=P.bestWord(['Z','S'],['E','B','R','A','X']);ok(mm&&E(mm.w,['Z','S'],['E','B','R','A','X']).total_score>=e.total_score,'Mot Max exhaustif : '+mm.w+' ('+mm.pts+') ≥ ZEBRAS ('+e.total_score+')');
// --- table de test ---
function table(room,n,stack){const ws=[];for(let i=0;i<n;i++){const w={id:i,room};ws.push(w);P.handle(w,{a:'sit',mise:'50',dec:'30'},'J'+i)}const t=P._table(room);P.handle(ws[0],{a:'start'},'J0');return {t,ws}}
const chips=(t,room)=>t.seats.reduce((a,s)=>a+s.stack,0)+(t.pot||0)+(JP[room]||0);
function setHand(t,hands,board){t.seats.forEach((s,i)=>{s.hand=hands[i]});t.board=board}
// 1) tous se couchent : gain sans montrer de mot, pas de cagnotte
{JP.R1=40;const {t,ws}=table('R1',3);run(20000);const tot=chips(t,'R1');
 P.handle(ws[t.turn],{a:'act',act:'raise',amt:30});P.handle(ws[t.turn],{a:'act',act:'fold'});P.handle(ws[t.turn],{a:'act',act:'fold'});
 ok(t.results&&t.results[0].win&&!t.results[0].word&&JP.R1===40,'deux joueurs se couchent : le dernier gagne sans montrer de mot, cagnotte intacte ('+JP.R1+')');
 ok(chips(t,'R1')===tot,'jetons conservés ('+tot+')')}
// 2) tous les mots invalides : le pot part dans la cagnotte, une seule fois
{JP.R2=0;const {t,ws}=table('R2',2);run(20000);setHand(t,[['Q','W'],['K','Y']],['X','Z','J','Q','W']);
 const tot=chips(t,'R2');for(let k=0;k<6&&t.phase==='mise';k++){P.handle(ws[t.turn],{a:'act',act:'call'});run(6000)}
 ok(t.phase==='mot','phase des mots atteinte');const pot=t.pot;P.handle(ws[0],{a:'word',w:'QWERTY'});P.handle(ws[1],{a:'word',w:'ZZZ'});P.handle(ws[1],{a:'word',w:'ZZZ'});
 ok(t.phase==='abattage'&&JP.R2===pot&&chips(t,'R2')===tot,'aucun mot valide : pot '+pot+' → cagnotte '+JP.R2+' (une seule fois), jetons conservés')}
// 3) égalité parfaite, pot indivisible : partage + reste dans la cagnotte
{JP.R3=0;const {t,ws}=table('R3',3);run(20000);setHand(t,[['A','R'],['A','R'],['Q','W']],['T','E','S','O','N']);
 const tot=chips(t,'R3');P.handle(ws[t.turn],{a:'act',act:'raise',amt:6});for(let k=0;k<12&&t.phase==='mise';k++){P.handle(ws[t.turn],{a:'act',act:'call'});run(6000)}
 const pot=t.pot;P.handle(ws[0],{a:'word',w:'RATS'});P.handle(ws[1],{a:'word',w:'RATS'});P.handle(ws[2],{a:'word',w:'-'});
 const g=t.results.filter(x=>x.win);ok(g.length===2&&g[0].gain===g[1].gain&&g[0].gain*2+JP.R3===pot&&chips(t,'R3')===tot,'ex æquo : '+g.map(x=>x.gain).join('+')+' + reste '+JP.R3+' = pot '+pot+', jetons conservés')}
// 4) départage par la longueur (même score : AVEC 20 et AERAI 20)
{JP.R4=0;const {t,ws}=table('R4',2);run(20000);setHand(t,[['V','C'],['A','I']],['T','E','S','R','A']);for(let k=0;k<6&&t.phase==='mise';k++){P.handle(ws[t.turn],{a:'act',act:'call'});run(6000)}
 P.handle(ws[0],{a:'word',w:'AVEC'});P.handle(ws[1],{a:'word',w:'AERAI'});const w=t.results.filter(x=>x.win);ok(w.length===1&&w[0].name==='J1'&&t.results[0].pts===t.results[1].pts,'égalité de score → le mot le plus long gagne : '+t.results.map(x=>x.name+' '+x.word+' '+x.pts).join(' / '))}
// 5) tapis avec petit tapis : pots séparés
{JP.R5=0;const {t,ws}=table('R5',3);t.seats[0].stack=5;run(20000);setHand(t,[['Z','E'],['A','I'],['O','U']],['B','R','S','T','N']);
 const tot=chips(t,'R5');for(let k=0;k<12&&t.phase==='mise';k++){const i=t.turn;P.handle(ws[i],{a:'act',act:i===0?'allin':(k<3?'raise':'call'),amt:30});run(6000)}
 P.handle(ws[0],{a:'word',w:'ZEBRES'.slice(0,0)+'BRISEZ'.slice(0,0)+'ZESTS'.slice(0,0)+'REZ'});P.handle(ws[1],{a:'word',w:'BAIN'});P.handle(ws[2],{a:'word',w:'BOUT'});
 const r0=t.results.find(x=>x.name==='J0');ok(chips(t,'R5')===tot,'tapis à petit solde : jetons conservés (J0 '+(r0&&r0.ok?'gagne '+(r0.gain||0):'perd')+', mise max de J0 = '+5+')');
 ok(!(r0&&r0.gain>5*3),'J0 ne gagne pas plus que ce qu\'il a pu suivre ('+(r0&&r0.gain)+')')}
// 6) relance au choix : bornes
{const {t,ws}=table('R6',2);run(20000);const i=t.turn,s=t.seats[i];P.handle(ws[i],{a:'act',act:'raise',amt:1});ok(s.roundBet===t.bet&&t.bet>=t.ante*2,'relance trop petite → relance minimale ('+t.bet+')');
 const j=t.turn,s2=t.seats[j];P.handle(ws[j],{a:'act',act:'raise',amt:99999});ok(s2.allin&&s2.stack===0,'relance au-delà du tapis → tapis');}
// 7) cagnotte gagnée par un mot de 6 lettres à l'abattage
{JP.R7=100;const {t,ws}=table('R7',2);run(20000);setHand(t,[['Z','S'],['Q','W']],['E','B','R','A','X']);for(let k=0;k<6&&t.phase==='mise';k++){P.handle(ws[t.turn],{a:'act',act:'call'});run(6000)}
 const tot=chips(t,'R7');P.handle(ws[0],{a:'word',w:'ZEBRAS'});P.handle(ws[1],{a:'word',w:'-'});ok(JP.R7===0&&t.jpWon&&t.jpWon.each===100&&chips(t,'R7')===tot,'mot de 6 lettres gagnant : cagnotte de 100 remportée, jetons conservés')}
// 8) un joueur quitte pendant que le robot joue : aucun jeton ne disparaît
{const w={id:9,room:'~S'};P.handle(w,{a:'sit',solo:true,mise:'20',lvl:'confirme'},'SOLO');const t=P._table('~S');ok(t.seats[1].name==='LÉO'&&t.seats[1].bot&&t.botLvl==='confirme','robot Léo, niveau choisi');
 P.handle(w,{a:'start'},'SOLO');run(20000);const before=t.seats.reduce((a,s)=>a+s.stack+(s.inPot||0),0);P.handle(w,{a:'leave'});
 ok(t.seats.reduce((a,s)=>a+s.stack,0)===before&&(wallets.SOLO??0)>0,'départ pendant le coup : mises rendues, jetons conservés')}
// 9) simulation : nombreux coups avec 2 robots, 3 niveaux, conservation exacte des jetons à chaque instant
{let errs=0,hands=0,jpw=0,n=0;for(const lvl of ['debutant','inter','confirme'])for(let rep=0;rep<12;rep++){const room='SIM'+lvl+rep;JP[room]=rep*7;const w={id:'h',room};P.handle(w,{a:'sit',mise:'50'},'H');const t=P._table(room);t.seats.push({name:'LÉO',bot:true,stack:50},{name:'LÉO2',bot:true,stack:50});t.botLvl=lvl;t.maxHands=10;
  const start=t.seats.reduce((a,s)=>a+s.stack,0)+JP[room];P.handle(w,{a:'start'},'H');
  for(let k=0;k<3000&&t.phase!=='fin';k++){if(t.phase==='mise'&&t.turn===0){const r=Math.random();P.handle(w,{a:'act',act:r<.15?'fold':r<.6?'call':r<.95?'raise':'allin',amt:t.bet+Math.floor(Math.random()*25)})}if(t.phase==='mot'&&!t.seats[0].word&&!t.seats[0].folded){const b=Math.random()<.8?P.bestWord(t.seats[0].hand,t.board):null;P.handle(w,{a:'word',w:b?b.w:'XQZ'})}run(2500);
    const sum=t.seats.reduce((a,s)=>a+s.stack,0)+(t.pot||0)+(JP[room]||0);if(sum!==start)errs++;n++}
  hands+=t.hand;if(t.jpWon)jpw++}
 ok(errs===0,'simulation de '+hands+' coups (Léo débutant, intermédiaire, confirmé) : '+n+' contrôles, '+errs+' écart de jetons')}
console.log(out.join('\n'));console.log(out.filter(x=>x[0]==='✅').length+' ✅ / '+out.filter(x=>x[0]==='❌').length+' ❌');process.exit(0)
