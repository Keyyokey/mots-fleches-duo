// Génère les questions « calcul » et « casse-tête » de Culture G (réponses calculées, donc vérifiées)
"use strict";
const fs=require("fs"),crypto=require("crypto");
let S=20261108;const R=()=>{S=(S+0x6D2B79F5)>>>0;let t=S;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const ri=(a,b)=>a+Math.floor(R()*(b-a+1)),pick=a=>a[Math.floor(R()*a.length)];
const nf=n=>{const neg=n<0;n=Math.abs(n);let [i,d]=String(Math.round(n*100)/100).split(".");i=i.replace(/\B(?=(\d{3})+(?!\d))/g," ");return(neg?"−":"")+i+(d?","+d:"")};
const hid=(p,s)=>p+crypto.createHash("sha1").update(s).digest("hex").slice(0,8);
const OUT=[],seenQ=new Set();
function add(k,t,q,good,bad,x){if(seenQ.has(q))return false;const a=[good,...bad];if(new Set(a).size!==4)return false;seenQ.add(q);OUT.push({id:hid(k==="calc"?"kc":"kp",q),k,t,q,a,x,s:"Mots Fléchés Duo (calcul vérifié)"});return true}
// distracteurs numériques proches et plausibles
function near(v,opts){const set=new Set();for(const o of opts){const w=Number.isInteger(v)?Math.round(v+o):v+o;if(w>0&&w!==v&&Number.isFinite(w))set.add(Math.round(w*100)/100);if(set.size===3)break}let s=1;while(set.size<3){const w=v+s*(R()<.5?-1:1)*Math.max(1,Math.round(v*.1));if(w>0&&w!==v)set.add(w);s++}return[...set].slice(0,3)}
const F=(w,u)=>u===" €"&&!Number.isInteger(w)?nf(w).replace(/,(\d)$/,",$10")+u:nf(w)+(u||"");const N=(v,o,u)=>[F(v,u),near(v,o).map(w=>F(w,u))];
const T="Calcul mental";
let guard=0;const want=(k,n,f)=>{let c=0;guard=0;while(c<n&&guard++<n*40)if(f())c++};
// ---------- calculs ----------
want("calc",30,()=>{const p=pick([10,15,20,25,30,40,50,60,75]),n=pick([20,40,60,80,120,160,200,240,300,360,400,480,600,800]);const v=p*n/100;if(v!==Math.round(v))return false;const[g,b]=N(v,[n/10,-n/10,p/5,v/2,-v/2]);return add("calc",T,"Combien font "+p+" % de "+nf(n)+" ?",g,b,p+" % de "+nf(n)+" = "+nf(n)+" × "+p+" ÷ 100 = "+nf(v)+".")});
want("calc",30,()=>{const a=ri(12,29),b=ri(6,19),v=a*b;const[g,bb]=N(v,[10,-10,b,-b,a,-a]);return add("calc",T,"Combien font "+a+" × "+b+" ?",g,bb,a+" × "+b+" = "+a+" × "+(b-b%10||b)+(b%10&&b>=10?" + "+a+" × "+b%10:"")+" = "+nf(v)+".")});
want("calc",20,()=>{const a=ri(11,25),v=a*a;const[g,b]=N(v,[2*a-1,-(2*a-1),10,-10,a]);return add("calc",T,"Combien vaut "+a+" au carré ("+a+"²) ?",g,b,a+"² = "+a+" × "+a+" = "+nf(v)+".")});
want("calc",25,()=>{const b=ri(3,12),v=ri(12,48),a=b*v;const[g,bb]=N(v,[1,-1,2,-2,b]);return add("calc",T,"Combien font "+nf(a)+" ÷ "+b+" ?",g,bb,nf(a)+" ÷ "+b+" = "+nf(v)+" car "+b+" × "+v+" = "+nf(a)+".")});
want("calc",25,()=>{const a=ri(2,20),b=ri(3,12),c=ri(3,9),v=a+b*c,w=(a+b)*c;if(v===w)return false;const bb=[nf(w),nf(v+c),nf(v-b)].filter(z=>z!==nf(v));if(bb.length<3)return false;return add("calc",T,"Combien font "+a+" + "+b+" × "+c+" ?",nf(v),bb,"La multiplication passe avant l'addition : "+b+" × "+c+" = "+(b*c)+", puis "+a+" + "+(b*c)+" = "+v+". (Le piège "+nf(w)+" calcule l'addition d'abord.)")});
want("calc",25,()=>{const h=ri(8,21),m=pick([0,5,10,15,20,25,30,35,40,45,50,55]),d=pick([85,95,100,105,110,118,125,132,140,150]);const tot=h*60+m+d,H=Math.floor(tot/60)%24,M=tot%60;const f=(x,y)=>x+" h "+String(y).padStart(2,"0");const g=f(H,M);const bb=[f(H,(M+10)%60),f((H+1)%24,M),f((H+23)%24,M)];
  return add("calc",T,"Un film commence à "+f(h,m)+" et dure "+d+" minutes. À quelle heure se termine-t-il ?",g,bb,d+" min = "+Math.floor(d/60)+" h "+String(d%60).padStart(2,"0")+". "+f(h,m)+" + "+Math.floor(d/60)+" h "+String(d%60).padStart(2,"0")+" = "+g+".")});
want("calc",20,()=>{const n=ri(2,6),IT=pick([["croissants",[0.9,1.1,1.2,1.3]],["cafés",[1.1,1.2,1.5,1.8,2.5]],["cartes postales",[0.9,1.2,1.5]],["magazines",[2.5,3.2,4.5]],["pains au chocolat",[1.1,1.3,1.4]]]),p=pick(IT[1]),c=Math.round(n*p*100)/100,bil=c<5?5:c<10?10:c<20?20:50,v=Math.round((bil-c)*100)/100;const it=IT[0];const[g,b]=N(v,[p,-p,1,-1,.5,-.5]," €");
  return add("calc",T,"Tu achètes "+n+" "+it+" à "+F(p," €")+" pièce et tu paies avec un billet de "+bil+" €. Combien te rend-on ?",g,b,n+" × "+F(p," €")+" = "+F(c," €")+", et "+bil+" € − "+F(c," €")+" = "+F(v," €")+".")});
want("calc",20,()=>{const v=pick([50,60,70,80,90,100,110,120,130]),t=pick([[1.5,"1 h 30"],[2.5,"2 h 30"],[0.5,"30 minutes"],[1.25,"1 h 15"],[2,"2 heures"],[3,"3 heures"],[0.75,"45 minutes"]]);const d=v*t[0];if(d!==Math.round(d))return false;const[g,b]=N(d,[v/2,-v/2,v,-v,10]," km");
  return add("calc",T,"Une voiture roule à "+v+" km/h pendant "+t[1]+". Quelle distance parcourt-elle ?",g,b,"Distance = vitesse × durée = "+v+" × "+nf(t[0])+" h = "+nf(d)+" km.")});
want("calc",20,()=>{const k=pick(["min","s","cm","g","m"]);let q,v,x;
  if(k==="min"){const h=ri(2,9),m=ri(5,55);v=h*60+m;q="Combien de minutes y a-t-il dans "+h+" h "+m+" ?";x=h+" × 60 + "+m+" = "+v+" minutes."}
  else if(k==="s"){const m=ri(3,25);v=m*60;q="Combien de secondes y a-t-il dans "+m+" minutes ?";x=m+" × 60 = "+v+" secondes."}
  else if(k==="cm"){const m=ri(2,40)/4;v=m*100;q="Combien de centimètres font "+nf(m)+" mètres ?";x=nf(m)+" × 100 = "+nf(v)+" cm."}
  else if(k==="g"){const m=ri(2,30)/4;v=m*1000;q="Combien de grammes font "+nf(m)+" kilos ?";x=nf(m)+" × 1 000 = "+nf(v)+" g."}
  else{const m=ri(3,95)*100;v=m/1000;q="Combien de kilomètres font "+nf(m)+" mètres ?";x=nf(m)+" ÷ 1 000 = "+nf(v)+" km."}
  const[g,b]=N(v,[v*9,-v*0.9,v,v/2,10]);return add("calc",T,q,g,b,x)});
want("calc",20,()=>{const a=ri(5,14),k=pick([2,3,4]),n=pick([5,10,12,15,20]),v=a*k+n;const[g,b]=N(v,[n,-n,a,-a,1,-1]);
  return add("calc",T,"Léa a "+a+" ans. Sa mère a "+k+" fois son âge. Quel âge aura sa mère dans "+n+" ans ?",g,b,"Aujourd'hui : "+a+" × "+k+" = "+(a*k)+" ans. Dans "+n+" ans : "+(a*k)+" + "+n+" = "+v+" ans.")});
want("calc",20,()=>{const v=ri(8,18),d=pick([[-2,0,2],[-3,1,2],[-4,1,3],[-1,-1,2],[-5,2,3]]);const L=d.map(z=>v+z);if(L.reduce((s,z)=>s+z,0)!==3*v)return false;const sc=L.map(z=>z).sort(()=>R()-.5);const[g,b]=N(v,[1,-1,2,-2]);
  return add("calc",T,"Quelle est la moyenne de ces trois notes : "+sc.join(", ")+" ?",g,b,"("+sc.join(" + ")+") ÷ 3 = "+3*v+" ÷ 3 = "+v+".")});
want("calc",15,()=>{const p=pick([10,20,25,30,40,50]),pr=pick([20,30,40,50,60,80,100,120,150,200]),v=pr*(100-p)/100;if(v!==Math.round(v))return false;const[g,b]=N(v,[pr*p/100-v>0?pr*p/100-v:5,-5,5,10,-10]," €");
  return add("calc",T,"Un jean coûte "+pr+" €. Il est soldé à −"+p+" %. Quel est son nouveau prix ?",g,b,"La remise vaut "+p+" % de "+pr+" = "+(pr*p/100)+" €, donc "+pr+" − "+(pr*p/100)+" = "+v+" €.")});
// ---------- casse-tête ----------
const P="Casse-tête";
const seq=(L,v,rule,o)=>{const[g,b]=N(v,o);return add("puz",P,"Quel nombre complète la suite : "+L.map(nf).join(", ")+", … ?",g,b,rule)};
want("puz",25,()=>{const a=ri(1,30),d=ri(3,13),L=[0,1,2,3,4].map(i=>a+i*d);return seq(L,a+5*d,"On ajoute "+d+" à chaque fois : "+nf(L[4])+" + "+d+" = "+nf(a+5*d)+".",[d,-d,1,-1,2*d])});
want("puz",15,()=>{const a=ri(1,5),r=pick([2,3]),L=[0,1,2,3].map(i=>a*r**i),v=a*r**4;return seq(L,v,"On multiplie par "+r+" à chaque fois : "+nf(L[3])+" × "+r+" = "+nf(v)+".",[L[3],-L[3]/2,r*2,-r])});
want("puz",12,()=>{const s=ri(1,6),L=[0,1,2,3,4].map(i=>(s+i)**2),v=(s+5)**2;return seq(L,v,"Ce sont les carrés : "+(s)+"², "+(s+1)+"², … donc "+(s+5)+"² = "+v+".",[2,-2,s+5,-(s+5),10])});
want("puz",15,()=>{const a=ri(1,6),b=ri(1,8),L=[a,b];while(L.length<6)L.push(L[L.length-1]+L[L.length-2]);const v=L[5];return seq(L.slice(0,5),v,"Chaque nombre est la somme des deux précédents : "+L[3]+" + "+L[4]+" = "+v+".",[L[3]-L[4]+L[4]>0?1:2,-1,L[2],-2,3])});
want("puz",15,()=>{const a=ri(1,20),s=ri(1,3),L=[a];let d=s;for(let i=0;i<4;i++){L.push(L[L.length-1]+d);d++}const v=L[4]+d;return seq(L,v,"L'écart augmente de 1 à chaque fois (+"+s+", +"+(s+1)+", +"+(s+2)+", +"+(s+3)+"), donc on ajoute "+d+" : "+L[4]+" + "+d+" = "+v+".",[-1,1,2,-2,d])});
want("puz",12,()=>{const a=ri(10,40),u=ri(5,12),w=ri(2,u-1),L=[a];for(let i=0;i<5;i++)L.push(L[i]+(i%2?-w:u));const v=L[5]+(5%2?-w:u);return seq(L.slice(0,5).concat([L[5]]).slice(0,5),L[5],"On ajoute "+u+" puis on retire "+w+", en alternance : "+L[4]+" + "+u+" = "+L[5]+".",[-u,w,-w,u-w])});
const AB="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
want("puz",15,()=>{const st=ri(1,3),dir=R()<.7?1:-1,s0=dir>0?ri(0,25-st*5):ri(st*5,25);const L=[0,1,2,3].map(i=>AB[s0+dir*st*i]),v=AB[s0+dir*st*4];const b=[AB[s0+dir*(st*4+1)],AB[s0+dir*(st*4-1)],AB[s0+dir*(st*5)]].filter(Boolean).filter(z=>z!==v);if(b.length<3)return false;
  return add("puz",P,"Quelle lettre complète la suite : "+L.join(", ")+", … ?",v,b,"On "+(dir>0?"avance":"recule")+" de "+st+" lettre"+(st>1?"s":"")+" dans l'alphabet à chaque fois : la suivante est "+v+".")});
const JR=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
want("puz",15,()=>{const d=ri(0,6),n=pick([10,15,17,20,23,25,30,40,45,50,100]),v=JR[(d+n)%7];const b=[JR[(d+n+1)%7],JR[(d+n+6)%7],JR[(d+n+3)%7]];
  return add("puz",P,"Nous sommes "+JR[d]+". Quel jour serons-nous dans "+n+" jours ?",v[0].toUpperCase()+v.slice(1),b.map(z=>z[0].toUpperCase()+z.slice(1)),n+" = 7 × "+Math.floor(n/7)+" + "+n%7+" : les semaines entières ne changent rien, il reste "+n%7+" jour"+(n%7>1?"s":"")+" à compter après "+JR[d]+".")});
// anagrammes : mots des thèmes des mots mêlés
const src=fs.readFileSync(process.argv[2],"utf8"),TH=eval("("+src.match(/const THEMES=(\{[\s\S]*?\n\});/)[1]+")");
const sig=w=>w.split("").sort().join("");
const cap=w=>w[0]+w.slice(1).toLowerCase();
want("puz",60,()=>{const th=pick(Object.keys(TH)),W=TH[th].filter(w=>w.length>=5&&w.length<=9);if(W.length<4)return false;const w=pick(W);let sh;let k=0;do{sh=w.split("").sort(()=>R()-.5).join("")}while((sh===w)&&k++<20);if(sh===w)return false;
  const others=W.filter(z=>z!==w&&sig(z)!==sig(w)&&Math.abs(z.length-w.length)<=1).sort(()=>R()-.5).slice(0,3);if(others.length<3)return false;
  return add("puz",P,"Anagramme (thème « "+th+" ») : quel mot se cache derrière "+sh+" ?",cap(w),others.map(cap),"En remettant les lettres de "+sh+" dans l'ordre, on obtient "+w+".")});
// énigmes classiques (réponses vérifiées à la main)
const EN=[
["Un escargot est au fond d'un puits de 10 m. Chaque jour il monte de 3 m, chaque nuit il glisse de 2 m. En combien de jours sort-il ?","8 jours",["10 jours","7 jours","9 jours"],"Après 7 jours et 7 nuits il est à 7 m ; le 8e jour il monte de 3 m et atteint 10 m : il sort sans glisser."],
["Une batte et une balle coûtent 1,10 € en tout. La batte coûte 1 € de plus que la balle. Combien coûte la balle ?","0,05 €",["0,10 €","0,15 €","0,01 €"],"Balle = x, batte = x + 1. 2x + 1 = 1,10 donc x = 0,05 €. (0,10 € donnerait 1,20 € en tout.)"],
["5 machines fabriquent 5 objets en 5 minutes. Combien de temps faut-il à 100 machines pour fabriquer 100 objets ?","5 minutes",["100 minutes","20 minutes","1 minute"],"Chaque machine fabrique un objet en 5 minutes ; 100 machines font donc 100 objets en 5 minutes."],
["Un nénuphar double de surface chaque jour. Il couvre tout l'étang en 48 jours. En combien de jours en couvre-t-il la moitié ?","47 jours",["24 jours","46 jours","12 jours"],"Comme il double chaque jour, il couvrait la moitié la veille : au 47e jour."],
["Dans une course, tu doubles le 2e. Quelle est ta place ?","2e",["1er","3e","Ça dépend"],"Tu prends la place de celui que tu doubles : la 2e."],
["Combien de fois peut-on retirer 2 de 10 ?","Une seule fois",["5 fois","4 fois","Autant qu'on veut"],"Après la première fois, on ne retire plus 2 de 10 mais de 8."],
["Un fermier a 17 moutons. Tous sauf 9 s'enfuient. Combien lui en reste-t-il ?","9",["8","17","0"],"« Tous sauf 9 » s'enfuient : il en reste 9."],
["Le père de Marie a 5 filles : Nana, Néné, Nini, Nono. Comment s'appelle la 5e ?","Marie",["Nunu","Nina","On ne peut pas savoir"],"C'est le père de Marie : la 5e fille est Marie elle-même."],
["Qu'est-ce qui est plus lourd : un kilo de plumes ou un kilo de plomb ?","Ils pèsent pareil",["Le plomb","Les plumes","Ça dépend de l'altitude"],"Un kilo reste un kilo, quelle que soit la matière."],
["Combien de mois de l'année ont 28 jours ?","12",["1","2","Ça dépend des années"],"Tous les mois ont au moins 28 jours."],
["Un médecin te donne 3 comprimés à prendre toutes les demi-heures. En combien de temps les as-tu tous pris ?","1 heure",["1 h 30","2 heures","30 minutes"],"Un tout de suite, un après 30 min, le dernier après 1 h."],
["Si 3 chats attrapent 3 souris en 3 minutes, combien de chats faut-il pour attraper 100 souris en 100 minutes ?","3 chats",["100 chats","33 chats","10 chats"],"3 chats attrapent 1 souris par minute à eux trois : en 100 minutes, 100 souris."],
["Combien de fois le chiffre 9 apparaît-il quand on écrit les nombres de 1 à 100 ?","20 fois",["10 fois","11 fois","19 fois"],"10 fois en unité (9, 19, …, 99) et 10 fois en dizaine (90 à 99) : 20 en tout."],
["Je suis un nombre. Multiplié par 3 puis augmenté de 4, je donne 25. Qui suis-je ?","7",["9","6","8"],"25 − 4 = 21 et 21 ÷ 3 = 7."],
["Une horloge sonne 6 coups en 5 secondes. Combien de temps lui faut-il pour sonner 12 coups ?","11 secondes",["10 secondes","12 secondes","9 secondes"],"6 coups = 5 intervalles d'1 s. 12 coups = 11 intervalles, donc 11 secondes."],
["Combien de poignées de main échangent 5 personnes si chacune serre la main de toutes les autres une fois ?","10",["20","25","5"],"5 × 4 ÷ 2 = 10 (chaque poignée de main est partagée par deux personnes)."],
["Quel est le plus petit nombre entier divisible à la fois par 2, 3, 4, 5 et 6 ?","60",["120","30","12"],"Le plus petit multiple commun de 4, 3 et 5 est 60, et 60 est aussi divisible par 2 et 6."],
["Un livre et un stylo coûtent 12 €. Le livre coûte 2 fois plus que le stylo. Combien coûte le stylo ?","4 €",["6 €","3 €","2 €"],"Stylo = x, livre = 2x : 3x = 12 donc x = 4 €."]];
EN.forEach(([q,g,b,x])=>add("puz",P,q,g,b,x));
const c=OUT.reduce((m,q)=>(m[q.k]=(m[q.k]||0)+1,m),{});console.error(c);
fs.writeFileSync(process.argv[3],JSON.stringify(OUT));
