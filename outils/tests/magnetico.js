// Magnético : solo (téléphone), puis partie à 3 (salle d'attente, lancement, mot trouvé, erreur, passage, tempo commun, classement, fin).
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/magnetico.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const SHOT = process.env.SHOT || '/tmp'; let ko = 0; const ok = (c, l) => { if (!c) ko++; console.log((c ? '✅ ' : '❌ ') + l); return c };
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.8.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
// pose les bonnes syllabes dans l'ordre (ou une liste donnée) puis valide
const play = (p, wrong) => p.evaluate(w => window.__t(`(()=>{const x=word(cur);const want=${w ? 'x.s.slice().reverse()' : 'x.s'};for(const t of want){const b=balls.find(b=>b.on&&!b.entering&&b.t===t&&!placed.includes(b));if(!b)return "pas encore "+t;pick(b)}validate();return "ok"})()`), wrong);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const errs = [];
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 500, isMobile: w < 500, deviceScaleFactor: 2 }); const p = await c.newPage(); p.on('pageerror', e => errs.push((me ? me.name : 'solo') + ': ' + e.message)); await p.route(/fonts\./, r => r.abort()); await p.goto(U + '/regles');
    await p.evaluate(m => { if (m) localStorage.setItem('fl-me', JSON.stringify(m)) }, me); return p };
  // ---- solo ----
  const s0 = await page(null); await s0.goto(U + '/magnetico?go=solo&lvl=facile'); await sleep(1500);
  await s0.screenshot({ path: SHOT + '/mg_solo_entree.png' });
  await sleep(4500); const st0 = await s0.evaluate(() => window.__t('({n:balls.filter(b=>b.on).length,w:word(cur).s.join("-"),lvl:G.level,words:G.words.length})'));
  ok(st0.n >= 2 && st0.words === 10, 'solo : les syllabes sont entrées dans le cadre (' + st0.n + ', mot ' + st0.w + '), 10 mots');
  ok(await play(s0, true) === 'ok', 'solo : essai faux'); await sleep(400);
  const e0 = await s0.evaluate(() => window.__t('({msg:document.getElementById("mgMsg").textContent,sc:G.players[0].score,ko:document.getElementById("mgBox").className})'));
  ok(/−5/.test(e0.msg) && /ko/.test(e0.ko), 'solo : erreur → encadré qui tremble, −5 (' + e0.msg + ', score ' + e0.sc + ')');
  await sleep(2600); ok(await play(s0) === 'ok', 'solo : le bon mot'); await sleep(900);
  await s0.screenshot({ path: SHOT + '/mg_solo_trouve.png' });
  const r0 = await s0.evaluate(() => ({ res: getComputedStyle(document.getElementById('mgRes')).display, txt: document.getElementById('mgRes').innerText.slice(0, 80), sc: window.__t('G.players[0].score') }));
  ok(r0.res === 'flex' && /bien jou/i.test(r0.txt) && r0.sc > 0, 'solo : définition et points affichés (score ' + r0.sc + ')');
  await s0.click('#mgNext'); await sleep(600); ok(await s0.evaluate(() => window.__t('cur')) === 1, 'solo : « Mot suivant » → mot 2');
  await s0.context().close();
  // ---- partie à 3 ----
  const sfx = Math.floor(Math.random() * 900 + 100); const names = ['GA', 'GB', 'GC', 'GD'].map(x => x + sfx);
  const P = []; for (const n of names) { const r = await api('create', { name: n, pin: '2468' }); P.push({ name: n, token: r.token }) }
  const sl = await api('screate', { ...P[0], sname: 'Magne ' + sfx }); for (const p of P.slice(1)) await api('sjoin', { ...p, sname: 'Magne ' + sfx, scode: sl.salon.acode });
  const C = sl.salon.code;
  const a = await page(P[0]); await a.goto(U + '/' + C + '/magnetico?go=multi&lvl=facile'); await sleep(2500);
  const b = await page(P[1]); await b.goto(U + '/' + C + '/magnetico'); await sleep(2000);
  const c = await page(P[2]); await c.goto(U + '/' + C + '/magnetico'); await sleep(2500);
  const st = p => p.evaluate(() => window.__t('({wait:G.wait,n:G.players.length,me:mySeat(),sc:G.players.map(p=>p.score),cur,done:G.done,ph:G.wait?"":sched(Date.now()).ph})'));
  let s = await st(a); ok(s.wait && s.n === 3, 'salle d\'attente : 3 joueurs');
  await a.screenshot({ path: SHOT + '/mg_salle.png' });
  await b.click('#launchBtn'); await sleep(5600 + 5200);
  s = await st(a); ok(!s.wait && s.cur === 0, 'partie lancée, même mot pour tous (' + s.ph + ')');
  const wa = await a.evaluate(() => window.__t('word(cur).s.join("-")')), wb = await b.evaluate(() => window.__t('word(cur).s.join("-")'));
  ok(wa === wb, 'mêmes syllabes chez chacun (' + wa + ')');
  ok(await play(c) === 'ok', 'C trouve en premier'); await sleep(1500); ok(await play(a, true) === 'ok', 'A se trompe'); await sleep(5000); {const r=await play(a);ok(r === 'ok', 'A trouve ensuite ('+r+')')} await sleep(1500);
  s = await st(b); ok(s.sc[2] > s.sc[0] && s.sc[0] > 0, 'scores : C (premier, +5) devant A ' + JSON.stringify(s.sc));
  await b.screenshot({ path: SHOT + '/mg_multi_jeu.png' });
  const rk = await b.evaluate(() => [...document.querySelectorAll('.mgpc')].map(e => ({ n: e.querySelector('.mgn').textContent, l: parseFloat(e.style.left) })).sort((x, y) => x.l - y.l).map(x => x.n));
  ok(/^GC/.test(rk[0]), 'classement en haut : le premier à gauche (' + rk.join(', ') + ')');
  await b.evaluate(() => window.__t('passWord()')); await sleep(2500);
  s = await st(a); ok(s.ph === 'res', 'tous ont trouvé ou passé → le mot se ferme pour tous (compte à rebours commun)');
  const cd = await a.evaluate(() => (document.getElementById('mgCd') || {}).innerText || '');
  ok(/Mot suivant dans \d+ s/.test(cd), 'compte à rebours affiché : ' + cd.replace(/\s+/g, ' '));
  await a.screenshot({ path: SHOT + '/mg_multi_res.png' });
  await sleep(11500); s = await st(c); ok(s.cur === 1 && (s.ph === 'entry' || s.ph === 'play'), 'tout le monde passe au mot 2 en même temps');
  // fin : on saute à la fin du dernier mot
  await a.evaluate(() => window.__t('patch("z","end",1,{ifAbsent:true,extra:{done:true,ended:Date.now()}})')); await sleep(2000);
  const end = await b.evaluate(() => ({ on: document.getElementById('endWin').classList.contains('on'), t: document.getElementById('endT').textContent }));
  ok(end.on && /gagne/.test(end.t), 'fin de partie : classement final (' + end.t + ')');
  await b.screenshot({ path: SHOT + '/mg_fin.png' });
  ok(!errs.length, 'aucune erreur JavaScript ' + JSON.stringify(errs.slice(0, 4)));
  await br.close(); console.log(ko ? ko + ' échec(s)' : 'tout est bon'); process.exit(ko ? 1 : 0);
})();
