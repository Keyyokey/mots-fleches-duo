// Défis du jour pour les réseaux (TikTok, Facebook, Instagram) : captures brutes prises sur le site local.
// node outils/reseaux/defis_capture.js [dossier_sortie]   (serveur local sur le port 3999, Playwright : variable PW)
// Sorties : fleches.png (grille avec 1 seul mot rempli), motdujour.png (2 essais colorés, jamais le mot), magnetico/ (images d'une
// partie : bulles qui bougent, aucune syllabe placée), enigme.json (question du jour seulement), infos.json.
const { chromium } = require(process.env.PW || "playwright");
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), OUT = path.resolve(process.argv[2] || "defis_out"), U = process.env.URL || "http://localhost:3999";
fs.mkdirSync(path.join(OUT, "magnetico"), { recursive: true });
const strip = w => String(w || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
// dictionnaire du Mot du jour (même source que le serveur) pour choisir deux essais plausibles
const f = fs.readdirSync(path.join(ROOT, "public", "d")).find(n => /^magnetico-[0-9a-f]{10}\.js$/.test(n));
const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "public", "d", f), "utf8"), sb);
const DICT = new Set(); for (const lv in sb.window.MG_MOTS) for (const e of sb.window.MG_MOTS[lv]) DICT.add(strip(e.split("|")[0]));
const colors = (g, w) => { const r = Array(w.length).fill(0), left = {}; for (let i = 0; i < w.length; i++) if (g[i] === w[i]) r[i] = 2; else left[w[i]] = (left[w[i]] || 0) + 1;
  for (let i = 0; i < w.length; i++) if (r[i] !== 2 && left[g[i]]) { r[i] = 1; left[g[i]]--; } return r; };
const NO_TUTO = () => { try { ["fleches", "rond", "meles", "culture", "poker", "magnetico", "motdujour"].forEach(k => localStorage.setItem("fl-tuto-" + k, "1")); localStorage.setItem("fl-pop-tuto", "1"); } catch (e) {} };

