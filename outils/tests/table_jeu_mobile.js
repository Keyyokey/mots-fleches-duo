// Table de jeu sur téléphone : clavier du système dans tous les jeux, boutons d'action dans le menu « ⋯ » à côté de Valider,
// en-tête caché et zoom sur le mot (mots fléchés) ; mot faux effacé (Tourniquet) ; grille pleine largeur, liste repliable,
// loupe (mots mêlés) ; ordinateur inchangé.
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/table_jeu_mobile.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const SHOT = process.env.SHOT || '/tmp';
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.6.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
// frappe au clavier du système : le champ caché reçoit le texte (caractère invisible + lettre), comme sur Android
const typeSys = (p, txt) => p.evaluate(t => { const k = document.getElementById('kb'); for (const l of t) { k.value = '​' + l; k.dispatchEvent(new Event('input')) } }, txt);
const backSys = p => p.evaluate(() => { const k = document.getElementById('kb'); k.value = ''; k.dispatchEvent(new Event('input')) });
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100); const r0 = await api('create', { name: 'TA' + sfx, pin: '1470' }); const ME = { name: 'TA' + sfx, token: r0.token };
  const page = async (w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 800 }, hasTouch: w < 500, isMobile: w < 500 }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(U + '/');
    await p.evaluate(m => { localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')) }, ME); return p };
  const T = (p, c) => p.evaluate(c => window.__t(c), c);
  const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' }, sel);

  // ---- mots fléchés, solo, téléphone
  const a = await page(); await a.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(4000);
  ok(await a.evaluate(() => document.body.classList.contains('tj') && getComputedStyle(document.getElementById('skTop')).display === 'none'), 'mots fléchés : en-tête Motipop caché pendant la partie');
  ok(!(await a.evaluate(() => !!document.getElementById('mkb'))), 'plus de clavier Motipop');
  const k0 = await T(a, '(()=>{const w=words.find(w=>w.cells.length>=4&&w.cells.every(x=>G.filled[x]===undefined));dir=w.dir;return w.cells[0]})()');
  await a.tap('#grid .fc[data-k="' + k0 + '"]'); await sleep(500);
  ok(await a.evaluate(() => document.activeElement && document.activeElement.id === 'kb'), 'toucher une case ouvre le clavier du téléphone');
  ok(/scale\(1\.[1-7]/.test(await a.evaluate(() => document.getElementById('grid').style.transform)), 'zoom sur le mot en cours');
  const btns = await a.evaluate(() => [...document.querySelectorAll('.flclue .fbtns .btn')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id));
  ok(JSON.stringify(btns) === '["moreBtn","fOk"]', 'sous la définition : seulement ⋯ et Valider ' + JSON.stringify(btns));
  await a.tap('#moreBtn'); await sleep(200);
  const items = await a.evaluate(() => [...document.querySelectorAll('#moreMenu button')].map(e => e.textContent));
  ok(items.length === 4 && items.includes('Indice') && items.includes('Vue d\'ensemble') && !items.includes('Passer mon tour'), 'menu ⋯ : ' + items.join(' · ') + ' (pas « Passer » en solo)');
  await a.screenshot({ path: SHOT + '/tj_fleches_menu.png' });
  await a.tap('#moreMenu button:last-child'); await sleep(400);
  ok((await a.evaluate(() => document.getElementById('grid').style.transform)) === '' && !(await vis(a, '#moreMenu')), '⋯ → « Vue d\'ensemble » : dézoom, menu refermé');
  await a.tap('#grid .fc[data-k="' + k0 + '"]'); await sleep(400);
  const sol = await T(a, 'curWord().cells.map(k=>SOL[k]).join("")');
  const wrong = [...sol].map(l => l === 'Z' ? 'Q' : 'Z').join('');
  await typeSys(a, wrong); await sleep(150); ok((await T(a, 'Object.values(pend).join("")')) === wrong, 'les lettres tapées au clavier du téléphone arrivent');
  await backSys(a); await sleep(100); ok((await T(a, 'Object.keys(pend).length')) === wrong.length - 1, 'touche Effacer d\'Android : une lettre effacée');
  await a.tap('#fOk'); await sleep(700);
  ok((await T(a, 'Object.keys(pend).length')) === 0, 'mot faux validé : la saisie est effacée');
  await a.tap('#grid .fc[data-k="' + k0 + '"]'); await sleep(300); await typeSys(a, sol); await sleep(150); await a.tap('#fOk'); await sleep(700);
  ok((await T(a, 'G.players[0].score')) > 0 && (await a.evaluate(() => document.getElementById('grid').style.transform)) === '', 'bon mot validé : points, retour à la vue d\'ensemble');
  await a.screenshot({ path: SHOT + '/tj_fleches_vue.png' });

  // ---- Tourniquet, solo, téléphone : clavier du système, mot faux effacé, menu ⋯
  const r = await page(); await r.goto(U + '/rond?go=solo&lvl=facile'); await sleep(4000);
  await r.evaluate(() => { const q = [...document.querySelectorAll('#rring .rq')].filter(e => !/f1|f2/.test(e.className))[4]; q.id = 'cible' });
  await r.tap('#cible'); await sleep(500);
  ok(await r.evaluate(() => document.activeElement && document.activeElement.id === 'kb'), 'Tourniquet : toucher une définition ouvre le clavier du téléphone');
  const bad = await T(r, '(()=>{const [c,q]=sel.split("-").map(Number);const W=norm(P.cols[c][q].w);return W[0]==="Z"?"QQQQQQ":"ZZZZZZ"})()');
  await typeSys(r, bad); await sleep(150); ok((await T(r, 'typ')) === bad, 'les 6 lettres arrivent');
  await r.tap('#rOk'); await sleep(600);
  const after = await r.evaluate(() => ({ typ: window.__t('typ'), slots: document.getElementById('rSlots').textContent.replace(/\s/g, '') }));
  ok(after.typ === '' && !/[A-Z]/.test(after.slots), 'mot faux validé : saisie et cases effacées');
  const rb = await r.evaluate(() => [...document.querySelectorAll('.rdclue .fbtns .btn')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id));
  ok(JSON.stringify(rb) === '["moreBtn","rOk"]', 'Tourniquet : seulement ⋯ et Valider ' + JSON.stringify(rb));
  await r.evaluate(() => { const q = [...document.querySelectorAll('#rring .rq')].filter(e => !/f1|f2/.test(e.className))[4]; q.id = 'cible' });
  await r.tap('#cible'); await sleep(300); await r.tap('#moreBtn'); await sleep(200);
  const ri = await r.evaluate(() => [...document.querySelectorAll('#moreMenu button')].map(e => e.textContent));
  ok(ri.length >= 1 && /Révéler/.test(ri[0]), 'menu ⋯ du Tourniquet : ' + ri.join(' · '));
  await r.screenshot({ path: SHOT + '/tj_rond_menu.png' });

  // ---- mots mêlés, solo, téléphone
  const m = await page(); await m.goto(U + '/meles?go=solo&lvl=moyen'); await sleep(3500);
  ok(await m.evaluate(() => document.body.classList.contains('tj')), 'mots mêlés : en-tête caché');
  const gw = await m.evaluate(() => document.querySelector('.wgrid').getBoundingClientRect().width); ok(gw >= 340, 'grille pleine largeur (' + Math.round(gw) + ' px)');
  const h0 = await m.evaluate(() => document.querySelector('.cloud').getBoundingClientRect().height); ok(h0 <= 32, 'liste des mots repliée (' + Math.round(h0) + ' px)');
  await m.tap('.wlh'); await sleep(200); const h1 = await m.evaluate(() => document.querySelector('.cloud').getBoundingClientRect().height); ok(h1 > h0, '« tout voir » déplie la liste');
  const w = await T(m, '(()=>{const w=G.words[0];const L=w.w.length;const a=$("#m"+w.r+"-"+w.c).getBoundingClientRect(),b=$("#m"+(w.r+w.dr*(L-1))+"-"+(w.c+w.dc*(L-1))).getBoundingClientRect();return {w:w.w,ax:a.x+a.width/2,ay:a.y+a.height/2,bx:b.x+b.width/2,by:b.y+b.height/2}})()');
  await m.mouse.move(w.ax, w.ay); await m.mouse.down(); await m.mouse.move((w.ax + w.bx) / 2, (w.ay + w.by) / 2, { steps: 4 }); await m.mouse.move(w.bx, w.by, { steps: 4 });
  const lp = await m.evaluate(() => { const e = document.getElementById('loupe'); return { on: e.classList.contains('on'), t: e.textContent } });
  ok(lp.on && (lp.t === w.w || [...lp.t].reverse().join('') === w.w), 'loupe au-dessus du doigt : « ' + lp.t + ' »');
  await m.mouse.up(); await sleep(400);
  ok(!(await m.evaluate(() => document.getElementById('loupe').classList.contains('on'))) && (await T(m, 'Object.keys(G.found).length')) === 1, 'doigt levé : loupe cachée, mot trouvé');

  // ---- ordinateur : rien ne change
  const pc = await page(1280); await pc.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(3500);
  const pcb = await pc.evaluate(() => [...document.querySelectorAll('.flclue .fbtns .btn')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id));
  ok(!(await pc.evaluate(() => document.body.classList.contains('tj'))) && pcb.includes('fHelp') && !pcb.includes('moreBtn'), 'ordinateur : boutons habituels, pas de menu ⋯ ' + JSON.stringify(pcb));
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 3)));
  console.log(res.join('\n')); await br.close()
})();
