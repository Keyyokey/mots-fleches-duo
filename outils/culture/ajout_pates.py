# Culture G : série « Quelles sont ces pâtes ? » (21/11/2026, demande de Juvenal : thème nourriture en photos)
# Photos : Wikimedia Commons (photo principale de l'article Wikipédia de chaque pâte), crédits et licences relevés
# sur Commons le 21/11/2026. Ajoute les questions à la banque public/d/culture-*.js (sans doublon) et renomme le fichier.
import json, hashlib, glob, os, random, re, urllib.parse

# nom affiché, fichier Commons, auteur, licence, famille (pour des leurres crédibles), explication
P = [
 ("Penne", "Pennelisce closeup.png", "Popo le Chien", "CC0", "tube", "« Penne » veut dire « plumes » : elles sont coupées en biais, comme la pointe d'une plume d'oie."),
 ("Rigatoni", "Rigatoni.jpg", "Popo le Chien", "CC0", "tube", "De l'italien « rigato », rayé : ces gros tubes striés retiennent bien les sauces épaisses."),
 ("Tortiglioni", "Tortiglioni closeup.png", "Popo le Chien", "CC0", "tube", "Proches des rigatoni, mais leurs stries tournent en spirale autour du tube."),
 ("Ziti", "Ziti top.jpg", "Popo le Chien", "CC0", "tube", "Longs tubes lisses de Campanie, servis aux mariages : « zita » signifie « fiancée » en napolitain."),
 ("Paccheri", "Paccheri3.jpg", "Popo le Chien", "CC0", "tube", "Très gros tubes napolitains ; « pacchero » veut dire « gifle », pour le bruit qu'ils font dans l'assiette."),
 ("Macaroni", "Macaroni2.jpg", "Popo le Chien", "CC0", "tube", "Petits tubes courbés, devenus célèbres dans le monde entier avec le gratin de macaroni."),
 ("Cannelloni", "Cannelloni2.png", "Popo le Chien", "CC0", "farcie", "Gros tubes qu'on farcit (viande, ricotta, épinards) puis qu'on gratine au four."),
 ("Ditalini", "Ditali bulk.jpg", "Popo le Chien", "CC0", "petite", "« Petits dés à coudre » : ces minuscules tubes vont surtout dans les soupes, comme la pasta e fagioli."),
 ("Farfalle", "Farfalle simple.png", "Popo le Chien", "CC0", "forme", "« Farfalle » veut dire « papillons » ; en France, on les appelle souvent des nœuds papillon."),
 ("Fusilli", "Fusilli bulk.jpg", "Popo le Chien", "CC0", "spirale", "De « fuso », le fuseau : autrefois, on enroulait la pâte autour d'une aiguille pour leur donner leur spirale."),
 ("Cavatappi", "Cavatappi2.jpg", "Popo le Chien", "CC0", "spirale", "« Cavatappi » veut dire « tire-bouchon » : des tubes creux enroulés en hélice."),
 ("Conchiglie", "Conchiglie rigate.png", "Popo le Chien", "CC0", "forme", "« Coquillages » en italien : leur creux capture la sauce comme une petite cuillère."),
 ("Orecchiette", "Orecchiette Pasta.JPG", "Liveon001 © Travis K. Witt", "CC BY-SA 3.0", "forme", "« Petites oreilles » des Pouilles, façonnées d'un coup de pouce ; on les sert avec des brocolis."),
 ("Radiatori", "Radiatori.jpg", "Popo le Chien", "CC BY-SA 4.0", "forme", "Inventées au XXe siècle, elles imitent les ailettes d'un radiateur."),
 ("Rotelle", "Rotelle.jpg", "domaine public", "Public domain", "forme", "« Petites roues » : leurs rayons plaisent beaucoup aux enfants."),
 ("Campanelle", "Gigli.jpg", "Popo le Chien", "CC0", "forme", "« Petites cloches », aussi appelées gigli (« lys ») pour leurs pétales ondulés."),
 ("Casarecce", "Casarecce2.jpg", "Popo le Chien", "CC0", "spirale", "« Faites maison » : ces petites pâtes siciliennes sont roulées en forme de S."),
 ("Strozzapreti", "Strozzapretti2.jpg", "Popo le Chien", "CC0", "spirale", "Leur nom veut dire « étrangle-prêtres » ; une légende dit qu'un curé gourmand s'en serait étouffé."),
 ("Trofie", "Trofie pasta macro.jpg", "Tom dl", "CC BY-SA 3.0", "spirale", "Petites torsades de Ligurie, servies traditionnellement avec le pesto génois."),
 ("Garganelli", "Garganelli colorati.jpg", "fugzu", "CC BY 2.0", "tube", "Carrés de pâte aux œufs roulés à la main sur un petit peigne, en Émilie-Romagne."),
 ("Spaghetti", "Spaghetti2.jpg", "Popo le Chien", "CC0", "longue", "« Spaghetti » veut dire « petites ficelles » ; ce sont les pâtes les plus consommées au monde."),
 ("Linguine", "Linguine.jpg", "Sebastian Zurkuhl (Circle357)", "CC BY-SA 2.0 de", "longue", "« Petites langues » : des spaghetti aplatis, parfaits avec les fruits de mer."),
 ("Bucatini", "Bucatini.jpg", "Popo le Chien", "CC0", "longue", "Gros spaghetti percés d'un trou (« buco ») sur toute leur longueur, rois de l'amatriciana."),
 ("Capellini", "Capelli angelo front.jpg", "Popo le Chien", "CC BY-SA 4.0", "longue", "Les plus fines des pâtes longues, aussi appelées « cheveux d'ange »."),
 ("Fettuccine", "Fettucine1.JPG", "LPLT", "CC BY-SA 4.0", "ruban", "« Petits rubans » de Rome, connus dans le monde entier avec la sauce Alfredo."),
 ("Tagliatelle", "Nests of tagliatelle bolognesi.jpg", "Paolo Piscolla", "CC BY-SA 2.0", "ruban", "Rubans aux œufs de Bologne, roulés en nids ; leur largeur officielle est déposée à la chambre de commerce."),
 ("Pappardelle", "Pappardelle.jpg", "Popo le Chien", "CC BY-SA 3.0", "ruban", "Les plus larges des rubans, de Toscane ; « pappare » veut dire manger avec gourmandise."),
 ("Mafaldine", "Reginette.jpg", "Popo le Chien", "CC0", "ruban", "Rubans aux bords ondulés, nommés en l'honneur de la princesse Mafalda de Savoie."),
 ("Bigoli", "Bigoli2.jpg", "Popo le Chien", "CC0", "longue", "Gros spaghetti de Vénétie, tirés à la presse ; on les sert souvent avec une sauce aux anchois."),
 ("Pici", "Pici con albume.jpeg", "fugzu", "CC BY 2.0", "longue", "Gros spaghetti roulés à la main, spécialité de la région de Sienne, en Toscane."),
 ("Orzo", "Orzo.jpg", "Fazal Majid", "Public domain", "petite", "« Orzo » veut dire « orge » : ces petites pâtes ont la forme d'un grain de riz."),
 ("Fregola", "UncookedFregula.jpg", "Emily Parkhurst", "CC BY-SA 2.0", "petite", "Petites billes de semoule grillées au four, spécialité de Sardaigne."),
 ("Agnolotti", "Agnolotti2.jpg", "Popo le Chien", "CC0", "farcie", "Petites pâtes farcies du Piémont, pincées entre les doigts."),
 ("Tortellini", "Tortellini Bolognesi.jpg", "Angelo.Muratore", "CC BY-SA 4.0", "farcie", "Selon la légende de Bologne, leur forme imite le nombril de Vénus ; on les sert en bouillon."),
 ("Ravioli", "Flickr - cyclonebill - Ravioli med skinke og asparges i mascarponecreme.jpg", "cyclonebill", "CC BY-SA 2.0", "farcie", "Deux carrés de pâte soudés autour d'une farce ; on en mange déjà en Italie au XIVe siècle."),
 ("Gnocchi", "Gnocchi di ricotta burro e salvia.jpg", "Paoletta S.", "CC BY 2.0", "farcie", "Petites boulettes de pomme de terre ou de ricotta ; ici au beurre et à la sauge."),
 ("Lasagnes", "Lasagne - stonesoup.jpg", "jules / stonesoup", "CC BY 2.0", "farcie", "Grandes feuilles de pâte superposées avec la sauce, puis cuites au four."),
]
NOUILLES = [
 ("Ramen", "Charsiu ramen 02.jpg", "Arnaud 25", "CC0", "Soupe de nouilles de blé venue de Chine et devenue un plat culte au Japon.", ["Udon", "Pho", "Soba"]),
 ("Udon", "Kakeudon.jpg", "Lusheeta (Wikipédia en japonais)", "CC BY-SA 3.0", "Épaisses nouilles japonaises de blé, servies ici dans un bouillon chaud (kake udon).", ["Soba", "Ramen", "Somen"]),
]
FAM = {}
for n, *_rest in P: FAM.setdefault(_rest[3], []).append(n)
NEAR = {"tube": ["tube"], "spirale": ["spirale", "forme"], "forme": ["forme", "spirale", "petite"], "petite": ["petite", "forme"], "longue": ["longue", "ruban"], "ruban": ["ruban", "longue"], "farcie": ["farcie"]}

