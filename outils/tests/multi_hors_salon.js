// Multijoueur hors salon (mots fléchés) : bouton « À plusieurs », joueurs en ligne, partie rapide, invitation directe,
// lien d'invitation (avec un invité sans pseudo), robot de secours, défi différé.
// usage : PW=chemin/playwright U=http://localhost:3999 node outils/tests/multi_hors_salon.js
const PW = process.env.PW || 'playwright'; const { chromium } = require(PW);
const U = process.env.U || 'http://localhost:3999'; const res = []; const ok = (c, l) => { res.push((c ? '✅ ' : '❌ ') + l); return c };
const SHOT = process.env.SHOT || '/tmp';
const ip = () => '10.9.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }); const errs = [];
  const sfx = Math.floor(Math.random() * 900 + 100); const names = ['HA', 'HB', 'HC', 'HD'].map(x => x + sfx);
  const P = []; for (const n of names) { const r = await api('create', { name: n, pin: '1357' }); P.push({ name: n, token: r.token }) }
  const page = async (me, w = 390) => { const c = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 500, isMobile: w < 500 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push((me ? me.name : 'invité') + ': ' + e.message)); await p.goto(U + '/');
    await p.evaluate(m => { if (m) localStorage.setItem('fl-me', JSON.stringify(m)); ['fleches', 'rond', 'meles', 'culture', 'poker', 'magnetico'].forEach(k => localStorage.setItem('fl-tuto-' + k, '1')) }, me); return p };
  const st = p => p.evaluate(() => window.__t('G?({wait:G.wait,n:G.players.length,names:G.players.map(p=>p.name),turn:G.turn,me:mySeat(),done:G.done,solo:!!G.solo,bot:!!G.bot,grid:G.grid}):null'));
  const mjOpen = async p => { await p.click('.mjpill'); await sleep(300) };

  // --- présence : A et B ont une page de mots fléchés ouverte (en solo) et se voient
  const a = await page(P[0]); await a.goto(U + '/fleches?go=solo&lvl=facile'); await sleep(2500);
  const b = await page(P[1], 1280); await b.goto(U + '/fleches?go=solo&lvl=facile'); await sleep(2500);
  const pill = await a.evaluate(() => { const e = document.querySelector('.mjpill'); return e ? e.textContent : null });
  ok(pill && /À plusieurs · 1/.test(pill), 'bouton « À plusieurs » avec 1 joueur en ligne (' + pill + ')');
  await mjOpen(a); const rows = await a.evaluate(() => [...document.querySelectorAll('#mjWin .mjrow b')].map(e => e.textContent));
  ok(rows.includes(P[1].name), 'joueurs en ligne : ' + JSON.stringify(rows));
  await a.screenshot({ path: SHOT + '/mj_panneau.png' });
  const over = await a.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('#mjWin *')].some(e => e.getBoundingClientRect().right > innerWidth + 1));
  ok(!over, 'panneau : rien ne dépasse à 390 px');
  // info-bulle
  await a.click('#mjWin [data-tip="mjT1"]'); const tipOn = await a.evaluate(() => !document.getElementById('mjT1').hidden); ok(tipOn, 'info-bulle « Partie rapide » s\'ouvre');

  // --- invitation directe : A invite B, B accepte → tous deux à la même table, partie lancée
  await a.click('#mjWin [data-a="inv"][data-n="' + P[1].name + '"]'); await sleep(1200);
  const ban = await b.evaluate(() => { const e = document.querySelector('.mjban'); return e ? e.textContent : '' });
  ok(/t'invite/.test(ban), 'B reçoit l\'invitation : « ' + ban.slice(0, 60) + ' »');
  await b.screenshot({ path: SHOT + '/mj_invitation.png' });
  await b.click('.mjban .go'); await sleep(9000);
  const ua = a.url(), ub = b.url(); const ca = (ua.match(/\/([A-Z0-9]{5})\/fleches/) || [])[1], cb = (ub.match(/\/([A-Z0-9]{5})\/fleches/) || [])[1];
  ok(ca && ca === cb, 'même table pour A et B (' + ca + ' / ' + cb + ')');
  let sa = await st(a), sb = await st(b);
  ok(sa && !sa.solo && !sa.wait && sa.n === 2 && sb && sb.grid === sa.grid, 'partie lancée automatiquement à 2 : ' + JSON.stringify(sa && sa.names));
  const busyPill = await a.evaluate(() => { const e = document.querySelector('.mjpill'); return e ? getComputedStyle(e).display : 'none' });
  ok(busyPill === 'none', 'bouton « À plusieurs » caché pendant la partie');
  await a.screenshot({ path: SHOT + '/mj_table.png' });
  // la table n'apparaît pas dans « Mes salons »
  const me1 = await api('me', P[0]); ok(!JSON.stringify(me1).includes(ca), 'la table n\'est pas dans les salons du joueur');
  // un joueur extérieur ne peut pas entrer sans la clé
  const c = await page(P[2]); await c.goto(U + '/' + ca + '/fleches'); await sleep(2500);
  ok(!/\/[A-Z0-9]{5}\/fleches/.test(c.url()) || c.url().indexOf(ca) < 0, 'sans le lien, impossible d\'entrer à la table (' + c.url().replace(U, '') + ')');
  await a.context().close(); await b.context().close();

  // --- partie rapide : C cherche, D cherche → appariés
  await c.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(2000);
  const d = await page(P[3], 1280); await d.goto(U + '/fleches?go=solo&lvl=normal'); await sleep(2000);
  await mjOpen(c); await c.click('#mjWin [data-lv="normal"]'); await c.click('#mjWin [data-a="quick"]'); await sleep(1500);
  const waitTxt = await c.evaluate(() => document.querySelector('#mjWin .mjwait') ? document.querySelector('#mjWin .mjwait').textContent : '');
  ok(/Recherche/.test(waitTxt), 'C attend un adversaire : « ' + waitTxt + ' »');
  await mjOpen(d); const dSees = await d.evaluate(() => document.querySelector('#mjWin').textContent); ok(/cherche un adversaire/.test(dSees), 'D voit que C cherche un adversaire');
  await d.click('#mjWin [data-a="quick"]'); await sleep(9000);
  let sc = await st(c), sd = await st(d);
  ok(sc && sd && !sc.solo && sc.grid === sd.grid && !sc.wait && sc.n === 2, 'partie rapide : C et D jouent ensemble ' + JSON.stringify(sc && sc.names));
  await c.context().close(); await d.context().close();

  // --- lien d'invitation : E crée le lien et attend ; un invité sans pseudo l'ouvre, crée son pseudo, revient à la table
  const e = await page(P[0]); await e.goto(U + '/fleches?go=solo'); await sleep(2000); await mjOpen(e);
  await e.click('#mjWin [data-a="link"]'); await sleep(1200);
  const link = await e.evaluate(() => { const x = document.querySelector('#mjWin .mjlink'); return x ? x.textContent : '' });
  ok(/\/[A-Z0-9]{5}\/fleches\?k=[a-z2-9]{8}$/.test(link), 'lien créé : ' + link.replace(U, ''));
  await e.screenshot({ path: SHOT + '/mj_lien.png' });
  await e.click('#mjWin [data-a="table"]'); await sleep(3000);
  let se = await st(e); ok(se && se.wait && se.names.includes('Invité'), 'E attend à la table : ' + JSON.stringify(se && se.names));
  const g = await page(null); await g.goto(link); await sleep(1500);
  ok(/need=pseudo/.test(g.url()), 'l\'invité sans pseudo est envoyé créer son pseudo');
  const gn = 'HG' + sfx; const r = await api('create', { name: gn, pin: '1357' });
  await g.evaluate(m => localStorage.setItem('fl-me', JSON.stringify(m)), { name: gn, token: r.token });
  await g.goto(U + '/'); await sleep(2500);   // l'accueil le renvoie à la table
  await sleep(8000); const sg = await st(g); se = await st(e);
  ok(sg && se && sg.grid === se.grid && !se.wait && se.names.includes(gn), 'après son pseudo, l\'invité revient et la partie démarre : ' + JSON.stringify(se && se.names));
  await e.context().close(); await g.context().close();

  // --- robot de secours : personne ne vient, la partie se joue contre le robot
  const h = await page(P[1]); await h.goto(U + '/fleches?go=solo'); await sleep(2000);
  await h.evaluate(() => window.__t('botStart("facile")')); await sleep(7000);
  let sh = await st(h); ok(sh && sh.bot && sh.names[1] === 'Robot Pop' && !sh.done, 'partie contre le robot ' + JSON.stringify(sh && sh.names));
  if (sh.turn === 0) { await h.evaluate(() => window.__t('pass()')); }
  await sleep(17000); const after = await h.evaluate(() => window.__t('({t:G.turn,f:Object.values(G.filled).filter(v=>v===1).length,s:G.players[1].score,msg:G.msg})'));
  ok(after.f > 0 || /Raté|lettre/.test(after.msg), 'le robot a joué son tour (' + JSON.stringify(after) + ')');
  await h.screenshot({ path: SHOT + '/mj_robot.png' });
  await h.context().close();

  // --- défi différé : A finit une grille, crée le défi ; B ouvre /duel/ID, joue la même grille, les scores sont comparés
  const x = await page(P[2]); await x.goto(U + '/fleches?go=solo&lvl=facile'); await sleep(2500);
  await x.evaluate(() => window.__t('G.players[0].score=42;finish("fin");save();render()')); await sleep(1200);
  const dv = await x.evaluate(() => getComputedStyle(document.querySelector('#endDuel')).display); ok(dv !== 'none', 'fin de grille : bouton « Défier un proche »');
  await x.click('#endDuel'); await sleep(1500);
  const box = await x.evaluate(() => { const b = document.querySelector('#duelBox'); return b ? b.textContent : '' }); ok(/défi est prêt/.test(box) && /42/.test(box), 'défi créé : ' + box.slice(0, 50));
  const did = await x.evaluate(() => window.__t('G.duel')); const xg = (await st(x)).grid;
  await x.screenshot({ path: SHOT + '/mj_defi.png' });
  const y = await page(P[3]); await y.goto(U + '/duel/' + did); await sleep(3500);
  const sy = await st(y); ok(sy && sy.solo && sy.grid === xg, 'le défi ouvre la même grille (' + (sy && sy.grid) + ')');
  await y.evaluate(() => window.__t('G.players[0].score=50;finish("fin");save();render()')); await sleep(2000);
  const tab = await y.evaluate(() => [...document.querySelectorAll('#duelBox tr')].map(t => t.textContent));
  ok(tab.length === 3 && /50/.test(tab[1]) && /42/.test(tab[2]), 'scores comparés : ' + JSON.stringify(tab));
  await y.screenshot({ path: SHOT + '/mj_defi_resultat.png' });
  await x.context().close(); await y.context().close();

  ok(!errs.length, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(res.join('\n')); await br.close(); process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error(e); console.log(res.join('\n')); process.exit(1) });
