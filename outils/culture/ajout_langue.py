# Culture G (23/11/2026) : 100 questions écrites à la main — expressions, proverbes, orthographe, synonymes,
# origine des mots, années 60-70, spécialités régionales. Source : questions_langue_23nov.txt (bonne réponse en 1er).
# Relançable : remplace les questions de ce fichier (identifiants « cl… ») et renomme public/d/culture-*.js.
import json, hashlib, glob, os, re
H = os.path.dirname(os.path.abspath(__file__))
rows = [l.rstrip("\n").split("|") for l in open(os.path.join(H, "questions_langue_23nov.txt"), encoding="utf-8") if l.strip() and not l.startswith("#")]
new = [{"t": t, "q": q, "a": [a, b, c, d], "x": x, "s": "Motipop", "id": "cl" + hashlib.sha1((t + "|" + q + "|" + a).encode()).hexdigest()[:7]} for t, q, a, b, c, d, x in rows]
D = os.path.join(H, "..", "..", "public", "d")
old = glob.glob(os.path.join(D, "culture-*.js")); assert len(old) == 1, old
txt = open(old[0], encoding="utf-8").read(); bank = json.loads(re.match(r"window\.__CG=(.*);\s*$", txt, re.S).group(1))
bank = [b for b in bank if not str(b.get("id", "")).startswith("cl")]
ids = {b["id"] for b in bank}; assert not any(x["id"] in ids for x in new); assert len({x["id"] for x in new}) == len(new)
bank += new
out = "window.__CG=" + json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + ";"
name = "culture-" + hashlib.sha1(out.encode()).hexdigest()[:10] + ".js"
if os.path.basename(old[0]) != name: open(os.path.join(D, name), "w", encoding="utf-8").write(out); os.remove(old[0])
print(len(new), "questions ajoutées,", len(bank), "au total ->", name)
