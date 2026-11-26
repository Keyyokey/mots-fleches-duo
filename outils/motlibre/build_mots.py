# Dictionnaires du « Mot du jour – Journalier / Libre » et du Défi du jour (protocole du 26/11/2026, étape 1).
# Sources libres (pas de copie d'un site) :
#   - liste de ~336 000 mots français « an-array-of-french-words » (licence MIT, LICENSE-an-array-of-french-words.txt) ;
#   - simplemma (MIT) : forme de base d'un mot → écarte pluriels, féminins, verbes conjugués et participes ;
#   - wordfreq (fréquence d'usage du français) : écarte les mots trop rares, classe facile / difficile ;
#   - définitions des grilles du site (outils/grilles/dict) pour les mots du Défi du jour.
# Usage : pip install simplemma wordfreq ; npm i an-array-of-french-words (dans /tmp/frw) puis
#         node -e "...writeFileSync('/tmp/frw/all.json', JSON.stringify(require('an-array-of-french-words')))"
#         python3 outils/motlibre/build_mots.py /tmp/frw/all.json
# Sortie : motlibre_mots.json (racine, lu par le serveur seulement ; jamais envoyé aux navigateurs).
import sys, os, re, json, glob, unicodedata
import simplemma, wordfreq
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, "..", ".."))
def plain(s): return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").upper()
ALL = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/frw/all.json", encoding="utf8"))
LENS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
# seuils de fréquence (échelle Zipf) : un mot long est naturellement plus rare, le seuil baisse avec la longueur
NORMAL = {3: 3.6, 4: 3.5, 5: 3.4, 6: 3.25, 7: 3.15, 8: 3.0, 9: 2.9, 10: 2.8, 11: 2.7, 12: 2.6}
HARD_SPAN = 0.75                       # « difficile » : entre (seuil − 0,75) et le seuil
# mots écartés : grossiers, injurieux, sujets pénibles (liste courte, complétée à la main au besoin)
BLOCK = set(plain(w) for w in """con conne connard connasse salope salaud pute putain merde chier chiotte bite couille cul enculer foutre
nique niquer pédé tapette gouine nègre négresse bougnoule youpin bâtard batard bordel branler branlette suicide viol violeur pédophile
nazi nazisme génocide inceste cocu crétin débile abruti idiot imbécile mongol trisomique taré pétasse poufiasse grognasse enfoiré
cadavre meurtre tuer torture prostituée prostitution drogue cocaïne héroïne zizi coït transsexuel islamiste terroriste jihad djihad
jihadiste djihadiste fasciste raciste intégriste men eme are rit pro leu lev""".split())
# mots-outils (pronoms, prépositions, conjonctions, adverbes de grammaire), interjections et abréviations : jamais à deviner
STOP = set(plain(w) for w in """ainsi alors après assez aucun aucune auquel auxquels autant autour autre avant avec beaucoup bien bientôt car
ceci cela celle celui cependant certes chacun chaque chez combien comme comment contre dans davantage dedans dehors déjà depuis derrière
desquels devant donc dont duquel elle elles encore enfin ensuite entre envers environ etc eux guère hélas hier ici jadis jamais jusque
laquelle lequel lesquels leur leurs lors lorsque lui malgré mais même mien mienne moins moi nôtre notre nous nul nulle oui parce parmi
partout pendant peu peut-être plupart plus plusieurs plutôt pour pourquoi pourtant près presque puis puisque quand quant quel quelle
quelque quelques quelqu qui quiconque quoi quoique sans selon sinon sitôt soi sous souvent suivant sur surtout tandis tant tantôt tard
tien tienne toi tôt toujours tous tout toute toutes très trop vers voici voilà vôtre votre vous ohé bravo hello okay yeah miss cine para
inter extra ciao allo bah bof hein euh hop pff zut aie oups waouh wow""".split())
valid, cand = set(), {L: [] for L in LENS}
accented = set(ALL)
for w in ALL:
    if not re.fullmatch(r"[a-zàâäçéèêëîïôöùûüÿœæ]+", w): continue
    p = plain(w).replace("Œ", "OE").replace("Æ", "AE")
    if not re.fullmatch(r"[A-Z]+", p) or not (3 <= len(p) <= 12): continue
    valid.add(p)
    cand[len(p)].append((w, p))
cand2 = {L: [] for L in LENS}
for L in LENS:
    for w, p in cand[L]:
        if p in BLOCK or p in STOP: continue
        if simplemma.lemmatize(w, lang="fr") != w: continue                  # forme fléchie : écartée
        if p.endswith("S") and p[:-1] in valid: continue                    # pluriel dont le singulier existe
        z = wordfreq.zipf_frequency(w, "fr")
        if z <= 0: continue
        if w.endswith("e") and (w + "r") in accented and wordfreq.zipf_frequency(w + "r", "fr") >= z - 0.3: continue   # « heurte » : surtout un verbe conjugué
        if w.endswith("ée") and w[:-1] in accented and wordfreq.zipf_frequency(w[:-1], "fr") > z: continue   # « honorée » : participe au féminin
        if w.endswith("ant") and (w[:-3] + "er") in accented and wordfreq.zipf_frequency(w[:-3] + "er", "fr") >= z: continue   # participe présent
        cand2[L].append((p, z))
cand = cand2
pool = {}
for L in LENS:
    best = {}
    for p, z in cand[L]: best[p] = max(best.get(p, 0), z)                    # même mot sans accent (ex. PECHE) : une seule fois
    n = sorted(p for p, z in best.items() if z >= NORMAL[L])
    d = sorted(p for p, z in best.items() if NORMAL[L] - HARD_SPAN <= z < NORMAL[L])
    pool[str(L)] = {"n": n, "d": d}
    print(L, "lettres :", len(n), "mots courants,", len(d), "mots difficiles")
# Défi du jour (6 lettres) : mots courants qui ont une définition dans les grilles du site (affichée en fin de partie)
defs = {}
for f in glob.glob(os.path.join(ROOT, "outils/grilles/dict/*.txt")):
    if re.search(r"(atlas|geo)\.txt$", f): continue
    for line in open(f, encoding="utf8"):
        if "|" not in line: continue
        w, d = line.rstrip("\n").split("|", 1); w = plain(w.strip()); d = d.strip()
        if len(w) == 6 and d and len(d) <= 70 and "..." not in d and "…" not in d and w not in defs: defs[w] = d[0].upper() + d[1:]
six = set(pool["6"]["n"])
daily = {w: defs[w] for w in sorted(defs) if w in six and not re.search(r"(S|X|Z)$", w)}
print("Défi du jour : réserve de", len(daily), "mots de 6 lettres avec définition")
json.dump({"v": 1, "pool": pool, "valid": sorted(valid), "daily6": daily}, open(os.path.join(ROOT, "motlibre_mots.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
print("motlibre_mots.json", os.path.getsize(os.path.join(ROOT, "motlibre_mots.json")) // 1024, "Ko ;", len(valid), "mots valides")
