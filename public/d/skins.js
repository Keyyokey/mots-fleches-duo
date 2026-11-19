// Catalogue des skins et de leurs habillages (document « Skins & habillages », 8/11/2026).
// Identifiant d'un habillage : "skin/habillage". Image : /d/skins/<serie>-<skin>-<habillage>.jpg (fond de couleur, 320 px)
// et /d/skins/t/<même nom>.png (fond transparent, autour de la table du poker). Tant qu'une image manque,
// le site affiche l'initiale du skin sur la couleur de sa rareté.
// 19/11/2026 : chaque habillage peut être un personnage différent ; 4e valeur = son nom affiché (sinon le nom du skin).
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
      ["professeure", "La Professeure", [["classique", "Classique", "pc"], ["diplomes", "Remise des diplômes", "epi", "Le Jeune diplômé"], ["bibliotheque", "Bibliothèque de nuit", "leg", "La Liseuse de nuit"]]],
      ["ecrivain", "L'Écrivain", [["classique", "Classique", "rare"], ["voyage", "En voyage", "epi", "La Romancière voyageuse"], ["encre", "Maîtresse de l'encre", "leg", "La Pieuvre de l'encre"]]],
      ["lectrice", "La Lectrice", [["classique", "Classique", "pc"], ["conte", "Robe de conte", "rare", "La Petite conteuse"], ["gardienne", "Tenue de cérémonie", "leg", "Le Gardien des mots"]]],
      ["cruciverbiste", "Le Cruciverbiste", [["classique", "Classique", "rare"], ["dimanche", "Dimanche matin", "epi", "Le Fléchiste du dimanche"], ["maitre", "Grand maître", "leg", "La Tortue grand maître"]]]]],
    ["cartes", "Cartes & Bluff", [
      ["stratege", "Le Stratège", [["classique", "Classique", "rare"], ["decontracte", "Décontracté", "epi"], ["tournoi", "Grand tournoi", "leg"]]],
      ["reine", "La Reine du bluff", [["classique", "Classique", "epi"], ["masque", "Bal masqué", "epi", "Le Prince du bal"], ["coeur", "Couronne de cœur", "leg", "La Reine de cœur"]]],
      ["croupier", "Le Croupier", [["classique", "Classique", "pc"], ["neon", "Casino néon", "epi", "La Croupière néon"], ["hasard", "Maître du hasard", "leg", "Le Raton du hasard"]]],
      ["ombre", "L'Ombre", [["classique", "Classique", "epi"], ["blanche", "Capuche des neiges", "epi", "L'Ombre blanche"], ["doree", "Ombre dorée", "leg", "La Panthère dorée"]]]]],
    ["rue", "Rue", [
      ["casquette", "La Joueuse en casquette", [["classique", "Classique", "pc"], ["skate", "Skate", "rare", "Le Skateur"], ["neon", "Néon", "epi", "La Joueuse néon"]]],
      ["rookie", "Le Rookie", [["classique", "Classique", "pc"], ["gamer", "Gamer", "rare", "La Gameuse"], ["champion", "Médaille d'or", "epi", "La Championne"]]],
      ["voyageuse", "La Voyageuse", [["classique", "Classique", "rare"], ["desert", "Désert", "epi", "Le Fennec voyageur"], ["epices", "Marché aux épices", "leg", "Le Marchand d'épices"]]],
      ["dj", "Le DJ", [["classique", "Classique", "rare"], ["festival", "Festival", "epi", "La Reine du festival"], ["cosmique", "Platines cosmiques", "leg", "L'Axolotl DJ"]]]]],
    ["hiver", "Hiver", [
      ["patineuse", "La Patineuse", [["classique", "Classique", "hiv"], ["aurore", "Aurore boréale", "hiv", "Le Patineur"], ["reine", "Reine des glaces", "hiv", "La Petite reine des glaces"]]],
      ["montagnard", "Le Montagnard", [["classique", "Classique", "hiv"], ["sommet", "Sommet", "hiv", "L'Alpiniste"], ["esprit", "Esprit des neiges", "hiv", "L'Ours des neiges"]]],
      ["bonhomme", "Le Bonhomme de neige farceur", [["classique", "Classique", "hiv"], ["fete", "Fête", "hiv", "La Manchote en fête"], ["roi", "Cape royale", "hiv", "Le Roi de l'hiver"]]]]],
    ["robots", "Robots", [
      ["leo", "Léo", [["classique", "Classique", "pc"], ["retro", "Années 80", "epi", "Papy Rétro"], ["dore", "Or poli", "leg", "Pépite, la robote dorée"]]],
      ["lexi", "Lexi", [["classique", "Classique", "rare"], ["bibliothecaire", "Bibliothécaire", "epi", "Le Géant lecteur"], ["cristal", "Cristal", "leg", "Le Chien cristal"]]]]],
    ["animaux", "Animaux", [
      ["chat", "Le Chat bibliothécaire", [["classique", "Classique", "pc"], ["pyjama", "Pyjama", "rare", "La Petite panda rousse"], ["mage", "Grimoire", "leg", "Le Lapin mage"]]],
      ["renard", "Le Renard bluffeur", [["classique", "Classique", "rare"], ["gentleman", "Gentleman", "epi", "Le Blaireau gentleman"], ["neige", "Bonnet d'hiver", "epi", "La Hase des neiges"]]],
      ["chouette", "La Chouette savante", [["classique", "Classique", "rare"], ["exploratrice", "Exploratrice", "epi", "L'Éléphante exploratrice"], ["nuit", "Gardienne de la nuit", "leg", "La Chauve-souris de nuit"]]]]],
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
        var o = { id: k[0] + "/" + h[0], serie: s[0], serieNom: s[1], skin: k[0], skinNom: h[3] || k[1], hab: h[0], habNom: h[1], rar: h[2], file: s[0] + "-" + k[0] + "-" + h[0] + (s[0] === "chasseurs" ? ".webp" : ".jpg"), full: s[0] + "-" + k[0] + "-" + h[0] + (s[0] === "chasseurs" ? "-full.webp" : "-full.jpg") };   // image entière pour le casier (19/11 : toutes les séries)   // chasseurs : images détourées (fond transparent)
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
