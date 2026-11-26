# Journal des audits de Motipop

## 23/11/2026 — Restes des anciennes versions

Parcours : les 16 pages (accueil, 7 jeux en solo, règles, mentions) à 1280 px et 390 px sans erreur JavaScript ni débordement ; recherche des anciens noms, des fonctions en double, des clés localStorage, du code mort et des règles périmées ; tests de l'accueil, multijoueur, salons, points, reprise/annulation passés.

### Bugs trouvés et corrigés
1. **Magnético : retouche perdue à la prochaine régénération.** Le style « textes plus lisibles sur mobile » (58fd75b) avait été ajouté à la main dans public/mg.html ; `python3 outils/magnetico/build_mg.py` l'effaçait. Reproduire : lancer build_mg.py puis `git diff public/mg.html`. Corrigé : règle déplacée dans outils/magnetico/mg_style.css, mg.html régénéré (rendu identique).
2. **Règles du Mot du jour périmées.** regles.html décrivait l'ancien classement (« le moins d'essais », « nombre de mots trouvés ») alors que le jeu compte des points depuis a891d79. Corrigé : barème +2 / +1 / +12, classements aux points (égalité : essais puis temps), 5 jetons au 1er du jour.
3. **Règles et tutoriels « À deux » pour des jeux à 4.** Mots fléchés et mots mêlés se jouent jusqu'à 4, mais regles.html et le tutoriel de l'accueil disaient « À deux ». Corrigé en « À plusieurs (2 à 4) » / « À plusieurs ». Descriptions (référencement) de fl.html, mm.html et regles.html alignées (4 joueurs, Mot du jour et Magnético dans la liste des règles).
4. **Code mort.** Accueil : ancienne clé `fl-salon-names` lue dans NAMES jamais utilisé, `saveNames()` et `newCode()` jamais appelés (les codes de salon viennent du serveur). Serveur : `liveInfo()` jamais appelé. Retirés.
5. **Deux tests périmés** (pas des bugs du site) : lancement_1clic.js attendait Culture G lancé sans réglage (le thème se choisit depuis fa65205) ; pages_info.js attendait 4 liens en pied de page (5 depuis la Visite guidée, 261166c). Mis à jour.

Test ajouté : outils/tests/restes_anciennes_versions.js (pages générées à jour, règles conformes, code mort absent, 1280 et 390 px).

