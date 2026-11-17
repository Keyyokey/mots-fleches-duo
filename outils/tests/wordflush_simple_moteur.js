// Wordflush simplifié (17/11/2026) : S'arrêter / Miser, 2 tours de mise (3 lettres, puis les 2 dernières), bonus du mot le plus long
// Lancer : node outils/tests/wordflush_simple_moteur.js (horloge simulée, sans réseau)
const Q=[];let NOW=Date.now();Date.now=()=>NOW;
global.setTimeout=(f,ms)=>{const id={f,at:NOW+(ms||0),on:true};Q.push(id);return id};global.clearTimeout=id=>{if(id)id.on=false};
function run(ms){const end=NOW+ms;for(;;){Q.sort((a,b)=>a.at-b.at);const n=Q.find(x=>x.on&&x.at<=end);if(!n)break;n.on=false;NOW=Math.max(NOW,n.at);n.f()}NOW=end}
let ko=0;const ok=(c,l)=>{if(!c)ko++;console.log((c?'✅ ':'❌ ')+l)};
const JP={};const P=require(require('path').join(__dirname,'../../poker.js'))({send:()=>{},wallet:()=>({coins:1000}),pay:()=>{},points:()=>{},jackpot:{get:r=>JP[r]||0,add:(r,n)=>{JP[r]=Math.max(0,(JP[r]||0)+n)}}});
function table(room,n){const ws=[];for(let i=0;i<n;i++){const w={id:i,room};ws.push(w);P.handle(w,{a:'sit',mise:'20',dec:'30'},'J'+i)}const t=P._table(room);P.handle(ws[0],{a:'start'},'J0');return{t,ws}}
const chips=(t,room)=>t.seats.reduce((a,s)=>a+s.stack,0)+(t.pot||0)+(JP[room]||0);
// 1) déroulé complet à 2 joueurs
{const {t,ws}=table('S1',2);run(20000);const tot=chips(t,'S1'),min=t.ante*2;
 ok(t.phase==='mise'&&t.shown===3&&t.round===1,'1er tour de mise après 3 lettres');
 ok(t.pot===2*t.ante,'mise de départ de chacun dans le pot ('+t.pot+')');
 const a=t.turn;P.handle(ws[a],{a:'act',act:'bet',amt:1});ok(t.seats[a].roundBet===min,'miser moins que le minimum → mise minimale ('+t.seats[a].roundBet+' = 2 × '+t.ante+')');
 const b=t.turn;P.handle(ws[b],{a:'act',act:'bet',amt:min+3});ok(t.bet===min+3&&t.phase==='mise'&&t.turn===a,'mise plus haute (+3) : le premier doit égaler ou s\'arrêter');
 P.handle(ws[a],{a:'act',act:'bet',amt:min+3});run(1);ok(t.shown===5&&t.round===2&&t.phase==='mise','égalité → l\'Académicien retourne les 2 dernières lettres d\'un coup, 2e tour de mise ('+t.msg+')');
 P.handle(ws[t.turn],{a:'act',act:'call'});P.handle(ws[t.turn],{a:'act',act:'bet'});ok(t.phase==='mot','2e tour terminé → phase du mot');
 t.seats[0].hand=['Z','S'];t.seats[1].hand=['T','E'];t.board=['E','B','R','A','X'];
 P.handle(ws[0],{a:'word',w:'ZEBRAS'});P.handle(ws[1],{a:'word',w:'ETE'});
 const r0=t.results.find(x=>x.name==='J0'),r1=t.results.find(x=>x.name==='J1');
 ok(r0.win&&r0.longBonus===3&&!r1.longBonus,'mot le plus long (ZEBRAS) : +3 jetons ('+t.msg+')');
 ok(chips(t,'S1')===tot+3,'jetons conservés + 3 offerts par l\'Académicien')}
// 2) tous les autres s'arrêtent : le dernier prend le pot sans montrer de mot
{const {t,ws}=table('S2',3);run(20000);P.handle(ws[t.turn],{a:'act',act:'bet'});P.handle(ws[t.turn],{a:'act',act:'fold'});P.handle(ws[t.turn],{a:'act',act:'fold'});
 ok(t.results&&t.results[0].win&&!t.results[0].word,'les autres s\'arrêtent → le pot sans montrer de mot')}
// 3) personne n'a misé : impossible de « passer » gratuitement, le temps écoulé = s'arrêter
{const {t,ws}=table('S3',2);run(20000);const i=t.turn;for(let k=0;k<120&&t.phase==='mise';k++)run(1000);ok(t.seats[i].folded&&/arr/.test(t.seats[i].last),'temps écoulé → le joueur s\'arrête ('+t.seats[i].last+')')}
// 4) on ne peut pas miser plus que son solde
{const {t,ws}=table('S4',2);run(20000);const i=t.turn,st=t.seats[i].stack;P.handle(ws[i],{a:'act',act:'bet',amt:9999});ok(t.seats[i].stack===0&&t.seats[i].allin,'mise au-delà du solde → mise tout ('+st+')')}
console.log(ko?ko+' échec(s)':'tout est bon');process.exit(ko?1:0);
