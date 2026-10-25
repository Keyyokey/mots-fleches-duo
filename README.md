# Mots Fléchés Duo — le site

Le même jeu que dans Claude, en vrai site web : **n'importe qui ouvre le lien et joue, sans compte**.

- En arrivant, chacun reçoit un **salon** (code de 5 caractères dans l'adresse, par ex. `monsite.com/8ZPH9`).
- Bouton **WhatsApp** / **Copier le lien** à l'accueil : tes amis ouvrent ce lien et voient les mêmes parties en direct (lettres tapées en direct, scores, tours, chrono).
- Le mode **Solo** reste sur l'appareil de chacun.

## Contenu
- `server.js` : le serveur (sert la page et partage les parties de chaque salon en direct ; sauvegarde sur disque, et dans Upstash Redis si configuré).
- `public/index.html` : la page du jeu (300 grilles originales en 3 niveaux + 17 grilles du magazine, grille du jour, sons, animations, design clair/sombre, solo/multi).
- `public/mot.html` : « Le mot du jour » (jeu complémentaire, adresse `/mot`).
- `public/jeux.html` : les tables « Le Tourniquet » (`/CODE/rond`) et « Mots mêlés » (`/CODE/meles`), en solo ou en duel dans le même salon.
- `SAUVEGARDE.md` : comment les parties sont gardées, et les options de stockage durable (Upstash…).
- `IDEES.md` : idées reprises des autres jeux et pistes de nouveaux jeux.
- `outils/grilles/` : le générateur de grilles et le dictionnaire de définitions.
- `render.yaml` : configuration prête pour l'hébergeur Render.
- `package.json` : dépendances.

## Essayer sur ton PC
1. Installe Node.js (LTS) : https://nodejs.org
2. Dans ce dossier : `npm install` puis `npm start`
3. Ouvre http://localhost:3000

## Mettre en ligne (Render, ~7 $/mois, ne s'endort jamais)
1. Mets ce dossier sur GitHub (sans `node_modules`).
2. Sur https://render.com : « New + » → **Blueprint** → choisis le dépôt → « Apply ».
3. Render te donne l'adresse du site, par ex. `https://mots-fleches-duo.onrender.com`.

Offre gratuite (réglage actuel) : le site s'endort après 15 min sans visite. Les parties sont recopiées depuis les navigateurs des joueurs au réveil ; pour un stockage 100 % durable, voir `SAUVEGARDE.md` (Upstash, gratuit).

## Bouton « Soutenir le site » (dons)
Le site affiche un bouton ☕ (accueil, menu, fin de partie) **dès que la variable `SUPPORT_URL` est renseignée** chez l'hébergeur.
Sur Render : ton service → **Environment** → `SUPPORT_URL` = ton lien de don (Ko-fi, PayPal.me, lien de paiement Stripe, Lydia…), puis « Save ».
Options : `SUPPORT_LABEL` (texte du bouton) et `MONTHLY_COST` (coût affiché, par défaut « 7 € »).
