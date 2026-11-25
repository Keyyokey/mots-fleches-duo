// Magnético à 4 joueurs, cas difficiles (25/11) : un joueur recharge la page en pleine partie, un autre ferme l'onglet,
// un calcul (même opération chez tous), fermeture du mot malgré l'absent, classement final identique partout,
// et sur téléphone la réponse à trouver est bien au-dessus des bulles.
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; let ko = 0; const ok = (c, l) => { if (!c) ko++; console.log((c ? '✅ ' : '❌ ') + l); return c };
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const play = p => p.evaluate(() => window.__t(`(()=>{const x=word(cur);for(const t of x.s){const b=balls.find(b=>b.on&&!b.entering&&b.t===t&&!placed.includes(b));if(!b)return "pas encore "+t;pick(b)}document.getElementById("mgOk").click();return "ok"})()`));
const playWhenReady = async p => { for (let i = 0; i < 30; i++) { const r = await play(p); if (r === 'ok') return r; await p.evaluate(() => window.__t('placed.forEach((b,k)=>{if(b&&!locked[k]){queue.push(b);placed[k]=null}});slots()')); await sleep(700) } return 'jamais prêt' };
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 500, isMobile: w < 500, deviceScaleFactor: 2 }); const p = await c.newPage(); p.on('pageerror', e => errs.push(me.name + ': ' + e.message));
    await p.goto(U + '/legal'); await p.evaluate(m => { localStorage.setItem('fl-me', JSON.stringify(m)); localStorage.setItem('fl-tuto-magnetico', '1') }, me); return p };
  const sfx = Math.floor(Math.random() * 900 + 100); const names = ['RA', 'RB', 'RC', 'RD'].map(x => x + sfx);
  const P = []; for (const n of names) { const r = await api('create', { name: n, pin: '2468' }); P.push({ name: n, token: r.token }) }
  const sl = await api('screate', { ...P[0], sname: 'Robuste ' + sfx }); for (const p of P.slice(1)) await api('sjoin', { ...p, sname: 'Robuste ' + sfx, scode: sl.salon.acode });
  const C = sl.salon.code;
  const pg = []; pg[0] = await page(P[0], 1280); await pg[0].goto(U + '/' + C + '/magnetico?go=multi&lvl=normal'); await sleep(2500);
  for (let i = 1; i < 4; i++) { pg[i] = await page(P[i]); await pg[i].goto(U + '/' + C + '/magnetico'); await sleep(1800) }
  const st = p => p.evaluate(() => window.__t('({wait:G.wait,n:G.players.length,sc:G.players.map(p=>p.score),cur,done:G.done,ph:G.wait?"":sched(Date.now()).ph,w:G.wait?"":(word(cur).math?word(cur).eq:word(cur).s.join("-"))})'));
  let s = await st(pg[0]); ok(s.n === 4, 'salle complète à 4 joueurs (la partie démarre toute seule à 4)');
  await pg[1].evaluate(()=>{const b=document.getElementById('launchBtn');if(b&&b.offsetParent)b.click()}); await sleep(11000);
  const all = await Promise.all(pg.map(st)); ok(all.every(x => !x.wait && x.cur === 0 && x.w === all[0].w), 'partie lancée à 4, même mot chez tous (' + all[0].w + ')');
  // téléphone : la réponse est au-dessus des bulles
  const lay = await pg[1].evaluate(() => { const b = document.getElementById('mgBox').getBoundingClientRect(), f = document.getElementById('mgField').getBoundingClientRect(); return { box: Math.round(b.bottom), field: Math.round(f.top) } });
  ok(lay.box <= lay.field, 'téléphone : la réponse à trouver est au-dessus des bulles (' + lay.box + ' ≤ ' + lay.field + ')');
  ok(await playWhenReady(pg[0]) === 'ok', 'RA trouve le mot 1'); await sleep(1200);
  // RB recharge la page en pleine partie
  await pg[1].reload(); await sleep(4500); s = await st(pg[1]); const sA = await st(pg[0]);
  ok(s.cur === sA.cur && s.n === 4 && s.sc[0] === sA.sc[0], 'RB recharge la page : il retrouve la partie, le même mot et les mêmes scores (' + JSON.stringify(s.sc) + ')');
  // RC ferme l'onglet
  await pg[2].context().close(); pg[2] = null;
  ok(await playWhenReady(pg[1]) === 'ok', 'RB (rechargé) trouve aussi'); await pg[3].evaluate(() => window.__t('passWord()'));
  // le mot se ferme malgré l'absent (au plus tard à la fin du chrono de 30 s)
  let closed = false; for (let i = 0; i < 40 && !closed; i++) { await sleep(1000); s = await st(pg[0]); closed = s.ph === 'res' || s.cur === 1 }
  ok(closed, 'le mot se ferme pour tous même si RC est parti');
  for (let i = 0; i < 30; i++) { s = await st(pg[0]); if (s.cur === 1 && (s.ph === 'play' || s.ph === 'entry')) break; await sleep(1000) }
  const w1 = await Promise.all([0, 1, 3].map(i => st(pg[i]))); ok(w1.every(x => x.cur === 1 && x.w === w1[0].w), 'mot 2 en même temps chez les présents (' + w1[0].w + ')');
  const isCalc = await pg[0].evaluate(() => window.__t('!!word(cur).math')); ok(isCalc, 'niveau normal : le 2ᵉ élément est un calcul, même opération pour tous');
  ok(await playWhenReady(pg[3]) === 'ok', 'RD résout le calcul');
  await sleep(1500); const sc = await Promise.all([0, 1, 3].map(i => st(pg[i]))); ok(sc.every(x => JSON.stringify(x.sc) === JSON.stringify(sc[0].sc)), 'scores identiques sur les 3 écrans ' + JSON.stringify(sc[0].sc));
  // fin
  await pg[0].evaluate(() => window.__t('patch("z","end",1,{ifAbsent:true,extra:{done:true,ended:Date.now()}})')); await sleep(2500);
  const ends = await Promise.all([0, 1, 3].map(i => pg[i].evaluate(() => ({ on: document.getElementById('endWin').classList.contains('on'), b: document.getElementById('endB').innerText.replace(/\s+/g, ' ').replace(/·?\s*toi/g, '') }))));
  ok(ends.every(e => e.on), 'fin de partie affichée chez tous'); ok(ends.every(e => e.b === ends[0].b), 'classement final identique partout');
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 4)));
  await br.close(); console.log(ko ? ko + ' échec(s)' : 'tout est bon'); process.exit(ko ? 1 : 0);
})();
