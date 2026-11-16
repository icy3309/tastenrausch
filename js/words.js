'use strict';
/* =========================================================
   Wortschatz für die Übungstexte.
   Pro Level werden nur Wörter genommen, die sich mit den bis
   dahin gelernten Tasten tippen lassen.
   Deutsch: Nomen stehen getrennt, damit sie ab dem
   Großbuchstaben-Level korrekt großgeschrieben werden.
   ========================================================= */
const W = (s) => s.trim().split(/\s+/);

const DE_NOUNS = W(`
aal aas abend abenteuer achse acker adler affe ahnung akku album alarm alltag alter ameise ampel amt anfang angst ankunft anruf antwort anzug apfel apotheke arbeit arm art arzt ast atem aufgabe auge august ausflug ausgang auto axt
baby bach backe bad bahn bahnhof ball banane band bank bar bart bau bauch bauer baum beere bein beispiel berg beruf besen besuch bett beutel biene bier bild birne bitte blatt blick blitz blume bluse blut boden bogen bohne boot bord brett brief brille brot bruder brunnen brust buch bude burg bus busch butter
café chance chef chor clown code computer creme
dach dame dampf dank datum dauer daumen decke deich detail dieb ding dorf dose drache draht drama dreck druck duft dunst durst dusche
ebbe ecke ehre ei eiche eile eimer eis eisen elch ende energie engel ente erde erfolg ernte esel essen eule euro
fabrik faden fahne fahrer fahrrad fall falle familie farbe fass faust feder fee fehler feier feind feld fell fels fenster ferien fest feuer fieber figur film finger fisch flagge flamme flasche fleck fleisch fliege flocke floh flur fluss flut folge form foto frage frau freude freund frieden frosch frucht frust fuchs fuge fuß futter
gabel gang gans garten gas gast gefahr gefühl geist geld gemüse gerät geschenk gesicht gewicht gift gipfel gitarre glanz glas glück gold gras grenze griff grube grund gruppe gruß gurke gurt
haar hafen hagel hahn haken hals halle hand handy harfe hase hass haus haut heft held hemd herbst herd herz heu hexe hilfe himmel hirsch hitze hobby hof hose hotel huhn hund hunger hut hütte
idee igel insel internet
jacke jagd jahr januar job joghurt jubel jugend juli juni
kabel kaffee käfer kakao kalb kalender kamel kamera kamm kampf kanal kante kappe karte kartoffel käse kasse kasten katze kauf keks keller kerze kette kind kino kirche kissen kiste klang klasse klavier kleid klima knie knopf knochen koch koffer kohl komma könig kopf korb körper kraft kragen kran kranz kreis kreuz krieg krone kröte krug kuchen kugel kuh kunst kurs kuss küste
labor lack lage lamm lampe land lärm laub lauf laune leben leder lehrer leib leiter lerche licht lied liebe linie liste loch löffel lohn löwe luft lust
macht magen magie mai mais mal mama mann mantel märchen markt maske maß mauer maus meer mehl meister menge mensch messer meter miete milch minute mittag mitte möbel mode monat mond moor moos morgen motor möwe mücke mühle mund musik mut mutter mütze
nabel nacht nadel nagel name nase nebel neffe nest netz nichte norden not notiz nudel null nummer nuss
oase obst ofen ohr öl oma onkel opa orange ordner ort osten ozean
paar paket palme panda papa papier park pass pause pech pferd pflanze pilz pinsel pirat plan platz pol polizei post preis prinz probe puls pulver punkt puppe
quark quelle quiz
rabe rad radio rahmen rand rasen rat ratte raum regal regel regen reh reifen reihe reis reise rekord rest rezept richter riese rind ring ritter rock rolle rose rost rücken ruder ruf ruhe runde
saal sache sack saft sage salat salz samen sand satz schaf schal schatz schaum schere schiff schild schirm schlaf schloss schluss schnee schrank schritt schuh schule schuss schwan schwein see seele segel seife seil seite sekunde sessel sieg silber sinn sitz sofa sohn sommer sonne spaß spiegel spiel spinne sport sprache stadt stall stamm stein stern stift stimme stirn stock stoff strand straße strom stück stuhl stunde sturm suche summe suppe süden
tafel tag takt tal tanne tante tanz tasche tasse taste tat tau taxi tee teich teil telefon teller tempo teppich test text theater tier tiger tinte tisch titel tochter tod ton topf tor torte traum treppe tropfen tuch tulpe tür turm typ
uhr ufer umwelt unfall ufo urlaub
vase vater verein vers video vogel volk vulkan
waage wagen wahl wal wald wand wange ware wärme wasser watte weg welle welt wert wespe westen wetter wiese wind winkel winter wirt witz woche wolf wolke wort wunder wunsch wurm wurst wüste wut
yacht yoga
zahl zahn zange zaun zebra zeh zeichen zeile zeit zelt zettel ziege ziel zimmer zitrone zoo zucker zug zunge zweig zwerg
`);

