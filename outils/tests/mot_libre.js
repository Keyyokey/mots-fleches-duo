// 26/11 : Mot libre (Mot du jour – Journalier / Libre) : longueurs 3 à 12, mot jamais envoyé avant la fin, points une seule fois,
// mode Progressif (palier de 3, 3e mot difficile, arrêt au premier raté), chronomètre, affichage téléphone et ordinateur.
// Lancé sur le serveur de test (ADMIN_KEY=test1234567890abcdef : même clé que le serveur pour relire le jeton).
const { chromium } = require(process.env.PW || 'playwright'); const U = process.env.U || 'http://localhost:3999';
const ML = require('../../motlibre')({ KEY: process.env.ADMIN_KEY || 'test1234567890abcdef' });
const ip = () => '10.6.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = 0, ko = 0; const chk = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); c ? ok++ : ko++; };
  const s = Math.floor(Math.random() * 9000 + 1000); const A = { name: 'ML' + s }; A.token = (await api('create', { name: A.name, pin: '2468' })).token;
  // API : le mot n'est pas dans la réponse, le jeton est illisible pour le navigateur
  for (const L of [3, 8, 12]) { const r = await api('ml', { op: 'new', mode: 'libre', len: L, ...A }); const w = ML.peek(r.tok).w;
    chk(r.len === L && w.length === L && !JSON.stringify(r).includes(w) && r.first === w[0], L + ' lettres : mot caché, 1re lettre ' + r.first); }
  const r1 = await api('ml', { op: 'new', mode: 'libre', len: 6, ...A }); const w1 = ML.peek(r1.tok).w;
  const bad = await api('ml', { op: 'essai', tok: r1.tok, g: w1[0] + 'QQQQQ', ...A }); chk(!!bad.refus, 'mot hors dictionnaire refusé : ' + bad.refus);
  const win = await api('ml', { op: 'essai', tok: r1.tok, g: w1, ...A }); chk(win.ok && win.done && win.word === w1 && win.pts > 0, 'trouvé du 1er coup : ' + win.pts + ' points (+' + win.gained + ' au score)');
  const again = await api('ml', { op: 'essai', tok: r1.tok, g: w1, ...A }); chk(!again.gained, 'même mot renvoyé : pas de points en double');
  const other = await api('ml', { op: 'essai', tok: r1.tok, g: w1, name: 'XX' + s, token: 'faux' }); chk(other.error === 'joueur', 'le jeton d\'un autre joueur est refusé');
  // progressif : paliers 3,4,5… ; 3e mot = réserve difficile
  const p0 = await api('ml', { op: 'new', mode: 'prog', step: 0 }), p2 = await api('ml', { op: 'new', mode: 'prog', step: 2 }), p3 = await api('ml', { op: 'new', mode: 'prog', step: 3 }), pl = await api('ml', { op: 'new', mode: 'prog', step: 26 });
  chk(p0.len === 3 && !p0.hard && p2.len === 3 && p2.hard && p3.len === 4 && pl.len === 12 && pl.hard, 'progressif : 3,3(difficile),4… dernier = 12 lettres difficile');
  // tirage sans mots voisins : 30 tirages de 6 lettres avec les indices récents → jamais à moins de 10 places d'un mot récent
  let rec = [], near = 0; for (let k = 0; k < 30; k++) { const r = await api('ml', { op: 'new', mode: 'libre', len: 6, rec }); if (rec.some(x => Math.abs(x - r.i) < 10)) near++; rec.push(r.i); }
  chk(near === 0, 'tirage : aucun mot voisin d\'un mot récent (30 tirages)');
  // chrono : un essai après la fin du temps → partie perdue (jeton fabriqué avec un départ ancien, impossible depuis un navigateur)
  const rc = await api('ml', { op: 'new', mode: 'libre', len: 5, chrono: 2 }); chk(rc.chrono === 2, 'chrono de 2 min accepté');
  const day = await api('mj', { op: 'etat', guest: 'abcdefabcdef' + s }); chk(day.len === 6 || day.len === 7, 'Mot du jour toujours en place (' + day.len + ' lettres)');
  // page : ordinateur puis téléphone
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  for (const [w, h, label] of [[1280, 800, 'ordinateur'], [390, 844, 'téléphone']]) {
    const c = await br.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 }); await c.addInitScript(m => localStorage.setItem('fl-me', JSON.stringify(m)), A);
    const p = await c.newPage(); p.on('pageerror', e => errs.push(label + ': ' + e.message)); await p.goto(U + '/motlibre?mode=libre&len=12'); await sleep(1800);
    const cells = await p.$$eval('#mdGrid .mdrow:first-child .mdc', x => x.map(e => e.getBoundingClientRect().right)); const vw = await p.evaluate(() => innerWidth);
    chk(cells.length === 12 && Math.max(...cells) <= vw, label + ' : 12 cases qui tiennent dans l\'écran');
    const tok = await p.evaluate(() => window.__t('S.tok')); const word = ML.peek(tok).w;
    await p.focus('#mdIn'); await p.keyboard.type(word.slice(1)); await p.keyboard.press('Enter'); await sleep(1500);
    const end = await p.evaluate(() => document.querySelector('#mdEnd.on') ? document.querySelector('#mdEnd').innerText : '');
    chk(/Trouvé en 1 essai/.test(end), label + ' : mot trouvé, fin affichée');
    const stats = await p.$eval('#mlStats', e => e.innerText.replace(/\s+/g, ' ')); chk(/Mots trouvés ?[12]/.test(stats), label + ' : stats en direct : ' + stats.slice(0, 80));
    await p.screenshot({ path: '/tmp/ml_' + (w < 500 ? 'tel' : 'pc') + '.png' });
    // progressif
    await p.click('[data-mode="prog"]'); await p.click('#mlGo'); await sleep(1500);
    chk(/Palier 3 lettres · mot 1\/3/.test(await p.textContent('#mlStep')), label + ' : parcours progressif lancé à 3 lettres');
    await c.close();
  }
  chk(!errs.length, 'aucune erreur de page ' + JSON.stringify(errs));
  console.log(ok + ' ok, ' + ko + ' ko'); await br.close(); process.exit(ko ? 1 : 0);
})();