def thumb(f, w=500):
    u = f.replace(" ", "_"); h = hashlib.md5(u.encode()).hexdigest(); q = urllib.parse.quote(u)
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{w}px-{q}" + (".png" if u.lower().endswith(".svg") else "")

def page(f): return "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(f.replace(" ", "_"))

def credit(a, l): return ("Domaine public" if l == "Public domain" else a + " · " + l) + " · Wikimedia Commons"

R = random.Random(20261121)
new = []
for name, f, a, lic, fam, x in P:
    pool = [m for g in NEAR[fam] for m in FAM[g] if m != name]
    R.shuffle(pool); d = []
    for m in pool:
        if m not in d: d.append(m)
        if len(d) == 3: break
    new.append({"t": "Cuisine", "q": "Quelles sont ces pâtes ?", "a": [name] + d, "x": x, "s": "Wikipédia / Wikimedia Commons", "img": thumb(f), "cr": credit(a, lic), "src": page(f), "th": "pates"})
for name, f, a, lic, x, d in NOUILLES:
    new.append({"t": "Cuisine", "q": "Comment s'appelle ce plat de nouilles ?", "a": [name] + d, "x": x, "s": "Wikipédia / Wikimedia Commons", "img": thumb(f), "cr": credit(a, lic), "src": page(f), "th": "pates"})
for q in new: q["id"] = "c" + hashlib.sha1(("pates|" + q["a"][0] + "|" + q["q"]).encode()).hexdigest()[:8]

D = os.path.join(os.path.dirname(__file__), "..", "..", "public", "d")
old = glob.glob(os.path.join(D, "culture-*.js")); assert len(old) == 1, old
txt = open(old[0], encoding="utf-8").read()
m = re.match(r"window\.__CG=(.*);\s*$", txt, re.S); bank = json.loads(m.group(1))
bank = [q for q in bank if q.get("th") != "pates"]   # la série est remplacée à chaque lancement
ids = {q["id"] for q in bank}
add = [q for q in new if q["id"] not in ids]
bank += add
out = "window.__CG=" + json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + ";"
name = "culture-" + hashlib.sha1(out.encode()).hexdigest()[:10] + ".js"
if os.path.basename(old[0]) != name:
    open(os.path.join(D, name), "w", encoding="utf-8").write(out); os.remove(old[0])
print(len(add), "questions ajoutées ;", len(bank), "au total ->", name)
