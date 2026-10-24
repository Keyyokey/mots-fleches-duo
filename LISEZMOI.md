# Mots Fléchés Duo — le site

Le même jeu que dans Claude, en vrai site web : **n'importe qui ouvre le lien et joue, sans compte**.

- En arrivant, chacun reçoit un **salon** (code de 5 caractères dans l'adresse, par ex. `monsite.com/8ZPH9`).
- Bouton **WhatsApp** / **Copier le lien** à l'accueil : tes amis ouvrent ce lien et voient les mêmes parties en direct (lettres tapées en direct, scores, tours, chrono).
- Le mode **Solo** reste sur l'appareil de chacun.

## Contenu
- `server.js` : le serveur (sert la page et partage les parties de chaque salon en direct ; sauvegarde sur disque).
- `public/index.html` : la page du jeu (17 grilles, design clair/sombre, niveaux, solo/multi).
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

Option gratuite : dans `render.yaml`, remplace `plan: starter` par `plan: free` et supprime le bloc `disk:` (le site s'endort après 15 min sans visite et les parties sont perdues au redémarrage).

## Bouton « Soutenir le site » (dons)
Le site affiche un bouton ☕ (accueil, menu, fin de partie) **dès que la variable `SUPPORT_URL` est renseignée** chez l'hébergeur.
Sur Render : ton service → **Environment** → `SUPPORT_URL` = ton lien de don (Ko-fi, PayPal.me, lien de paiement Stripe, Lydia…), puis « Save ».
Options : `SUPPORT_LABEL` (texte du bouton) et `MONTHLY_COST` (coût affiché, par défaut « 7 € »).
