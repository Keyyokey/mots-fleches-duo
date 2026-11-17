# Découpage d'un mot (majuscules sans accents) en syllabes écrites, à la française (« PA-PIL-LON », « CONS-TRUI-RE »).
V = set("AEIOUY")
LIQ = set("LR"); OCC = set("BCDFGKPTV")
UNITS = ("CH", "PH", "TH", "GN")
def units(w):
    out = []; i = 0
    while i < len(w):
        two = w[i:i+2]
        if two in UNITS: out.append(two); i += 2; continue
        if w[i] == "Q" and i+1 < len(w) and w[i+1] == "U": out.append("QU"); i += 2; continue
        if w[i] == "G" and i+2 < len(w) and w[i+1] == "U" and w[i+2] in "EIY": out.append("GU"); i += 2; continue
        out.append(w[i]); i += 1
    return out
def isv(u): return len(u) == 1 and u in V
def cluster(a, b): return b in LIQ and (a in OCC or a in ("PH", "CH", "TH"))
def syllabes(w):
    u = units(w)
    # Y entre deux voyelles = consonne (ROYAUME : RO-YAU-ME)
    kinds = []
    for i, x in enumerate(u):
        v = isv(x)
        if x == "Y" and 0 < i < len(u)-1 and isv(u[i-1]) and isv(u[i+1]): v = False
        kinds.append(v)
    # noyaux : suites de voyelles
    nuc = []; i = 0
    while i < len(u):
        if kinds[i]:
            j = i
            while j < len(u) and kinds[j]: j += 1
            nuc.append((i, j)); i = j
        else: i += 1
    if len(nuc) < 2: return [w]
    cuts = []
    for (a0, a1), (b0, b1) in zip(nuc, nuc[1:]):
        C = list(range(a1, b0)); n = len(C)
        if n == 0: cut = a1
        elif n == 1: cut = C[0]
        elif n == 2: cut = C[0] if cluster(u[C[0]], u[C[1]]) else C[1]
        else: cut = C[-2] if cluster(u[C[-2]], u[C[-1]]) else C[-1]
        cuts.append(cut)
    out = []; prev = 0
    for c in cuts: out.append("".join(u[prev:c])); prev = c
    out.append("".join(u[prev:]))
    return out
if __name__ == "__main__":
    for w in "PAPILLON TORNADE COQUELICOT LABYRINTHE RAMIFICATION PRESTIDIGITATEUR CHOCOLAT ELEPHANT ORDINATEUR AUTOMOBILE CONSTRUIRE INSTINCT OISEAU CROISSANCE REVOLUTION ROYAUME QUESTION GUITARE AGNEAU PHOTOGRAPHIE ARBRE ECLAIR".split():
        print(w, "-".join(syllabes(w)))
