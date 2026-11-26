/* Multijoueur hors salon (26/11/2026) : bouton « À plusieurs » des pages de jeu.
   Partie rapide (avec robot de secours si personne ne vient), joueurs en ligne à inviter, lien d'invitation, défi différé.
   La page de jeu appelle MJ.init({ game, path, gname, mount, robot(lvl), duel(lvl), busy() }). Le serveur : lobby.js. */
(function () {
  "use strict";
  var LV = { facile: "Facile", normal: "Normal", difficile: "Difficile" };
  var C = null, ws = null, ON = { list: [], guests: 0 }, lvl = "facile", qAt = 0, qTimer = null, sent = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function me() { try { var m = JSON.parse(localStorage.getItem("fl-me") || "null"); return m && m.name && m.token && !m.stale ? { name: String(m.name).toUpperCase(), token: m.token, guest: !!m.guest } : null; } catch (e) { return null; } }
  // sans compte : un nom d'invité (INVITE + chiffres) est créé pour cet appareil, pour jouer à plusieurs tout de suite
  var guestP = null;
  function ensureMe() { if (me()) return Promise.resolve(me()); if (guestP) return guestP;
    guestP = fetch("/api/p/guest", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then(function (r) { return r.json(); }).then(function (r) { guestP = null;
      if (!r || !r.token) return null; localStorage.setItem("fl-me", JSON.stringify({ name: r.name, token: r.token, guest: 1 })); relob(); return me(); }).catch(function () { guestP = null; return null; });
    return guestP; }
  function relob() { var m = me(); sendo({ t: "lob", game: C.game, name: m ? m.name : "", token: m ? m.token : "", busy: busy() }); }
  function code() { return ((location.pathname.match(/^\/([A-Za-z0-9]{5})(?:\/|$)/) || [])[1] || "").toUpperCase(); }
  // un message envoyé pendant une reconnexion attend l'ouverture (avant : perdu, et le bouton restait sur « Création du lien… »)
  var pending = [];
  function sendo(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); else if (o.t !== "lob" && o.t !== "lobbusy") pending.push(o); }
  function busy() { try { return !!(C.busy && C.busy()); } catch (e) { return false; } }
  function connect() {
    ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
    ws.onopen = function () { var m = me(); sendo({ t: "lob", game: C.game, name: m ? m.name : "", token: m ? m.token : "", busy: busy() }); if (qAt) sendo({ t: "lobq", lvl: lvl }); var p = pending; pending = []; p.forEach(sendo); };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } on(m); };
    ws.onclose = function () { setTimeout(connect, 2500); };
  }
  function on(m) {
    if (m.t === "online") { ON = m; pill(); if (isOpen()) render(); }
    else if (m.t === "lobgo") { stopQ(); go(m); }
    else if (m.t === "lobq") { }
    else if (m.t === "inbox") { INB = (m.list || []).slice(); inbox(); }
    else if (m.t === "lobinv") { INB = INB.filter(function (x) { return x.k !== m.k; }); INB.unshift(m); received(m); }
    else if (m.t === "lobinvx") { INB = INB.filter(function (x) { return x.k !== m.k; }); var a = document.getElementById("mjAsk"); if (a && a.dataset.k === m.k) a.classList.remove("on"); inbox(); }
    else if (m.t === "lobsent") { sent[m.to] = Date.now(); render(); }
    else if (m.t === "lobno") { delete sent[m.by]; say("<b>" + esc(m.by) + "</b> ne peut pas jouer maintenant."); render(); }
    else if (m.t === "loblink") { linkReady(m); }
    else if (m.t === "lobfail") { stopQ(); if (m.need === "pseudo") { render(); return; } say(esc(m.msg || "Réessaie dans un instant.")); render(); }
  }
  var PATH = { fleches: "fleches", magnetico: "magnetico", rond: "rond", meles: "meles", culture: "culture" };
  function go(m) {
    var base = "/" + m.id + "/" + (PATH[m.game] || C.path);
    try { sessionStorage.setItem("fl-table", JSON.stringify({ id: m.id, opp: m.opp, at: Date.now() })); } catch (e) {}
    location.href = m.host ? base + "?go=multi&opp=" + encodeURIComponent(m.opp) + "&lvl=" + encodeURIComponent(m.lvl) : base + "?go=join";
  }
  // ---------- styles ----------
  function css() {
    if (document.getElementById("mj-css")) return; var st = document.createElement("style"); st.id = "mj-css";
    st.textContent = ".mjpill{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding:7px 12px;border-radius:999px;border:1px solid var(--stroke,rgba(255,255,255,.2));background:var(--glass2,rgba(255,255,255,.14));color:inherit;font:800 .88rem Nunito,Inter,sans-serif;cursor:pointer;white-space:nowrap;backdrop-filter:blur(10px)}"
      + ".mjpill .dot{width:8px;height:8px;border-radius:50%;background:#3ddc97;box-shadow:0 0 0 3px rgba(61,220,151,.25)}.mjpill .dot.off{background:#8892a0;box-shadow:none}"
      + "#mjWin .sheet{max-height:calc(100vh - 32px);overflow:auto;text-align:left;gap:10px}#mjWin .mjin{display:flex;flex-direction:column;gap:10px}#mjWin h3{margin:0;padding-right:34px;display:flex;align-items:center;gap:8px}"
      + ".mjlv{display:flex;gap:6px}.mjlv button{flex:1;padding:8px 4px;border-radius:12px;border:1px solid var(--stroke,rgba(255,255,255,.2));background:transparent;color:inherit;font:700 .88rem Nunito,Inter,sans-serif;cursor:pointer}.mjlv button.on{background:linear-gradient(135deg,var(--accent,#00ADB5),var(--violet,#A26BFF));color:#fff;border-color:transparent}"
      + ".mjc{border:1px solid var(--stroke,rgba(255,255,255,.18));border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,.04)}.mjc .hd{display:flex;align-items:center;gap:8px;font-weight:800}.mjc .hd .ic{font-size:1.15rem}"
      + ".mjtip{position:relative;margin-left:auto}.mjtip>button{width:24px;height:24px;min-height:24px;padding:0;border-radius:50%;border:1px solid var(--stroke,rgba(255,255,255,.3));background:transparent;color:inherit;font:800 .78rem Inter,sans-serif;cursor:pointer}"
      + ".mjtip .tb{position:absolute;right:0;top:30px;z-index:5;width:min(250px,70vw);padding:10px 12px;border-radius:12px;background:rgba(20,28,48,.96);color:#eef2f7;font:500 .84rem/1.4 Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}.mjtip .tb[hidden]{display:none}"
      + ".mjrow{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}.mjrow:first-child{border-top:0}.mjrow b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.mjrow .st{font-size:.8rem;opacity:.75}.mjrow .btn{flex:0 0 auto;width:auto;min-height:34px;padding:6px 12px}"
      + ".mjwait{display:flex;align-items:center;gap:10px}.mjwait .spin{flex:0 0 auto}.mjlink{word-break:break-all;font:600 .85rem Inter,sans-serif;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.08);user-select:all}"
      + ".mjinf{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}.mjinf small{font-size:.8rem;opacity:.8}.mjrow .btn:disabled{opacity:.45}.mjbtns a.btn{text-decoration:none;text-align:center;color:inherit;display:flex;align-items:center;justify-content:center}.mjbtns{display:flex;gap:6px;flex-wrap:wrap}.mjbtns .btn{flex:1 1 30%;min-width:0}.mjsay{font-size:.88rem;color:var(--gold,#ffc857)}"
      + "[data-theme=light] .mjtip .tb{background:#fff;color:#1b2433;border:1px solid rgba(15,25,40,.12)}[data-theme=light] .mjc{background:rgba(255,255,255,.45)}[data-theme=light] .mjrow{border-top-color:rgba(15,25,40,.08)}[data-theme=light] .mjlink{background:rgba(15,25,40,.06)}"
      + ".mjban{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:95;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;max-width:min(560px,calc(100vw - 24px));padding:12px 14px;border-radius:18px;background:rgba(20,28,48,.8);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);box-shadow:0 18px 50px rgba(0,0,0,.4);color:#eef2f7}"
      + ".mjban .it{flex:1 1 220px;font:600 .95rem Inter,Nunito,sans-serif;line-height:1.35}.mjban .it b{color:#5eead4}"
      + "[data-theme=light] .mjban{background:rgba(255,255,255,.9);color:#1b2433;border-color:rgba(15,25,40,.12)}[data-theme=light] .mjban .it b{color:#0f766e}"
      + ".mjbdg{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:9px;background:#ff5d7a;color:#fff;font:800 .72rem Inter,sans-serif}"
      + ".mjinbox{position:fixed;left:14px;bottom:16px;z-index:85;display:inline-flex;align-items:center;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(20,28,48,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#eef2f7;font:800 .9rem Nunito,Inter,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.35)}"
      + "[data-theme=light] .mjinbox{background:rgba(255,255,255,.85);color:#1b2433;border-color:rgba(15,25,40,.12)}"
      + "#mjAsk{position:fixed;inset:0;z-index:130;display:none;place-items:center;padding:16px;background:rgba(5,10,20,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}#mjAsk.on{display:grid;animation:mjf .25s}"
      + "#mjAsk .mjaskb{width:min(400px,100%);padding:22px;display:flex;flex-direction:column;gap:12px;text-align:center}#mjAsk h3{margin:0;font-size:1.15rem;line-height:1.35}#mjAsk .mjbtns .btn{flex:1;min-height:48px;font-size:1rem}"
      + "@keyframes mjf{from{opacity:0}to{opacity:1}}"
      + ".duelbox{margin-top:12px;display:flex;flex-direction:column;gap:8px;text-align:left}.duelbox .dt{font-size:1rem}.duelbox table{width:100%;border-collapse:collapse;font-size:.9rem}.duelbox th,.duelbox td{padding:5px 6px;text-align:left;border-bottom:1px solid rgba(127,127,127,.25)}.duelbox th{font-size:.78rem;opacity:.7}.duelbox tr.me td{color:var(--accent,#00ADB5);font-weight:800}"
      + "@media(max-width:420px){.mjpill .lb{display:none}}";
    document.head.appendChild(st);
  }
  // ---------- bouton ----------
  var P = null;
  function pill() {
    if (!P) return; var n = others().length;
    P.style.display = busy() ? "none" : ""; var u = unread();
    P.innerHTML = '<span class="dot' + (n ? "" : " off") + '"></span>👥 <span class="lb">À plusieurs</span>' + (n ? " · " + n : "") + (u ? '<span class="mjbdg" aria-label="' + u + ' invitation' + (u > 1 ? "s" : "") + ' non lue' + (u > 1 ? "s" : "") + '">' + u + "</span>" : "");
    P.title = n ? n + " joueur" + (n > 1 ? "s" : "") + " en ligne" : "Jouer avec d'autres joueurs";
  }
  // ---------- boîte d'invitations (26/11) ----------
  // en partie : rien n'interrompt le jeu, l'invitation attend dans la boîte (pastille « non lue ») ; à l'accueil : fenêtre Oui / Non
  var INB = [];
  function seen() { try { return JSON.parse(sessionStorage.getItem("fl-inv-seen") || "[]"); } catch (e) { return []; } }
  function markSeen() { try { sessionStorage.setItem("fl-inv-seen", JSON.stringify(INB.map(function (x) { return x.k; }).concat(seen()).slice(0, 80))); } catch (e) {} inbox(); }
  function unread() { var s = seen(); return INB.filter(function (x) { return s.indexOf(x.k) < 0; }).length; }
  function playing() { try { return !!(C.playing ? C.playing() : busy()); } catch (e) { return false; } }
  var IB = null;
  function inbox() {
    pill(); if (isOpen()) render();
    var show = INB.length && (!P || P.style.display === "none");   // bouton « Invitations » seul quand il n'y a pas de bouton « À plusieurs » visible
    if (!IB && show) { css(); IB = document.createElement("button"); IB.type = "button"; IB.className = "mjinbox"; IB.onclick = function () { open(); }; document.body.appendChild(IB); }
    if (IB) { IB.style.display = show ? "" : "none"; var u = unread(); IB.innerHTML = "📨 Invitations" + (u ? '<span class="mjbdg">' + u + "</span>" : " · " + INB.length); }
  }
  function received(m) {
    ding();
    if (playing() && !C.home) { inbox(); return; }                 // en partie : silencieux, la pastille suffit
    inbox(); ask(m);
  }
  function ask(m) {
    css(); var a = document.getElementById("mjAsk");
    if (!a) { a = document.createElement("div"); a.id = "mjAsk"; a.setAttribute("role", "dialog"); a.setAttribute("aria-modal", "true"); a.setAttribute("aria-labelledby", "mjAskT"); document.body.appendChild(a); }
    a.dataset.k = m.k;
    a.innerHTML = '<div class="glass sheet qbox mjaskb"><h3 id="mjAskT">Proposition de jouer à ' + esc(m.gname) + " par " + esc(m.from) + "</h3>"
      + (LV[m.lvl] && m.game !== "culture" ? '<div class="note">Niveau ' + LV[m.lvl] + "</div>" : "") + '<div class="mjbtns"><button class="btn primary" type="button" data-r="1">Oui</button><button class="btn" type="button" data-r="0">Non</button></div></div>';
    a.querySelectorAll("[data-r]").forEach(function (b) { b.onclick = function () { answer(m.k, b.dataset.r === "1"); a.classList.remove("on"); }; });
    a.classList.add("on"); markSeen(); setTimeout(function () { var y = a.querySelector("[data-r='1']"); if (y) y.focus(); }, 50);
  }
  function answer(k, yes) { INB = INB.filter(function (x) { return x.k !== k; }); sendo({ t: "lobans", k: k, ok: !!yes }); inbox(); }
  function ago(t) { var m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "à l'instant" : "il y a " + m + " min"; }
  function others() { var m = me(); return (ON.list || []).filter(function (o) { return !m || o.name !== m.name; }); }
  // ---------- fenêtre ----------
  var W = null, msg = "", link = null;
  function isOpen() { return W && W.classList.contains("on"); }
  function open() { css(); if (!W) { W = document.createElement("div"); W.id = "mjWin"; W.className = "overlay"; W.innerHTML = '<div class="glass sheet" role="dialog" aria-modal="true" aria-labelledby="mjT"><div class="mjin"></div></div>'; document.body.appendChild(W);
      W.addEventListener("click", function (e) { if (e.target === W) close(); }); }
    msg = ""; render(); W.classList.add("on"); markSeen(); if (!me()) ensureMe().then(function () { if (isOpen()) render(); }); }
  function close() { if (W) W.classList.remove("on"); }
  function say(t) { msg = t; if (!isOpen()) banner({ text: t }); }
  function tip(id, t) { return '<span class="mjtip"><button type="button" aria-label="En savoir plus" aria-expanded="false" data-tip="' + id + '">i</button><span class="tb" id="' + id + '" hidden>' + t + "</span></span>"; }
  function render() {
    if (!W) return; var m = me(), g = esc(C.gname), sh = W.querySelector(".mjin"), o = others();
    var h = '<h3 id="mjT">👥 Jouer à plusieurs</h3>';   // la croix de fermeture est ajoutée par icones.js à toute fenêtre
    if (msg) h += '<div class="mjsay">' + msg + "</div>";
    if (INB.length) h += '<div class="mjc"><div class="hd"><span class="ic">📨</span>Invitations reçues</div>' + INB.map(function (x) {
      return '<div class="mjrow"><span class="mjinf"><b>' + esc(x.gname) + "</b><small>" + esc(x.from) + " · " + ago(x.at) + "</small></span>" + '<button class="btn primary" data-a="iy" data-k="' + esc(x.k) + '">Jouer</button><button class="btn" data-a="in" data-k="' + esc(x.k) + '">Non</button></div>'; }).join("") + "</div>";
    if (C.home) { if (!INB.length) h += '<div class="note">Aucune invitation pour le moment.</div>'; sh.innerHTML = h; return; }
    if (m && m.guest) h += '<div class="note">Tu joues en invité : <b>' + esc(m.name) + '</b> · <a href="/?moncompte=1" style="color:inherit">Créer mon compte</a></div>';
    if (!C.nolvl) h += '<div class="mjlv" role="group" aria-label="Niveau">' + Object.keys(LV).map(function (k) { return '<button type="button" data-lv="' + k + '" class="' + (k === lvl ? "on" : "") + '">' + LV[k] + "</button>"; }).join("") + "</div>";
    // partie rapide
    h += '<div class="mjc"><div class="hd"><span class="ic">⚡</span>Partie rapide' + tip("mjT1", "Un adversaire qui attend sur ce jeu. Personne ? Joue contre le robot.") + "</div>";
    if (!m) h += needMe() + (C.robot ? '<button class="btn" data-a="robot">🤖 Jouer contre le robot</button>' : "");
    else if (qAt) { var s = Math.floor((Date.now() - qAt) / 1000);
      h += '<div class="mjwait"><span class="spin"></span><span>Recherche d\'un adversaire… <b>' + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + "</b></span></div>";
      if (s >= 20) h += '<div class="note">Personne pour l\'instant.</div><div class="mjbtns">' + (C.robot ? '<button class="btn primary" data-a="robot">🤖 Jouer contre le robot</button>' : "") + '<button class="btn" data-a="cancel">Arrêter</button></div>';
      else h += '<button class="btn" data-a="cancel">Annuler</button>'; }
    else h += '<button class="btn primary" data-a="quick">Trouver un adversaire</button>';
    h += "</div>";
    // joueurs en ligne
    h += '<div class="mjc"><div class="hd"><span class="ic">🟢</span>En ligne sur Motipop' + tip("mjT2", "Joueurs connectés. « Inviter » : il reçoit ta proposition.") + "</div>";
    if (!o.length) h += '<div class="note">Personne d\'autre pour l\'instant' + (ON.guests > 1 ? " (" + (ON.guests - (m ? 0 : 1)) + " visiteur" + (ON.guests > 2 ? "s" : "") + " sans pseudo)" : "") + ".</div>";
    else h += "<div>" + o.map(function (p) { var st = p.busy ? "en partie" : p.wait ? "cherche un adversaire" : "sur " + (p.game === C.game ? "ce jeu" : esc(gameName(p.game)));
      var w = sent[p.name] && Date.now() - sent[p.name] < 60e3;
      return '<div class="mjrow"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:' + (p.busy ? "#ffc857" : "#3ddc97") + '"></span><b>' + esc(p.name) + '</b><span class="st">' + st + "</span>"
        + (m ? '<button class="btn" data-a="inv" data-n="' + esc(p.name) + '"' + (p.busy || w ? " disabled" : "") + ">" + (w ? "Invité…" : "Inviter") + "</button>" : "") + "</div>"; }).join("") + "</div>";
    if (!m && o.length) h += needMe();
    h += "</div>";
    // lien d'invitation
    h += '<div class="mjc"><div class="hd"><span class="ic">🔗</span>Inviter un proche' + tip("mjT3", "Un lien par SMS ou WhatsApp : vous jouez ensemble, sans salon. Valable 2 jours.") + "</div>";
    if (!m) h += needMe();
    else if (link) h += '<div class="mjlink">' + esc(link.url) + "</div>" + shareBtns(link.url, "On fait une partie de " + C.gname + " ensemble ? ") + '<button class="btn primary" data-a="table">Aller à la table et attendre</button>';
    else h += '<button class="btn" data-a="link">Créer le lien</button>';
    h += "</div>";
    // défi différé
    if (C.duel) h += '<div class="mjc"><div class="hd"><span class="ic">⏳</span>Défi différé' + tip("mjT4", "Joue seul, envoie ta partie : ton proche joue la même, vous comparez.") + '</div><button class="btn" data-a="duel">Jouer une grille et défier</button></div>';
    sh.innerHTML = h;
  }
  var GN = { accueil: "l'accueil", fleches: "les mots fléchés", magnetico: "Magnético", rond: "le Tourniquet", meles: "les mots mêlés", culture: "la culture générale" };
  function gameName(g) { return GN[g] || "un autre jeu"; }
  function needMe() { return '<div class="note">Il te faut un pseudo (gratuit, 1 minute).</div><button class="btn primary" data-a="me">Créer mon pseudo</button>'; }
  function shareBtns(url, txt) { var t = encodeURIComponent(txt + url);
    var sms = /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? "sms:&body=" + t : "sms:?body=" + t;
    return '<div class="mjbtns"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + t + '">WhatsApp</a>'
      + (matchMedia("(pointer:fine)").matches ? "" : '<a class="btn" href="' + sms + '">SMS</a>')
      + '<button class="btn" type="button" data-a="copy" data-u="' + esc(url) + '">Copier</button></div>'; }
  function linkReady(m) { link = { id: m.id, url: location.origin + "/" + m.id + "/" + C.path + "?k=" + m.k }; if (!isOpen()) open(); else render(); }
  function startQ() { qAt = Date.now(); sendo({ t: "lobq", lvl: lvl }); clearInterval(qTimer); qTimer = setInterval(function () { if (isOpen()) render(); }, 1000); render(); }
  function stopQ() { if (!qAt) return; qAt = 0; clearInterval(qTimer); sendo({ t: "lobx" }); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-tip]");
    if (t && W && W.contains(t)) { var b = document.getElementById(t.dataset.tip); var o = b.hidden; W.querySelectorAll(".mjtip .tb").forEach(function (x) { x.hidden = true; }); b.hidden = !o; t.setAttribute("aria-expanded", String(o)); return; }
    if (W && W.contains(e.target) && !e.target.closest(".mjtip")) W.querySelectorAll(".mjtip .tb").forEach(function (x) { x.hidden = true; });
    var l = e.target.closest && e.target.closest("#mjWin [data-lv]"); if (l) { lvl = l.dataset.lv; try { localStorage.setItem("fl-mj-lvl", lvl); } catch (x) {} render(); return; }
    var cp = e.target.closest && e.target.closest("#duelBox [data-a='copy']"); if (cp) { copy(cp.dataset.u, cp); return; }
    var a = e.target.closest && e.target.closest("#mjWin [data-a]"); if (!a) return; var k = a.dataset.a; msg = "";
    if (k === "close") { close(); return; }
    if (k === "iy" || k === "in") { answer(a.dataset.k, k === "iy"); return; }
    if (k === "me") { try { sessionStorage.setItem("fl-back", location.pathname + location.search); } catch (x) {} location.href = "/?need=pseudo"; return; }
    if (k === "quick") return startQ();
    if (k === "cancel") { stopQ(); render(); return; }
    if (k === "robot") { stopQ(); close(); C.robot(lvl); return; }
    if (k === "inv") { sendo({ t: "lobinv", to: a.dataset.n, lvl: lvl }); sent[a.dataset.n] = Date.now(); render(); return; }
    if (k === "link") { sendo({ t: "loblink" }); a.disabled = true; a.textContent = "Création du lien…";
      setTimeout(function () { if (!link && a.isConnected && a.disabled) { a.disabled = false; a.textContent = "Créer le lien"; msg = "Pas de réponse du serveur. Réessaie."; render(); } }, 8000); return; }
    if (k === "copy") { copy(a.dataset.u, a); return; }
    if (k === "table") { go({ id: link.id, host: 1, opp: "Invité", lvl: lvl }); return; }
    if (k === "duel") { close(); C.duel(lvl); return; }
  });
  function copy(u, el) { var done = function () { if (el) { el.textContent = "Copié ✓"; setTimeout(function () { el.textContent = "Copier"; }, 1800); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { prompt("Copie ce lien :", u); });
    else prompt("Copie ce lien :", u); }
  // ---------- invitation reçue ----------
  // message court (refus, erreur) quand la fenêtre est fermée
  function banner(m) {
    css(); var d = document.createElement("div"); d.className = "mjban"; d.setAttribute("role", "status");
    d.innerHTML = '<span class="it">' + m.text + "</span>"; setTimeout(function () { d.remove(); }, 6000);
    var old = document.querySelector(".mjban"); if (old) old.remove(); document.body.appendChild(d);
  }
  var AC = null; function ding() { try { if (localStorage.getItem("fl-sound") === "off") return; } catch (e) {}
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); [[659, 0], [784, .12], [988, .24], [1319, .38]].forEach(function (x) { var t = AC.currentTime + x[1], o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.value = x[0]; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .5); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .55); }); } catch (e) {}
    if (navigator.vibrate) try { navigator.vibrate([40, 60, 40]); } catch (e) {} }
  // à une table hors salon, « Partager » envoie le lien de la table (pas de nom de salon ni de code)
  function tableShare(e) { var r = window.SK_ROOM; if (!r || !r.temp) return; var b = e.target.closest && e.target.closest('[data-open="share"],[data-open="salon"]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); link = { id: r.id, url: location.origin + "/" + r.id + "/" + C.path + "?k=" + r.k }; open(); }
  document.addEventListener("click", tableShare, true);
  // ---------- commun aux 5 jeux (26/11) : appels au serveur, attente d'une table, encadré du défi différé ----------
  function api(u, b) { var m = me(); return fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ name: m ? m.name : "", token: m ? m.token : "" }, b || {})) }).then(function (r) { return r.json(); }).catch(function () { return {}; }); }
  // ready() ouvre la partie dès qu'elle existe et répond true ; fail() au bout de 20 s
  function tableWait(ready, fail) {
    document.body.classList.remove("booting"); var w = $("#endWin");
    $("#endT").textContent = "⏳ Ton adversaire prépare la partie…"; $("#endB").innerHTML = '<span class="spin"></span>';
    ["#endAgain", "#endSame", "#endDuel"].forEach(function (x) { var e = $(x); if (e) e.style.display = "none"; }); w.classList.add("on");
    var t0 = Date.now(), iv = setInterval(function () {
      if (ready()) { clearInterval(iv); w.classList.remove("on"); var a = $("#endAgain"); if (a) a.style.display = ""; return; }
      if (Date.now() - t0 > 20000) { clearInterval(iv); fail("Ton adversaire n'est pas arrivé. Reviens à l'accueil et relance une partie rapide."); } }, 300);
  }
  var fmtS = function (t) { return Math.floor(t / 60) + " min " + String(t % 60).padStart(2, "0"); };
  // o : { id, res:[{n,s,t}], mine, by, txt } — tableau des scores et boutons de partage, ajoutés sous la fin de partie
  function duelPaint(o) {
    css(); var B = $("#endB"); if (!B || !o || !o.id) return; var d = document.getElementById("duelBox");
    if (!d) { d = document.createElement("div"); d.id = "duelBox"; d.className = "duelbox"; B.appendChild(d); }
    var url = location.origin + "/duel/" + o.id, m = me(), mn = m ? m.name : "Toi";
    var rows = (o.res || []).slice().sort(function (a, b) { return b.s - a.s || a.t - b.t; }).slice(0, 8).map(function (x, i) {
      return "<tr" + (x.n === mn ? ' class="me"' : "") + "><td>" + (i + 1) + "</td><td>" + esc(x.n) + "</td><td><b>" + x.s + "</b></td><td>" + fmtS(x.t) + "</td></tr>"; }).join("");
    d.innerHTML = '<b class="dt">⚔️ ' + (o.mine ? "Ton défi est prêt" : "Défi de " + esc(o.by || "")) + "</b>" + (rows ? "<table><tr><th>#</th><th>Joueur</th><th>Points</th><th>Temps</th></tr>" + rows + "</table>" : "")
      + shareBtns(url, o.txt || "");
  }
  // ---------- API ----------
  window.MJ = {
    init: function (cfg) { C = cfg; try { lvl = localStorage.getItem("fl-mj-lvl") || "facile"; } catch (e) {} css();
      if (cfg.mount) { var host = typeof cfg.mount === "string" ? $(cfg.mount) : cfg.mount; if (host) { P = document.createElement("button"); P.type = "button"; P.className = "mjpill"; P.onclick = open; host.appendChild(P); pill(); } }
      inbox(); connect(); setInterval(function () { var b = busy(); if (b !== MJ._b) { MJ._b = b; sendo({ t: "lobbusy", busy: b }); pill(); } }, 2000); },
    open: open, close: close, api: api, tableWait: tableWait, duelPaint: duelPaint, _b: false
  };
})();
