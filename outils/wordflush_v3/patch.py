import sys
P='/home/claude/mots-fleches-duo/public/poker.html'
s=open(P,encoding='utf8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: sys.exit("ANCRE x%d (attendu %d): %s"%(c,n,a[:90]))
    s=s.replace(a,b)
css=open('style.css',encoding='utf8').read(); js=open('extra.js',encoding='utf8').read()
rep('</head>','<style id="wf3">\n'+css+'</style>\n</head>')
# balisage
rep('<div class="pksteps" id="pkSteps"','<div class="wfbar" id="wfBar"><i></i></div>\n        <div class="pksteps" id="pkSteps"')
rep('<div class="wletters" id="pkWL"','<div class="wfbar" id="wfWBar"><i></i></div>\n        <div class="wslots" id="wfSlots" aria-label="Ton mot : touche une tuile pour la retirer"></div>\n        <div class="wletters" id="pkWL"')
rep('<input class="pkin" id="pkIn"','<div class="wtools" id="wfTools"><button type="button" class="wtb" id="wfBack" aria-label="Retirer la dernière lettre">⌫</button><button type="button" class="wtb" id="wfMix">Mélanger</button><button type="button" class="wtb" id="wfClr">Effacer</button><span class="wpts" id="wfPts" hidden></span></div>\n        <input class="pkin" id="pkIn" aria-label="Ton mot"')
rep('<button class="btn" id="pkBest">','<button class="btn gold" id="pkBest">')
rep('touche une lettre pour l\'ajouter)"','touche une tuile pour l\'ajouter)"')
rep('<span class="tag2">Ton mot</span>','<span class="tag2">Ton mot</span><span class="wbadges" id="wfBadges"></span>')
# rendu
rep('function render(){const st=ST;','function render(){const st=ST;document.body.dataset.ph=st&&st.started?st.phase:"";')
rep('$("#pkBoard").innerHTML=(st.board&&st.board.length?st.board:[null,null,null,null,null]).map((c,i)=>card(c,c?"":"slot","b"+i)).join("");',
    '{const bd=st.board&&st.board.length?st.board:[null,null,null,null,null];$("#pkBoard").innerHTML=bd.map((c,i)=>c?card(c,"","b"+i):\'<div class="card-l slot wait" data-ck="b\'+i+\'" data-n="\'+(st.started&&i>2?["4e","5e"][i-3]:"")+\'"></div>\').join("")}')
rep('''$('[data-a="call"]').textContent=owe?"Suivre "+Math.min(owe,me?me.stack:0):"Parole";''',
    '''$('[data-a="call"]').innerHTML=owe?"Suivre<small class='ch'>"+Math.min(owe,me?me.stack:0)+"</small>":"Parole<small>gratuit</small>";$('[data-a="fold"]').innerHTML="Se coucher";''')
rep('''$('[data-a="raise"]').textContent=me&&maxTo>st.bet?"Relancer…":"Relancer";''','''$('[data-a="raise"]').innerHTML="Relancer<small>"+(me&&maxTo>st.bet?"choisir le montant":"impossible")+"</small>";''')
rep('''$('[data-a="allin"]').textContent=me&&me.stack?"Tapis ("+me.stack+")":"Tapis";''','''$('[data-a="allin"]').innerHTML="Tapis"+(me&&me.stack?"<small class='ch'>"+me.stack+"</small>":"");''')
rep('''"<b class='yt'>▶ À toi de jouer</b> · "+(owe?"À payer : <b>"+Math.min(owe,me.stack)+"</b>":"Rien à payer")+" · ton solde <b>"+me.stack+"</b> · pot <b>"+st.pot+"</b>"+(owe>=me.stack?" · <span class='warn'>suivre = tapis</span>":"")+coachTip(st,owe)''',
    '''"<b class='yt'>À toi de jouer</b><span class='wfk'>"+(owe?"À payer <b>"+Math.min(owe,me.stack)+"</b>":"Rien à payer")+"</span><span class='wfk'>Solde <b>"+me.stack+"</b></span><span class='wfk'>Pot <b>"+st.pot+"</b></span>"+(owe>=me.stack?"<span class='wfk warn'>suivre = tapis</span>":"")+coachTip(st,owe)''')
rep('  // phase « mot »\n','  wfRender(st,me,myTurn);\n  // phase « mot »\n')
rep('$("#pkWordCard").classList.toggle("later",st.phase==="mise");','$("#pkWordCard").classList.toggle("later",st.phase==="mise"||!st.started&&st.phase!=="abattage");')
rep('bell();setTimeout(()=>$("#pkIn").focus(),100)}','bell();setTimeout(wfFocus,100)}')
rep('lettersShow(ST,ST.seats?ST.seats[ST.me]:null);setTimeout(()=>$("#pkIn").focus(),50)}});','lettersShow(ST,ST.seats?ST.seats[ST.me]:null);setTimeout(wfFocus,50)}});')
# siège : dernière action en pastille
rep('''(s.last?" · "+esc(s.last):"")+(s.gone?" · parti":"")''','''(s.last&&st.phase==="mise"?'<em class="wfsay '+(/couch/.test(s.last)?"wsf":/relance|tapis/.test(s.last)?"wsr":"wsc")+'">'+esc(s.last)+'</em>':s.last?" · "+esc(s.last):"")+(s.gone?" · parti":"")''')
# horloge
rep('const left=ST.deadline-(Date.now()+skew);\n  $$("[data-clk]")','const left=ST.deadline-(Date.now()+skew);wfTick(left);\n  $$("[data-clk]")')
# verrouillage
rep('''toast("🔒","Mot verrouillé : <b>"+esc(m.w)+"</b>")}}''','''toast("🔒","Mot verrouillé : <b>"+esc(m.w)+"</b>");wfSlots();wfPts(null);if(SOUND){tone(660,.12,.05);tone(880,.12,.05,.1);tone(1320,.3,.06,.2)}}}''')
rep('$("#pkIn").value=v;\n  clearTimeout(CHK);','$("#pkIn").value=v;wfSlots();wfPts(null);\n  clearTimeout(CHK);')
rep('const e=m.r;const c=$("#pkCalc");','const e=m.r;const c=$("#pkCalc");wfPts(e);')
# tuiles du chevalet
a=s.index('function lettersShow(st,me){');b=s.index('document.addEventListener("click",e=>{if(e.target.closest("#pkPrep"))')
new='''function lettersShow(st,me){const w=$("#pkWL");if(!w)return;const on=me&&!me.folded&&me.hand&&(st.phase==="mot"||$("#pkWordCard").classList.contains("prep"))&&!LOCKED;
  const rack=on?wfRack():[],key=rack.map(t=>t.c).join("")+"|"+WF.mixN;
  if(w.dataset.k!==key){w.dataset.k=key;const btn=i=>'<button type="button"'+(rack[i].mine?' class="mine"':'')+' data-k="'+i+'" data-l="'+rack[i].c+'">'+rack[i].c+'<i>'+(LV[rack[i].c]||"")+'</i></button>';
    const mine=rack.map((t,i)=>i).filter(i=>rack[i].mine),com=rack.map((t,i)=>i).filter(i=>!rack[i].mine);if(WF.mixN)for(let i=com.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[com[i],com[j]]=[com[j],com[i]]}
    w.innerHTML=on?mine.map(btn).join("")+'<span class="sep"></span>'+com.map(btn).join(""):""}
  wfSlots()}
document.addEventListener("click",e=>{const b=e.target.closest("#pkWL button");if(b&&!LOCKED&&!b.classList.contains("used")){const i=$("#pkIn");if(i.disabled)return;i.value=(i.value+b.dataset.l).slice(0,7);typed()}});
'''
s=s[:a]+new+js+s[b:]
# relance : le bouton dit ce qu'il va faire
rep('$("#rzTo").textContent=v;','$("#rzTo").textContent=v;$("#rzOk").textContent=v>=RZ.max?"Tapis · "+v:"Relancer à "+v;$("#rzOk").classList.toggle("gold",v>=RZ.max);$("#rzOk").classList.toggle("primary",v<RZ.max);')
open(P,'w',encoding='utf8').write(s);print("ok",len(s))
