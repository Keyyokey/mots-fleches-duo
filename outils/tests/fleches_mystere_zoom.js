// Mots fléchés (audit du 26/11) :
//  1. le mot mystère ne rapporte +20 qu'une seule fois (avant : on pouvait le reproposer à l'infini,
//     et à plusieurs le joueur suivant lisait le mot affiché et le reproposait pour +20) ;
//  2. en solo, la fenêtre du mot mystère ne parle pas de « passer ton tour » (il n'y a pas de tours) ;
//  3. téléphone : pendant la saisie d'un long mot avec le zoom, la case en cours reste visible
//     (avant : la dernière lettre d'un mot vertical de 8 cases s'écrivait hors de l'écran).
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/fleches_mystere_zoom.js
const PW = process.env.PW || 'playwright'; const { chromium, devices } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];

  // --- 1 et 2 : solo sur ordinateur, grille avec mot mystère
  const c1 = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c1.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + '/fleches?go=solo&lvl=facile'); await sleep(2500);
  const n = await p.evaluate(() => { const L = window.__t('GRIDS').filter(d => d.lvl === 'facile' && /^[^T]/.test(d.id)); const i = L.findIndex(d => d.myst); return i + 1 });
  ok(n > 0, 'une grille facile avec mot mystère existe (n° ' + n + ')');
  await p.evaluate(() => localStorage.removeItem('fl2-solo-fleches'));
  await p.goto(U + '/fleches?go=solo&lvl=facile&n=' + n); await sleep(2500);
  const m = await p.evaluate(() => window.__t('cur.myst'));
  await p.click('.flbar'); await sleep(250);
  const pen = await p.evaluate(() => { const e = document.querySelector('#mystWin .note'); return e ? e.innerText : '' });
  ok(!/tour/i.test(pen), 'solo : la fenêtre ne parle pas de tour (« ' + pen + ' »)');
  await p.fill('#mystIn', m); await p.click('#mystGo'); await sleep(300);
  const s1 = await p.evaluate(() => window.__t('G.players[0].score'));
  ok(s1 === 20, 'mot mystère trouvé : +20 (' + s1 + ')');
  // nouvel essai : la fenêtre ne s'ouvre plus, et même en forçant la proposition, pas de 2e bonus
  await p.click('.flbar'); await sleep(250);
  const reopen = await p.evaluate(() => document.querySelector('#mystWin').classList.contains('on'));
  ok(!reopen, 'mot mystère déjà trouvé : la fenêtre ne se rouvre pas');
  await p.evaluate(m => { document.querySelector('#mystIn').value = m; window.__t('proposeMyst()') }, m); await sleep(200);
  const s2 = await p.evaluate(() => window.__t('G.players[0].score'));
  ok(s2 === 20, 'reproposer le mot ne redonne pas +20 (' + s2 + ')');
  await c1.close();

  // --- 3 : téléphone, zoom pendant la saisie du plus long mot vertical
  const c2 = await br.newContext({ ...devices['iPhone 13'] }); const q = await c2.newPage();
  q.on('pageerror', e => errs.push(e.message));
  await q.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(3000);
  const w = await q.evaluate(() => { const ws = window.__t('words').filter(w => w.dir === 'v' && w.cells.every(k => window.__t('G').filled[k] === undefined)).sort((a, b) => b.cells.length - a.cells.length); return ws[0] && { cells: ws[0].cells } });
  ok(w && w.cells.length >= 6, 'mot vertical long trouvé (' + (w && w.cells.length) + ' cases)');
  await q.tap('.fc[data-k="' + w.cells[0] + '"]'); await sleep(200);
  await q.evaluate(() => { window.__t('dir="v";render()') }); await sleep(200);
  let hidden = [];
  for (let i = 0; i < w.cells.length; i++) {
    await q.keyboard.type('Z'); await sleep(480);
    const v = await q.evaluate(() => { const c = document.querySelector('#grid .fc.caret'), b = document.querySelector('.flboard'); if (!c) return null;
      const r = c.getBoundingClientRect(), bb = b.getBoundingClientRect(); const vis = Math.max(0, Math.min(r.bottom, bb.bottom) - Math.max(r.top, bb.top)) / r.height;
      return { k: window.__t('sel'), vis: Math.round(vis * 100), zoomed: b.classList.contains('zoomed') } });
    if (v && v.zoomed && v.vis < 75) hidden.push(v.k + ' (' + v.vis + ' %)');
  }
  ok(!hidden.length, 'zoom : la case en cours reste visible à chaque lettre' + (hidden.length ? ' — cachées : ' + hidden.join(', ') : ''));
  await c2.close();

  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  console.log(res.join('\n')); await br.close()
})();
