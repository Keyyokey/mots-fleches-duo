// 23/11/2026 : texte lisible par Google sur chaque page de jeu (titre H1, présentation, questions fréquentes, données structurées).
// Le bloc s'affiche sous le jeu sur l'adresse publique (/fleches…) ; il est masqué pendant une partie (go=, join=, reprise, salon).
const P = {
  "fl.html": {
    title: "Mots fléchés gratuits en ligne, seul ou à plusieurs — Motipop",
    h1: "Mots fléchés gratuits en ligne",
    intro: "Près de 2 000 grilles de mots fléchés gratuites, en trois niveaux : Facile, Normal et Difficile. Sur téléphone, des grilles 8 × 8 faites pour l'écran ; sur ordinateur, le format classique de 10 colonnes.",
    body: ["Touche une définition, tape le mot, puis « Valider ». Chaque bonne lettre rapporte un point, chaque mot complété trois de plus. Les cases numérotées forment un mot mystère, avec un indice sous la grille.",
      "Tu peux jouer seul, ou inviter jusqu'à trois amis par WhatsApp : chacun joue à son tour sur la même grille, en direct, et le meilleur score gagne. Aucun téléchargement, aucune inscription obligatoire."],
    faq: [["Les mots fléchés de Motipop sont-ils gratuits ?", "Oui, toutes les grilles sont gratuites et jouables sans compte. Un pseudo sert seulement à garder tes points et à apparaître au classement."],
      ["Peut-on jouer aux mots fléchés à plusieurs ?", "Oui, de 2 à 4 joueurs en direct : ouvre ton salon, invite tes amis par WhatsApp et jouez chacun votre tour sur la même grille."],
      ["Quelle différence avec les mots croisés ?", "Dans les mots fléchés, les définitions sont écrites dans la grille, dans des cases avec une flèche qui indique le sens du mot. Il n'y a pas de liste de définitions à côté."]]
  },
  "mm.html": {
    title: "Mots mêlés gratuits en ligne, des dizaines de thèmes — Motipop",
    h1: "Mots mêlés gratuits en ligne",
    intro: "Près de 1 200 grilles de mots mêlés gratuites, rangées par thèmes : animaux, cuisine, voyages, jardin, musique, régions de France et bien d'autres.",
    body: ["Les mots de la liste sont cachés dans la grille, dans tous les sens : vers la droite, vers le bas, en diagonale, à l'endroit et à l'envers. Glisse le doigt du début à la fin du mot, ou touche sa première puis sa dernière lettre.",
      "Joue seul contre le chrono, ou à plusieurs : chaque mot n'est compté qu'une fois, le plus rapide le prend."],
    faq: [["Comment trouver les mots plus vite ?", "Cherche d'abord la première lettre du mot, puis regarde ses voisines dans les huit directions. Les lettres rares (K, W, Y, Z) sont de bons points de départ."],
      ["Combien de niveaux y a-t-il ?", "Trois : Facile, Normal et Difficile. Plus le niveau monte, plus il y a de mots écrits à l'envers."],
      ["Faut-il créer un compte ?", "Non, tu peux jouer tout de suite. Un pseudo permet seulement de garder tes points."]]
  },
  "rd.html": {
    title: "Le Tourniquet : mots en rond gratuits en ligne — Motipop",
    h1: "Le Tourniquet, les mots en rond",
    intro: "Le Tourniquet est un jeu de mots en rond : 18 définitions, et chaque réponse fait toujours 6 lettres, écrites dans les cases autour de sa définition. Plus de 2 200 grilles gratuites.",
    body: ["La première lettre se place dans la case du haut, puis le mot tourne dans le sens des aiguilles d'une montre. Les cases sont partagées avec les ronds voisins : chaque mot trouvé donne des lettres pour les autres.",
      "Un mot juste rapporte 10 points, et 10 de plus si ton mot complète aussi un voisin : c'est un ricochet."],
    faq: [["Dans quel sens s'écrit le mot ?", "Il commence dans la case du haut et tourne dans le sens des aiguilles d'une montre. Quand tu touches un rond, ses cases sont numérotées de 1 à 6."],
      ["Combien de lettres font les réponses ?", "Toujours 6 lettres, quel que soit le niveau."],
      ["Peut-on y jouer à deux ?", "Oui, à deux en direct, chacun son tour, depuis ton salon."]]
  },
  "mg.html": {
    title: "Magnético : jeu de syllabes gratuit en ligne — Motipop",
    h1: "Magnético, le jeu des syllabes",
    intro: "Les syllabes d'un mot entrent dans le cadre, flottent et s'entrechoquent. Touche-les dans le bon ordre pour reformer le mot. Plus de 5 600 mots, du plus courant au plus rare.",
    body: ["Aucun indice pendant la recherche : la définition s'affiche une fois le mot trouvé. En Normal et en Difficile, des syllabes pièges se glissent parmi les bonnes.",
      "Seul ou jusqu'à 4 joueurs en même temps, avec les mêmes syllabes pour tous : le premier qui trouve gagne un bonus."],
    faq: [["Combien de temps a-t-on par mot ?", "30 secondes par mot. À plusieurs, un compte à rebours commun de 10 secondes fait passer tout le monde au mot suivant."],
      ["Qu'est-ce qu'une syllabe piège ?", "Une syllabe qui ne fait pas partie du mot. Il n'y en a aucune en Facile, une en Normal et deux en Difficile."],
      ["Le jeu est-il gratuit ?", "Oui, entièrement gratuit et sans téléchargement."]]
  },
  "cg.html": {
    title: "Quiz de culture générale gratuit en ligne — Motipop",
    h1: "Quiz de culture générale",
    intro: "Plus de 7 400 questions de culture générale : photos à reconnaître, histoire, géographie, calcul mental, casse-tête et questions où chacun donne sa réponse.",
    body: ["Chaque partie compte 10 questions mélangées, 20 secondes par question et 4 réponses au choix. Plus tu réponds vite, plus tu gagnes de points.",
      "Choisis un thème si tu préfères : nourriture, animaux, pays et drapeaux, fromages de France, pâtisseries… Et à deux, vous avez les mêmes questions au même moment."],
    faq: [["Combien de questions par partie ?", "10 questions : 3 avec une image, 2 de culture, 2 calculs, 2 casse-tête et 1 question où chacun tape sa réponse."],
      ["Peut-on choisir un thème ?", "Oui : tout mélangé, nourriture, animaux, pays et drapeaux, et plusieurs séries de photos."],
      ["Le quiz est-il adapté aux seniors ?", "Oui : grandes photos, gros boutons, et aucune inscription obligatoire."]]
  },
  "md.html": {
    title: "Mot du jour : trouve le mot en 6 essais, gratuit — Motipop",
    h1: "Le mot du jour",
    intro: "Chaque jour, un mot de 6 ou 7 lettres, le même pour tout le monde. Tu as 6 essais pour le trouver, et sa première lettre est donnée.",
    body: ["Après chaque essai, les cases se colorent : vert, la lettre est à la bonne place ; cerclée de jaune, elle est dans le mot mais ailleurs ; gris, elle n'y est pas. Un mode daltonien remplace ces couleurs par l'orange et le bleu.",
      "Une fois le mot trouvé, partage ton résultat en petits carrés sans dévoiler la réponse, et compare-toi au classement du jour. Le mot change à minuit."],
    faq: [["À quelle heure change le mot du jour ?", "À minuit, heure de Paris. Tout le monde a le même mot pendant la journée."],
      ["Combien d'essais a-t-on ?", "6 essais. Chaque essai doit être un vrai mot français."],
      ["Peut-on partager son résultat ?", "Oui, en petits carrés de couleur, sans dévoiler le mot, par WhatsApp ou par message."]]
  },
  "poker.html": {
    title: "Wordflush : le poker avec des lettres, gratuit — Motipop",
    h1: "Wordflush, le poker des mots",
    intro: "Wordflush mélange le poker et les jeux de mots : forme le meilleur mot avec tes 2 lettres cachées et celles du milieu, mise et bluffe pour remporter le pot.",
    body: ["Chacun reçoit 2 lettres cachées, l'Académicien retourne ensuite 5 lettres au milieu, en deux fois. À chaque tour, tu mises ou tu t'arrêtes. À la fin, le meilleur mot gagne.",
      "On joue uniquement avec des jetons fictifs, offerts chaque semaine : aucun argent réel n'est misé ni gagné."],
    faq: [["Joue-t-on avec de l'argent ?", "Non, uniquement avec des jetons fictifs, qui ne s'achètent pas et n'ont aucune valeur."],
      ["Combien de lettres a-t-on pour former un mot ?", "2 lettres cachées à toi et 5 lettres communes au milieu : jusqu'à 7 lettres."],
      ["Peut-on jouer contre l'ordinateur ?", "Oui, contre le robot Léo, ou contre tes amis."]]
  }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const CSS = '<style id="seoTxt-css">#seoTxt{max-width:760px;margin:40px auto 32px;padding:22px 24px;border-radius:22px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);color:inherit;font:400 1rem/1.6 Inter,system-ui,sans-serif;box-sizing:border-box}#seoTxt h2{font:800 1.35rem/1.2 Nunito,Inter,sans-serif;margin:0 0 10px}#seoTxt h3{font:800 1.05rem Nunito,Inter,sans-serif;margin:18px 0 6px}#seoTxt p{margin:0 0 10px}#seoTxt details{border-top:1px solid rgba(255,255,255,.14);padding:10px 0}#seoTxt summary{cursor:pointer;font-weight:700}#seoTxt details p{margin:8px 0 0;opacity:.9}#seoTxt a{color:#7ff0de}html.ingame #seoTxt,body.tj #seoTxt{display:none!important}html[data-theme="light"] #seoTxt{background:rgba(255,255,255,.55);border-color:rgba(20,30,60,.12)}@media(max-width:620px){#seoTxt{margin:28px 12px 24px;padding:18px}}.sr-h1{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}</style>';
const GAME_FLAG = '<script>(function(){var s=location.search,p=location.pathname.split("/").filter(Boolean);if(/[?&](go|join|resume|n|g)=/.test(s)||p.length>1)document.documentElement.classList.add("ingame")})()</script>';
function apply(file, txt, site) {
  const c = P[file]; if (!c) return txt;
  txt = txt.replace(/<title>[^<]*<\/title>/, "<title>" + esc(c.title) + "</title>");
  const ld = [{ "@context": "https://schema.org", "@type": "WebApplication", name: c.h1, url: site + ({ "fl.html": "/fleches", "mm.html": "/meles", "rd.html": "/rond", "mg.html": "/magnetico", "cg.html": "/culture", "md.html": "/motdujour", "poker.html": "/poker" })[file], applicationCategory: "GameApplication", operatingSystem: "Tous (navigateur)", inLanguage: "fr-FR", description: c.intro, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, publisher: { "@type": "Organization", name: "Motipop", url: site + "/" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }];
  txt = txt.replace("</head>", GAME_FLAG + CSS + '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>\n</head>");
  const block = '<section id="seoTxt" aria-labelledby="seoT"><h2 id="seoT">' + esc(c.h1) + '</h2><p><b>' + esc(c.intro) + '</b></p>' + c.body.map(p => "<p>" + esc(p) + "</p>").join("") +
    '<h3>Questions fréquentes</h3>' + c.faq.map(([q, a]) => "<details><summary>" + esc(q) + "</summary><p>" + esc(a) + "</p></details>").join("") +
    '<p style="margin-top:14px">' + (file === "md.html" ? '<a href="/solution">Solution du mot du jour d\'hier</a> · ' : "") + '<a href="/">Tous les jeux de Motipop</a> · <a href="/regles">Règles détaillées</a></p></section>';
  txt = txt.replace(/<body([^>]*)>/, '<body$1><h1 class="sr-h1">' + esc(c.h1) + '</h1>');
  const i = txt.lastIndexOf("</body>");
  return i < 0 ? txt : txt.slice(0, i) + block + txt.slice(i);
}
module.exports = { apply, P };
