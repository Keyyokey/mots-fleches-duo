// Prototype — Mots Fléchés Duo : fond animé en Canvas 2D, mini-jeu « Attrape les lettres du mot du jour »
// Structure : état → boucle (update/draw) → entrées → interface. Aucune dépendance.
(() => {
  "use strict";

  // ---------- réglages ----------
  const WORDS = ["GRILLE", "LETTRE", "ENIGME", "DEFINIR", "MOTEUR", "CROISER", "FLECHE", "TOURNER", "MELANGE", "CULTURE",
    "VOYELLE", "ALPHABET", "PLUME", "INDICE", "SYLLABE", "DICTION", "LECTURE", "ROMAN", "POESIE", "CASSE"];
  const DECOYS = "AEIOUBCDFGHJKLMNPRSTVZ";
  const DURATION = 60;                         // secondes de jeu
  const N_LETTERS = () => (innerWidth < 600 ? 14 : 22);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SEASON = (() => { const m = new Date().getMonth(); return m < 2 || m === 11 ? "hiver" : m < 5 ? "printemps" : m < 8 ? "ete" : "automne"; })();
  const LIGHT = matchMedia("(prefers-color-scheme: light)").matches;   // fond clair : couleurs plus soutenues pour rester lisibles
  const PALETTE = LIGHT ? { hiver: ["#0369a1", "#4338ca", "#0e7490"], printemps: ["#15803d", "#be185d", "#a16207"], ete: ["#b45309", "#c2410c", "#0f766e"], automne: ["#c2410c", "#b91c1c", "#a16207"] }[SEASON] : { hiver: ["#7dd3fc", "#a5b4fc", "#e0f2fe"], printemps: ["#86efac", "#f9a8d4", "#fde68a"], ete: ["#fcd34d", "#fb923c", "#5eead4"], automne: ["#fb923c", "#f87171", "#facc15"] }[SEASON];

  // ---------- canvas ----------
  const cv = document.getElementById("scene"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener("resize", resize); resize();

  // ---------- état ----------
  const S = { mode: "idle", word: "", slots: [], score: 0, left: DURATION, letters: [], parts: [], shake: 0, pointer: { x: -999, y: -999 } };
  const dayWord = () => { const d = new Date(); const k = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); return WORDS[k % WORDS.length]; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const missing = () => S.slots.map((c, i) => (c ? null : S.word[i])).filter(Boolean);

  // zones occupées par l'interface (carte du jeu, tuiles, en-tête) : les lettres les contournent pour rester attrapables
  let RECTS = [];
  const readRects = () => { RECTS = [...document.querySelectorAll(S.mode === "play" ? ".top,.hero" : ".top,.hero,.tile,.sec")].map(e => e.getBoundingClientRect()).filter(r => r.bottom > 0 && r.top < H); };
  const inRect = (x, y, r) => RECTS.some(b => x + r > b.left && x - r < b.right && y + r > b.top && y - r < b.bottom);
  function freeSpot(r) { for (let k = 0; k < 40; k++) { const x = rnd(r, W - r), y = rnd(r, H - r); if (!inRect(x, y, r)) return [x, y]; } return [rnd(r, W - r), H - r]; }
  function makeLetter(ch) {
    const r = innerWidth < 600 ? rnd(20, 26) : rnd(24, 32), sp = REDUCED ? 12 : 38; readRects(); const [x0, y0] = freeSpot(r);
    return { ch, r, x: x0, y: y0, vx: rnd(-sp, sp), vy: rnd(-sp, sp), rot: rnd(-.3, .3), vr: rnd(-.4, .4), col: PALETTE[Math.floor(Math.random() * PALETTE.length)], pop: 0 };
  }
  // au moins une lettre utile par case vide, le reste en leurres
  function fill() {
    const need = S.mode === "play" ? missing() : [];
    const have = S.letters.map(l => l.ch);
    for (const ch of need) { const i = have.indexOf(ch); if (i >= 0) have.splice(i, 1); else S.letters.push(makeLetter(ch)); }
    while (S.letters.length < N_LETTERS()) S.letters.push(makeLetter(DECOYS[Math.floor(Math.random() * DECOYS.length)]));
  }

  // ---------- son ----------
  let AC = null, soundOn = (() => { try { return localStorage.getItem("fl-sound") !== "off"; } catch { return true; } })();
  function tone(f, d = 0, t = .15, type = "sine", v = .1) {
    if (!soundOn) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
      const n = AC.currentTime + d, o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(v, n + .01); g.gain.exponentialRampToValueAtTime(.0001, n + t);
      o.connect(g).connect(AC.destination); o.start(n); o.stop(n + t + .05);
    } catch { /* son indisponible */ }
  }
  const sfx = { good: () => { tone(660); tone(990, .08, .2); }, bad: () => tone(180, 0, .2, "square", .05), win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .12, .3, "triangle", .14)), tic: () => tone(1100, 0, .05, "square", .03), end: () => [440, 392, 330].forEach((f, i) => tone(f, i * .16, .3)) };

  // ---------- interface ----------
  const $ = id => document.getElementById(id);
  function renderUI() {
    $("slots").innerHTML = S.slots.map((c, i) => `<span class="slot${c ? " on" : ""}" aria-label="case ${i + 1}${c ? " : " + c : " vide"}">${c || ""}</span>`).join("");
    $("score").textContent = S.score + (Math.abs(S.score) > 1 ? " pts" : " pt");
    $("timer").textContent = Math.ceil(S.left) + " s";
    $("startBtn").style.display = S.mode === "play" ? "none" : "";
  }
  function start() {
    S.mode = "play"; S.word = dayWord(); S.slots = Array(S.word.length).fill(""); S.score = 0; S.left = DURATION; S.letters = []; fill(); renderUI();
    $("endOv").hidden = true; document.body.classList.add("playing");   // pendant la partie, les tuiles s'effacent : tout l'écran sert au jeu
  }
  function finish(won) {
    S.mode = "end"; document.body.classList.remove("playing");
    if (won) { const bonus = Math.ceil(S.left) * 2; S.score += bonus; sfx.win(); burst(W / 2, H / 3, 60); $("endT").textContent = "Bravo !"; $("endP").textContent = `Tu as trouvé « ${S.word} » avec ${Math.ceil(S.left)} s d'avance (+${bonus} pts de bonus). Score : ${S.score} pts.`; }
    else { sfx.end(); $("endT").textContent = "Temps écoulé"; $("endP").textContent = `Le mot du jour était « ${S.word} ». Score : ${S.score} pts.`; }
    renderUI(); $("endOv").hidden = false; $("againBtn").focus();
  }
  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("soundBtn").addEventListener("click", e => {
    soundOn = !soundOn; try { localStorage.setItem("fl-sound", soundOn ? "on" : "off"); } catch { }
    e.currentTarget.textContent = soundOn ? "🔊" : "🔇"; e.currentTarget.setAttribute("aria-pressed", String(soundOn)); e.currentTarget.setAttribute("aria-label", soundOn ? "Son activé" : "Son coupé");
  });
  if (!soundOn) { const b = $("soundBtn"); b.textContent = "🔇"; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Son coupé"); }

  // ---------- entrées ----------
  function hit(x, y) {
    for (let i = S.letters.length - 1; i >= 0; i--) { const l = S.letters[i]; if (Math.hypot(l.x - x, l.y - y) <= l.r + 6) return i; }
    return -1;
  }
  cv.addEventListener("pointermove", e => { S.pointer.x = e.clientX; S.pointer.y = e.clientY; });
  cv.addEventListener("pointerleave", () => { S.pointer.x = S.pointer.y = -999; });
  cv.addEventListener("pointerdown", e => {
    const i = hit(e.clientX, e.clientY); if (i < 0) return;
    const l = S.letters[i];
    if (S.mode !== "play") { l.vx += rnd(-120, 120); l.vy -= 140; burst(l.x, l.y, 8, l.col); return; }   // hors partie : simple jeu de bulles
    const k = S.slots.findIndex((c, j) => !c && S.word[j] === l.ch);
    if (k >= 0) {
      S.slots[k] = l.ch; S.score += 10; sfx.good(); burst(l.x, l.y, 18, "#5eead4"); S.letters.splice(i, 1);
      if (!S.slots.includes("")) return finish(true);
    } else { S.score -= 3; S.shake = .35; sfx.bad(); l.pop = .3; }
    fill(); renderUI();
  });

  // ---------- particules ----------
  function burst(x, y, n, col) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(60, 260); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.4, .9), col: col || PALETTE[i % PALETTE.length] }); } }

  // ---------- boucle ----------
  let last = performance.now(), tic = -1;
  function update(dt) {
    if (S.mode === "play") {
      S.left -= dt;
      const s = Math.ceil(S.left); if (s <= 5 && s > 0 && s !== tic) { tic = s; sfx.tic(); renderUI(); }
      if (Math.ceil(S.left + dt) !== s) renderUI();
      if (S.left <= 0) { S.left = 0; return finish(false); }
    }
    for (const l of S.letters) {
      const dx = l.x - S.pointer.x, dy = l.y - S.pointer.y, d = Math.hypot(dx, dy);
      if (d < 120 && d > 1) { const f = (120 - d) * 2.2; l.vx += dx / d * f * dt; l.vy += dy / d * f * dt; }   // les lettres s'écartent du doigt
      const sp = Math.hypot(l.vx, l.vy), max = REDUCED ? 30 : 140; if (sp > max) { l.vx *= max / sp; l.vy *= max / sp; }
      l.x += l.vx * dt; l.y += l.vy * dt; l.rot += l.vr * dt; l.pop = Math.max(0, l.pop - dt);
      if (l.x < l.r) { l.x = l.r; l.vx = Math.abs(l.vx); } if (l.x > W - l.r) { l.x = W - l.r; l.vx = -Math.abs(l.vx); }
      if (l.y < l.r) { l.y = l.r; l.vy = Math.abs(l.vy); } if (l.y > H - l.r) { l.y = H - l.r; l.vy = -Math.abs(l.vy); }
      for (const b of RECTS) {                                      // rebond sur les cartes de l'interface
        if (!(l.x + l.r > b.left && l.x - l.r < b.right && l.y + l.r > b.top && l.y - l.r < b.bottom)) continue;
        const o = [[l.x + l.r - b.left, "L"], [b.right - (l.x - l.r), "R"], [l.y + l.r - b.top, "T"], [b.bottom - (l.y - l.r), "B"]].sort((a, c) => a[0] - c[0])[0];
        if (o[1] === "L") { l.x = b.left - l.r; l.vx = -Math.abs(l.vx); } else if (o[1] === "R") { l.x = b.right + l.r; l.vx = Math.abs(l.vx); }
        else if (o[1] === "T") { l.y = b.top - l.r; l.vy = -Math.abs(l.vy); } else { l.y = b.bottom + l.r; l.vy = Math.abs(l.vy); }
      }
    }
    for (let i = 0; i < S.letters.length; i++) for (let j = i + 1; j < S.letters.length; j++) {   // les lettres ne se chevauchent pas
      const a = S.letters[i], c = S.letters[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || .01, m = a.r + c.r + 4;
      if (d < m) { const k = (m - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * k; a.y -= ny * k; c.x += nx * k; c.y += ny * k; const v = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny; if (v < 0) { a.vx += v * nx; a.vy += v * ny; c.vx -= v * nx; c.vy -= v * ny; } }
    }
    for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
    S.parts = S.parts.filter(p => p.life > 0);
    S.shake = Math.max(0, S.shake - dt);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (S.shake) ctx.translate(rnd(-4, 4) * S.shake * 3, rnd(-4, 4) * S.shake * 3);
    for (const l of S.letters) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot); const sc = 1 + l.pop; ctx.scale(sc, sc);
      ctx.globalAlpha = S.mode === "play" ? .95 : (LIGHT ? .7 : .55);
      ctx.fillStyle = LIGHT ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.10)"; ctx.strokeStyle = l.pop ? "#f87171" : l.col; ctx.lineWidth = 2;
      roundRect(-l.r, -l.r, l.r * 2, l.r * 2, l.r * .45); ctx.fill(); ctx.stroke();
      ctx.fillStyle = l.col; ctx.font = `900 ${Math.round(l.r * 1.15)}px Nunito, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(l.ch, 0, 2);
      ctx.restore();
    }
    for (const p of S.parts) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;    // onglet caché : pas de saut de temps au retour
    readRects(); update(dt); draw(); requestAnimationFrame(frame);
  }

  fill(); S.word = dayWord(); S.slots = Array(S.word.length).fill(""); renderUI();
  requestAnimationFrame(frame);
  if (location.hostname === "localhost") window.__proto = { S, start, hit };   // pour les tests
})();
