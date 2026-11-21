# Bruitages des jeux (banque de sons de Juvenal, 21/11/2026, Pixabay)

Fichiers nettoyés (silences coupés, fondu de fin, volumes égalisés, mp3 mono 64 kbit/s) :
tuile / tuile2 (lettre posée, effacer), ok (bonne réponse), mot (mot trouvé), ding (à toi de jouer, cloche du Tourniquet),
pop (bulles, sélection), faux (erreur, volume réduit), victoire (fin de partie gagnée), perdu (Mot du jour raté),
tic / tac (pendule des dernières secondes : « tictac » = tic tac tic tac).
Non utilisé : la voix « Game over » (anglais, voix d'homme).

Ils sont regroupés dans public/d/sons-<empreinte>.js (window.__SONS, base64) et joués par MotipopSons.play(nom)
(outils/site/musique.js). Chaque jeu branche ses sons juste après son objet sfx/SFX ; un son pas encore chargé
laisse jouer l'ancien son fabriqué.