(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const info = {};
  // ---------- Mot du jour : le mot est connu du serveur ; on montre 2 essais qui donnent des indices sans le révéler ----------
  {
    const c = await br.newContext({ viewport: { width: 520, height: 900 }, deviceScaleFactor: 2 }); await c.addInitScript(NO_TUTO); const p = await c.newPage();
    await p.goto(U + "/motdujour"); await p.waitForTimeout(2500);
    const st = await p.evaluate(() => window.__t("({len:S.len,first:S.first,day:S.day})"));
    const call = b => p.evaluate(b => window.__t("call(" + JSON.stringify(b) + ")"), b);
    // le mot du jour : on l'apprend en interrogeant une partie invitée jetable (6 essais au plus, sans rien afficher)
    const cands = [...DICT].filter(w => w.length === st.len && w[0] === st.first);
    const probe = "zz" + Math.random().toString(36).slice(2, 14).replace(/[^a-z0-9]/g, "").padEnd(12, "0");
    let ans = null;
    const pool = cands.slice(); const seen = [];
    for (let k = 0; k < 6 && !ans; k++) {
      const g = pool.find(w => seen.every(([sg, sc]) => colors(sg, w).join() === sc.join())); if (!g) break;
      const r = await p.evaluate(([b, g]) => fetch("/api/p/mj", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "essai", guest: b, g }) }).then(r => r.json()), [probe, g]);
      const t = (r.tries || []).slice(-1)[0]; if (!t) break; seen.push([g, t.c]); if (r.ok) ans = g;
      pool.splice(pool.indexOf(g), 1);
    }
    if (!ans) { const left = pool.filter(w => seen.every(([sg, sc]) => colors(sg, w).join() === sc.join())); ans = left.length === 1 ? left[0] : null; }
    // deux essais : le 1er avec 1 à 2 lettres bien placées, le 2e avec 2 à 3 ; jamais le mot
    const score = w => colors(w, ans).filter(x => x === 2).length - 1, y = w => colors(w, ans).filter(x => x === 1).length;
    const others = cands.filter(w => w !== ans).sort();
    const g1 = others.find(w => score(w) === 1 && y(w) >= 1) || others.find(w => score(w) <= 1) || others[0];
    const g2 = others.find(w => w !== g1 && score(w) === 2 && y(w) >= 1) || others.find(w => w !== g1 && score(w) >= 2 && score(w) <= 3) || others.find(w => w !== g1);
    for (const g of [g1, g2]) { await p.evaluate(g => window.__t('inp.value="' + g + '";inp.dispatchEvent(new Event("input"));send()'), g); await p.waitForTimeout(900); }
    await p.evaluate(() => { const i = document.querySelector("#mdIn"); if (i) i.blur(); });
    await (await p.$("#mdGrid")).screenshot({ path: path.join(OUT, "motdujour.png") });
    info.motdujour = { len: st.len, first: st.first, day: st.day, essais: [g1, g2] };
    // la partie sonde et la partie montrée restent sur le serveur local : rien n'est envoyé au vrai site
    await c.close();
  }
  // ---------- Mots fléchés : grille d'un niveau normal avec un seul mot rempli (le plus long horizontal) ----------
  {
    const c = await br.newContext({ viewport: { width: 640, height: 980 }, deviceScaleFactor: 2 }); await c.addInitScript(NO_TUTO); const p = await c.newPage();
    await p.goto(U + "/fleches?go=solo&lvl=normal"); await p.waitForTimeout(6000);
    const w = await p.evaluate(() => window.__t(`(()=>{let best=null;for(const k in cellWords){const x=cellWords[k].h;if(x&&x.cells.every(c=>G.filled[c]===undefined)&&(!best||x.cells.length>best.cells.length))best=x}return best&&best.cells.map(c=>[c,SOL[c]])})()`));
    if (w) { const el = await p.$('[data-k="' + w[0][0] + '"]'); if (el) await el.click(); await p.waitForTimeout(200); for (const [, ch] of w) { await p.keyboard.type(ch); await p.waitForTimeout(80); } }
    await p.waitForTimeout(900); await p.evaluate(() => { document.querySelectorAll('.sel,.cur,.on-word,.hl,.qsel,.wsel,.act').forEach(e => e.classList.remove('sel', 'cur', 'on-word', 'hl', 'qsel', 'wsel', 'act')); if (document.activeElement) document.activeElement.blur(); }); await p.waitForTimeout(300);
    await (await p.$("#grid")).screenshot({ path: path.join(OUT, "fleches.png") });
    info.fleches = { mot: w ? w.map(x => x[1]).join("") : "" };
    await c.close();
  }
  // ---------- Magnético : les bulles qui bougent, rien de placé (images pour la vidéo) ----------
  {
    const c = await br.newContext({ viewport: { width: 600, height: 1067 }, deviceScaleFactor: 1 }); await c.addInitScript(NO_TUTO); const p = await c.newPage();
    await p.goto(U + "/magnetico?go=solo&lvl=" + (process.env.MG_LVL || "normal")); await p.waitForTimeout(1500);
    await p.waitForFunction(() => document.querySelectorAll(".mgball").length && [...document.querySelectorAll(".mgball")].filter(e => e.style.display !== "none").length >= 3, null, { timeout: 15000 }).catch(() => {});
    // toutes les bulles du mot (syllabes + pièges) sont entrées dans le cadre
    await p.waitForFunction(() => window.__t("queue.length===0&&!ent"), null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
    const box = await p.evaluate(() => { const a = document.querySelector("#mgBox").getBoundingClientRect(), b = document.querySelector("#mgField").getBoundingClientRect(); return { x: Math.min(a.left, b.left) - 6, y: a.top - 6, width: Math.max(a.right, b.right) - Math.min(a.left, b.left) + 12, height: b.bottom - a.top + 12 }; });
    // enregistrement continu (screencast) pendant 7 s, bien avant la fin du chrono (sinon la réponse s'affiche)
    const cdp = await c.newCDPSession(p); let n = 0; const t0 = Date.now();
    cdp.on("Page.screencastFrame", async e => { if (Date.now() - t0 < 10000) { fs.writeFileSync(path.join(OUT, "magnetico", String(n++).padStart(3, "0") + ".jpg"), Buffer.from(e.data, "base64")); fs.appendFileSync(path.join(OUT, "magnetico", "t.txt"), e.metadata.timestamp + "\n"); } try { await cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }); } catch (_) {} });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    await p.waitForTimeout(10300); await cdp.send("Page.stopScreencast").catch(() => {});
    fs.writeFileSync(path.join(OUT, "magnetico", "clip.json"), JSON.stringify({ box, dpr: 1, vw: 600, vh: 1067 }));
    info.magnetico = await p.evaluate(() => window.__t ? window.__t("({n:word(cur).s.length,math:!!word(cur).math})") : null).catch(() => null);
    await c.close();
  }
  // ---------- Énigme du jour : la question seulement ----------
  {
    const r = await fetch(U + "/api/p/en", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json());
    fs.writeFileSync(path.join(OUT, "enigme.json"), JSON.stringify({ n: r.n, q: r.q }, null, 1));
  }
  fs.writeFileSync(path.join(OUT, "infos.json"), JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info)); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
