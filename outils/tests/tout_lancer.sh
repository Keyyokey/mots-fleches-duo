#!/usr/bin/env bash
# Lance TOUS les tests de Motipop sur un serveur local, et dit lesquels échouent.
# À lancer avant chaque commit (l'audit de nuit le fait aussi, avant ET après ses changements).
#   bash outils/tests/tout_lancer.sh            → tous les tests
#   bash outils/tests/tout_lancer.sh magnetico  → seulement ceux dont le nom contient « magnetico »
# Il faut Playwright et Chromium : PW = chemin du module playwright (sinon « playwright » installé),
# CHROMIUM = chemin de Chromium (par défaut /opt/pw-browsers/chromium).
cd "$(dirname "$0")/../.." || exit 1
export PW="${PW:-playwright}"
FILTRE="${1:-}"
# pas des tests : faux_upstash.js (outil pour sauvegardes.js), magnetico_bulles_passage_trace.js (trace de mise au point),
# wordflush_mobile_phases.js (fait des captures d'écran, ne vérifie rien) ;
SAUTER="faux_upstash.js magnetico_bulles_passage_trace.js wordflush_mobile_phases.js"
pkill -9 -f "node server.js" 2>/dev/null; sleep 1
ADMIN_KEY=test1234567890abcdef PORT=3999 SOLO_MIN_MS=2000 node server.js > /tmp/motipop-3999.log 2>&1 & S1=$!
PORT=3100 SOLO_MIN_MS=2000 node server.js > /tmp/motipop-3100.log 2>&1 & S2=$!
sleep 4
OK=0; KO=0; LISTE=""
for t in outils/tests/*.js; do
  n=$(basename "$t")
  case " $SAUTER " in *" $n "*) continue;; esac
  [ -n "$FILTRE" ] && [[ "$n" != *"$FILTRE"* ]] && continue
  if [ "$n" = "sauvegardes.js" ]; then echo "⏭  $n (demande le faux Upstash : node outils/tests/faux_upstash.js)"; continue; fi
  ARG=""; [ "$n" = "meles_repartition.js" ] && ARG="meles_data.js"   # ce test lit le fichier des grilles
  out=$(timeout 300 node "$t" $ARG 2>&1); code=$?
  if [ $code -ne 0 ] || echo "$out" | grep -q "^ *❌"; then KO=$((KO+1)); LISTE="$LISTE $n"; echo "❌ $n"; echo "$out" | grep "^ *❌\|Error\|rror:" | head -5 | sed 's/^/     /'
  else OK=$((OK+1)); echo "✅ $n"; fi
done
kill -9 $S1 $S2 2>/dev/null
echo "----"; echo "$OK test(s) réussi(s), $KO en échec.${LISTE:+ À regarder :$LISTE}"
[ $KO -eq 0 ]
