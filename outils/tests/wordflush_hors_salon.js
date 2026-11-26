// 26/11 : Wordflush à plusieurs hors salon : bouton « À plusieurs », invitation directe (table temporaire, départ automatique à 2), lien d'invitation.
const { chromium } = require(process.env.PW || 'playwright'); const U = process.env.U || 'http://localhost:3999';
const ip = () => '10.8.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = 0, ko = 0; const chk = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); c ? ok++ : ko++; };
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  const s = Math.floor(Math.random() * 900 + 100); const P = []; for (const n of ['WA', 'WB', 'WC']) { const r = await api('create', { name: n + s, pin: '1357' }); P.push({ name: n + s, token: r.token }); }
  const page = async (me, w) => { const c = await br.newContext({ viewport: { width: w, height: 844 } }); await c.addInitScript(m => { if (m) localStorage.setItem('fl-me', JSON.stringify(m)); localStorage.setItem('fl-tuto-poker', '1'); localStorage.setItem('fl-visite', '1'); localStorage.setItem('fl-pop-tuto', '1'); }, me); const p = await c.newPage(); p.on('pageerror', e => errs.push((me ? me.name : 'invité') + ': ' + e.message)); return p; };
  const st = p => p.evaluate(() => typeof ST !== 'undefined' && ST ? { started: ST.started, seats: ST.seats.map(x => x.name), me: ST.me } : null);
  const a = await page(P[0], 1280), b = await page(P[1], 390);
  await a.goto(U + '/poker'); await b.goto(U + '/poker'); await sleep(3000);
  const pill = await a.evaluate(() => { const e = document.querySelector('.mjpill'); return e ? e.textContent : null; });
  chk(pill && /À plusieurs/.test(pill), 'bouton « À plusieurs » sur Wordflush (' + pill + ')');
  await a.click('.mjpill'); await sleep(500);
  const rows = await a.evaluate(() => [...document.querySelectorAll('#mjWin .mjrow b')].map(e => e.textContent));
  chk(rows.includes(P[1].name), 'joueurs en ligne : ' + JSON.stringify(rows));
  await a.screenshot({ path: '/tmp/wf_panneau.png' });
  await a.click('#mjWin [data-a="inv"][data-n="' + P[1].name + '"]'); await sleep(1500);
  const ask = await b.evaluate(() => { const e = document.getElementById('mjAsk'); return e && e.classList.contains('on') ? e.innerText : ''; });
  chk(/Wordflush/.test(ask), 'invitation reçue : ' + ask.replace(/\s+/g, ' '));
  await b.click('#mjAsk [data-r="1"]'); await sleep(6000);
  chk(/^\/[A-Z0-9]{5}\/poker/.test(new URL(a.url()).pathname) && new URL(a.url()).pathname === new URL(b.url()).pathname, 'même table : ' + new URL(a.url()).pathname + ' / ' + new URL(b.url()).pathname);
  const sa = await st(a), sb = await st(b);
  chk(sa && sa.seats.length === 2 && sa.started, 'deux joueurs assis, partie lancée seule : ' + JSON.stringify(sa));
  chk(sb && sb.me >= 0 && sb.started, 'l\'invité joue aussi : ' + JSON.stringify(sb));
  await a.screenshot({ path: '/tmp/wf_table.png' });
  // lien d'invitation, ouvert par quelqu'un sans compte
  const c = await page(P[2], 1280); await c.goto(U + '/poker'); await sleep(2500); await c.click('.mjpill'); await sleep(400);
  await c.click('#mjWin [data-a="link"]'); await sleep(1500);
  const link = await c.evaluate(() => (document.querySelector('#mjWin .mjlink') || {}).textContent || '');
  chk(/\/poker\?k=/.test(link), 'lien créé : ' + link.replace(U, ''));
  await c.click('#mjWin [data-a="table"]'); await sleep(3000);
  const g = await page(null, 390); await g.goto(link); await sleep(6000);
  const sg = await st(g), sc = await st(c);
  chk(sg && sg.me >= 0 && /^INVITE/.test(sg.seats[sg.me] || ''), 'invité sans compte assis : ' + JSON.stringify(sg));
  chk(sc && sc.started && sc.seats.length === 2, 'partie lancée avec l\'invité : ' + JSON.stringify(sc));
  chk(!errs.length, 'aucune erreur de page ' + JSON.stringify(errs));
  console.log(ok + ' ok, ' + ko + ' ko'); await br.close(); process.exit(ko ? 1 : 0);
})();
