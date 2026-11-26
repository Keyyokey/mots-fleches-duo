// « Jouer » depuis l'accueil (go=multi) ne remplace jamais une partie active du salon : on rejoint la salle d'attente,
// ou on regarde la partie en cours. Mots fléchés et mots mêlés.
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/jouer_ne_casse_pas.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.5.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'}); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100); const P = [];
  for (const n of ['JA', 'JB', 'JC'].map(x => x + sfx)) { const r = await api('create', { name: n, pin: '1593' }); P.push({ name: n, token: r.token }) }
  const sl = await api('screate', { ...P[0], sname: 'Jouer ' + sfx }); for (const p of P.slice(1)) { await api('sjoin', { ...p, sname: 'Jouer ' + sfx, scode: sl.salon.acode }); await api('sdecide', { ...P[0], salon: sl.salon.code, member: p.name, ok: true }); }
  const C = sl.salon.code;
  const page = async me => { const c = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await c.addInitScript(()=>{window.__noBoxPop=1}); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(U + '/');
    await p.evaluate(m => { localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')) }, me); return p };
  for (const g of ['fleches', 'meles']) {
    const a = await page(P[0]); await a.goto(U + '/' + C + '/' + g + '?go=multi&lvl=facile'); await sleep(2500);
    const gid = await a.evaluate(() => window.__t('G.gid'));
    const b = await page(P[1]); await b.goto(U + '/' + C + '/' + g + '?go=multi&lvl=difficile'); await sleep(2500);
    const s = await b.evaluate(() => window.__t('({gid:G.gid,n:G.players.length,me:mySeat()})'));
    ok(s.gid === gid && s.n === 2 && s.me === 1, g + ' : « Jouer » pendant une salle d\'attente → on la rejoint (même partie, 2 joueurs)');
    await b.click('#launchBtn'); await sleep(8000);
    const c = await page(P[2]); await c.goto(U + '/' + C + '/' + g + '?go=multi&lvl=facile'); await sleep(2500);
    const t = await c.evaluate(() => window.__t('({gid:G.gid,me:mySeat(),wait:G.wait})'));
    ok(t.gid === gid && t.me === null && !t.wait, g + ' : « Jouer » pendant une partie en cours → on la regarde, elle n\'est pas remplacée');
    await a.evaluate(() => window.__t('G.done=true;G.ended=Date.now();save();render()')); await sleep(1500);
    for (const p of [a, b, c]) await p.context().close();
  }
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  console.log(res.join('\n')); await br.close()
})();
