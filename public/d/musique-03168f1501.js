/* Motipop · musique d'ambiance (20/11/2026)
   Nappe douce et lente, créée sur place (Web Audio) : 4 accords tenus qui se fondent l'un dans l'autre,
   un peu d'écho, parfois une note claire très légère. Pas de paroles, pas de rythme : pour la concentration.
   Coupée par défaut. Le choix est gardé dans le stockage du navigateur (fl-music = on / off).
   Les navigateurs interdisent le son avant un premier toucher : si la musique est allumée, elle démarre au premier geste. */
(function () {
  if (window.MotipopMusique) return;
  const LS = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const isOn = () => LS.get("fl-music") === "on";
  // accords : Do maj7, La min7, Fa maj7, Sol sus (notes MIDI)
  const CH = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 62]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let AC = null, master = null, bus = null, timer = null, playing = false, step = 0;

  function setup() {
    if (AC) return true;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    AC = new C(); master = AC.createGain(); master.gain.value = 0;
    // écho doux (réverbération fabriquée : un bruit qui s'éteint en 3 s)
    const len = AC.sampleRate * 3, buf = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) }
    const conv = AC.createConvolver(); conv.buffer = buf;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300;   // son rond, sans aigus agressifs
    const dry = AC.createGain(); dry.gain.value = .6; const wet = AC.createGain(); wet.gain.value = .5;
    lp.connect(dry); dry.connect(master); lp.connect(conv); conv.connect(wet); wet.connect(master); master.connect(AC.destination);
    bus = lp; return true;
  }
  function chord() {
    if (!playing) return;
    const t = AC.currentTime + .05, notes = CH[step % CH.length]; step++;
    notes.forEach((m, i) => [0, 7].forEach(det => {            // deux voix un peu désaccordées : son chaud
      const o = AC.createOscillator(), g = AC.createGain(), v = .045 / (i + 1.5);
      o.type = i === 0 ? "sine" : "triangle"; o.frequency.value = mtof(m); o.detune.value = det - 3.5;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 3); g.gain.setValueAtTime(v, t + 7); g.gain.linearRampToValueAtTime(0, t + 11);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 11.3);
    }));
    if (Math.random() < .6) {                                     // de temps en temps, une note claire très douce
      const m = notes[1 + Math.floor(Math.random() * 3)] + 24, dt = 2 + Math.random() * 4, o = AC.createOscillator(), g = AC.createGain();
      o.type = "sine"; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(.011, t + dt + .06); g.gain.exponentialRampToValueAtTime(.0001, t + dt + 4);
      o.connect(g); g.connect(bus); o.start(t + dt); o.stop(t + dt + 4.2);
    }
  }
  function start() {
    if (playing || !setup()) return;
    if (AC.state === "suspended") AC.resume();
    playing = true; const t = AC.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(.55, t + 3);
    chord(); timer = setInterval(chord, 8000);
  }
  function stop() {
    if (!playing) return; playing = false; clearInterval(timer); timer = null;
    const t = AC.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.5);
  }
  // icône : une note de musique en verre (barrée quand la musique est coupée)
  const icon = on => '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><defs><linearGradient id="muG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9F4FF"/><stop offset=".55" stop-color="#8FA8FF"/><stop offset="1" stop-color="#A26BFF"/></linearGradient></defs>'
    + '<path fill="url(#muG)" d="M19 12.5 36 8v21.5a5.5 4.5 0 1 1-3-4V15l-11 3v15.5a5.5 4.5 0 1 1-3-4z"' + (on ? '' : ' opacity=".75"') + '/>'
    + (on ? '' : '<path d="M10 38 38 10" stroke="#ff6b8a" stroke-width="3.4" stroke-linecap="round"/>') + '</svg>';
  const subs = new Set();
  function sync() { subs.forEach(f => { try { f(isOn()) } catch (e) {} }) }
  function set(on) { LS.set("fl-music", on ? "on" : "off"); on ? start() : stop(); sync() }
  // relie un bouton : icône seule (en-tête) ou icône + mot (menu du téléphone)
  function bind(el, withLabel) {
    if (!el || el.dataset.mu) return; el.dataset.mu = "1";
    const draw = on => { el.innerHTML = icon(on) + (withLabel ? (on ? "Musique" : "Musique coupée") : ""); el.title = on ? "Couper la musique d'ambiance" : "Musique d'ambiance"; el.setAttribute("aria-pressed", on ? "true" : "false") };
    subs.add(draw); draw(isOn());
    el.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); set(!isOn()) });
  }
  // musique allumée : démarre au premier geste (règle des navigateurs)
  const kick = () => { if (isOn()) start(); };
  ["pointerdown", "keydown", "touchstart"].forEach(ev => window.addEventListener(ev, kick, { once: true, passive: true }));
  // onglet caché : silence ; de retour : la musique reprend si elle est allumée
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (isOn() && AC) start(); });
  window.MotipopMusique = { isOn, set, toggle: () => set(!isOn()), bind, icon };
})();
