# Synchronisation et sauvegarde des parties

## Ce qui se passe aujourd'hui

| Situation | Avant | Maintenant |
|---|---|---|
| On recharge la page | Rien n'est perdu (la partie est sur le serveur) | Rien n'est perdu |
| Le téléphone se met en veille | Reconnexion automatique | Reconnexion immédiate au retour sur l'onglet |
| Render (offre gratuite) endort le serveur après 15 min sans visite, ou redéploie | **Toutes les parties du salon étaient effacées** | Chaque navigateur garde une copie et la renvoie au serveur au réveil : la partie reprend |
| Coup joué pendant une coupure | Perdu | Gardé sur l'appareil ; « Coup non enregistré » s'affiche, on revalide après reconnexion |
| Changer d'appareil | Il fallait le même salon | Bouton **💾 Lien de sauvegarde** : un lien qui recrée les parties en cours n'importe où |

Le seul cas encore perdant : le serveur redémarre **et** aucun des joueurs n'a rouvert la page sur un appareil qui avait la partie (par exemple, tout le monde a vidé son navigateur). Pour l'éviter complètement, il faut un stockage externe (voir ci-dessous).

## Ce qui est fait sans compte

1. **Copie locale** : chaque appareil garde la dernière version des parties du salon (`localStorage`).
2. **Numéro de version** : le serveur numérote chaque coup (`_v`). Au réveil, il ne reprend une copie que si elle est plus récente que la sienne : pas de retour en arrière.
3. **Lien de sauvegarde** : les parties en cours, compressées dans l'adresse (`#r=…`).
4. **Code du salon à l'arrivée** : quand on ouvre un lien d'invitation, une fenêtre demande de confirmer le code et affiche combien de joueurs sont déjà connectés. On peut aussi taper un code à la main (« Rejoindre un autre salon »).

## Les options avec un compte (à choisir)

| Option | Coût | Ce que ça apporte | Ce que Juvenal doit faire |
|---|---|---|---|
| **Upstash Redis** ⭐ recommandé | Gratuit (500 000 commandes/mois, 256 Mo) | Les salons survivent à tout : veille, redéploiement, panne. **Déjà programmé dans le serveur**, il suffit d'ajouter 2 variables | Créer un compte sur upstash.com → *Create database* (région Europe) → copier `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` → les coller dans Render, onglet *Environment* |
| Réveil permanent (UptimeRobot ou cron-job.org) | Gratuit | Le serveur ne s'endort plus (plus d'attente de 30 à 60 s au premier chargement). Render gratuit donne 750 h/mois, assez pour un service allumé en continu | Créer un moniteur HTTP toutes les 10 min sur `https://mots-fleches-duo.onrender.com/healthz` |
| Render payant (Starter + disque) | ≈ 7 $/mois + 0,25 $/Go | Plus de veille, fichier de sauvegarde sur un vrai disque | Passer le service en *Starter* et ajouter un *Disk* monté sur `/var/data`, avec `DATA_DIR=/var/data` |
| Supabase (Postgres) | Gratuit, mais le projet se met en pause après 1 semaine sans activité | Base de données complète, comptes joueurs possibles plus tard | Plus de code à écrire ; utile seulement si on veut des comptes et des classements |
| Firebase Realtime Database | Gratuit (1 Go stockés, 10 Go/mois transférés) | Synchronisation en direct gérée par Google, même sans notre serveur | Réécrire la couche réseau ; à garder pour une version « application » |
| Turso (SQLite en ligne) | Gratuit (5 Go) | Stockage durable léger | Comme Upstash, mais plus de code |

**Conseil** : Upstash + un réveil UptimeRobot. Deux comptes gratuits, dix minutes de réglages, aucun code à changer.

## Vérifier que tout marche

Ouvre `https://mots-fleches-duo.onrender.com/healthz` :
- `ok 3` → le serveur tourne (3 salons en mémoire) ;
- `ok 3 redis` → le stockage Upstash est actif.
