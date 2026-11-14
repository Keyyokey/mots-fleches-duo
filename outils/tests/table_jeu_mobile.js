// Table de jeu sur téléphone : en-tête caché, clavier Motipop, zoom sur le mot, menu ⋯ (mots fléchés) ;
// grille pleine largeur, liste repliable, loupe (mots mêlés) ; ordinateur inchangé.
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/table_jeu_mobile.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const SHOT = process.env.SHOT || '/tmp';
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.6.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100); const P = [];
  for (const n of ['TA' + sfx, 'TB' + sfx]) { const r = await api('create', { name: n, pin: '1470' }); P.push({ name: n, token: r.token }) }
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 800 }, hasTouch: w < 500, isMobile: w < 500 }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(U + '/');
    await p.evaluate(m => { localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')) }, me); return p };
  const T = (p, c) => p.evaluate(c => window.__t(c), c);

  // ---- mots fléchés, solo, téléphone
  const a = await page(P[0]); await a.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(4000);
  ok(await a.evaluate(() => document.body.classList.contains('tj') && getComputedStyle(document.getElementById('skTop')).display === 'none'), 'partie en cours : en-tête Motipop caché');
  const k0 = await T(a, '(()=>{const w=words.find(w=>w.cells.length>=4&&w.cells.every(x=>G.filled[x]===undefined));dir=w.dir;return w.cells[0]})()');
  await a.tap('#grid .fc[data-k="' + k0 + '"]'); await sleep(500);
  const kb = await a.evaluate(() => ({ on: getComputedStyle(document.getElementById('mkb')).display === 'flex', sys: document.activeElement && document.activeElement.id === 'kb', clue: document.getElementById('mkClue').textContent, cur: window.__t('curWord().text') }));
  ok(kb.on && !kb.sys, 'toucher une case : clavier Motipop affiché, clavier du téléphone fermé');
  ok(kb.clue === kb.cur, 'la définition du mot touché est au-dessus du clavier (« ' + kb.clue + ' »)');
  const z1 = await a.evaluate(() => document.getElementById('grid').style.transform);
  ok(/scale\(1\.[1-7]/.test(z1), 'zoom sur le mot en cours (' + z1 + ')');
  await a.screenshot({ path: SHOT + '/tj_fleches_zoom.png' });
  const sol = await T(a, 'curWord().cells.map(k=>SOL[k]).join("")');
  for (const l of sol) { await a.tap('#mkb [data-k="' + l + '"]'); await sleep(60) }
  ok((await T(a, 'Object.values(pend).join("")')) === sol, 'les touches du clavier Motipop écrivent dans la grille (' + sol + ')');
  await a.tap('#mkb [data-k="⌫"]'); await sleep(100); ok((await T(a, 'Object.keys(pend).length')) === sol.length - 1, '⌫ efface la dernière lettre');
  await a.tap('#mkb [data-k="' + sol[sol.length - 1] + '"]'); await sleep(100);
  await a.tap('#mkOk'); await sleep(700);
  ok((await a.evaluate(() => document.getElementById('grid').style.transform)) === '', 'après « Valider » : retour à la vue d\'ensemble');
  ok((await T(a, 'G.players[0].score')) > 0, 'mot validé, points marqués');
  await a.screenshot({ path: SHOT + '/tj_fleches_vue.png' });
  const w0 = await T(a, 'curWord()&&curWord().id'); await a.tap('#mkNext'); await sleep(400); const w1 = await T(a, 'curWord()&&curWord().id');
  ok(w1 !== null && w1 !== w0, '› passe au mot suivant');
  await a.tap('#mkMore'); await sleep(200); ok(await a.evaluate(() => document.getElementById('mkMenu').classList.contains('on')), 'menu ⋯ ouvert');
  await a.screenshot({ path: SHOT + '/tj_fleches_menu.png' });
  await a.tap('#mkMenu [data-a="view"]'); await sleep(400); ok((await a.evaluate(() => document.getElementById('grid').style.transform)) === '', '⋯ → « Vue d\'ensemble » dézoome');

  // ---- mots fléchés à deux : pas de clavier quand ce n'est pas son tour
  const sl = await api('screate', { ...P[0], sname: 'Table ' + sfx }); await api('sjoin', { ...P[1], sname: 'Table ' + sfx, scode: sl.salon.acode }); const C = sl.salon.code;
  const d1 = await page(P[0]); await d1.goto(U + '/' + C + '/fleches?go=multi&lvl=facile'); await sleep(2500);
  const d2 = await page(P[1]); await d2.goto(U + '/' + C + '/fleches'); await sleep(2500); await d2.click('#launchBtn'); await sleep(8000);
  const turn = await T(d1, 'G.turn'); const other = turn === 0 ? d2 : d1;
  const kc = await other.evaluate(() => getComputedStyle(document.getElementById('mkb')).display);
  ok(kc === 'none', 'à deux : pas de clavier pendant le tour de l\'autre');

  // ---- mots mêlés, solo, téléphone
  const m = await page(P[0]); await m.goto(U + '/meles?go=solo&lvl=moyen'); await sleep(3500);
  ok(await m.evaluate(() => document.body.classList.contains('tj')), 'mots mêlés : en-tête caché');
  const gw = await m.evaluate(() => document.querySelector('.wgrid').getBoundingClientRect().width); ok(gw >= 340, 'grille pleine largeur (' + Math.round(gw) + ' px)');
  const h0 = await m.evaluate(() => document.querySelector('.cloud').getBoundingClientRect().height); ok(h0 <= 32, 'liste des mots repliée (' + Math.round(h0) + ' px)');
  await m.tap('.wlh'); await sleep(200); const h1 = await m.evaluate(() => document.querySelector('.cloud').getBoundingClientRect().height); ok(h1 > h0, '« tout voir » déplie la liste');
  const w = await T(m, '(()=>{const w=G.words[0];const L=w.w.length;const a=$("#m"+w.r+"-"+w.c).getBoundingClientRect(),b=$("#m"+(w.r+w.dr*(L-1))+"-"+(w.c+w.dc*(L-1))).getBoundingClientRect();return {w:w.w,ax:a.x+a.width/2,ay:a.y+a.height/2,bx:b.x+b.width/2,by:b.y+b.height/2}})()');
  await m.mouse.move(w.ax, w.ay); await m.mouse.down(); await m.mouse.move((w.ax + w.bx) / 2, (w.ay + w.by) / 2, { steps: 4 }); await m.mouse.move(w.bx, w.by, { steps: 4 });
  const lp = await m.evaluate(() => { const e = document.getElementById('loupe'); return { on: e.classList.contains('on'), t: e.textContent } });
  await m.screenshot({ path: SHOT + '/tj_meles_loupe.png' });
  ok(lp.on && (lp.t === w.w || [...lp.t].reverse().join('') === w.w), 'loupe au-dessus du doigt : « ' + lp.t + ' »');
  await m.mouse.up(); await sleep(400);
  ok(!(await m.evaluate(() => document.getElementById('loupe').classList.contains('on'))) && (await T(m, 'Object.keys(G.found).length')) === 1, 'doigt levé : loupe cachée, mot trouvé');

  // ---- ordinateur : rien ne change
  const pc = await page(P[0], 1280); await pc.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(3500);
  ok(await pc.evaluate(() => !document.body.classList.contains('tj') && getComputedStyle(document.getElementById('mkb')).display === 'none'), 'ordinateur : affichage habituel, pas de clavier Motipop');
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  console.log(res.join('\n')); await br.close()
})();