const DE_OTHER = W(`
ab aber acht ach alle allein alles als also alt am an andere anders auch auf aus außen
bald bei beide bis bitte blass blau bleiben blind böse brav breit bringen bunt
da dabei dafür damit danach dann daran darf darum das dass dein dem den denken denn der des deshalb dich die dir doch dort drei du dumm dunkel dünn durch dürfen
eben echt egal eher eigen ein eine einfach eins elf eng er erst es essen etwa etwas euch euer
fahl fahren fallen falls falsch fast faul fehlen fein fern fertig fest feucht fit flach fleißig fliegen frech frei fremd fressen freuen früh fünf für
gar geben gegen gehen gelb genau gerade gern gestern gesund gewinnen glatt gleich glücklich grau groß grün gut
haben halb halt hart hast hat heiß heißen hell helfen her heute hier hin hinter hoch hoffen holen hören hübsch
ich ihm ihn ihr im immer in innen ist
ja jagen je jede jeder jetzt jung
kahl kalt kann kaputt kaufen kaum kein klar klein klug kochen kommen können kurz
lachen lang lass lassen laufen laut leben leer legen leicht leider leise lernen lesen letzte lieb lieben liegen los
machen mag mal man manche mehr mein meist mit mittel mögen morgen müde muss müssen
nach nah nass neben nehmen nein nett neu neun nicht nie noch nun nur
ob oben oder oft ohne
packen passen per plötzlich
rasch recht reden reich rein rennen richtig rot rufen ruhig rund
sagen sanft satt sauber sauer schaffen scharf schauen schief schlafen schlau schlecht schnell schon schön schreiben schwach schwer sechs sehen sehr sein seit selbst setzen sich sie sieben sind singen sitzen so sofort soll spät spielen springen stark stehen still süß
tanzen tief tippen toll tragen treffen trinken trocken tun
über um und uns unser unten unter
viel vier voll vom von vor
wach wahr wann war warm warten warum was weil weich weit welche wenig wenn wer werden wie wieder will wir wissen wo wohl wollen
zehn zu zuerst zurück zusammen zwar zwei zwölf
`);

const EN_WORDS = W(`
a add ads aha all alas alfalfa ask asks as
dad dads fad fads fall falls flag flags flak flash flask gag gal gala glad glass gas gash had hag half hall halls has hash jag lad lads lag lash lass sad saga salad salads sash shad shall slag slash
a able about above accept across act add after again against age ago agree ahead air all allow almost alone along already also always am among and anger animal another answer any apple area arm army around arrive art as ask at away
baby back bad bag ball band bank bar base bath be bear beat beautiful bed been before began begin behind being believe bell below best better between big bird bit black blood blue board boat body bold book born both bottom box boy brain bread break bright bring broad brother brown build burn busy but buy by
cake call calm came camp can car card care carry case cat catch cause cell center chair chance change charge chart check child choose circle city class clean clear climb clock close cloud coast coat cold color come common cook cool copy corn corner cost could count country course cover crowd cry cup cut
dance dark day dead deal dear decide deep desk did die differ dinner do doctor does dog dollar done door down draw dream dress drink drive drop dry duck during
each ear early earth east easy eat edge egg eight either else end enemy enjoy enough enter equal even evening ever every exact example eye
face fact fair fall family famous far farm fast father fear feed feel feet fell few field fight figure fill final find fine finger finish fire first fish fit five flat floor flow flower fly follow food foot for force forest form forward found four free fresh friend from front fruit full fun
game garden gate gave get gift girl give glad go goal gold gone good got gray great green ground group grow guess guide
hair half hand happen happy hard has hat have he head hear heart heat heavy held help her here high hill him his history hit hold hole home hope horse hot hour house how huge human hundred hunt hurry
ice idea if image in inch inside into iron is island it its
job join joke joy judge jump just
keep key kick kid kill kind king kitchen knee knew knife know
lady lake land large last late laugh law lay lead learn least leave left leg less let letter level lie life lift light like line lion list listen little live long look lose lost lot loud love low luck lunch
made magic main make man many map mark market master match may me mean meet melt middle might mile milk mind minute miss modern moment money monkey month moon more morning most mother mountain mouse mouth move much music must my
name nation nature near need never new news next nice night nine no noise north nose not note nothing now number
ocean of off offer office often oil old on once one only open or orange order other our out over own
page paint pair paper park part party pass past path pay peace pen people perfect person pick picture piece pilot place plan plant play please point pool poor power press pretty print prize problem pull push put
queen question quick quiet quite
race radio rain raise ran reach read ready real reason red remember rest rich ride right ring river road rock roll room root rope rose round row rule run rush
safe said sail salt same sand save saw say school sea season seat second see seed seem sell send sense seven shape share sharp she ship shoe shop short should shout show side sign silver simple since sing sister sit six size skill skin sky sleep slow small smell smile snow so soft soil some song soon sound south space speak special speed spell spend spot spring square stand star start state stay step stick still stone stop store storm story street strong student study such sugar summer sun sure surprise sweet swim
table tail take talk tall teach team tell ten test than thank that the their them then there these they thing think this those three through throw tiger time tiny to today together told tomorrow too took top total touch tower town toy track train tree trip true try turn twelve twenty two type
under until up upon us use usual
valley value very view village visit voice
wait walk wall want war warm wash watch water wave way we wear weather week well went were west what wheel when where which while white who whole why wide wife wild will win wind window winter wish with woman wonder wood word work world would write wrong
yard year yellow yes yet you young your
zebra zero zone zoo
`);

