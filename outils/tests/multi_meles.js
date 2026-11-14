// Mots mêlés de 2 à 4 joueurs : salle d'attente, lancement, couleurs, mots trouvés, départ, spectateur.
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/multi_meles.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const SHOT = process.env.SHOT || '/tmp';
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.7.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100); const names = ['MA', 'MB', 'MC', 'MD', 'ME'].map(x => x + sfx);
  const P = []; for (const n of names) { const r = await api('create', { name: n, pin: '2468' }); P.push({ name: n, token: r.token }) }
  const sl = await api('screate', { ...P[0], sname: 'Meles ' + sfx }); for (const p of P.slice(1)) await api('sjoin', { ...p, sname: 'Meles ' + sfx, scode: sl.salon.acode });
  const C = sl.salon.code;
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 500, isMobile: w < 500 }); const p = await c.newPage(); p.on('pageerror', e => errs.push(me.name + ': ' + e.message)); await p.goto(U + '/');
    await p.evaluate(m => { localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')) }, me); return p };
  const st = p => p.evaluate(() => window.__t('({wait:G.wait,n:G.players.length,names:G.players.map(p=>p.name),scores:G.players.map(p=>p.score),me:mySeat(),done:G.done,out:G.out||null,found:Object.keys(G.found).length,words:G.words.length})'));
  const take = (p, k) => p.evaluate(k => window.__t('(()=>{const w=G.words.filter(x=>!G.found[x.w])[' + k + '];const L=w.w.length;finish([w.r,w.c],[w.r+w.dr*(L-1),w.c+w.dc*(L-1)]);return w.w})()'), k);

  const a = await page(P[0]); await a.goto(U + '/' + C + '/meles?go=multi&lvl=moyen'); await sleep(2500);
  const b = await page(P[1]); await b.goto(U + '/' + C + '/meles'); await sleep(2000);
  const c = await page(P[2]); await c.goto(U + '/' + C + '/meles'); await sleep(2500);
  let s = await st(a); ok(s.wait && s.n === 3, 'salle d\'attente : 3 joueurs ' + JSON.stringify(s.names));
  ok(s.words === 11, 'Normal : toujours 11 mots (même dynamique) (' + s.words + ')');
  await b.click('#launchBtn'); await sleep(8000);
  s = await st(a); ok(!s.wait && s.n === 3, 'partie lancée à 3');
  const w1 = await take(c, 0); await sleep(1200); const w2 = await take(a, 0); await sleep(1500);
  s = await st(b); ok(s.found === 2 && s.scores[2] > 0 && s.scores[0] > 0, 'mots trouvés par 2 joueurs (« ' + w1 + ' », « ' + w2 + ' ») ' + JSON.stringify(s.scores));
  const pill = await b.evaluate(() => [...document.querySelectorAll('.wpill')].filter(e => /found-p3/.test(e.className)).length);
  ok(pill === 1, 'mot du 3e joueur barré en violet');
  const cards = await b.evaluate(() => [...document.querySelectorAll('.mm2 .scores2 .sc')].filter(e => getComputedStyle(e).display !== 'none').length);
  ok(cards === 3, '3 cartes de joueurs (' + cards + ')');
  await c.screenshot({ path: SHOT + '/meles_jeu3.png' });
  await c.evaluate(() => window.__t('quitGame()')); await sleep(2000);
  s = await st(a); ok(!s.done && s.out && s.out[2] && s.scores[2] === 0, 'le 3e quitte : 0 point, la partie continue ' + JSON.stringify(s.scores));
  const d = await page(P[3]); await d.goto(U + '/' + C + '/meles'); await sleep(2500);
  s = await st(d); ok(s.me === null && s.n === 3, 'arrivée après le lancement : spectateur');
  await a.evaluate(() => window.__t('G.done=true;G.ended=Date.now();save();render()')); await sleep(1500);
  for (const p of [a, b, c, d]) await p.context().close();

  const ps = []; const a2 = await page(P[0]); ps.push(a2); await a2.goto(U + '/' + C + '/meles?go=multi&lvl=facile'); await sleep(2500);
  for (const k of [1, 2, 3]) { const x = await page(P[k]); ps.push(x); await x.goto(U + '/' + C + '/meles'); await sleep(1800) }
  await sleep(7000); s = await st(a2); ok(!s.wait && s.n === 4, 'salle pleine (4) : lancement automatique');
  for (let k = 0; k < 4; k++) { await take(ps[k], 0); await sleep(1100) }
  await sleep(1000); await ps[0].screenshot({ path: SHOT + '/meles_jeu4.png' });
  const dim = await ps[0].evaluate(() => [...document.querySelectorAll('.mm2 .scores2 .sc')].map(e => e.className + ' ' + getComputedStyle(e).opacity + ' ' + getComputedStyle(e).filter));
  ok(dim.filter(x => /^sc sc\d 1 none$/.test(x)).length === 4, '4 cartes bien visibles ' + JSON.stringify(dim));
  const cols = await ps[0].evaluate(() => [...document.querySelectorAll('.wpill')].map(e => (e.className.match(/found-p(\d)/) || [])[1]).filter(Boolean));
  ok(new Set(cols).size === 4, '4 couleurs de mots trouvés ' + JSON.stringify(cols));
  const e5 = await page(P[4]); await e5.goto(U + '/' + C + '/meles'); await sleep(2500); s = await st(e5); ok(s.me === null, '5e personne : spectateur');
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  console.log(res.join('\n')); await br.close()
})();
