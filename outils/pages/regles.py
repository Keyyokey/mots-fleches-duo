import sys;sys.path.insert(0,'/home/claude/pages');from base import page
body='''
<h1>Règles et <em>jetons</em></h1>
<p class="lead">Comment se joue chaque jeu, comment se gagnent les points, et à quoi servent les jetons.</p>
<nav class="toc" aria-label="Sommaire"><a href="#fleches">Mots fléchés</a><a href="#rond">Tourniquet</a><a href="#meles">Mots mêlés</a><a href="#culture">Culture G</a><a href="#wordflush">Wordflush</a><a href="#points">Points</a><a href="#jetons">Jetons</a><a href="#skins">Skins</a></nav>

<section class="card" id="fleches"><h2>🔤 Mots fléchés</h2>
<ul><li>Touche une définition (ou une case) : le mot s'éclaire dans la grille. ⇄ change le sens.</li>
<li>Tape les lettres puis « Valider » : <b>1 point par bonne lettre</b>, <b>3 de plus</b> par mot complété.</li>
<li>💡 révèle une lettre, sans rapporter de points.</li>
<li>Les cases numérotées valent <b>2 points de plus</b> chacune. Elles forment le <b>mot mystère</b> (un indice est donné sous la grille) : le trouver rapporte <b>+20 points</b> ; une proposition fausse fait passer ton tour.</li>
<li>À deux : chacun son tour, avec un temps limité par tour et un nombre de mots maximum, affichés en haut de la partie.</li></ul></section>

<section class="card" id="rond"><h2>⭕ Le Tourniquet (mots en rond)</h2>
<ul><li>18 ronds, 18 définitions : chaque réponse fait toujours <b>6 lettres</b>.</li>
<li>Touche un rond, tape les 6 lettres puis « Valider » : le mot s'écrit dans les cases autour, partagées avec les ronds voisins.</li>
<li>Mot juste : <b>+10 points</b>. Si ton mot complète aussi un voisin, c'est un <b>ricochet : +10 de plus</b>.</li></ul></section>

<section class="card" id="meles"><h2>🔎 Mots mêlés</h2>
<ul><li>Les mots de la liste sont cachés dans la grille. Glisse du début à la fin du mot, ou touche sa première puis sa dernière lettre.</li>
<li>Sens possibles selon le niveau : <b>facile</b> → ↓ ↘ · <b>normal</b> → ↓ ↘ ↗ · <b>difficile</b> les 4 sens, à l'endroit ou à l'envers. Les mots sont répartis à parts égales entre les sens.</li>
<li>Chaque mot trouvé rapporte des points. À deux, un mot déjà pris par l'autre ne compte plus : le plus rapide gagne.</li></ul></section>

<section class="card" id="culture"><h2>❓ Culture générale</h2>
<ul><li>Chaque partie compte <b>10 questions mélangées</b> : 3 avec image, 2 de culture, 2 calculs, 2 casse-tête et 1 « Tout le monde a son mot à dire ».</li>
<li>20 secondes par question, 4 réponses au choix (touches 1 à 4) : bonne réponse <b>10 points</b>, et <b>jusqu'à 5 de plus</b> si tu es rapide.</li>
<li><b>Tout le monde a son mot à dire</b> : tu tapes ta réponse en 30 secondes (accents, majuscules et pluriels ne comptent pas, une petite faute de frappe est tolérée). Toutes les bonnes réponses comptent ; une réponse originale rapporte <b>+3</b>.</li>
<li>À deux, vous avez les mêmes questions au même moment.</li></ul></section>

<section class="card" id="wordflush"><h2>🃏 Wordflush</h2>
<ul><li>Tu reçois <b>2 lettres cachées</b> ; 5 lettres communes arrivent au milieu (3, puis 1, puis 1).</li>
<li>À chaque étape : parole, suivre, relancer, tapis ou se coucher. Si tout le monde se couche, tu gagnes le pot sans montrer ton mot.</li>
<li>Pendant les mises, la jauge <b>« Force de ta main »</b> compare ta main à d'autres mains possibles avec les mêmes lettres (sans jamais donner le mot). Tu peux la masquer.</li>
<li>À la fin, forme un mot avec tes lettres et celles du milieu (au moins une des tiennes). Score = valeur des lettres + bonus de longueur + <b>Main pleine +5</b> si tes 2 lettres cachées sont dans le mot.</li></ul>
<table><tr><th>Longueur du mot</th><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td></tr><tr><th>Bonus</th><td>0</td><td>+3</td><td>+6</td><td>+10</td><td>+15</td><td>+22</td></tr></table>
<ul><li>Égalité : le mot le plus long l'emporte ; sinon le pot est partagé (le reste indivisible va dans la cagnotte).</li>
<li><b>Cagnotte</b> du salon : elle grossit avec les pots sans mot valide et les restes de partage ; elle est gagnée par le vainqueur de l'abattage avec un mot de 6 ou 7 lettres.</li>
<li>Wordflush se joue uniquement avec des <b>jetons fictifs</b> (voir plus bas) : aucun argent réel n'est misé ni gagné.</li></ul></section>

<section class="card" id="points"><h2>🏆 Les points</h2>
<ul><li>Les points de chaque partie s'ajoutent à ton <b>total</b>, qui sert au classement général. Il faut un pseudo pour les garder.</li>
<li><b>En solo</b>, le niveau multiplie les points : facile ×1, normal ×1,5, difficile ×2.</li>
<li><b>Chaque jour et pour chaque jeu</b>, les parties rapportent de moins en moins : 1re à 3e partie 100 %, 4e à 6e 75 %, 7e à 10e 50 %, ensuite 25 %. Le compteur repart à zéro chaque jour.</li>
<li>Une grille (ou série de questions) <b>rejouée</b> en solo rapporte 10 points la 2e fois, puis 3 points.</li>
<li>Les points sont vérifiés par le serveur : une partie solo n'est comptée que si elle a duré au moins 20 secondes (40 parties solo au plus par heure) ; à plusieurs, c'est le score de la partie gardée par le serveur qui compte. Une partie ne rapporte qu'une fois.</li></ul></section>

<section class="card" id="jetons"><h2>🪙 Les jetons</h2>
<ul><li>Les jetons servent <b>uniquement à miser dans Wordflush</b>.</li>
<li><b>Au départ</b> : 70 jetons.</li>
<li><b>Chaque semaine</b> (le lundi), tu reçois une dotation selon tes mises de la semaine précédente :</li></ul>
<table><tr><th>Jetons misés la semaine passée</th><td>aucun</td><td>1 à 19</td><td>20 à 49</td><td>50 et plus</td></tr><tr><th>Dotation</th><td>+20</td><td>+35</td><td>+50</td><td>+70</td></tr></table>
<p class="note">La dotation ne fait pas dépasser 300 jetons.</p>
<ul><li><b>Convertir des points</b> : 4 points = 1 jeton, jusqu'à 500 points toutes les 2 heures. Les points convertis sont retirés de ton total (et du classement).</li>
<li>Les jetons <b>ne s'achètent pas</b>, <b>ne s'échangent pas</b> entre joueurs et <b>n'ont aucune valeur en argent</b> : ils ne peuvent être ni vendus ni retirés.</li></ul></section>

<section class="card" id="skins"><h2>🎭 Les skins</h2>
<ul><li>Choisis ton skin dans « Ma page » → « Mon skin ». Il apparaît à côté de ton pseudo, notamment dans les classements.</li>
<li>Les habillages se débloquent avec tes points au total : <span class="pill">Peu commun</span> offert · <span class="pill">Rare</span> dès 500 · <span class="pill">Épique</span> dès 2 000 · <span class="pill">Légendaire</span> dès 5 000 · <span class="pill">Hiver</span> seulement en décembre.</li>
<li>Comme les jetons, les skins sont gratuits et n'ont aucune valeur en argent.</li></ul></section>
'''
open('/home/claude/mots-fleches-duo/public/regles.html','w',encoding='utf8').write(page("Règles et jetons","Règles des jeux de Motipop (mots fléchés, Tourniquet, mots mêlés, Culture G, Wordflush), barème des points, jetons et skins.",body))
print("ok")
