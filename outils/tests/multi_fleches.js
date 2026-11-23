// Mots fléchés de 2 à 4 joueurs : salle d'attente, lancement, tours, couleurs, spectateur, départ d'un joueur.
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/multi_fleches.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const SHOT = process.env.SHOT || '/tmp';
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.8.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'}); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100); const names = ['AA', 'BB', 'CC', 'DD', 'EE'].map(x => x + sfx);
  const P = []; for (const n of names) { const r = await api('create', { name: n, pin: '1357' }); P.push({ name: n, token: r.token }) }
  const sl = await api('screate', { ...P[0], sname: 'Multi ' + sfx }); for (const p of P.slice(1)) await api('sjoin', { ...p, sname: 'Multi ' + sfx, scode: sl.salon.acode });
  const C = sl.salon.code;
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 500, isMobile: w < 500 }); const p = await c.newPage(); p.on('pageerror', e => errs.push(me.name + ': ' + e.message)); await p.goto(U + '/');
    await p.evaluate(m => { localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')) }, me); return p };
  const st = p => p.evaluate(() => window.__t('({wait:G.wait,n:G.players.length,names:G.players.map(p=>p.name),turn:G.turn,me:mySeat(),done:G.done,dur:dur(),tours:maxTours(),out:G.out||null,msg:G.msg})'));

  // --- partie à 3 : A propose, B et C arrivent, C lance
  const a = await page(P[0]); await a.goto(U + '/' + C + '/fleches?go=multi&lvl=normal'); await sleep(2500);
  const b = await page(P[1]); await b.goto(U + '/' + C + '/fleches'); await sleep(2000);
  const c = await page(P[2]); await c.goto(U + '/' + C + '/fleches'); await sleep(2500);
  let s = await st(a); ok(s.wait && s.n === 3, 'salle d\'attente : 3 joueurs inscrits ' + JSON.stringify(s.names));
  const lb = await c.evaluate(() => ({ rows: document.querySelectorAll('#lobbyList .lrow').length, btn: document.querySelector('#launchBtn').textContent, dis: document.querySelector('#launchBtn').disabled }));
  ok(lb.rows === 4 && !lb.dis && /3 joueurs/.test(lb.btn), 'liste de la salle (3 + place libre) et bouton « ' + lb.btn + ' »');
  await c.screenshot({ path: SHOT + '/multi_salle.png' });
  await c.click('#launchBtn'); await sleep(8000);
  s = await st(a); ok(!s.wait && s.n === 3 && !s.done, 'partie lancée à 3');
  ok(s.dur === 50 && s.tours === 1, 'Normal à 3 : 50 s par tour, 1 tour chacun (' + s.dur + ' s, ' + s.tours + ')');
  const cards = await b.evaluate(() => [...document.querySelectorAll('.scores2 .sc')].filter(e => e.style.display !== 'none').length);
  ok(cards === 3, '3 cartes de joueurs affichées (' + cards + ')');
  const multi = await b.evaluate(() => document.querySelector('.fl2').classList.contains('multi'));
  ok(multi, 'mise en page « plusieurs joueurs » sur téléphone');
  // le joueur dont c'est le tour passe : le tour va au suivant
  const pages = [a, b, c]; let t0 = s.turn; await pages[t0].evaluate(() => window.__t('pass()')); await sleep(1500);
  s = await st(a); ok(s.turn === (t0 + 1) % 3, 'après « passer », le tour va au joueur suivant (' + t0 + ' → ' + s.turn + ')');
  await pages[s.turn].screenshot({ path: SHOT + '/multi_jeu3.png' });
  // un spectateur arrive (D) : il ne rejoint pas une partie lancée
  const d = await page(P[3]); await d.goto(U + '/' + C + '/fleches'); await sleep(2500);
  s = await st(d); ok(s.me === null && s.n === 3, 'arrivée après le lancement : spectateur (pas d\'ajout)');
  const spec = await d.evaluate(() => { const e = document.querySelector('#specBar'); return e && e.style.display !== 'none' ? e.textContent : '' });
  ok(/tu regardes/.test(spec), 'bandeau spectateur : « ' + spec.slice(0, 40) + '… »');
  // un joueur quitte : la partie continue à 2, il garde ses points
  const q = (s.turn + 1) % 3; const qn = s.names[q]; await pages[q].evaluate(() => window.__t('quitGame()')); await sleep(2000);
  s = await st(a); ok(!s.done && s.out && s.out[q], qn + ' quitte : la partie continue sans lui');
  const sq = await a.evaluate(q => window.__t('G.players['+q+'].score'), q); ok(sq === 0, 'il repart avec 0 point (' + sq + ')');
  for (let k = 0; k < 2; k++) { const t = (await st(a)).turn; ok(t !== q, 'son tour est sauté (tour ' + t + ')'); await pages[t].evaluate(() => window.__t('pass()')); await sleep(1300) }
  await a.evaluate(() => window.__t('finish("Fin du test");save();render()')); await sleep(1500);
  s = await st(c); ok(s.done, 'fin de partie vue par tous');
  const endRows = await c.evaluate(() => document.querySelectorAll('#endB .endrow .rk').length); ok(endRows === 3, 'classement numéroté de 3 joueurs (' + endRows + ')');
  await c.screenshot({ path: SHOT + '/multi_fin.png' });
  for (const p of [a, b, c, d]) await p.context().close();

  // --- partie à 4 : lancement automatique quand la salle est pleine ; le 5e est spectateur
  const ps = []; const a2 = await page(P[0]); ps.push(a2); await a2.goto(U + '/' + C + '/fleches?go=multi&lvl=facile'); await sleep(2500);
  for (const k of [1, 2, 3]) { const x = await page(P[k]); ps.push(x); await x.goto(U + '/' + C + '/fleches'); await sleep(1800) }
  await sleep(7000); s = await st(a2); ok(!s.wait && s.n === 4, 'salle pleine (4) : lancement automatique ' + JSON.stringify(s.names));
  ok(s.dur === 35, 'Facile à 4 : 35 s par tour (' + s.dur + ')');
  const e5 = await page(P[4]); await e5.goto(U + '/' + C + '/fleches'); await sleep(2500); s = await st(e5); ok(s.me === null && s.n === 4, '5e personne : spectateur');
  await ps[s.turn].screenshot({ path: SHOT + '/multi_jeu4.png' });
  const pc = await ps[0].evaluate(() => [...document.querySelectorAll('.scores2 .sc')].filter(e => e.style.display !== 'none').map(e => getComputedStyle(e.querySelector('.pi')).backgroundColor));
  ok(pc.length === 4 && new Set(pc).size === 4, '4 couleurs différentes ' + JSON.stringify(pc));
  // perte de connexion : un joueur ferme sa page, il sort de la partie au bout d'une minute (0 point)
  const lostN = (await st(ps[0])).names[3]; await ps[3].context().close(); await sleep(68000);
  s = await st(ps[0]); ok(s.out && s.out[3] && !s.done, lostN + ' perd la connexion : sorti après 1 minute, la partie continue');
  // ordinateur : même partie, 4 cartes en colonne
  const pcw = await page(P[0], 1280); await pcw.goto(U + '/' + C + '/fleches'); await sleep(2500);
  await pcw.screenshot({ path: SHOT + '/multi_pc.png' });
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  console.log(res.join('\n')); await br.close()
})();
