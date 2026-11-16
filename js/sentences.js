'use strict';
/* =========================================================
   Satz-Baukasten: setzt aus Satzbausteinen grammatisch
   richtige Sätze zusammen – über eine Million Kombinationen
   pro Sprache, damit sich die Texte praktisch nie wiederholen.
   Alle Bausteine sind so gewählt, dass sie zueinander passen
   (Nominativ/Akkusativ, Verb in der 3. Person Singular).
   ========================================================= */
const SB = {
  de: {
    // Wer? (Nominativ, klein am Anfang – wird am Satzanfang großgeschrieben)
    who: W(`der_kleine_Hund die_schlaue_Katze mein_großer_Bruder meine_Schwester unsere_Lehrerin der_alte_Fischer
      ein_mutiger_Ritter die_junge_Ärztin der_freche_Papagei ein_müder_Bär die_Prinzessin der_Bäcker unser_Nachbar
      meine_Oma mein_Opa der_Pirat die_Hexe ein_kleiner_Drache der_Zauberer die_Polizistin der_Koch ein_frecher_Affe
      die_Bürgermeisterin mein_bester_Freund die_Trainerin der_Postbote ein_neugieriges_Kind die_Malerin der_Astronaut
      die_Gärtnerin der_Roboter ein_grüner_Frosch der_Fuchs die_Eule der_Schüler die_Sängerin der_Tänzer ein_Detektiv
      die_Kapitänin der_König meine_Tante der_Hausmeister ein_alter_Seemann die_Forscherin`),
    // Was tut er/sie mit etwas? (3. Person Singular)
    vt: W(`sucht findet sieht malt kauft holt versteckt trägt braucht mag putzt repariert verliert bemerkt zeichnet
      bringt wäscht fotografiert bestellt packt verschenkt entdeckt vergisst teilt`),
    // Was? (Akkusativ)
    what: W(`einen_roten_Ball das_alte_Buch eine_warme_Decke den_goldenen_Schlüssel ein_kleines_Boot die_blaue_Tasse
      einen_frischen_Apfel das_neue_Fahrrad eine_bunte_Laterne den_schweren_Koffer ein_altes_Foto die_grüne_Jacke
      einen_leckeren_Kuchen das_geheime_Tagebuch eine_leere_Flasche den_verlorenen_Schuh ein_glänzendes_Schwert
      die_alte_Landkarte einen_weichen_Teddy das_kaputte_Radio eine_riesige_Pizza den_bunten_Drachen ein_winziges_Ei
      die_silberne_Krone einen_langen_Schal das_rote_Auto eine_kleine_Muschel den_magischen_Stein ein_frisches_Brot
      die_warme_Suppe einen_dicken_Pullover das_lustige_Spiel eine_alte_Uhr den_gelben_Regenschirm ein_neues_Heft
      die_verlorene_Brille einen_bunten_Blumenstrauß das_letzte_Stück_Torte eine_geheime_Botschaft den_kleinen_Kompass`),
    // Was tut er/sie? (ohne Objekt)
    vi: W(`schläft tanzt singt wartet spielt lacht rennt träumt arbeitet liest pfeift sitzt frühstückt wandert
      schwimmt übt telefoniert jubelt gähnt staunt`),
    // Wo?
    where: W(`im_Garten am_Strand auf_dem_Dach im_Keller hinter_dem_Haus im_dunklen_Wald auf_dem_Markt in_der_Küche
      unter_dem_Bett am_See in_der_Schule auf_dem_Berg im_Zug vor_der_Tür im_Park auf_der_Insel in_der_Stadt
      neben_dem_Brunnen im_Schloss am_Hafen in_der_Höhle auf_dem_Spielplatz im_Museum unter_der_Brücke
      auf_dem_Balkon im_Bus am_Bahnhof in_der_Bibliothek auf_dem_Bauernhof im_Zelt`),
    // Wann? (steht am Satzanfang → Verb kommt direkt danach)
    when: W(`Am_Morgen Heute Jeden_Tag Am_Abend Im_Sommer Im_Winter Nach_der_Schule Am_Wochenende Plötzlich Manchmal
      Um_acht_Uhr Mitten_in_der_Nacht Bei_Regen Zum_Glück Am_Sonntag Im_Herbst Kurz_vor_Mitternacht Jeden_Montag
      Nach_dem_Essen Im_Frühling`),
    conj: ['weil', 'obwohl', 'während', 'sobald'],
  },
  en: {
    who: W(`the_little_dog the_clever_cat my_big_brother my_sister our_teacher the_old_fisherman a_brave_knight
      the_young_doctor the_cheeky_parrot a_sleepy_bear the_princess the_baker our_neighbor my_grandma my_grandpa
      the_pirate the_witch a_tiny_dragon the_wizard the_police_officer the_cook a_funny_monkey the_mayor
      my_best_friend the_coach the_mail_carrier a_curious_child the_painter the_astronaut the_gardener the_robot
      a_green_frog the_fox the_owl the_student the_singer the_dancer a_detective the_captain the_king my_aunt
      the_janitor an_old_sailor the_explorer`),
    vt: W(`finds sees paints buys grabs hides carries needs likes cleans fixes loses notices draws brings washes
      orders packs discovers drops shares forgets borrows wraps`),
    what: W(`a_red_ball the_old_book a_warm_blanket the_golden_key a_small_boat the_blue_cup a_fresh_apple the_new_bike
      a_colorful_lantern the_heavy_suitcase an_old_photo the_green_jacket a_tasty_cake the_secret_diary an_empty_bottle
      the_lost_shoe a_shiny_sword the_old_map a_soft_teddy_bear the_broken_radio a_giant_pizza the_bright_kite
      a_tiny_egg the_silver_crown a_long_scarf the_red_car a_small_shell the_magic_stone a_fresh_loaf_of_bread
      the_warm_soup a_thick_sweater the_funny_game an_old_clock the_yellow_umbrella a_new_notebook the_lost_glasses
      a_bunch_of_flowers the_last_piece_of_cake a_secret_message the_little_compass`),
    vi: W(`sleeps dances sings waits plays laughs runs dreams works reads whistles sits hikes swims practices
      cheers yawns relaxes`),
    where: W(`in_the_garden on_the_beach on_the_roof in_the_basement behind_the_house in_the_dark_forest at_the_market
      in_the_kitchen under_the_bed by_the_lake at_school on_the_mountain on_the_train in_front_of_the_door in_the_park
      on_the_island in_the_city next_to_the_fountain in_the_castle at_the_harbor in_the_cave on_the_playground
      at_the_museum under_the_bridge on_the_balcony on_the_bus at_the_station in_the_library on_the_farm in_the_tent`),
    when: W(`In_the_morning Today Every_day In_the_evening In_summer In_winter After_school On_the_weekend Suddenly
      Sometimes At_eight_in_the_morning In_the_middle_of_the_night Luckily On_Sunday In_autumn Just_before_midnight
      Every_Monday After_dinner In_spring`),
    conj: ['because', 'while', 'although', 'as_soon_as'],
  },
};
// Unterstriche halten Wortgruppen zusammen; hier werden sie zu Leerzeichen.
for (const L of Object.values(SB)) for (const k in L) L[k] = L[k].map((x) => x.replace(/_/g, ' '));

