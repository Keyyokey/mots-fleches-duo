// 26/11 : entrer dans un salon = demande au responsable (boîte), réponse au demandeur (boîte). Nom + code ne suffisent plus.
const { chromium } = require(process.env.PW || 'playwright'); const U = process.env.U || 'http://localhost:3999';
const ip = () => '10.7.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200);
const api = async (r, b) => { const x = await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) }); return { status: x.status, ...(await x.json()) }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = 0, ko = 0; const chk = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); c ? ok++ : ko++; };
  const s = Math.floor(Math.random() * 900 + 100); const mk = async n => { const o = { name: n + s }; o.token = (await api('create', { name: o.name, pin: '1234' })).token; return o; };
  const A = await mk('DA'), B = await mk('DB'), C = await mk('DC'), D = await mk('DD');
  const sl = (await api('screate', { ...A, sname: 'Guerilla ' + s })).salon; const CODE = sl.code;
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  const pg = async (m, w) => { const c = await br.newContext({ viewport: { width: w, height: 844 } }); await c.addInitScript(m => { localStorage.setItem('fl-me', JSON.stringify(m)); localStorage.setItem('fl-visite', '1'); localStorage.setItem('fl-pop-tuto', '1'); }, m); const p = await c.newPage(); p.on('pageerror', e => errs.push(m.name + ': ' + e.message)); await p.goto(U + '/'); await sleep(2500); return p; };
  const a = await pg(A, 1200), b = await pg(B, 390);
  // B demande avec le bon nom et le bon code : pas d'entrée directe
  const r = await api('sjoin', { ...B, sname: 'Guerilla ' + s, scode: sl.acode });
  chk(r.status === 200 && r.pending && !r.salon, 'demande en attente : « ' + r.msg + ' »');
  chk(!(await api('salons', B)).salons.some(x => x.code === CODE), 'B n\'est pas encore membre');
  chk((await api('sjoin', { ...B, sname: 'Guerilla ' + s, scode: sl.acode })).msg.includes('déjà envoyée'), 'deuxième demande : déjà envoyée');
  await sleep(1200);
  const askA = await a.evaluate(() => { const e = document.getElementById('mjAsk'); return e && e.classList.contains('on') ? e.innerText : ''; });
  chk(/demande à entrer/.test(askA), 'le responsable reçoit la fenêtre : ' + askA.replace(/\s+/g, ' '));
  await a.screenshot({ path: '/tmp/dem_a.png' });
  await a.click('#mjAsk [data-bx="ok"]'); await sleep(1500);
  chk((await api('salons', B)).salons.some(x => x.code === CODE), 'accepté : B est membre');
  const askB = await b.evaluate(() => { const e = document.getElementById('mjAsk'); return e && e.classList.contains('on') ? e.innerText : ''; });
  chk(/accepté/.test(askB), 'B reçoit la réponse : ' + askB.replace(/\s+/g, ' '));
  await b.screenshot({ path: '/tmp/dem_b.png' });
  await b.click('#mjAsk [data-bx="go"]'); await sleep(2500);
  chk(b.url().endsWith('/' + CODE), 'Entrer ouvre le salon (' + b.url().replace(U, '') + ')');
  await b.goto(U + '/'); await sleep(2500);
  chk(!(await b.evaluate(() => (document.querySelector('.mjinbox') || {}).innerText || '')).includes('Boîte ·'), 'réponse lue : retirée de la boîte');
  // C refusé, le responsable n'est pas en ligne : la demande attend dans sa boîte
  await a.context().close();
  await api('sjoin', { ...C, sname: 'Guerilla ' + s, scode: sl.acode });
  const c = await pg(C, 390);
  const a2 = await pg(A, 1200); await sleep(500);
  const inbox = await a2.evaluate(() => { const e = document.getElementById('mjAsk'); return e && e.classList.contains('on') ? e.innerText : ''; });
  chk(/demande à entrer/.test(inbox), 'demande gardée pendant l\'absence du responsable');
  await a2.click('#mjAsk [data-bx="no"]'); await sleep(1500);
  chk(!(await api('salons', C)).salons.some(x => x.code === CODE), 'refusé : C n\'est pas membre');
  const askC = await c.evaluate(() => { const e = document.getElementById('mjAsk'); return e && e.classList.contains('on') ? e.innerText : ''; });
  chk(/refusée/.test(askC), 'C reçoit le refus : ' + askC.replace(/\s+/g, ' '));
  // D : accepté depuis « Gérer ce salon »
  await api('sjoin', { ...D, sname: 'Guerilla ' + s, scode: sl.acode });
  await a2.goto(U + '/' + CODE); await sleep(2500);
  await a2.evaluate(() => { const e = document.getElementById('mjAsk'); if (e) e.classList.remove('on'); });
  await a2.click('.salon-pill'); await sleep(900);
  const mng = await a2.evaluate(() => (document.getElementById('slMng') || {}).innerText || '');
  chk(/1 demande/.test(mng), 'lien Gérer : ' + mng);
  await a2.click('#slMng'); await sleep(400); await a2.screenshot({ path: '/tmp/dem_gerer.png' });
  await a2.click('#popSalon [data-ok="' + D.name + '"]'); await sleep(1200);
  chk((await api('salons', D)).salons.some(x => x.code === CODE), 'accepté depuis Gérer : D est membre');
  chk(!errs.length, 'aucune erreur de page ' + JSON.stringify(errs));
  console.log(ok + ' ok, ' + ko + ' ko'); await br.close(); process.exit(ko ? 1 : 0);
})();
