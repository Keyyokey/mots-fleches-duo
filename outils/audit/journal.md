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