const SENTENCES_DE = [
  'Übung macht den Meister.',
  'Zehn Finger fliegen über die Tasten.',
  'Franz jagt im komplett verwahrlosten Taxi quer durch Bayern.',
  'Wer schnell tippt, hat mehr Zeit für schöne Dinge.',
  'Heute ist ein guter Tag, um einen neuen Rekord aufzustellen.',
  'Die Katze schläft auf dem warmen Sofa.',
  'Ein kleiner Drache bewacht einen großen Schatz.',
  'Ohne Fleiß kein Preis.',
  'Morgen früh fahren wir mit dem Zug ans Meer.',
  'Jeder Fehler ist eine Chance, etwas zu lernen.',
  'Bleib ruhig, atme tief und schau nicht auf die Tastatur.',
  'Im Wald stehen hohe Bäume und kleine Büsche.',
  'Wir trinken Tee, essen Kuchen und lachen viel.',
  'Der Ritter zieht sein Schwert und reitet zur Burg.',
  'Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.',
  'Die Sonne scheint, die Vögel singen und ich tippe blind.',
  'Langsam und sauber ist am Anfang besser als schnell und falsch.',
  'Nach dem Regen kommt der Regenbogen.',
  'Meine Finger kennen den Weg, auch wenn ich nicht hinsehe.',
  'Am Wochenende besuchen wir unsere Großeltern auf dem Land.',
  'Der Hund bellt, wenn der Postbote klingelt.',
  'Im Sommer gehen wir oft im See schwimmen.',
  'Ein gutes Buch ist wie eine Reise in eine andere Welt.',
  'Kannst du mir bitte das Salz geben.',
  'Der Zug hat heute leider zehn Minuten Verspätung.',
  'Wir treffen uns um acht Uhr vor dem Kino.',
  'Mein Bruder spielt jeden Abend Gitarre.',
  'Im Winter liegt auf den Bergen viel Schnee.',
  'Die Kinder bauen am Strand eine riesige Sandburg.',
  'Ich koche heute Nudeln mit Tomatensoße.',
  'Das Konzert war laut, bunt und einfach großartig.',
  'Unser Lehrer erklärt die Aufgabe noch einmal ganz genau.',
  'Auf dem Markt gibt es frisches Obst und Gemüse.',
  'Wer früh aufsteht, sieht den Sonnenaufgang.',
  'Das Team hat das Spiel in der letzten Minute gewonnen.',
  'Mit jeder Runde werden meine Finger etwas schneller.',
  'Der Wind weht die bunten Blätter über die Straße.',
  'Wir packen die Koffer und fahren in den Urlaub.',
  'Ein Glas Wasser am Morgen tut dem Körper gut.',
  'Die Rakete startet mit einem lauten Knall in den Himmel.',
  'Wer im Dunkeln pfeift, hat meistens ein bisschen Angst.',
  'Auf dem Dachboden finden wir eine Kiste voller alter Briefe.',
  'Der Bäcker steht jeden Morgen um vier Uhr auf.',
  'Im Zoo füttert der Pfleger die hungrigen Pinguine.',
  'Nach dem Gewitter riecht die Luft ganz frisch.',
  'Unsere Katze schläft am liebsten in der Sonne.',
  'Mit etwas Geduld lernt man fast alles.',
  'Die Fahrräder stehen ordentlich vor der Schule.',
  'Am Lagerfeuer erzählen wir uns gruselige Geschichten.',
  'Der Kapitän steuert das Schiff sicher in den Hafen.',
  'Ein guter Freund hört zu, auch wenn er müde ist.',
  'Im Herbst sammeln die Eichhörnchen Nüsse für den Winter.',
  'Heute Abend gibt es Pfannkuchen mit Apfelmus.',
  'Die Bibliothek hat am Samstag bis sechs Uhr geöffnet.',
  'Mein Handy liegt irgendwo zwischen den Sofakissen.',
  'Der Drache niest, und plötzlich brennt die Kerze.',
  'Wir fahren mit dem Rad an den Fluss und angeln.',
  'Die Astronautin schwebt durch die Raumstation.',
  'Beim Fußball zählt am Ende nur das Ergebnis.',
  'Ein kleiner Fehler ist kein Grund aufzugeben.',
  'Die Oma strickt einen Schal in allen Farben des Regenbogens.',
  'Im Museum steht ein riesiges Skelett von einem Dinosaurier.',
  'Der Wecker klingelt, aber niemand will aufstehen.',
  'Auf der Wiese grasen Kühe, Schafe und ein Pony.',
  'Mit jedem Tag tippe ich ein bisschen schneller.',
];