/** Einen zufälligen, grammatisch richtigen Satz bauen (mit `rng` reproduzierbar). */
function buildSentence(lang, rng = Math.random) {
  const L = SB[lang] || SB.de;
  const p = (a) => a[Math.floor(rng() * a.length)];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const s = p(L.who), s2 = p(L.who.filter((x) => x !== s));
  let out;
  if (lang === 'en') {
    switch (Math.floor(rng() * 7)) {
      case 0: out = `${cap(s)} ${p(L.vt)} ${p(L.what)} ${p(L.where)}.`; break;
      case 1: out = `${p(L.when)}, ${s} ${p(L.vt)} ${p(L.what)}.`; break;
      case 2: out = `${cap(s)} ${p(L.vi)} ${p(L.where)}.`; break;
      case 3: out = `${cap(s)} ${p(L.vt)} ${p(L.what)} ${p(L.conj)} ${s2} ${p(L.vi)} ${p(L.where)}.`; break;
      case 4: out = `When ${s} ${p(L.vt)} ${p(L.what)}, ${s2} ${p(L.vi)}.`; break;
      case 5: out = `${cap(s)} ${p(L.vi)} ${p(L.where)}, and ${s2} ${p(L.vt)} ${p(L.what)}.`; break;
      default: out = `${p(L.when)}, ${s} ${p(L.vi)} ${p(L.where)}.`;
    }
  } else {
    switch (Math.floor(rng() * 7)) {
      case 0: out = `${cap(s)} ${p(L.vt)} ${p(L.what)} ${p(L.where)}.`; break;
      case 1: out = `${p(L.when)} ${p(L.vt)} ${s} ${p(L.what)}.`; break;
      case 2: out = `${cap(s)} ${p(L.vi)} ${p(L.where)}.`; break;
      // Nebensatz: Verb ans Ende
      case 3: out = `${cap(s)} ${p(L.vi)} ${p(L.where)}, ${p(L.conj)} ${s2} ${p(L.what)} ${p(L.vt)}.`; break;
      // Wenn-Satz vorne → danach Verb vor dem Subjekt
      case 4: out = `Wenn ${s} ${p(L.what)} ${p(L.vt)}, ${p(L.vi)} ${s2}.`; break;
      case 5: out = `${cap(s)} ${p(L.vi)} ${p(L.where)}, und ${s2} ${p(L.vt)} ${p(L.what)}.`; break;
      default: out = `${p(L.when)} ${p(L.vi)} ${s} ${p(L.where)}.`;
    }
  }
  return out;
}
