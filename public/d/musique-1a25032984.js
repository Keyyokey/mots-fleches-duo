/* Motipop · musique d'ambiance (20/11/2026, vrais morceaux depuis le 21/11/2026)
   Deux morceaux sans paroles joués à la suite et en boucle, doucement, sur toutes les pages.
   Coupée par défaut. Le choix est gardé dans le stockage du navigateur (fl-music = on / off).
   Les navigateurs interdisent le son avant un premier toucher : si la musique est allumée, elle démarre au premier geste. */
(function () {
  if (window.MotipopMusique) return;
  const LS = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const isOn = () => LS.get("fl-music") === "on";
  // morceaux (envoyés par Juvenal le 21/11, Pixabay, libres de droits) : bossa-nova jazz puis symphonie classique, en boucle.
  // Volume ramené au même niveau (-20 LUFS), compressés en 96 kbit/s, fondu à la fin. Rien n'est téléchargé tant que la musique est coupée.
  const TRACKS = ["/d/musique-bossa-b72178ee4e.mp3", "/d/musique-classique-8c07127f12.mp3"];
  const VOL = .32;
  // la musique continue d'une page à l'autre : morceau et position gardés pour la session
  const SS = { get: () => { try { return JSON.parse(sessionStorage.getItem("fl-music-pos") || "null") } catch (e) { return null } }, set: v => { try { sessionStorage.setItem("fl-music-pos", JSON.stringify(v)) } catch (e) {} } };
  let AC = null, gain = null, el = null, playing = false, idx = 0, fadeT = null;
  function setup() {
    if (el) return true;
    el = new Audio(); el.preload = "none"; el.setAttribute("playsinline", "");
    // volume par Web Audio (sur iPhone, le volume d'un élément audio ne se règle pas)
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) { try { AC = new C(); const src = AC.createMediaElementSource(el); gain = AC.createGain(); gain.gain.value = 0; src.connect(gain); gain.connect(AC.destination) } catch (e) { AC = null; gain = null } }
    if (!gain) el.volume = 0;
    el.addEventListener("ended", () => { idx = (idx + 1) % TRACKS.length; el.src = TRACKS[idx]; if (playing) el.play().catch(() => {}) });
    setInterval(save, 5000); addEventListener("pagehide", save);
    return true;
  }
  function save() { if (el && el.src && playing) SS.set({ i: idx, t: el.currentTime || 0 }) }
  function vol(to, sec) {
    clearInterval(fadeT);
    if (gain) { const t = AC.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(to, t + sec); return }
    const from = el.volume, n = Math.max(1, Math.round(sec * 20)); let k = 0;
    fadeT = setInterval(() => { k++; el.volume = Math.max(0, Math.min(1, from + (to - from) * k / n)); if (k >= n) clearInterval(fadeT) }, 50);
  }
  function start() {
    if (playing || !setup()) return;
    playing = true; if (AC && AC.state === "suspended") AC.resume();
    if (!el.src) { const p = SS.get(); idx = p && TRACKS[p.i] ? p.i : 0; el.src = TRACKS[idx]; if (p && p.t > 1) el.addEventListener("loadedmetadata", () => { try { el.currentTime = Math.min(p.t, (el.duration || 1e9) - 2) } catch (e) {} }, { once: true }) }
    el.play().then(() => vol(VOL, 2.5)).catch(() => { playing = false });   // refusé sans geste : on réessaiera au prochain toucher
  }
  function stop() {
    if (!playing) return; playing = false; save(); vol(0, 1);
    setTimeout(() => { if (!playing && el) el.pause() }, 1100);
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
  const kick = () => { if (isOn() && !playing) start(); };
  ["pointerdown", "keydown", "touchstart"].forEach(ev => window.addEventListener(ev, kick, { passive: true }));
  // onglet caché : silence ; de retour : la musique reprend si elle est allumée
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (isOn() && el) start(); });
  window.MotipopMusique = { isOn, set, toggle: () => set(!isOn()), bind, icon, etat: () => ({ joue: playing && !!el && !el.paused, morceau: idx, t: el ? Math.round(el.currentTime) : 0 }) };
})();