const SENTENCES_EN = [
  'Practice makes perfect.',
  'The quick brown fox jumps over the lazy dog.',
  'Ten fingers fly across the keys.',
  'Every mistake is a chance to learn something new.',
  'Stay calm, breathe deeply and do not look at the keyboard.',
  'A small dragon guards a huge pile of gold.',
  'Today is a good day to set a new record.',
  'The cat is sleeping on the warm sofa.',
  'We take the early train to the sea tomorrow.',
  'Slow and clean is better than fast and wrong.',
  'My fingers know the way, even when I do not look.',
  'After the rain comes the rainbow.',
  'The knight draws his sword and rides to the castle.',
  'We drink tea, eat cake and laugh a lot.',
  'The sun is shining and the birds are singing.',
  'Tall trees and small bushes grow in the forest.',
  'On the weekend we visit our grandparents in the country.',
  'The dog barks every time the mail arrives.',
  'In summer we often swim in the lake.',
  'A good book is like a trip to another world.',
  'Could you please pass me the salt.',
  'The train is ten minutes late again today.',
  'Let us meet at eight in front of the cinema.',
  'My brother plays the guitar every evening.',
  'In winter the mountains are covered in snow.',
  'The children build a giant sand castle on the beach.',
  'Tonight I am cooking pasta with tomato sauce.',
  'The concert was loud, colorful and simply amazing.',
  'Our teacher explains the task once more.',
  'The market sells fresh fruit and vegetables.',
  'The team won the game in the very last minute.',
  'With every round my fingers get a little faster.',
  'The wind blows the colorful leaves across the street.',
  'We pack our bags and go on holiday.',
  'A glass of water in the morning is good for you.',
  'The rocket lifts off into the sky with a loud bang.',
  'Five quick wizards jump over the boxing judge.',
  'Keep your eyes on the screen and trust your hands.',
  'Small steps every day lead to big results.',
  'Nobody types fast on the first day.',
  'In the attic we find a box full of old letters.',
  'The baker gets up at four every morning.',
  'At the zoo the keeper feeds the hungry penguins.',
  'After the storm the air smells fresh and clean.',
  'Our cat loves to sleep in the sun.',
  'With a little patience you can learn almost anything.',
  'The bikes are parked neatly in front of the school.',
  'Around the campfire we tell each other spooky stories.',
  'The captain steers the ship safely into the harbor.',
  'A good friend listens, even when he is tired.',
  'In autumn the squirrels collect nuts for the winter.',
  'Tonight we are having pancakes with apple sauce.',
  'The library is open until six on Saturday.',
  'My phone is somewhere between the sofa cushions.',
  'The dragon sneezes and suddenly the candle is burning.',
  'We ride our bikes to the river and go fishing.',
  'The astronaut floats through the space station.',
  'In football only the final score counts.',
  'A small mistake is no reason to give up.',
  'Grandma knits a scarf in every color of the rainbow.',
  'The museum shows the giant skeleton of a dinosaur.',
  'The alarm clock rings, but nobody wants to get up.',
  'Cows, sheep and a pony are grazing in the meadow.',
  'Every day I type a little bit faster.',
];

const WORDBANK = {
  de: [...new Set(DE_NOUNS)].map((w) => ({ w, noun: true }))
    .concat([...new Set(DE_OTHER)].filter((w) => !DE_NOUNS.includes(w)).map((w) => ({ w, noun: false }))),
  en: [...new Set(EN_WORDS)].map((w) => ({ w, noun: false })),
};
const SENTENCE_BANK = { de: SENTENCES_DE, en: SENTENCES_EN };
