// 27/11 : suppression du compte (exigence Google Play) — API delme, salon du responsable supprimé pour tous,
// chemin dans l'appli (Ma page → Supprimer mon compte) et page web /supprimer-compte.
const { chromium } = require(process.env.PW || 'playwright'); const U = process.env.U || 'http://localhost:3999';
const ip = () => '10.7.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const api = async (r, b) => (await fetch(U + '/api/p/' + r, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: JSON.stringify(b) })).json();
(async () => {
  let ok = 0, ko = 0; const chk = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); c ? ok++ : ko++; };
  const s = Math.floor(Math.random() * 900 + 100);
  // API : un responsable de salon avec un membre
  const A = { name: 'DA' + s }, B = { name: 'DB' + s };
  A.token = (await api('create', { name: A.name, pin: '1357' })).token; B.token = (await api('create', { name: B.name, pin: '2468' })).token;
  const sc = await api('screate', { ...A, sname: 'Test suppr ' + s }); const code = sc.salon && sc.salon.code, acode = sc.salon && sc.salon.acode;
  const j = await api('sjoin', { ...B, code: acode }); chk(!!code && (j.salons || []).length >= 0, 'salon créé et rejoint (' + code + ')');
  await api('mj', { op: 'start', ...A });
  const wrong = await api('delme', { name: A.name, pin: '0000' }); chk(wrong.error === 'ident', 'mauvais code secret : refusé');
  const del = await api('delme', { name: A.name, pin: '1357' }); chk(del.ok === true, 'bon code secret : compte supprimé');
  const login = await api('login', { name: A.name, pin: '1357' }); chk(login.error === 'ident', 'connexion impossible après suppression');
  const rank = await api('rank', {}); chk(!JSON.stringify(rank).includes('"' + A.name + '"'), 'absent du classement');
  const lb = await api('salons', B); chk(!(lb.salons || []).some(x => x.code === code), 'le salon du responsable a disparu pour son membre');
  const j2 = await api('sjoin', { ...B, code: acode }); chk(!!j2.error || !!j2.msg && !(j2.salons || []).some(x => x.code === code), 'le code d\'accès du salon ne marche plus');
  // dans l'appli : accueil → Ma page → Supprimer mon compte
  const br = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const C = { name: 'DC' + s }; C.token = (await api('create', { name: C.name, pin: '9753' })).token;
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + '/fleches'); await p.evaluate(c => localStorage.setItem('fl-me', JSON.stringify({ name: c.name, token: c.token, salons: [] })), C);
  await p.reload(); await p.waitForTimeout(2200);
  await p.click('.gtop .gmenu'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('skTop').shadowRoot.querySelector('.mi[data-act=pseudo]').click()); await p.waitForTimeout(400);
  const R = 'document.getElementById("skTop").shadowRoot';
  const hasDel = await p.evaluate(R + '.querySelector("#meDel")!==null'); chk(hasDel, 'Ma page : lien « Supprimer mon compte »');
  await p.evaluate(R + '.querySelector("#meDel").click()'); await p.waitForTimeout(200);
  await p.evaluate(R + '.querySelector("#dmPin").value="9753"'); await p.evaluate(R + '.querySelector("#dmGo").click()'); await p.waitForTimeout(1200);
  const me = await p.evaluate(() => localStorage.getItem('fl-me')); const lc = await api('login', { name: C.name, pin: '9753' });
  chk(!me && lc.error === 'ident', 'appli : compte supprimé et joueur déconnecté');
  // page web
  const D = { name: 'DD' + s }; await api('create', { name: D.name, pin: '8642' });
  const w = await ctx.newPage(); await w.goto(U + '/supprimer-compte'); await w.waitForTimeout(800);
  await w.fill('#dfName', D.name); await w.fill('#dfPin', '8642'); await w.click('#dfGo'); await w.waitForTimeout(500);
  const m1 = await w.textContent('#dfMsg'); chk(/Coche/.test(m1), 'page web : confirmation demandée');
  await w.check('#dfOk'); await w.click('#dfGo'); await w.waitForTimeout(1200);
  const m2 = await w.textContent('#dfMsg'); const ld = await api('login', { name: D.name, pin: '8642' });
  chk(/supprimés/.test(m2) && ld.error === 'ident', 'page web : ' + m2);
  chk(!errs.length, 'aucune erreur de page ' + JSON.stringify(errs));
  await br.close(); console.log(ok + ' ok, ' + ko + ' ko'); process.exit(ko ? 1 : 0);
})();
