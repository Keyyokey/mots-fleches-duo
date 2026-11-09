import sys;sys.path.insert(0,'/home/claude/pages');from base import page
body='''
<h1>Informations <em>légales</em></h1>
<p class="lead">Mentions légales, protection de tes données et conditions d'utilisation de Motipop. Mise à jour : 9 novembre 2026.</p>
<nav class="toc" aria-label="Sommaire"><a href="#mentions">Mentions légales</a><a href="#confidentialite">Confidentialité</a><a href="#conditions">Conditions d'utilisation</a></nav>

<section class="card" id="mentions"><h2>📄 Mentions légales</h2>
<h3>Éditeur</h3>
<p>{{EDITEUR}}</p>
<p>Contact : {{CONTACT}}</p>
<h3>Hébergeur</h3>
<p><b>Render Services, Inc.</b> — 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis — site : render.com. Le site est servi depuis la région Frankfurt (Allemagne).</p>
<h3>Base de données</h3>
<p><b>Upstash, Inc.</b> — upstash.com (stockage des comptes, des points et des parties).</p>
<h3>Contenus</h3>
<p>Les grilles, définitions et questions sont rédigées pour Motipop ou proviennent de sources libres, notamment Wikidata et Wikimedia Commons (images, licences libres indiquées par leurs auteurs) et OpenQuizzDB (licence CC BY-SA). Les drapeaux proviennent de la bibliothèque flag-icons. Le nom, le logo et les illustrations de Motipop ne peuvent pas être réutilisés sans accord.</p></section>

<section class="card" id="confidentialite"><h2>🔒 Confidentialité et données personnelles</h2>
<p>Motipop collecte le moins de données possible. Il n'y a <b>ni publicité, ni cookie, ni outil de suivi publicitaire</b>.</p>
<h3>Ce qui est enregistré, et pourquoi</h3>
<ul><li><b>Si tu crées un pseudo</b> : ton pseudo, ton code secret (jamais en clair : seule une empreinte chiffrée est gardée), une empreinte des appareils connectés, tes points, ton historique de parties, tes jetons, ton skin et tes salons. <i>But</i> : faire fonctionner ton compte, le classement et le jeu à plusieurs.</li>
<li><b>Ton adresse IP</b>, utilisée sur le moment pour limiter les abus (trop d'essais de code, trop de connexions). Elle n'est pas enregistrée dans la base ; l'hébergeur peut la garder quelques jours dans ses journaux techniques.</li>
<li><b>Dans ton navigateur</b> (stockage local, pas des cookies) : ta session, tes réglages (thème, icônes, tutoriels vus) et la partie en cours. Tu peux les effacer à tout moment depuis ton navigateur.</li></ul>
<h3>Base légale</h3>
<p>L'exécution du service que tu demandes en jouant (le jeu, le compte, le classement) et l'intérêt légitime de protéger le site contre les abus.</p>
<h3>Qui y a accès</h3>
<p>L'éditeur, ainsi que les prestataires techniques nécessaires : Render (hébergement) et Upstash (base de données). Ces sociétés sont américaines ; les transferts éventuels de données hors de l'Union européenne sont encadrés par leurs engagements contractuels (clauses contractuelles types). Tes données ne sont jamais vendues.</p>
<h3>Durée de conservation</h3>
<p>Tant que ton compte existe. Sur simple demande, ton compte est supprimé ; il disparaît aussi des sauvegardes automatiques au plus tard 8 jours après.</p>
<h3>Tes droits</h3>
<p>Tu peux demander l'accès à tes données, leur correction, leur suppression ou leur export, et t'opposer à leur utilisation, en écrivant à : {{CONTACT}}. Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (cnil.fr).</p>
<h3>Jeunes joueurs</h3>
<p>Le site est ouvert à tous et ne demande ni nom, ni âge, ni e-mail. Si tu as moins de 15 ans, parles-en à un parent avant de créer un pseudo.</p></section>

<section class="card" id="conditions"><h2>🤝 Conditions d'utilisation</h2>
<h3>Le service</h3>
<p>Motipop est un site de jeux de mots gratuit. Il peut évoluer, être interrompu pour maintenance ou s'arrêter ; les règles d'un jeu ne changent jamais au milieu d'une partie.</p>
<h3>Ton pseudo et ton code</h3>
<ul><li>Un pseudo par personne. Garde ton code secret : quiconque le connaît peut jouer à ta place.</li>
<li>Le pseudo et le nom des salons ne doivent contenir ni insulte, ni propos haineux ou sexuels, ni données personnelles (téléphone, adresse…), ni se faire passer pour quelqu'un d'autre. Un pseudo ou un salon qui ne respecte pas ces règles peut être renommé ou supprimé.</li></ul>
<h3>Jeu loyal</h3>
<ul><li>Interdit : robots, scripts, exploitation volontaire de bugs, comptes multiples pour gagner des points ou des jetons, entente entre joueurs pour fausser une partie.</li>
<li>En cas de triche, les points, jetons ou skins concernés peuvent être annulés et le compte suspendu.</li>
<li>Tu as trouvé un bug ? Signale-le à {{CONTACT}} : merci !</li></ul>
<h3>Points, jetons et skins</h3>
<p>Les points, jetons et skins sont des éléments de jeu <b>sans valeur monétaire</b>. Ils ne s'achètent pas, ne s'échangent pas, ne se vendent pas et ne se convertissent pas en argent. <b>Wordflush n'est pas un jeu d'argent</b> : on n'y mise que des jetons fictifs, obtenus gratuitement. Le barème est décrit sur la page <a href="/regles">Règles et jetons</a>.</p>
<h3>Responsabilité</h3>
<p>Le site est fourni tel quel. L'éditeur fait de son mieux pour qu'il soit disponible et juste, mais ne peut garantir l'absence d'erreur dans une grille ou une question ; une erreur signalée sera corrigée.</p>
<h3>Droit applicable</h3>
<p>Ces conditions sont soumises au droit français.</p></section>
'''
open('/home/claude/mots-fleches-duo/public/legal.html','w',encoding='utf8').write(page("Informations légales","Mentions légales, confidentialité et conditions d'utilisation de Motipop, site de jeux de mots en ligne entre amis.",body))
print("ok")
