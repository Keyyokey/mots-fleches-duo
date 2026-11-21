# Culture G : séries en photos (21/11/2026, demande de Juvenal) — fromages de France, fruits exotiques, races de chats,
# pâtisseries françaises. Photos : Wikimedia Commons (photo de l'article Wikipédia, vérifiée une à une sur planche ;
# écartées : nom écrit sur l'étiquette, photo peu parlante). Crédits relevés sur Commons le 21/11/2026.
# Remplace ces séries à chaque lancement et renomme public/d/culture-*.js.
import json, hashlib, glob, os, random, re, urllib.parse

S = {
"fromages": ("Cuisine", "Quel est ce fromage ?", [
 ("Brie de Meaux", "Brie_01.jpg", "Coyau", "CC BY-SA 3.0", "fleurie", "Surnommé « le roi des fromages » au congrès de Vienne en 1815, il vient de Seine-et-Marne."),
 ("Camembert", "Camembert_de_Normandie_(AOP)_10.jpg", "Coyau", "CC BY-SA 3.0", "fleurie", "La légende l'attribue à Marie Harel, une fermière normande, vers 1791 ; sa boîte en bois date de 1890."),
 ("Coulommiers", "Coulommiers_lait_cru.jpg", "Myrabella", "CC BY-SA 3.0", "fleurie", "Cousin plus petit et plus épais du brie, né lui aussi en Seine-et-Marne."),
 ("Neufchâtel", "Cœurs_de_Neufchâtel_01.jpg", "Coyau", "CC BY-SA 3.0", "fleurie", "Le plus ancien fromage normand ; sa forme en cœur viendrait des jeunes filles qui l'offraient aux soldats anglais."),
 ("Saint-marcellin", "Wikicheese_-_Saint-marcellin_-_20150417_-_010.jpg", "Thesupermat", "CC BY-SA 4.0", "fleurie", "Petit fromage du Dauphiné, souvent vendu dans un pot en terre cuite."),
 ("Reblochon", "Reblochon_11.jpg", "Pierre-Yves Beaudouin", "CC BY-SA 4.0", "lavee", "Fromage savoyard de la tartiflette ; « reblocher », c'était traire une 2e fois en cachette du propriétaire."),
 ("Époisses", "Époisses_Gaugry_03.jpg", "Coyau", "CC BY-SA 3.0", "lavee", "Fromage de Bourgogne à croûte orangée, lavée au marc de Bourgogne ; on dit que Napoléon l'adorait."),
 ("Pont-l'évêque", "Pont-l'Évêque_03.jpg", "Coyau", "CC BY-SA 3.0", "lavee", "Fromage carré du pays d'Auge, en Normandie, connu depuis le Moyen Âge."),
 ("Livarot", "Livarot_(fromage)_02.jpg", "Coyau", "CC BY-SA 3.0", "lavee", "Surnommé « le colonel » à cause des 5 bandes de roseau qui l'entourent, comme les galons."),
 ("Maroilles", "Maroilles_(cheese).jpg", "BastienM", "CC BY-SA 3.0", "lavee", "Fromage carré du Nord, créé par les moines de l'abbaye de Maroilles vers l'an 960."),
 ("Munster", "Munster_01.jpg", "Pierre-Yves Beaudouin", "CC BY-SA 4.0", "lavee", "Fromage d'Alsace et des Vosges, souvent servi avec des graines de cumin."),
 ("Langres", "Langres_fromage_AOP_coupe.jpg", "Myrabella", "CC BY-SA 4.0", "lavee", "Fromage de Champagne reconnaissable à son creux sur le dessus, la « fontaine », qu'on remplit parfois de marc."),
 ("Beaufort", "Beaufort_(fromage)_01.jpg", "Coyau", "CC BY-SA 3.0", "cuite", "« Prince des gruyères », fabriqué en Savoie ; son talon est creusé (concave)."),
 ("Comté", "Comte_AOP.jpg", "Myrabella", "CC BY-SA 3.0", "cuite", "Le fromage AOP le plus produit de France ; une meule pèse environ 40 kg et demande 400 litres de lait."),
 ("Emmental", "Emmental_(fromage)_01.jpg", "Coyau", "CC BY-SA 3.0", "cuite", "Ses trous, les « yeux », viennent du gaz produit par des bactéries pendant l'affinage."),
 ("Abondance", "Abondance_(fromage)_01.jpg", "Coyau", "CC BY-SA 3.0", "cuite", "Fromage de Haute-Savoie, du nom d'un village et d'une race de vaches."),
 ("Cantal", "Wikicheese-XX_-_Cantal_entre-deux_-_20180601_-_002.jpg", "Thesupermat", "CC BY-SA 4.0", "pressee", "L'un des plus vieux fromages de France, déjà cité par Pline l'Ancien il y a 2 000 ans."),
 ("Salers", "Salers_(fromage)_01.jpg", "Coyau", "CC BY-SA 3.0", "pressee", "Fabriqué uniquement à la ferme, en Auvergne, avec le lait des vaches au pâturage d'avril à novembre."),
 ("Laguiole", "Laguiole_(fromage)_01.jpg", "Coyau", "CC BY-SA 3.0", "pressee", "Fromage de l'Aubrac, base de l'aligot ; il partage son nom avec le célèbre couteau."),
 ("Saint-nectaire", "Saint-Nectaire.jpg", "Homer Ectus", "CC BY-SA 3.0", "pressee", "Fromage d'Auvergne affiné sur un lit de paille de seigle ; Louis XIV en servait à sa table."),
 ("Morbier", "Morbier_(fromage)_01.jpg", "Pierre-Yves Beaudouin", "CC BY-SA 4.0", "pressee", "Sa raie noire, autrefois de la suie de charbon, séparait le caillé du matin et celui du soir."),
 ("Tomme de Savoie", "WikiCheese_-_Tomme_de_Savoie_-_20150619_-_002.jpg", "Coyau", "CC BY-SA 3.0", "pressee", "Fromage de montagne à croûte grise, fabriqué avec le lait écrémé après la fabrication du beurre."),
 ("Tome des Bauges", "Tome_des_Bauges.jpg", "Mit-Mit", "Public domain", "pressee", "Fromage du massif des Bauges, en Savoie, à la croûte grise fleurie."),
 ("Ossau-iraty", "Fromages_Ossau-Iraty_003.jpg", "Jean Michel Etchecolonea", "CC BY-SA 3.0", "pressee", "Fromage de brebis du Pays basque et du Béarn ; on le sert avec de la confiture de cerises noires."),
 ("Raclette", "Raclette_(6300310978).jpg", "Pierre Guinoiseau", "CC BY 2.0", "pressee", "Son nom vient du verbe « racler » : on racle le fromage fondu sur les pommes de terre."),
 ("Roquefort", "Wikicheese_-_Roquefort_-_20150417_-_002.jpg", "Thesupermat", "CC BY-SA 4.0", "bleu", "Premier fromage AOC de France (1925), au lait de brebis, affiné dans les caves de Roquefort-sur-Soulzon."),
 ("Bleu d'Auvergne", "Wikicheese_Clermont-Ferrand_-_Bleu_d'Auvergne_20220825-02.jpg", "Pymouss", "CC BY-SA 4.0", "bleu", "Bleu au lait de vache, inventé au XIXe siècle par un paysan qui ensemençait son caillé avec du pain moisi."),
 ("Fourme d'Ambert", "Wikicheese_Clermont-Ferrand_-_Fourme_d'Ambert_20220825-01.jpg", "Pymouss", "CC BY-SA 4.0", "bleu", "Bleu doux et haut comme une petite colonne, fabriqué dans le Forez."),
 ("Bleu de Gex", "Bleu_de_Gex.jpg", "Myrabella", "CC BY-SA 3.0", "bleu", "Bleu du Haut-Jura ; sa croûte porte le mot « Gex » imprimé en relief."),
 ("Chabichou du Poitou", "Chabichou_du_Poitou_04.jpg", "Coyau", "CC BY-SA 3.0", "chevre", "Petit chèvre en forme de bonde ; son nom viendrait du mot arabe « chebli », la chèvre."),
 ("Crottin de Chavignol", "Crottin_02.jpg", "Coyau", "CC BY-SA 3.0", "chevre", "Petit chèvre du Berry, souvent servi chaud sur une salade."),
 ("Sainte-maure-de-touraine", "Sainte-Maure_de_touraine_01.jpg", "Coyau", "CC BY-SA 3.0", "chevre", "Chèvre en forme de bûche, traversé par une paille de seigle qui porte le nom du producteur."),
 ("Valençay", "Valençay_04.jpg", "Pierre-Yves Beaudouin", "CC BY-SA 4.0", "chevre", "Pyramide au sommet coupé : Talleyrand l'aurait fait couper pour ne pas rappeler à Napoléon sa défaite en Égypte."),
 ("Brocciu", "Brocciu2.jpg", "auteur non indiqué", "CC BY-SA 3.0", "chevre", "Fromage frais corse au petit-lait de brebis ou de chèvre, ingrédient du fiadone."),
]),
"fruits": ("Cuisine", "Quel est ce fruit ?", [
 ("Litchi", "Litchi_chinensis_fruits.JPG", "B.navez", "CC BY-SA 3.0", "petit", "Venu de Chine du Sud, il se mange beaucoup à Noël en France ; sa peau rugueuse cache une chair blanche parfumée."),
 ("Ramboutan", "Rambutan_white_background_alt.jpg", "Muhammad Mahdi Karim", "GFDL 1.2", "petit", "Cousin du litchi ; son nom malais veut dire « chevelu », pour ses poils souples."),
 ("Longane", "Dimocarpus_longan_fruits.jpg", "domaine public", "Public domain", "petit", "Appelé « œil de dragon » en Chine : son noyau noir ressemble à une pupille."),
 ("Physalis", "Uchuva_2005.jpg", "JuanseG", "Public domain", "petit", "Petite baie orange enfermée dans une lanterne de papier, d'où son surnom d'« amour en cage »."),
 ("Kumquat", "Kumquat.jpeg", "domaine public", "Public domain", "petit", "Ce petit agrume se mange entier, avec la peau, qui est sucrée alors que la chair est acide."),
 ("Mangue", "Mangos_-_single_and_halved.jpg", "Ivar Leidus", "CC BY-SA 4.0", "gros", "Fruit national de l'Inde, qui en produit près de la moitié du monde."),
 ("Papaye", "Carica_papaya_dsc07806.jpg", "David Monniaux", "CC BY-SA 3.0", "gros", "Ses graines noires ont un goût poivré ; son enzyme, la papaïne, attendrit la viande."),
 ("Durian", "Durian_in_black.jpg", "مانفی", "CC BY-SA 4.0", "gros", "« Roi des fruits » en Asie, mais son odeur est si forte qu'il est interdit dans le métro de Singapour."),
 ("Jacquier", "The_jackfruit_is_holding_on_to_the_tree.jpg", "Tushar Hossain", "CC BY-SA 4.0", "gros", "Le plus gros fruit d'arbre du monde : il peut dépasser 30 kg."),
 ("Corossol", "Soursop,_Annona_muricata.jpg", "Muhammad Mahdi Karim", "GFDL 1.2", "gros", "Gros fruit vert à épines molles des Antilles, à la chair blanche acidulée."),
 ("Ananas", "Owoce_Ananas.jpg", "Agnieszka Kwiecień", "GFDL", "gros", "Ce n'est pas un seul fruit : c'est une centaine de petites baies soudées entre elles."),
 ("Noix de coco", "Noix_de_coco_3.jpg", "Arnaud 25", "CC BY-SA 4.0", "gros", "Elle peut flotter des mois sur la mer et germer sur une autre île."),
 ("Banane plantain", "Plantains.jpg", "Daegis", "CC BY-SA 3.0", "gros", "Banane à cuire, plus ferme et moins sucrée, à la base des bananes frites (alloco, tostones)."),
 ("Pitaya (fruit du dragon)", "Pitaya_cross_section_ed2.jpg", "SMasters", "CC BY-SA 3.0", "autre", "Fruit d'un cactus grimpant ; sa chair blanche est piquée de petites graines noires."),
 ("Kiwano", "Owoce_Kiwano.jpg", "Agnieszka Kwiecień", "CC BY-SA 3.0", "autre", "Aussi appelé « concombre cornu », il vient d'Afrique ; sa chair verte a un goût de concombre et de banane."),
 ("Salak", "Salak_(Salacca_zalacca),_2015-05-17.jpg", "Crisco 1492", "CC BY-SA 4.0", "autre", "Surnommé « fruit serpent » pour sa peau brune en écailles."),
 ("Pomme-cannelle", "Annona_squamosa_(_Annonaceae_).jpg", "Filo gèn'", "CC BY-SA 4.0", "autre", "Fruit des Antilles en écailles vertes ; sa chair crémeuse a un goût de crème vanillée."),
 ("Figue de Barbarie", "Opuntia_ficus-indica_fruit9.jpg", "Hippocampus", "CC BY 2.5", "autre", "Fruit du cactus nopal ; attention à ses minuscules épines avant de l'éplucher."),
 ("Main de Bouddha", "Buddhahand2.jpg", "Wrong Side", "CC BY-SA 2.0", "autre", "Cédrat découpé en « doigts », sans pulpe ni jus ; en Asie, on l'offre dans les temples."),
 ("Grenade", "Pomegranate_DSW.JPG", "Augustus Binu", "CC BY-SA 3.0", "autre", "Remplie de centaines de grains rouges ; la ville de Grenade, en Espagne, porte son nom."),
 ("Goyave", "Goiaba_vermelha.jpg", "Rodrigo.Argenton", "CC BY-SA 4.0", "autre", "Très riche en vitamine C (plus qu'une orange), elle est très consommée au Brésil."),
 ("Kaki", "Fuyu_persimmon_fruits,_one_cut_open.jpg", "Frank Schulenburg", "CC BY-SA 4.0", "autre", "Fruit national du Japon ; certains kakis ne se mangent que très mûrs, presque en gelée."),
 ("Avocat", "Avocado_Hass_-_single_and_halved.jpg", "Ivar Leidus", "CC BY-SA 4.0", "autre", "C'est bien un fruit ! Son nom vient du mot aztèque « ahuacatl »."),
 ("Kiwi", "Kiwi_(Actinidia_chinensis)_1_Luc_Viatour.jpg", "Luc Viatour", "CC BY-SA 2.5", "autre", "Originaire de Chine, il a été rebaptisé en Nouvelle-Zélande, du nom de l'oiseau national."),
 ("Citron vert", "Backyard_limes.jpg", "Wtstoffs", "Public domain", "autre", "Aussi appelé lime, il est indispensable au mojito et au ti-punch."),
 ("Nashi", "Nashi_pear.jpg", "auteur non indiqué", "CC BY-SA 3.0", "autre", "Poire asiatique ronde comme une pomme, croquante et très juteuse."),
 ("Feijoa", "Goiaba-serrana,_ou_guarobi_(do_guarani_'fruto_verde'),_Feijoa_sellowiana,_em_Bagé,_RS,_Brasil_-_55238473195.jpg", "Gabriel Collares", "CC BY 4.0", "autre", "Petit fruit vert d'Amérique du Sud au goût d'ananas et de fraise."),
 ("Sapotille", "സപ്പോട്ട.jpg", "Sugeesh", "CC BY-SA 3.0", "autre", "Fruit brun au goût de poire caramélisée ; son arbre donne le chiclé, la base du chewing-gum d'origine."),
]),
"chats": ("Animaux", "Quelle est cette race de chat ?", [
 ("Persan", "Chat_Persan_18_novembre_2026.jpg", "Lixialouver", "CC0", "long", "Le chat à poil long le plus célèbre, au nez écrasé ; il demande un brossage chaque jour."),
 ("Ragdoll", "Ragdoll_Kater,_drei_Jahre_alt,_RAG_n_21_seal-tabby-colourpoint,_Januar_2015.JPG", "BlackIceNRW", "CC BY-SA 3.0", "long", "« Poupée de chiffon » : il se laisse aller tout mou quand on le prend dans les bras."),
 ("Norvégien", "Norwegianblackandwhitecat.jpg", "Bagne II", "CC0", "long", "Chat des forêts de Norvège, à la fourrure épaisse et imperméable, excellent grimpeur."),
 ("Balinais", "Balinese_blue_lynx_point.jpg", "Dr. Mirjam Kessler", "libre de droits", "long", "Un siamois à poil mi-long ; son nom évoque la grâce des danseuses de Bali."),
 ("Angora turc", "Angora_turc_blanc_2.jpg", "Daly69", "CC BY-SA 3.0", "long", "Chat blanc soyeux d'Ankara (autrefois Angora), protégé par le zoo de la ville."),
 ("Turc de Van", "GizemliKediler_Bey_Bunyamin_(Beebe)_TUV_d_63_male_EX1_CAC.JPG", "Heikki Siltala", "CC BY 3.0", "long", "Surnommé « le chat nageur » : il adore l'eau, chose rare chez les chats."),
 ("Sacré de Birmanie", "Minerva-25.jpg", "Claudia Zaino", "CC BY-SA 2.5 it", "long", "Reconnaissable à ses yeux bleus et à ses quatre pattes gantées de blanc."),
 ("Maine coon", "Maine_Coon_silver_tabby_resting_on_a_cat_tree._Photograph_taken_indoors_on_24_March_2019.png", "EDE32434343", "CC BY 4.0", "long", "L'une des plus grandes races : un mâle peut dépasser 1 m du nez à la queue."),
 ("Somali", "Vega-poseuse.jpg", "Bonsai-ka", "CC BY-SA 1.0", "long", "Un abyssin à poil mi-long, surnommé « chat renard » pour sa queue en panache."),
 ("Selkirk rex", "Selkirk_rex_longhair_FINTICAt_cat_show_Helsinki_2013-11-24.JPG", "Heikki Siltala", "CC BY 3.0", "long", "Chat au poil frisé comme un mouton, né aux États-Unis en 1987."),
 ("Mau égyptien", "CH_Chai-lai_Lisimba_(Simba)_MAU_ns_24_male_EX1_CAP.JPG", "Heikki Siltala", "CC BY 3.0", "tache", "L'une des rares races naturellement tachetées ; « mau » veut dire « chat » en égyptien ancien."),
 ("Ocicat", "Moosegrove_Ícaro_Idílico,_JW_(Ikaro)_OCI_n_24_young_male_EX1_BIV_NOM.JPG", "Heikki Siltala", "CC BY 3.0", "tache", "Il ressemble à un petit ocelot, mais n'a aucun sang sauvage."),
 ("Bengal", "Best_Stalk.jpg", "Lightburst", "CC BY-SA 4.0", "tache", "Issu d'un croisement avec le chat-léopard d'Asie : sa robe a des rosettes de léopard."),
 ("Savannah", "Savannah_Cat_portrait.jpg", "Jason Douglas", "Public domain", "tache", "Croisement avec le serval africain : c'est l'une des plus grandes races de chats domestiques."),
 ("Toyger", "Toyger_male_queenanne.JPG", "Gaynorjl", "CC BY-SA 3.0", "tache", "« Tigre jouet » : sa robe rayée imite celle d'un tigre miniature."),
 ("Abyssin", "Kamee01.jpg", "Martin Bahmann", "CC BY-SA 3.0", "tache", "Chat élancé au poil « tiqueté » (chaque poil a plusieurs bandes de couleur) ; il rappelle les chats de l'Égypte ancienne."),
 ("Singapura", "Singapura_cat_breed.jpg", "AnneAllier", "CC BY-SA 4.0", "tache", "La plus petite race de chat : une femelle pèse à peine 2 kg."),
 ("Manx", "Manx_Tabby.JPG", "C. Reid", "Public domain", "tache", "Chat de l'île de Man né sans queue, à cause d'un gène naturel."),
 ("American curl", "GIC_Minnikatin_Zelta_ACS_n_22_female_EX1_CAGCIB_GIC.JPG", "Heikki Siltala", "CC BY 3.0", "tache", "Ses oreilles sont recourbées vers l'arrière ; la race vient d'une chatte errante trouvée en Californie en 1981."),
 ("Scottish fold", "Scottish_Fold.jpg", "Steve Jurvetson", "CC BY 2.0", "tache", "Ses oreilles pliées vers l'avant lui donnent une tête de hibou."),
 ("Bleu russe", "Bleu_russe_01.jpg", "Rebexho", "CC BY-SA 3.0", "uni", "Robe gris-bleu argenté et yeux vert émeraude ; on dit qu'il vient du port d'Arkhangelsk."),
 ("Chartreux", "Keijuhovin_Boromir_Ponteva_(Porri)_CHA_male_EX1_CAGPIB.jpg", "Heikki Siltala", "CC BY 3.0", "uni", "Race française au poil gris-bleu et aux yeux cuivre ; le général de Gaulle en avait un."),
 ("British shorthair", "British_Shorthair._Female._18_months_old.jpg", "George E. Koronaios", "CC BY-SA 4.0", "uni", "Chat rond et trapu ; il aurait inspiré le chat du Cheshire d'Alice au pays des merveilles."),
 ("Bombay", "Bombay_femelle.JPG", "Pititebilette", "CC BY-SA 3.0", "uni", "Tout noir aux yeux cuivrés : on l'appelle la « panthère de salon »."),
 ("Havana brown", "Havana_Brown_-_choco.jpg", "Dave Scelfo", "CC BY-SA 2.0", "uni", "Chat couleur chocolat, nommé comme les cigares de La Havane."),
 ("Burmese", "Burmakatze-chocolate.JPG", "Earth68", "CC BY-SA 3.0", "uni", "Chat d'origine birmane, à la robe satinée et aux yeux dorés."),
 ("Exotic shorthair", "Nipsu-Nappulan_Non-Stop_Exotic_shorthair.JPG", "Heikki Siltala", "CC BY 3.0", "uni", "Un persan à poil court : même visage écrasé, mais pas besoin de brossage quotidien."),
 ("Sphynx", "Sphynx_cat_19_November_2026.jpg", "Lixialouver", "CC0", "rare", "Chat presque sans poils, né au Canada en 1966 ; il a besoin d'un bain de temps en temps."),
 ("Devon rex", "Syra.jpg", "Bebopscrx", "CC BY-SA 3.0", "rare", "Chat aux grandes oreilles et au poil frisé, surnommé « chat lutin »."),
 ("Cornish rex", "BebopsLilacPrince.JPG", "m.Gerver", "CC BY-SA 3.0", "rare", "Né en Cornouailles en 1950 ; son poil court ondule comme une vague."),
 ("Lykoï", "8-month-old_male_Lykoi.jpg", "steptacular", "CC BY-SA 4.0", "rare", "« Chat loup-garou » : son poil clairsemé et rêche lui donne un air de loup."),
 ("Siamois", "Siamese_cat_Vaillante.JPG", "Meekahoo", "CC BY-SA 3.0", "rare", "Chat de Thaïlande (l'ancien Siam) aux yeux bleus ; ses extrémités sont plus foncées car elles sont plus froides."),
 ("Oriental", "OSH_24-CH_Clamoris_Epeius_(Omar).JPG", "Heikki Siltala", "CC BY 3.0", "rare", "Cousin du siamois, très élancé, aux grandes oreilles et très bavard."),
 ("Bobtail japonais", "JapaneseBobtailBlueEyedMi-ke.JPG", "ようてい", "CC BY-SA 3.0", "rare", "Sa queue courte en pompon a inspiré le maneki-neko, le chat porte-bonheur qui lève la patte."),
]),
"patisseries": ("Cuisine", "Quelle est cette pâtisserie ?", [
 ("Paris-brest", "Paris-Brest_IMG_0875.JPG", "Deror_avi", "CC BY-SA 4.0", "choux", "Créé en 1910 pour la course cycliste Paris-Brest-Paris : il a la forme d'une roue de vélo."),
 ("Éclair", "Eclairs_with_chocolate_icing_at_Cafe_Blue_Hills.jpg", "georgie_grd", "CC BY-SA 2.0", "choux", "Son nom viendrait du fait qu'il se mange… en un éclair !"),
 ("Profiterole", "Profiterole_choc.jpg", "Hcrepin", "CC BY-SA 3.0", "choux", "Chou garni de glace vanille et nappé de chocolat chaud au moment de servir."),
 ("Religieuse", "Religieuses_au_chocolat.jpg", "Sonia Geffrier", "Public domain", "choux", "Deux choux superposés qui rappellent la silhouette d'une religieuse en habit."),
 ("Croquembouche", "Croquembouche_wedding_cake.jpg", "Eric Baker", "CC BY-SA 3.0", "choux", "Pièce montée de choux collés au caramel, servie aux mariages et baptêmes ; son nom veut dire « croque en bouche »."),
 ("Croissant", "Croissant-Petr_Kratochvil.jpg", "Petr Kratochvil", "CC0", "vienn", "Il vient du kipferl autrichien ; le croissant au beurre feuilleté est une invention française du XIXe siècle."),
 ("Pain au chocolat", "Pain_au_chocolat_Luc_Viatour.jpg", "Luc Viatour", "CC BY-SA 3.0", "vienn", "Appelé « chocolatine » dans le Sud-Ouest : un débat qui ne finit jamais !"),
 ("Brioche", "Brioche.jpg", "auteur non indiqué", "CC BY-SA 3.0", "vienn", "Pâte levée riche en beurre et en œufs ; la brioche à tête est la forme parisienne."),
 ("Kouglof", "Kougelhopf.jpg", "CaHeSo", "CC BY 4.0", "vienn", "Brioche alsacienne aux raisins et amandes, cuite dans un moule en couronne torsadée."),
 ("Kouign-amann", "Kouignamann.JPG", "Haltopub", "Public domain", "vienn", "« Gâteau au beurre » en breton, né à Douarnenez vers 1860 : il est très riche en beurre et en sucre."),
 ("Galette des rois", "Galette_Frangipane_2021.jpg", "Benh LIEU SONG", "CC BY-SA 4.0", "gateau", "Pâte feuilletée et frangipane, mangée à l'Épiphanie ; qui trouve la fève devient roi."),
 ("Tarte Tatin", "Tarte_Tatin_a_la_Michalak.jpg", "Shani Evenstein", "CC BY-SA 4.0", "gateau", "Tarte aux pommes cuite à l'envers, inventée par les sœurs Tatin en Sologne, sans doute par accident."),
 ("Far breton", "Far-breton.jpg", "Easyfrenchfood", "CC BY-SA 3.0", "gateau", "Flan épais breton, souvent garni de pruneaux."),
 ("Clafoutis", "Clafoutis2.jpg", "Popo le Chien", "CC BY-SA 4.0", "gateau", "Dessert du Limousin aux cerises entières, avec leur noyau, ce qui leur garde leur goût."),
 ("Gâteau basque", "Gâteau_basque_02.jpg", "Arnaud 25", "CC BY-SA 4.0", "gateau", "Pâte sablée fourrée de crème pâtissière ou de confiture de cerises noires d'Itxassou."),
 ("Tarte tropézienne", "Tarte_tropézienne_01.jpg", "Arnaud 25", "CC0", "gateau", "Brioche garnie de crème, créée à Saint-Tropez ; Brigitte Bardot lui aurait trouvé son nom."),
 ("Fraisier", "Fraisier_hk_jp.jpg", "SUBARUsti2020hk", "CC BY-SA 4.0", "gateau", "Génoise, crème mousseline et fraises entières, recouvert d'une fine pâte d'amandes."),
 ("Tarte au citron meringuée", "Tarte_au_citron.JPG", "Camille Gévaudan", "CC BY-SA 3.0", "gateau", "Crème au citron acidulée et meringue dorée au chalumeau."),
 ("Opéra", "Tartine_bakery_opera_cake_in_2007.jpg", "Arnold Gatilao", "CC BY 2.0", "gateau", "Couches de biscuit au café, crème au beurre et ganache ; il rappelle la scène de l'Opéra Garnier."),
 ("Mille-feuille", "Mille-feuille_02.jpg", "Arnaud 25", "CC0", "gateau", "Trois couches de pâte feuilletée et deux de crème pâtissière, glacé et marbré sur le dessus."),
 ("Bûche de Noël", "Buche_de_Noel_(Yule_Log).jpg", "Mitantig", "CC BY-SA 4.0", "gateau", "Gâteau roulé en forme de bûche, qui rappelle la vraie bûche qu'on faisait brûler à Noël."),
 ("Crêpe", "Crepes_dsc07085.jpg", "David Monniaux", "CC BY-SA 3.0", "petit", "On en fait à la Chandeleur, le 2 février ; la tradition veut qu'on la fasse sauter une pièce à la main."),
 ("Gaufre", "Waffles.png", "Pplc", "CC BY-SA 4.0", "petit", "Cuite entre deux plaques en nid d'abeille ; les gaufres de Liège et de Bruxelles sont les plus connues."),
 ("Macaron", "Macarons,_French_made_mini_cakes.JPG", "Nicolas Halftermeyer", "CC BY-SA 3.0", "petit", "Deux coques à la poudre d'amande et une ganache ; la version parisienne s'est imposée au XXe siècle."),
 ("Calisson", "Calisson_fruidoraix.jpg", "Loak14", "CC BY-SA 4.0", "petit", "Confiserie d'Aix-en-Provence en forme de navette : pâte d'amandes et melon confit, sous un glaçage blanc."),
 ("Cannelé", "Caneles_stemilion.jpg", "Roboppy", "CC BY-SA 2.5", "petit", "Spécialité bordelaise, croustillante dehors et moelleuse dedans, parfumée au rhum et à la vanille."),
 ("Madeleine", "Madeleines_pic.jpg", "Ruth", "CC BY-SA 4.0", "petit", "Petit gâteau en forme de coquillage, de Commercy ; la « madeleine de Proust » réveille les souvenirs."),
 ("Crème brûlée", "Creme_brulée.jpg", "Arnaud 25", "Public domain", "petit", "Crème à la vanille recouverte de sucre caramélisé qu'on casse d'un coup de cuillère."),
 ("Île flottante", "Îles_flottantes.jpg", "Arnaud 25", "CC0", "petit", "Blancs d'œufs en neige posés sur une crème anglaise, avec un filet de caramel."),
 ("Merveilleux", "Merveilleux.jpg", "Eeicing", "CC BY-SA 4.0", "petit", "Meringue enrobée de crème fouettée et de copeaux de chocolat, venue du Nord et de Belgique."),
 ("Mont-blanc", "VermicellesDessert.jpg", "Honio", "Public domain", "petit", "Vermicelles de crème de marrons sur une meringue, comme le sommet enneigé du mont Blanc."),
]),
}
NEAR = {"fleurie": ["fleurie", "lavee"], "lavee": ["lavee", "fleurie"], "cuite": ["cuite", "pressee"], "pressee": ["pressee", "cuite"], "bleu": ["bleu", "pressee"], "chevre": ["chevre", "fleurie"],
        "petit": ["petit", "autre"], "gros": ["gros", "autre"], "autre": ["autre", "petit", "gros"],
        "long": ["long"], "tache": ["tache", "uni"], "uni": ["uni", "tache"], "rare": ["rare", "uni"],
        "choux": ["choux", "petit"], "vienn": ["vienn", "gateau"], "gateau": ["gateau"], "petit_p": ["petit"]}

