# Générateur de grilles

Fabrique les 200 grilles originales du site (définitions écrites à la main dans `dict/*.txt`, une ligne `MOT|définition`).

```
pip install wordfreq            # fréquence des mots, pour choisir les mots courants en Facile
python3 generate_all.py facile  # écrit new_facile.json (idem : moyen, difficile)
python3 check_new.py            # vérifie : chaque case couverte, chaque définition utile, mot mystère juste
```

Niveaux : Facile = 10 lignes, mots courants, mots de 6 lettres maximum ; Moyenne = 13 lignes, 7 lettres ; Difficile = 15 lignes, 8 lettres.
Ajouter des mots dans `dict/` donne des grilles plus variées.

## Format téléphone 8 × 8 (21/11/2026)

```
python3 gen_tel.py 150      # 150 grilles 8 × 8 par niveau → tel.json (identifiants TF…, TM…, TD…, champs nc:8 et fmt:"t")
python3 publier_tel.py      # les ajoute à public/d/grilles-*.js et gl-<niveau>-*.js, met à jour public/fl.html (relançable)
```

Sur téléphone, ce format est proposé par défaut ; le format classique 10 colonnes reste au choix dans la fenêtre de réglage (`fl-fmt` : « t » ou « c »).
Côté serveur, les deux formats ont des listes séparées (`facile` / `facile:t`…), le tirage multijoueur reçoit `fmt`.
