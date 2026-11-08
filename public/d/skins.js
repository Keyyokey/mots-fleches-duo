// Catalogue des skins et de leurs habillages (document « Skins & habillages », 8/11/2026).
// Identifiant d'un habillage : "skin/habillage". Image : /d/skins/<serie>-<skin>-<habillage>.jpg (fond de couleur, 320 px)
// et /d/skins/t/<même nom>.png (fond transparent, autour de la table du poker). Tant qu'une image manque,
// le site affiche l'initiale du skin sur la couleur de sa rareté.
(function (root) {
  var RAR = {
    pc: { nom: "Peu commun", c1: "#22BD92", c2: "#0f6b54", pts: 0 },
    rare: { nom: "Rare", c1: "#17B9C5", c2: "#0b5f7a", pts: 500 },
    epi: { nom: "Épique", c1: "#9167F1", c2: "#4b2a9c", pts: 2000 },
    leg: { nom: "Légendaire", c1: "#F4BE4D", c2: "#b06d12", pts: 5000 },
    hiv: { nom: "Hiver", c1: "#9FD8F0", c2: "#3d7fa8", pts: 0, mois: 12 }
  };
  var SERIES = [
    ["lettres", "Lettrés", [
      ["professeure", "La Professeure", [["classique", "Classique", "pc"], ["diplomes", "Remise des diplômes", "epi"], ["bibliotheque", "Bibliothèque de nuit", "leg"]]],
      ["ecrivain", "L'Écrivain", [["classique", "Classique", "rare"], ["voyage", "En voyage", "epi"], ["encre", "Maître de l'encre", "leg"]]],
      ["lectrice", "La Lectrice", [["classique", "Classique", "pc"], ["conte", "Conte", "rare"], ["gardienne", "Gardienne des mots", "leg"]]],
      ["cruciverbiste", "Le Cruciverbiste", [["classique", "Classique", "rare"], ["dimanche", "Dimanche matin", "epi"], ["maitre", "Grand maître", "leg"]]]]],
    ["cartes", "Cartes & Bluff", [
      ["stratege", "Le Stratège", [["classique", "Classique", "rare"], ["decontracte", "Décontracté", "epi"], ["tournoi", "Grand tournoi", "leg"]]],
      ["reine", "La Reine du bluff", [["classique", "Classique", "epi"], ["masque", "Bal masqué", "epi"], ["coeur", "Reine de cœur", "leg"]]],
      ["croupier", "Le Croupier", [["classique", "Classique", "pc"], ["neon", "Casino néon", "epi"], ["hasard", "Maître du hasard", "leg"]]],
      ["ombre", "L'Ombre", [["classique", "Classique", "epi"], ["blanche", "Ombre blanche", "epi"], ["doree", "Ombre dorée", "leg"]]]]],
    ["rue", "Rue", [
      ["casquette", "La Joueuse en casquette", [["classique", "Classique", "pc"], ["skate", "Skate", "rare"], ["neon", "Néon", "epi"]]],
      ["rookie", "Le Rookie", [["classique", "Classique", "pc"], ["gamer", "Gamer", "rare"], ["champion", "Champion junior", "epi"]]],
      ["voyageuse", "La Voyageuse", [["classique", "Classique", "rare"], ["desert", "Désert", "epi"], ["epices", "Marché aux épices", "leg"]]],
      ["dj", "Le DJ", [["classique", "Classique", "rare"], ["festival", "Festival", "epi"], ["cosmique", "Platines cosmiques", "leg"]]]]],
    ["hiver", "Hiver", [
      ["patineuse", "La Patineuse", [["classique", "Classique", "hiv"], ["aurore", "Aurore boréale", "hiv"], ["reine", "Reine des glaces", "hiv"]]],
      ["montagnard", "Le Montagnard", [["classique", "Classique", "hiv"], ["sommet", "Sommet", "hiv"], ["esprit", "Esprit des neiges", "hiv"]]],
      ["bonhomme", "Le Bonhomme de neige farceur", [["classique", "Classique", "hiv"], ["fete", "Fête", "hiv"], ["roi", "Roi de l'hiver", "hiv"]]]]],
    ["robots", "Robots", [
      ["leo", "Léo", [["classique", "Classique", "pc"], ["retro", "Rétro", "epi"], ["dore", "Léo doré", "leg"]]],
      ["lexi", "Lexi", [["classique", "Classique", "rare"], ["bibliothecaire", "Bibliothécaire", "epi"], ["cristal", "Lexi cristal", "leg"]]]]],
    ["animaux", "Animaux", [
      ["chat", "Le Chat bibliothécaire", [["classique", "Classique", "pc"], ["pyjama", "Pyjama", "rare"], ["mage", "Chat mage", "leg"]]],
      ["renard", "Le Renard bluffeur", [["classique", "Classique", "rare"], ["gentleman", "Gentleman", "epi"], ["neige", "Renard des neiges", "epi"]]],
      ["chouette", "La Chouette savante", [["classique", "Classique", "rare"], ["exploratrice", "Exploratrice", "epi"], ["nuit", "Gardienne de la nuit", "leg"]]]]],
    // série en pied (8/11/2026) : image du visage pour les avatars, image en pied (-full) pour le casier
    ["chasseurs", "Les Chasseurs de mots", [
      ["streameuse", "Zoé, la Streameuse", [["classique", "Classique", "epi"]]],
      ["jardinier", "Le Jardinier des mots", [["classique", "Classique", "leg"]]],
      ["tigre", "Le Tigre arbitre", [["classique", "Classique", "epi"]]],
      ["poetesse", "La Poétesse des abysses", [["classique", "Classique", "leg"]]],
      ["bibliothecaire", "Mamie Bibliothécaire", [["classique", "Classique", "rare"]]],
      ["boulanger", "Le Boulanger des lettres", [["classique", "Classique", "rare"]]],
      ["cartographe", "La Cartographe", [["classique", "Classique", "epi"]]],
      ["champion", "Le Champion en fauteuil", [["classique", "Classique", "leg"]]],
      ["conteur", "Le Papy conteur", [["classique", "Classique", "epi"]]],
      ["lina", "Lina, la petite championne", [["classique", "Classique", "rare"]]]]]
  ];
  var LIST = [], BY = {};
  SERIES.forEach(function (s) {
    s[2].forEach(function (k) {
      k[2].forEach(function (h) {
        var o = { id: k[0] + "/" + h[0], serie: s[0], serieNom: s[1], skin: k[0], skinNom: k[1], hab: h[0], habNom: h[1], rar: h[2], file: s[0] + "-" + k[0] + "-" + h[0] + (s[0] === "chasseurs" ? ".webp" : ".jpg"), full: s[0] === "chasseurs" ? s[0] + "-" + k[0] + "-" + h[0] + "-full.webp" : "" };   // chasseurs : images détourées (fond transparent)
        LIST.push(o); BY[o.id] = o;
      });
    });
  });
  // débloqué ? tot = points au total du joueur ; mois = 1..12 (mois en cours, heure de Paris)
  function unlocked(id, tot, mois) {
    var o = BY[id]; if (!o) return false; var r = RAR[o.rar];
    if (r.mois) return mois === r.mois;
    return (Number(tot) || 0) >= r.pts;
  }
  function condition(id) {
    var o = BY[id]; if (!o) return ""; var r = RAR[o.rar];
    if (r.mois) return "Seulement en décembre";
    return r.pts ? "Dès " + r.pts.toLocaleString("fr-FR") + " points" : "Offert";
  }
  var api = { RAR: RAR, LIST: LIST, BY: BY, unlocked: unlocked, condition: condition };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SKINS = api;
})(this);
