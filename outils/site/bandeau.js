(function(){/* bandeau des scores lié (téléphone) : les deux joueurs dans une seule barre, le joueur actif éclairé, l'écart au centre */
var mq=window.matchMedia("(max-width:620px)");
function shown(e){return e&&e.style.display!=="none"&&getComputedStyle(e).display!=="none"}
function tick(){document.querySelectorAll(".scores2").forEach(function(box){var a=box.querySelector(".sc1"),b=box.querySelector(".sc2");
  var on=mq.matches&&shown(a)&&shown(b)&&!shown(box.querySelector(".sc3"));box.classList.toggle("linked",!!on);if(!on){if(a)a.classList.remove("lead");if(b)b.classList.remove("lead");return}
  var v=box.querySelector(".vsb");if(!v){v=document.createElement("span");v.className="vsb";v.setAttribute("aria-hidden","true");box.insertBefore(v,b)}
  var sa=parseInt((a.querySelector(".sv")||{}).textContent,10)||0,sb=parseInt((b.querySelector(".sv")||{}).textContent,10)||0,d=Math.abs(sa-sb);
  v.textContent=d?"+"+d:"=";v.style.top=(a.offsetTop+a.offsetHeight/2)+"px";
  var turn=a.classList.contains("turn")||b.classList.contains("turn");
  a.classList.toggle("lead",!turn&&sa>sb);b.classList.toggle("lead",!turn&&sb>sa)})}
setInterval(tick,400);tick()})();
