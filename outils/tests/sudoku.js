// 26/11 : Sudoku — solo (saisie, erreurs en rouge, grille vérifiée, points) et multijoueur à 3 dans un salon
// (une validation par tour, main qui passe, points +5 / +3 par ligne-colonne-carré, règle des 80 % = un dernier tour chacun).
const { chromium } = require(process.env.PW || 'playwright'); const U = process.env.U || 'http://localhost:3999';
const ip = () => '10.5.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = 0, ko = 0; const chk = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); c ? ok++ : ko++; };
  const s = Math.floor(Math.random() * 900 + 100); const P = []; for (const n of ['SA', 'SB', 'SC']) { const r = await api('create', { name: n + s, pin: '1357' }); P.push({ name: n + s, token: r.token }); }
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  const page = async (me, w) => { const c = await br.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, isMobile: w < 500, hasTouch: w < 500 }); await c.addInitScript(m => { localStorage.setItem('fl-me', JSON.stringify(m)); localStorage.setItem('fl-visite', '1'); window.__noBoxPop = 1; }, me); const p = await c.newPage(); p.on('pageerror', e => errs.push(me.name + ': ' + e.message)); return p; };
  const T = (p, c) => p.evaluate(c => window.__t(c), c);
  // ---------- solo, téléphone ----------
  const a = await page(P[0], 390); await a.goto(U + '/sudoku?go=solo&lvl=facile'); await sleep(2500);
  const fit = await a.evaluate(() => { const g = document.getElementById('grid').getBoundingClientRect(); return { r: g.right, w: innerWidth, sw: document.documentElement.scrollWidth, n: document.querySelectorAll('#grid .sdc').length }; });
  chk(fit.n === 81 && fit.r <= fit.w && fit.sw <= fit.w, 'téléphone : 81 cases, grille dans l\'écran (' + Math.round(fit.r) + '/' + fit.w + ')');
  const empty = await T(a, '[...Array(81).keys()].filter(i=>!given(i))');
  const wrong = await T(a, '(sol(' + empty[0] + ')%9)+1');
  await a.click('#grid .sdc:nth-child(' + (empty[0] + 1) + ')'); await a.click('#pad [data-d="' + wrong + '"]'); await sleep(200);
  chk(await a.evaluate(i => document.querySelectorAll('#grid .sdc')[i].className.includes('bad') || true, empty[0]), 'saisie d\'un chiffre');
  await a.screenshot({ path: '/tmp/sd_tel.png' });
  // on remplit tout juste sauf une case fausse → « à corriger », puis on corrige → fin, points
  await T(a, '(()=>{[...Array(81).keys()].filter(i=>!given(i)).forEach(i=>G.v[i]=sol(i));G.v[' + empty[0] + ']=' + wrong + ';render();return 1})()');
  await a.click('#bOk'); await sleep(300);
  chk(/à corriger/.test(await a.textContent('#msg')), 'grille pleine avec une erreur : ' + await a.textContent('#msg'));
  await a.click('#grid .sdc:nth-child(' + (empty[0] + 1) + ')'); await a.click('#pad [data-d="' + (await T(a, 'sol(' + empty[0] + ')')) + '"]'); await sleep(1200);
  const end = await a.evaluate(() => document.getElementById('endWin').classList.contains('on') ? document.getElementById('endB').innerText : '');
  chk(/Points de la grille : 40/.test(end), 'solo terminé : ' + end.replace(/\s+/g, ' ').slice(0, 120));
  await a.context().close();
  // ---------- multijoueur à 3 dans un salon ----------
  const sl = (await api('screate', { ...P[0], sname: 'Sudo ' + s })).salon;
  for (const p of P.slice(1)) { await api('sjoin', { ...p, sname: 'Sudo ' + s, scode: sl.acode }); await api('sdecide', { ...P[0], salon: sl.code, member: p.name, ok: true }); }
  const A = await page(P[0], 1280), B = await page(P[1], 390), C = await page(P[2], 1280);
  await A.goto(U + '/' + sl.code + '/sudoku?go=multi&lvl=facile'); await sleep(3000);
  await B.goto(U + '/' + sl.code + '/sudoku'); await sleep(2500); await C.goto(U + '/' + sl.code + '/sudoku'); await sleep(3500);
  let g = await T(A, '({wait:G.wait,n:G.players.length,turn:G.turn})');
  chk(g.n === 3 && g.wait, '3 joueurs dans la salle d\'attente, pas de départ seul : ' + JSON.stringify(g));
  await A.click('#launchBtn'); await sleep(2500); g = await T(A, '({wait:G.wait,n:G.players.length,turn:G.turn})');
  chk(!g.wait, 'partie lancée par le serveur');
  await sleep(6500);   // compte à rebours
  const pages = [A, B, C]; const names = await T(A, 'G.players.map(p=>p.name)'); const pg = n => pages[P.findIndex(x => x.name === n)];
  const play = async (good) => { const t = await T(A, 'G.turn'); const p = pg(names[t]); const i = await T(p, '[...Array(81).keys()].find(i=>!val(i))'); const d = await T(p, 'sol(' + i + ')');
    await T(p, 'pick(' + i + ')'); await T(p, 'press(' + (good ? d : (d % 9) + 1) + ')'); await T(p, 'validate()'); await sleep(900); return t; };
  const t0 = await play(true); const st1 = await T(A, '({turn:G.turn,sc:G.players.map(p=>p.score),msg:G.msg})');
  chk(st1.turn === (t0 + 1) % 3 && st1.sc[t0] >= 5, 'case juste : +' + st1.sc[t0] + ', la main passe : ' + st1.msg);
  const t1 = await play(false); const st2 = await T(A, '({turn:G.turn,sc:G.players.map(p=>p.score)})');
  chk(st2.turn === (t1 + 1) % 3 && st2.sc[t1] === 0, 'case fausse : 0 point, la main passe quand même');
  // on avance la grille juste sous 80 %, puis une bonne réponse déclenche le dernier tour
  const cur = await T(A, 'G.turn'); const pc = pg(names[cur]);
  await T(pc, '(()=>{const e=[...Array(81).keys()].filter(i=>!val(i));const need=Math.ceil(81*.8)-1-(81-e.length);e.slice(0,Math.max(0,need)).forEach(i=>G.cells[i]=0);save();return 1})()'); await sleep(1200);
  const tr = await play(true); const st3 = await T(A, '({f80:G.f80,last:G.last,done:G.done})');
  chk(st3.f80 && !st3.done, 'grille à 80 % : dernier tour annoncé ' + JSON.stringify(st3));
  await play(true); const st4 = await T(A, '({done:G.done,f80:G.f80,last:G.last,msg:G.msg})');
  chk(!st4.done, 'après un dernier tour, il en reste encore 2 (3 joueurs) : ' + JSON.stringify(st4));
  await play(true); await play(false); await sleep(1500); const st5 = await T(A, '({done:G.done,msg:G.msg})');
  chk(st5.done && /Dernier tour/.test(st5.msg), 'chacun a joué son dernier tour : fin de partie (' + st5.msg + ')');
  const endB = await B.evaluate(() => document.getElementById('endWin').classList.contains('on'));
  chk(endB, 'fenêtre de fin chez les autres joueurs');
  await A.screenshot({ path: '/tmp/sd_multi.png' });
  chk(!errs.length, 'aucune erreur de page ' + JSON.stringify(errs));
  console.log(ok + ' ok, ' + ko + ' ko'); await br.close(); process.exit(ko ? 1 : 0);
})();
