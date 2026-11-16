'use strict';
/* =========== Hilfsfunktionen =========== */
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('de-DE');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Deterministischer Zufallsgenerator – beide Battle-Spieler bekommen denselben Text. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========== Finger & Tastatur-Layouts =========== */
const FINGER_NAMES = {
  lp: 'Linker kleiner Finger', lr: 'Linker Ringfinger', lm: 'Linker Mittelfinger', li: 'Linker Zeigefinger',
  ri: 'Rechter Zeigefinger', rm: 'Rechter Mittelfinger', rr: 'Rechter Ringfinger', rp: 'Rechter kleiner Finger', th: 'Daumen',
};
const KB_MODS = {
  back: { k: 'back', label: '⌫', w: 2 }, tab: { k: 'tab', label: '⇥', w: 1.5 }, enter: { k: 'enter', label: '⏎', w: 1.5 },
  caps: { k: 'caps', label: '⇪', w: 1.8 }, enter2: { k: 'enter2', label: '', w: 1.2 },
  shiftL: { k: 'shiftL', label: '⇧', w: 1.3 }, shiftR: { k: 'shiftR', label: '⇧', w: 2.7 },
  space: [{ k: 'spacerL', w: 4 }, { k: ' ', label: '', w: 7 }, { k: 'spacerR', w: 4 }],
};
const LAYOUTS = {
  qwertz: {
    name: 'QWERTZ', desc: 'Deutsch / Österreich / Schweiz', umlauts: true,
    fingers: { lp: '^1qay<', lr: '2wsx', lm: '3edc', li: '45rtfgvb', ri: '67zuhjnm', rm: '8ik,', rr: '9ol.', rp: '0ßpüöä´+#-', th: ' ' },
    rows: [
      ['^', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß', '´', KB_MODS.back],
      [KB_MODS.tab, 'q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü', '+', KB_MODS.enter],
      [KB_MODS.caps, 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä', '#', KB_MODS.enter2],
      [{ ...KB_MODS.shiftL }, '<', 'y', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-', KB_MODS.shiftR],
      KB_MODS.space,
    ],
  },
  qwerty: {
    name: 'QWERTY', desc: 'Englisch (US / UK)', umlauts: false,
    fingers: { lp: '`1qaz', lr: '2wsx', lm: '3edc', li: '45rtfgvb', ri: '67yuhjnm', rm: '8ik,', rr: '9ol.', rp: "0-=p[]\;'/", th: ' ' },
    rows: [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', KB_MODS.back],
      [KB_MODS.tab, 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
      [KB_MODS.caps, 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", { k: 'enter', label: '⏎', w: 2.2 }],
      [{ ...KB_MODS.shiftL, w: 2.3 }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', KB_MODS.shiftR],
      KB_MODS.space,
    ],
  },
};
const LANGS = { de: { name: 'Deutsch', flag: '🇩🇪' }, en: { name: 'English', flag: '🇬🇧' } };

// Werden von applyLayout() gesetzt
let FINGERS = {}, KEY_FINGER = {}, KEY_ROWS = [], LEVELS = [];

/* =========== Streak-Stufen =========== */
const TIERS = [
  { at: 0, mult: 1, title: 'Leg los!', color: '#7c5cff' },
  { at: 10, mult: 2, title: 'NICE!', color: '#38d9a9' },
  { at: 25, mult: 3, title: 'KILLING SPREE', color: '#4dabf7' },
  { at: 50, mult: 4, title: 'RAMPAGE', color: '#ffa94d' },
  { at: 75, mult: 5, title: 'UNSTOPPABLE', color: '#ff6b6b' },
  { at: 100, mult: 6, title: 'GODLIKE', color: '#ffd23f' },
  { at: 150, mult: 8, title: 'LEGENDARY', color: '#ff4dd8' },
  { at: 250, mult: 10, title: 'BEYOND GODLIKE', color: '#00e5ff' },
];
const FEVER_TIER = 5; // ab GODLIKE
const tierIndex = (streak) => { let t = 0; TIERS.forEach((x, i) => { if (streak >= x.at) t = i; }); return t; };

const RANKS = [
  [0, 'Tipp-Neuling'], [5000, 'Tasten-Lehrling'], [20000, 'Finger-Akrobat'], [60000, 'Tasten-Krieger'],
  [150000, 'Tipp-Ninja'], [400000, 'Keyboard-Legende'], [1000000, 'Tipp-Gott'],
];
const rankFor = (total) => RANKS.filter(([s]) => total >= s).pop()[1];

/* =========== Level =========== */
// Tasten je Layout; {K} im Namen = die neuen Tasten
const LEVEL_DEFS = [
  { name: 'Grundreihe links', only: { qwertz: 'asdf', qwerty: 'asdf' }, wpm: 8, len: 70, tip: 'Linke Hand auf A S D F – der Zeigefinger fühlt den Huckel auf dem F.' },
  { name: 'Grundreihe rechts', only: { qwertz: 'jklö', qwerty: 'jkl;' }, wpm: 8, len: 70, tip: 'Rechte Hand auf J K L – der Zeigefinger fühlt den Huckel auf dem J.' },
  { name: 'Grundreihe komplett', add: '', wpm: 10, len: 90, tip: 'Beide Hände auf der Grundreihe, Daumen auf der Leertaste.' },
  { name: 'Die Mitte: {K}', add: 'gh', wpm: 12, len: 100, tip: 'Die Zeigefinger rutschen kurz zur Mitte und gleich zurück.' },
  { name: 'Obere Reihe: {K}', add: 'ei', wpm: 14, len: 110, tip: 'Die Mittelfinger greifen nach oben.' },
  { name: 'Obere Reihe: {K}', add: 'ru', wpm: 15, len: 120, tip: 'Die Zeigefinger greifen nach oben.' },
  { name: 'Obere Reihe: {K}', add: { qwertz: 'tz', qwerty: 'ty' }, wpm: 16, len: 120, tip: 'Zeigefinger schräg nach oben zur Mitte.' },
  { name: 'Obere Reihe: {K}', add: 'wo', wpm: 18, len: 130, tip: 'Die Ringfinger greifen nach oben.' },
  { name: 'Obere Reihe: {K}', add: { qwertz: 'qpü', qwerty: 'qp' }, wpm: 18, len: 130, tip: 'Die kleinen Finger greifen nach oben.' },
  { name: 'Untere Reihe: {K}', add: { qwertz: 'yxcv', qwerty: 'zxcv' }, wpm: 20, len: 140, tip: 'Die linke Hand greift nach unten.' },
  { name: 'Untere Reihe: {K}', add: 'bnm', wpm: 20, len: 150, tip: 'B mit dem linken, N und M mit dem rechten Zeigefinger.' },
  { name: { qwertz: 'Satzzeichen & Umlaute', qwerty: 'Satzzeichen' }, add: { qwertz: ',.äß', qwerty: ',.' }, punct: true, wpm: 22, len: 160, tip: 'Komma: rechter Mittelfinger. Punkt: rechter Ringfinger.' },
  { name: 'Großbuchstaben', add: '', punct: true, caps: true, wpm: 22, len: 170, tip: 'Shift immer mit dem kleinen Finger der ANDEREN Hand drücken!' },
  { name: 'Echte Sätze', sentences: true, wpm: 25, len: 220, tip: 'Jetzt wird es ernst: echte Sätze mit allem drum und dran.' },
  { name: 'BOSS: Godlike-Marathon', sentences: true, boss: true, wpm: 30, len: 480, tip: 'Halte den Streak bis GODLIKE – und darüber hinaus!' },
];
const forLayout = (v, layout) => (v && typeof v === 'object' ? v[layout] : v);

function buildLevels(layout) {
  let cum = '';
  return LEVEL_DEFS.map((d) => {
    const only = forLayout(d.only, layout), add = forLayout(d.add, layout) || '';
    let keys;
    if (only) { keys = only; cum += only; } else { cum += add; keys = cum; }
    const newKeys = only || add;
    const shown = [...newKeys].filter((c) => /\p{L}/u.test(c)).map((c) => c.toUpperCase());
    const name = forLayout(d.name, layout).replace('{K}', shown.length > 2 ? shown.join(' ') : shown.join(' & '));
    return { ...d, name, keys, newKeys, layout };
  });
}

/** Tastatur-Layout aktivieren (Finger, Bildschirm-Tastatur, Level). */
function applyLayout(id) {
  const L = LAYOUTS[id] || LAYOUTS.qwertz;
  KEY_ROWS = L.rows;
  FINGERS = {}; KEY_FINGER = {};
  for (const [f, keys] of Object.entries(L.fingers)) {
    FINGERS[f] = { name: FINGER_NAMES[f], keys };
    for (const k of keys) KEY_FINGER[k] = f;
  }
  KEY_FINGER.shiftL = 'lp';
  KEY_FINGER.shiftR = 'rp';
  LEVELS = buildLevels(id);
}

/* =========== Übungstexte =========== */
const TRANSLIT = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue' };
const translit = (s) => s.replace(/[äöüßÄÖÜ]/g, (c) => TRANSLIT[c]);
const capFirst = (w) => (w[0] === 'ß' ? w : w[0].toUpperCase() + w.slice(1));

/** Alle echten Wörter einer Sprache, die sich mit diesen Tasten tippen lassen. */
const _poolCache = {};
function wordPool(lang, keys, ascii) {
  const id = lang + '|' + keys + '|' + ascii;
  if (_poolCache[id]) return _poolCache[id];
  const ok = new Set(keys);
  return (_poolCache[id] = (WORDBANK[lang] || WORDBANK.de)
    .map((e) => (ascii ? { ...e, w: translit(e.w) } : e))
    .filter((e) => [...e.w].every((c) => ok.has(c))));
}

/**
 * Erzeugt Übungstext für ein Level aus echten Wörtern.
 * Mit `rng` reproduzierbar (Battles). `lang`: 'de' | 'en'.
 */
function genText(lv, rng = Math.random, len = lv.len, lang = save.lang || 'de') {
  const rand = (n) => Math.floor(rng() * n);
  const pick = (a) => a[rand(a.length)];
  const ascii = !LAYOUTS[lv.layout]?.umlauts;

  // Echte Sätze: feste Sätze gemischt mit Sätzen aus dem Baukasten (js/sentences.js).
  // Ab „Satzzeichen“ (Level 12) gibt es Sätze; ohne Shift-Level noch kleingeschrieben.
  if (lv.sentences || lv.punct) {
    const fixed = lv.sentences ? (SENTENCE_BANK[lang] || SENTENCE_BANK.de) : [];
    const pool = fixed.map((x) => (ascii ? translit(x) : x));
    for (let i = pool.length - 1; i > 0; i--) { const j = rand(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const allowed = new Set([...lv.keys, ' ', ...(lv.caps ? [...lv.keys].map((c) => c.toUpperCase()) : [])]);
    const typable = (s) => lv.sentences || [...s].every((c) => allowed.has(c));
    const out = [], recent = [];
    let i = 0, total = 0, guard = 0;
    while (total < len && guard++ < 500) {
      let s = pool.length && rng() < 0.3 ? pool[i++ % pool.length] : buildSentence(lang, rng);
      if (ascii) s = translit(s);
      if (!lv.caps && !lv.sentences) s = s.toLowerCase();
      if (recent.includes(s) || !typable(s)) continue;
      recent.push(s); if (recent.length > 30) recent.shift();
      out.push(s); total += s.length + 1;
    }
    if (out.length) return out.join(' ');
  }

  const letters = [...new Set(lv.keys)].filter((c) => /\p{L}/u.test(c));
  const focus = [...lv.newKeys].filter((c) => letters.includes(c));
  const real = wordPool(lang, letters.join(''), ascii);
  // Wörter mit den neuen Tasten kommen öfter dran
  const focused = focus.length ? real.filter((e) => focus.some((c) => e.w.includes(c))) : [];
  // Ganz am Anfang gibt es kaum echte Wörter → mit kurzen Fingerübungen auffüllen
  const drillShare = real.length >= 25 ? 0 : real.length >= 8 ? 0.25 : real.length ? 0.55 : 1;
  const drill = () => {
    const n = 2 + rand(3);
    let s = '';
    for (let i = 0; i < n; i++) s += focus.length && rng() < 0.5 ? pick(focus) : pick(letters);
    return s;
  };

  const words = [], recent = [];
  let total = 0, sentenceStart = true, sinceDot = 0;
  while (total < len) {
    let w, noun = false;
    if (rng() < drillShare) w = drill();
    else {
      let e;
      for (let t = 0; t < 6; t++) {
        e = focused.length >= 4 && rng() < 0.5 ? pick(focused) : pick(real);
        if (!recent.includes(e.w)) break;
      }
      w = e.w; noun = e.noun;
      recent.push(w); if (recent.length > 6) recent.shift();
    }
    if (lv.caps && (noun || sentenceStart)) w = capFirst(w);
    sentenceStart = false; sinceDot++;
    if (lv.punct) {
      if (sinceDot >= 4 && rng() < 0.22) { w += '.'; sentenceStart = true; sinceDot = 0; }
      else if (sinceDot >= 2 && rng() < 0.1) w += ',';
    }
    words.push(w);
    total += w.length + 1;
  }
  if (lv.punct && !/[.,]$/.test(words[words.length - 1])) words[words.length - 1] += '.';
  return words.join(' ');
}