def thumb(f, w=500):
    u = f.replace(" ", "_"); h = hashlib.md5(u.encode()).hexdigest(); q = urllib.parse.quote(u)
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{w}px-{q}" + (".png" if u.lower().endswith(".svg") else "")
def page(f): return "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(f.replace(" ", "_"))
def credit(a, l): return ("Domaine public" if l == "Public domain" else a + " · " + l) + " · Wikimedia Commons"

R = random.Random(20261121); new = []
for th, (t, q, L) in S.items():
    fam = {}
    for n, f, a, l, g, x in L: fam.setdefault(g, []).append(n)
    for n, f, a, l, g, x in L:
        pool = [m for gg in NEAR[g] for m in fam.get(gg, []) if m != n]
        R.shuffle(pool); d = []
        for m in pool:
            if m not in d: d.append(m)
            if len(d) == 3: break
        if len(d) < 3: d += [m for m in R.sample([y[0] for y in L], len(L)) if m != n and m not in d][:3 - len(d)]
        new.append({"t": t, "q": q, "a": [n] + d, "x": x, "s": "Wikipédia / Wikimedia Commons", "img": thumb(f), "cr": credit(a, l), "src": page(f), "th": th,
                    "id": "c" + hashlib.sha1((th + "|" + n).encode()).hexdigest()[:8]})

D = os.path.join(os.path.dirname(__file__), "..", "..", "public", "d")
old = glob.glob(os.path.join(D, "culture-*.js")); assert len(old) == 1, old
txt = open(old[0], encoding="utf-8").read(); bank = json.loads(re.match(r"window\.__CG=(.*);\s*$", txt, re.S).group(1))
bank = [b for b in bank if b.get("th") not in S]
ids = {b["id"] for b in bank}; assert not any(x["id"] in ids for x in new)
bank += new
out = "window.__CG=" + json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + ";"
name = "culture-" + hashlib.sha1(out.encode()).hexdigest()[:10] + ".js"
if os.path.basename(old[0]) != name: open(os.path.join(D, name), "w", encoding="utf-8").write(out); os.remove(old[0])
from collections import Counter
print(Counter(x["th"] for x in new), len(bank), "->", name)
