# Générateur de grilles

Fabrique les 200 grilles originales du site (définitions écrites à la main dans `dict/*.txt`, une ligne `MOT|définition`).

```
pip install wordfreq            # fréquence des mots, pour choisir les mots courants en Facile
python3 generate_all.py facile  # écrit new_facile.json (idem : moyen, difficile)
python3 check_new.py            # vérifie : chaque case couverte, chaque définition utile, mot mystère juste
```

Niveaux : Facile = 10 lignes, mots courants, mots de 6 lettres maximum ; Moyenne = 13 lignes, 7 lettres ; Difficile = 15 lignes, 8 lettres.
Ajouter des mots dans `dict/` donne des grilles plus variées.
