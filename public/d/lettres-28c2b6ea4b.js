/* Motipop · pluie de lettres (accueil 20/11/2026, toutes les pages depuis le 20/11 midi)
   Des tuiles de verre portant une lettre descendent lentement dans les marges vides, sur ordinateur seulement
   (dès qu'une marge dépasse 110 px) ; sur téléphone, dans les espaces libres entre les cartes (jamais visibles à travers une carte). Suit le bouton « Décor de saison » (body.nodeco = coupé)
   et le réglage « réduire les animations » du système. En pause quand l'onglet est caché. */
(function () {
  if (window.__lettres) return; window.__lettres = 1;
  const RM = matchMedia("(prefers-reduced-motion: reduce)");
  // lettres tirées selon leur fréquence en français (les plus courantes tombent plus souvent)
  const POOL = "EEEEEEEAAAAASSSSIIIINNNNTTTTRRRRUUULLLOOOODDCCPPMMEÉÈGBVHFQJXYZK";
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0";
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, zones = [], drops = [], last = 0, raf = 0, full = false, masks = [];
  // la zone occupée : <main> sur l'accueil ; sur les autres pages, l'ensemble des cartes de verre visibles (le jeu, pas l'en-tête)
  function content() {
    const m = document.querySelector("main"); if (m) return m.getBoundingClientRect();
    let L = Infinity, R = -Infinity;
    document.querySelectorAll(".wrap .glass, .wrap .gtop, .wrap canvas").forEach(e => {
      if (e.closest("[hidden]") || getComputedStyle(e).position === "fixed") return;
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; L = Math.min(L, r.left); R = Math.max(R, r.right);
    });
    if (L === Infinity) { const w = document.querySelector(".wrap"); return w ? w.getBoundingClientRect() : null; }
    return { left: L, right: R };
  }
  function measure(resize) {
    if (resize !== false) { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    const r = content(); zones = [];
    if (r) { if (r.left > 110) zones.push([12, r.left - 24]); if (W - r.right > 110) zones.push([r.right + 24, W - 12]); }
    // téléphone et écran étroit : pas de marge libre → les lettres passent en filigrane derrière tout le contenu (plus rares et plus pâles)
    const was = full; full = !zones.length && W <= 900; if (full) zones.push([6, W - 6]); if (was !== full) drops.length = 0;
    // accueil sur téléphone : vrai filigrane, par-dessus les cartes (très pâle, ne capte pas le toucher) ; jeux : toujours derrière
    // les cartes (jeux, classements, en-tête) masquent complètement les lettres : rien ne transparaît sous le verre
    masks = [...document.querySelectorAll(".glass, .tile, #skTop, #hdr, .wrap canvas, .sitefoot a")].filter(e => getComputedStyle(e).position !== "fixed");
    drops = drops.filter(d => zones.some(z => d.x >= z[0] && d.x <= z[1]));
  }
  const active = () => zones.length && !RM.matches && !document.body.classList.contains("nodeco") && !document.hidden;
  function spawn(top) {
    const z = zones[Math.floor(Math.random() * zones.length)], s = full ? 22 + Math.random() * 16 : 26 + Math.random() * 18;
    drops.push({ x: z[0] + s / 2 + Math.random() * Math.max(1, z[1] - z[0] - s), y: top ? Math.random() * H : -40, s,
      v: 14 + Math.random() * 16, a: (Math.random() - .5) * .5, va: (Math.random() - .5) * .25, sw: Math.random() * 6.28,
      l: POOL[Math.floor(Math.random() * POOL.length)], o: full ? .3 + Math.random() * .25 : .45 + Math.random() * .4 });
  }
  function tile(d, light) {
    const s = d.s, h = s / 2, fade = Math.min(1, (H - d.y) / 160, (d.y + 40) / 120);
    ctx.save(); ctx.translate(d.x + Math.sin(d.sw) * 6, d.y); ctx.rotate(d.a); ctx.globalAlpha = Math.max(0, d.o * fade);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-h, -h, s, s, s * .24) : ctx.rect(-h, -h, s, s);
    ctx.fillStyle = light ? "rgba(15,25,40,.05)" : "rgba(255,255,255,.07)"; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = light ? "rgba(15,25,40,.16)" : "rgba(255,255,255,.22)"; ctx.stroke();
    const g = ctx.createLinearGradient(-h, -h, h, h); g.addColorStop(0, "#22d3ee"); g.addColorStop(1, "#a78bfa");
    ctx.fillStyle = g; ctx.font = "800 " + Math.round(s * .58) + "px Nunito, Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(d.l, 0, s * .04); ctx.restore();
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return;                              // ~30 images/s : largement assez pour une chute lente
    const dt = Math.min(.1, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);
    if (!active()) { drops.length = 0; return; }
    const want = full ? Math.max(8, Math.round(W * H / 24000)) : zones.reduce((n, z) => n + Math.round((z[1] - z[0]) * H / 15000), 0);
    while (drops.length < want) spawn(drops.length < want / 2 && t < 4000);
    const light = document.documentElement.dataset.theme === "light";
    drops.forEach(d => { d.y += d.v * dt; d.a += d.va * dt; d.sw += dt * .6; tile(d, light); });
    drops = drops.filter(d => d.y < H + 40);
    ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = 1; ctx.beginPath();
    for (const e of masks) { const r = e.getBoundingClientRect(); if (r.width < 2 || r.bottom < 0 || r.top > H) continue; const rad = Math.min(24, r.height / 2, r.width / 2); if (ctx.roundRect) ctx.roundRect(r.left - 3, r.top - 3, r.width + 6, r.height + 6, rad); else ctx.rect(r.left - 3, r.top - 3, r.width + 6, r.height + 6); }
    ctx.fill(); ctx.globalCompositeOperation = "source-over";
  }
  measure(); setInterval(() => { if (!document.hidden) measure(false); }, 2000);   // le jeu change de taille en cours de partie
  addEventListener("resize", () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 150); });
  raf = requestAnimationFrame(frame);
})();
