// Invitations et comptes invités (26/11) : nom d'invité automatique (INVITE + chiffres), fenêtre floutée Oui / Non à l'accueil,
// son à chaque invitation, invitation silencieuse en partie (pastille non lue + boîte), stats réservées aux comptes,
// reprise de l'invité dans le compte à l'inscription (le nom d'invité ne sert plus).
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/invitations_invites.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const SHOT = process.env.SHOT || '/tmp';
const ip = () => '10.7.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const api = async (r, b) => { const x = await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) }); let j = {}; try { j = await x.json() } catch (e) {} return { status: x.status, ...j } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100);
  const A = { name: 'IA' + sfx }; A.token = (await api('create', { name: A.name, pin: '2468' })).token;
  const C = { name: 'IC' + sfx }; C.token = (await api('create', { name: C.name, pin: '2468' })).token;
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 500, isMobile: w < 500 }); const p = await c.newPage();
    // compte les sons joués (oscillateurs créés)
    await p.addInitScript(() => { window.__osc = 0; const A = window.AudioContext || window.webkitAudioContext; if (A) { const o = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__osc++; return o.apply(this, arguments) } } });
    p.on('pageerror', e => errs.push((me ? me.name : 'visiteur') + ': ' + e.message)); await p.goto(U + '/');
    await p.evaluate(m => { if (m) localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker', 'magnetico'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')); localStorage.setItem('fl-tuto-accueil', '1'); localStorage.setItem('fl-visite', '1') }, me); return p };

  // --- 1. un visiteur sans compte ouvre « À plusieurs » : il reçoit un nom d'invité
  const g = await page(null); await g.goto(U + '/fleches?go=solo'); await sleep(2500);
  await g.click('.mjpill'); await sleep(1500);
  const gm = await g.evaluate(() => JSON.parse(localStorage.getItem('fl-me') || 'null'));
  ok(gm && /^INVITE\d{4,5}$/.test(gm.name) && gm.guest, 'nom d\'invité créé tout seul : ' + (gm && gm.name));
  const gtxt = await g.evaluate(() => document.querySelector('#mjWin').textContent);
  ok(/Tu joues en invité/.test(gtxt) && /Trouver un adversaire/.test(gtxt), 'la fenêtre propose de jouer tout de suite (invité)');
  // le compte invité ne peut pas avoir de code secret ni être choisi comme pseudo
  ok((await api('pin', { name: gm.name, token: gm.token, pin: '1111' })).status === 403, 'un invité ne peut pas se donner un code secret');
  ok((await api('create', { name: 'INVITE1', pin: '1111' })).status === 400, 'les pseudos « INVITE… » sont réservés');
  // deux invités n'ont jamais le même numéro
  const names = new Set(); for (let i = 0; i < 12; i++) { const r = await api('guest', {}); names.add(r.name) }
  ok(names.size === 12, '12 invités, 12 numéros différents');

  // --- 2. l'invité, sur l'accueil, reçoit une invitation : fenêtre floutée Oui / Non + son
  await g.goto(U + '/'); await sleep(3000);
  const st = await g.evaluate(() => document.getElementById('chartSub') ? document.getElementById('chartSub').textContent : '');
  ok(/Crée ton compte pour voir tes stats/.test(st), 'stats réservées aux comptes : « ' + st.slice(0, 45) + ' »');
  const a = await page(A, 1280); await a.goto(U + '/fleches?go=solo'); await sleep(2500);
  await a.click('.mjpill'); await sleep(800);
  const rowG = await a.$('#mjWin [data-a="inv"][data-n="' + gm.name + '"]'); ok(!!rowG, 'l\'invité sur l\'accueil apparaît « en ligne » chez A');
  const o0 = await g.evaluate(() => window.__osc);
  if (rowG) await rowG.click(); await sleep(1500);
  const ask = await g.evaluate(() => { const e = document.getElementById('mjAsk'); if (!e || !e.classList.contains('on')) return null; return { t: e.querySelector('h3').textContent, blur: getComputedStyle(e).backdropFilter || getComputedStyle(e).webkitBackdropFilter, b: [...e.querySelectorAll('button')].map(x => x.textContent) } });
  ok(ask && ask.t === 'Proposition de jouer à mots fléchés par ' + A.name, 'fenêtre : « ' + (ask && ask.t) + ' »');
  ok(ask && /blur/.test(ask.blur), 'arrière-plan flouté (' + (ask && ask.blur) + ')');
  ok(ask && ask.b.join('/') === 'Oui/Non', 'boutons Oui / Non');
  ok((await g.evaluate(() => window.__osc)) > o0, 'un son est joué à la réception');
  await g.screenshot({ path: SHOT + '/inv_modale.png' });
  await g.click('#mjAsk [data-r="1"]'); await sleep(9000);
  const ug = g.url(), ua = a.url(); const cg = (ug.match(/\/([A-Z0-9]{5})\/fleches/) || [])[1];
  ok(cg && ua.includes('/' + cg + '/fleches'), 'Oui : l\'invité et A jouent à la même table (' + cg + ')');
  const sg = await g.evaluate(() => window.__t('G?({n:G.players.length,names:G.players.map(p=>p.name),wait:G.wait}):null'));
  ok(sg && !sg.wait && sg.names.includes(gm.name), 'partie lancée : ' + JSON.stringify(sg && sg.names));

  // --- 3. C est en pleine partie (solo) : l'invitation n'interrompt rien, elle attend dans la boîte (pastille non lue)
  const c = await page(C); await c.goto(U + '/rond?go=solo'); await sleep(3000);
  const a2 = await page(A, 1280); await a2.goto(U + '/rond?go=solo'); await sleep(2500); await a2.click('.mjpill'); await sleep(800);
  const oc0 = await c.evaluate(() => window.__osc);
  await a2.click('#mjWin [data-a="inv"][data-n="' + C.name + '"]'); await sleep(1500);
  const cs = await c.evaluate(() => ({ ask: !!(document.getElementById('mjAsk') && document.getElementById('mjAsk').classList.contains('on')), ban: !!document.querySelector('.mjban'), bdg: (document.querySelector('.mjpill .mjbdg') || {}).textContent || '' }));
  ok(!cs.ask && !cs.ban, 'en partie : pas de fenêtre ni de bandeau');
  ok(cs.bdg === '1', 'en partie : pastille « 1 invitation non lue » sur le bouton');
  ok((await c.evaluate(() => window.__osc)) > oc0, 'en partie : le son d\'invitation est joué');
  await c.screenshot({ path: SHOT + '/inv_pastille.png' });
  await c.click('.mjpill'); await sleep(600);
  const box = await c.evaluate(() => [...document.querySelectorAll('#mjWin .mjc')].find(e => /Invitations reçues/.test(e.textContent))?.textContent || '');
  ok(/Tourniquet/.test(box) && box.includes(A.name), 'boîte : jeu et expéditeur (« ' + box.slice(0, 60) + ' »)');
  const bdg2 = await c.evaluate(() => (document.querySelector('.mjpill .mjbdg') || {}).textContent || '');
  ok(!bdg2, 'boîte ouverte : la pastille disparaît');
  await c.screenshot({ path: SHOT + '/inv_boite.png' });
  await c.click('#mjWin [data-a="in"]'); await sleep(1000);
  const left = await c.evaluate(() => [...document.querySelectorAll('#mjWin .mjc')].some(e => /Invitations reçues/.test(e.textContent)));
  ok(!left, '« Non » : l\'invitation quitte la boîte');

  // --- 4. l'invité crée son compte : tout passe dans le compte, le nom d'invité ne sert plus
  const g2 = await api('guest', {}); await api('solo', { name: g2.name, token: g2.token, game: 'fleches', op: 'put', doc: { gid: 'test' + sfx, solo: true, done: false, level: 'facile' } });
  const nn = 'IN' + sfx; const cr = await api('create', { name: nn, pin: '2468', guest: g2.name, gtoken: g2.token });
  ok(cr.status === 200 && cr.merged === g2.name, 'inscription : l\'invité ' + g2.name + ' est repris (' + cr.merged + ')');
  const me2 = await api('me', { name: nn, token: cr.token }); ok(me2.status === 200 && (me2.solo || []).includes('fleches'), 'la partie gardée de l\'invité est dans le compte');
  ok((await api('me', { name: g2.name, token: g2.token })).status === 401, 'l\'ancien nom d\'invité est fermé');
  const again = await api('create', { name: 'IM' + sfx, pin: '2468', guest: g2.name, gtoken: g2.token }); ok(again.status === 200 && !again.merged, 'un invité déjà repris ne peut pas l\'être deux fois');
  // la fenêtre « Ma page » d'un invité propose de créer le compte
  const g3 = await page({ name: (await api('guest', {})).name, token: 'x', guest: 1 }); await g3.goto(U + '/'); await sleep(1500);
  const pill = await g3.evaluate(() => document.querySelector('.me-pill .sub') ? document.querySelector('.me-pill .sub').textContent : '');
  ok(/Créer mon compte/.test(pill), 'pastille de l\'invité : « ' + pill + ' »');

  ok(!errs.length, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(res.join('\n')); await br.close(); process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error(e); console.log(res.join('\n')); process.exit(1) });