### Questions pour Juvenal (rien changé)
- **Page /maquette** : l'ancienne maquette « Mots Fléchés Duo » avec « Poker lettres » est toujours servie (cachée aux moteurs de recherche). La retirer ?
- **Culture G et Tourniquet** : le multijoueur reste à 2 (bandeau « Duo », « Les deux joueurs ont quitté »), alors que les autres jeux vont jusqu'à 4. Voulu ?
- **Tuiles de l'accueil** : Mots fléchés porte l'étiquette « Duo » / « Seul ou à deux » et la Visite guidée dit « Seul ou à deux ! » alors que le jeu va jusqu'à 4. Changer le texte ?
- **Skin « Le Croupier »** (et « La Croupière néon ») : nom hérité de l'époque Poker, alors que le meneur s'appelle maintenant l'Académicien. Renommer ?
- **Wordflush** : le panneau de relance « Relancer à … / ½ pot / Tapis » (pkRaise, rzShow) n'est plus jamais affiché depuis le passage à S'arrêter / Miser + ; à retirer (à voir à l'audit Wordflush du 10/12).
- **Magnético solo** : la partie est enregistrée dans `fl2-solo-mg` mais jamais relue (pas de « Reprendre » pour Magnético). Reprise voulue ou enregistrement à supprimer ?
- **Fichiers inutilisés** (à voir à l'audit performance du 31/12) : public/d/culture-*.js, grilles-*.js, f-playfair-display-*.woff2 ne sont chargés par aucune page ; outils/pages/regles.py contient d'anciennes règles et écraserait regles.html s'il était relancé ; outils/site/sk.js garde l'ancien en-tête complet (mount/fleches/jeux, ~11 Ko, titre « Mots Fléchés Duo ») qui ne sert plus puisque toutes les pages utilisent l'en-tête simple.
- Tests : 11 tests ont encore un chemin Playwright d'une ancienne session et plusieurs utilisent le port 3100 (à harmoniser à l'audit du 11/01) ; sauvegardes.js demande le faux Upstash.

Prochain thème : 26/11 — Mots fléchés.


## 23/11/2026 (soir) — Garde-fous après deux incidents (fait avec Juvenal, hors calendrier)

Incidents :
1. **liveInfo() supprimé par l'audit du matin** alors qu'il sert à la liste des salons → « Serveur occupé » en ligne sur « Mes salons » et à la création de salon. Rétabli (8eacb73). Le test restes_anciennes_versions.js exigeait cette suppression : corrigé, il vérifie maintenant que liveInfo est présent ET appelé.
2. **Mot du jour sur téléphone** : les lettres au-dessus de la grille ressemblaient à un clavier mais ne réagissaient pas, et la consigne était cachée → les visiteurs venus de Facebook repartaient sans jouer. Corrigé (87bb59e : lettres qui écrivent au toucher, bouton Effacer, consigne visible).

Garde-fous ajoutés :
- `bash outils/tests/tout_lancer.sh` : lance TOUS les tests (serveurs 3999 et 3100 démarrés par le script, SOLO_MIN_MS=2000). Résultat ce soir : 31 réussis, 0 en échec. Sautés et pourquoi : faux_upstash.js (outil), magnetico_bulles_passage_trace.js (trace), wordflush_mobile_phases.js (captures d'écran, ne vérifie rien), poker_v2_moteur.js (ancien moteur v2 remplacé par le v3), sauvegardes.js (demande le faux Upstash).
- Tous les tests : `require(process.env.PW||'playwright')` et Chromium via `process.env.CHROMIUM` (fini les chemins d'anciennes sessions). poker_v2_moteur.js : chemin relatif vers poker.js.
- Nouveau test `nouveau_visiteur_mobile.js` : téléphone neuf, navigateur Facebook, 8 pages d'arrivée ; consigne visible, rien qui déborde, tuiles-lettres qui écoutent le toucher, et parcours complet du Mot du jour. Il échoue bien sur l'ancien md.html. Il a trouvé 3 pages sans consigne, corrigées : Mots mêlés (« fais glisser ton doigt sur les lettres d'un mot »), Magnético (« Touche les N syllabes dans l'ordre »), Tourniquet (« Touche un rond pour lire sa définition, puis tape le mot »).
- Magnético : les calculs (53cbda7) avaient été écrits dans public/mg.html ; reportés dans outils/magnetico/mg_engine.js et mg_style.css, page régénérée identique.
- Consigne de l'audit de nuit mise à jour : suite complète AVANT et APRÈS, pas de commit si un test qui passait échoue, recherche de tous les appels avant de supprimer du code, vérification en ligne de l'accueil, de « Mes salons » et du Mot du jour après déploiement, revert immédiat si cassé.


## 26/11/2026 — Mots fléchés

Parcours : solo (ordinateur 1280 px et iPhone 390 px), à deux (un ordinateur + un téléphone, comptes de test), mot mystère, clavier du téléphone, zoom pendant la saisie, niveaux ; lecture complète du moteur de public/fl.html et des règles. Aucune erreur JavaScript, rien ne déborde à 390 px.

Suite complète avant : 36 réussis, 0 en échec. Après : 37 réussis (dont le nouveau test), 0 en échec ; `node --check server.js` OK.
À noter : un passage intermédiaire a vu magnetico.js échouer une fois (« solo : le bon mot ») sans aucun changement à Magnético, puis passer seul et dans la suite finale : test instable à regarder à l'audit des tests du 11/01.
Le 1er essai de correction du zoom faisait échouer table_jeu_mobile.js (« la grille reste là où on l'a mise ») : la vue ne suit maintenant la case en cours que quand celle-ci change, une grille déplacée au doigt reste en place.

### Bugs trouvés et corrigés (public/fl.html)
1. **Mot mystère : +20 à chaque nouvelle proposition.** Une fois le mot trouvé, on pouvait rouvrir la fenêtre et le reproposer : +20 à chaque fois (jusqu'au plafond serveur de 800). À plusieurs c'était pire : le mot trouvé s'affiche dans les cases, le joueur suivant le recopiait et gagnait +20 lui aussi. Reproduire : grille facile n° 1 (`/fleches?go=solo&lvl=facile&n=1`), proposer REPONDRE trois fois → 60 points. Corrigé : la fenêtre ne s'ouvre plus et la proposition est refusée quand le mot mystère est déjà trouvé.
2. **Téléphone, zoom : la fin d'un long mot s'écrivait hors de l'écran.** Le zoom centre la vue sur le mot ; un mot vertical de 8 cases ne tient pas en entier, et les dernières lettres se tapaient dans une case invisible. Reproduire : iPhone, grille normale n° 136, toucher la 1re case de « VILLE DU VIN » et taper 8 lettres. Corrigé : la vue zoomée suit la case en cours quand elle sort de l'écran (le déplacement d'un doigt et la loupe marchent comme avant).
3. **Textes.** En solo, la fenêtre du mot mystère disait « Faux : tu passes ton tour » (il n'y a pas de tours en solo) : phrase masquée en solo. Le message de l'aide 💡 disait « réservée au niveau Facile en duo » alors que le jeu va jusqu'à 4 : « à plusieurs ».

Test ajouté : outils/tests/fleches_mystere_zoom.js (échoue sur l'ancienne page, passe après).

### Questions pour Juvenal (rien changé)
- **Coupure de connexion à deux** : à 3 ou 4 joueurs, un joueur absent plus d'1 minute sort avec 0 point. À deux (d'après le code, lostCheck ne s'applique qu'à partir de 3), rien ne se passe : son tour s'écoule à chaque fois (45 à 90 s d'attente pour l'autre) et il garde ses points. Faut-il appliquer la même règle (0 point, l'autre gagne) ?
- **Règles écrites des mots fléchés** (regles.html) : il manque le bonus +20 quand on termine la grille, la pénalité −2 par lettre fausse en Difficile, et le fait qu'en Normal/Difficile une seule lettre fausse annule tout l'essai (en Facile les bonnes lettres sont gardées). Les ajouter (texte un peu plus long) ?
- Commentaire périmé dans fl.html sur le « format téléphone 8 × 8 » (fin du choix 8×8 depuis c992228) : sans effet, laissé tel quel.
