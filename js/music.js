'use strict';
/* =========================================================
   Menü-Musik: entspannter Chiptune-House-Loop, live erzeugt.
   120 BPM, 64 Takte (~2 min) in 8 Teilen: Intro, Groove, Thema,
   Breakdown, Drop, Thema hoch, Groove 2, Outro – mit zufälligen
   Kleinigkeiten (Ghost-Kicks, Hihat-Dynamik, Arp-Sprünge).
   Läuft in allen Menüs, blendet im Spiel aus.
   ========================================================= */
const _ = null;
const Music = {
  BPM: 120,
  bus: null, duck: null, filter: null,
  timer: null, nextTime: 0, step: 0, active: false, unlocked: false,

  /* ---------- Harmonien (je ein Takt pro Akkord) ---------- */
  PROG: {
    A: { chords: [[57, 60, 64, 67, 71], [57, 60, 64, 65, 69], [55, 59, 60, 64, 67], [55, 59, 62, 64, 66]], bass: [45, 41, 48, 43] }, // Am9 Fmaj7 Cmaj7 G6
    B: { chords: [[57, 60, 64, 65, 67], [55, 59, 62, 64, 67], [57, 60, 62, 64, 65], [56, 59, 62, 64, 68]], bass: [41, 40, 38, 40] }, // Fmaj9 Em7 Dm9 E7
  },

  /* ---------- Melodien (16tel pro Takt, _ = Pause) ---------- */
  MEL: {
    A: [
      [76, _, _, 79, _, _, 76, _, 74, _, 72, _, _, _, _, _],
      [72, _, _, 74, _, _, 76, _, _, _, 69, _, _, _, _, _],
      [71, _, _, 72, _, _, 74, _, 76, _, 79, _, _, 76, _, _],
      [74, _, _, _, 71, _, _, _, 74, _, 76, _, _, _, _, _],
      // zweite Hälfte der Phrase: anderes Ende
      [76, _, _, 79, _, _, 81, _, 79, _, 76, _, _, 74, _, _],
      [72, _, _, 74, _, _, 76, _, _, _, 77, _, 76, _, _, _],
      [74, _, 76, _, 79, _, _, _, 76, _, 74, _, 72, _, _, _],
      [71, _, _, _, _, _, _, _, 67, _, 69, _, 71, _, 74, _],
    ],
    B: [
      [72, _, _, 76, _, _, 77, _, 76, _, 72, _, _, _, _, _],
      [71, _, _, 74, _, _, 76, _, _, _, 79, _, 76, _, _, _],
      [77, _, _, 76, _, _, 74, _, 72, _, 74, _, _, _, _, _],
      [71, _, _, _, 68, _, _, _, 71, _, 74, _, 76, _, _, _],
      [72, _, 74, _, 76, _, 77, _, 79, _, _, _, 77, _, 76, _],
      [74, _, _, 76, _, _, 79, _, _, _, 83, _, 79, _, _, _],
      [81, _, _, 79, _, _, 77, _, 76, _, 74, _, 72, _, _, _],
      [71, _, _, _, 74, _, _, _, 76, _, _, _, _, _, _, _],
    ],
  },

  /* ---------- Songaufbau: 8 Teile à 8 Takte ≈ 2 Minuten, dann von vorn ----------
     kick/clap: Drums · hats: off|16|shuffle|shaker|- · bass: off|walk|pad
     stabs: house|sparse|- · pad: lange Flächen · lead: Melodie (+12 = Oktave höher)
     filter: [Anfang, Ende] in Hz · fill: Drum-Fill im letzten Takt · riser: Rauschen hoch */
  SONG: [
    { name: 'Intro',     prog: 'A', hats: 'off',     bass: 'pad',  pad: true, stabs: 'sparse', filter: [1400, 3000] },
    { name: 'Groove',    prog: 'A', kick: true, clap: true, hats: 'off', bass: 'off', stabs: 'house', filter: [1600, 3200], fill: true },
    { name: 'Thema',     prog: 'A', kick: true, clap: true, hats: '16',  bass: 'off', stabs: 'house', lead: 'A', filter: [3500, 4500], fill: true },
    { name: 'Breakdown', prog: 'B', hats: 'shaker',  bass: 'pad',  pad: true, arp: true, filter: [2000, 4500], riser: true },
    { name: 'Drop',      prog: 'B', kick: true, clap: true, hats: 'shuffle', bass: 'walk', stabs: 'house', lead: 'B', perc: true, filter: [5000, 5000], fill: true },
    { name: 'Thema hoch',prog: 'A', kick: true, clap: true, hats: '16', bass: 'walk', stabs: 'sparse', lead: 'A', up: 12, arp: true, perc: true, filter: [5000, 5000], fill: true },
    { name: 'Groove 2',  prog: 'B', kick: true, clap: true, hats: 'shuffle', bass: 'off', stabs: 'house', arp: true, filter: [4500, 2200], fill: true },
    { name: 'Outro',     prog: 'A', kick: true, hats: 'off', bass: 'off', stabs: 'sparse', pad: true, filter: [3000, 1400] },
  ],

  get enabled() { return !save.muted && save.music !== false; },

  setup() {
    const c = Sound.init();
    if (this.bus) return c;
    this.bus = c.createGain(); this.bus.gain.value = 0;
    this.duck = c.createGain(); // „Sidechain“: pumpt bei jeder Kick
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 2400;
    this.duck.connect(this.filter).connect(this.bus).connect(Sound.out);
    return c;
  },

  /** Nach jedem Screenwechsel / Mute-Klick aufrufen. */
  update() {
    const want = this.enabled && this.unlocked && UI.current !== 'game' && !document.hidden;
    if (want === this.active) return;
    this.active = want;
    const c = this.setup(), t = c.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    if (want) {
      this.bus.gain.linearRampToValueAtTime(1.1, t + 1);
      if (!this.timer) {
        this.nextTime = t + 0.1;
        this.timer = setInterval(() => this.schedule(), 50);
      }
    } else {
      this.bus.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => { if (!this.active) { clearInterval(this.timer); this.timer = null; } }, 700);
    }
  },

  schedule() {
    const c = Sound.ctx, s16 = 60 / this.BPM / 4, total = this.SONG.length * 128;
    // Hing der Browser kurz (Tab im Hintergrund, viel Last), verpasste Schritte
    // überspringen statt sie alle auf einmal nachzuspielen – das klang „stückelig“.
    if (this.nextTime < c.currentTime) {
      const missed = Math.ceil((c.currentTime - this.nextTime) / s16);
      this.step = (this.step + missed) % total;
      this.nextTime += missed * s16;
    }
    // 0,3 s Vorlauf: kleine Ruckler im Browser hört man so nicht
    while (this.nextTime < c.currentTime + 0.3) {
      // leichter Swing auf den 16tel-Offbeats – klingt lockerer
      const swing = this.step % 2 ? s16 * 0.08 : 0;
      this.playStep(this.step, this.nextTime + swing);
      this.nextTime += s16;
      this.step = (this.step + 1) % total; // Position bleibt beim Wiederkommen ins Menü erhalten
    }
  },

  playStep(step, t) {
    const sec = this.SONG[Math.floor(step / 128)];
    const barIn = Math.floor(step / 16) % 8, s = step % 16, bar = barIn % 4;
    const P = this.PROG[sec.prog], chord = P.chords[bar], root = P.bass[bar];
    const lastBar = barIn === 7, rnd = Math.random();

    // Filterfahrt über den ganzen Teil
    if (s === 0) {
      const [a, b] = sec.filter;
      this.filter.frequency.setTargetAtTime(a + (b - a) * (barIn / 7), t, 0.6);
    }

    // --- Drums ---
    const fillNow = sec.fill && lastBar && s >= 12;
    if (sec.kick && s % 4 === 0 && !(fillNow && s > 12)) this.kick(t);
    if (sec.kick && s === 14 && rnd < 0.12) this.kick(t, 0.5); // gelegentlicher Ghost-Kick
    if (sec.clap && (s === 4 || s === 12) && !fillNow) this.clap(t);
    if (fillNow) this.tom(t, s); // kleiner Chiptune-Fill
    this.hats(sec.hats, s, t, rnd);
    if (sec.perc && (s === 3 || s === 11 || (s === 7 && rnd < 0.4))) this.rim(t);
    if (sec.riser && barIn === 6 && s === 0) this.riser(t, (60 / this.BPM) * 8);

    // --- Bass ---
    if (sec.bass === 'off' && (s % 4 === 2 || (s === 15 && rnd < 0.6))) this.bass(root + (s === 15 ? 12 : 0), t);
    if (sec.bass === 'walk') {
      const walk = { 2: 0, 6: 0, 10: 12, 13: 7, 14: 12 };
      if (walk[s] != null) this.bass(root + walk[s], t);
    }
    if (sec.bass === 'pad' && s === 0) this.subPad(root, t);

    // --- Akkorde ---
    if (sec.stabs === 'house' && [0, 3, 6, 10].includes(s)) this.stab(chord, t, s === 0 ? 0.4 : 0.18);
    if (sec.stabs === 'sparse' && (s === 0 || (s === 10 && bar % 2))) this.stab(chord, t, 0.5);
    if (sec.pad && s === 0) this.pad(chord, t);
    if (sec.arp && s % 2 === 0) {
      const pattern = [0, 2, 4, 1, 3, 2, 4, 1];
      const n = chord[pattern[(s / 2) % 8] % chord.length] + 12 + (rnd < 0.1 ? 12 : 0);
      this.arp(n, t);
    }

    // --- Melodie ---
    if (sec.lead) {
      const m = this.MEL[sec.lead][barIn][s];
      if (m) this.lead(m + (sec.up || 0), t);
    }
  },

  /* ---------- Instrumente ---------- */
  voice(type, freq, t, dur, vol, dest = this.duck) {
    const c = Sound.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  kick(t, vel = 1) {
    const c = Sound.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.38 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.35);
    // Sidechain-Pumpen: alles andere kurz leiser
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(0.6, t);
    this.duck.gain.linearRampToValueAtTime(1, t + 0.2);
  },
  noise(t, dur, vol, type, freq, q = 1) {
    const c = Sound.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = Sound.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.bus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  },
  hat(t, vol, dur) { this.noise(t, dur, vol, 'highpass', 8000); },
  hats(kind, s, t, rnd) {
    const v = 0.8 + rnd * 0.4; // leicht wechselnde Lautstärke = lebendiger
    if (kind === 'off' && s % 4 === 2) this.hat(t, 0.028 * v, 0.08);
    if (kind === '16') { if (s % 4 === 2) this.hat(t, 0.028 * v, 0.08); else if (s % 2) this.hat(t, 0.009 * v, 0.03); }
    if (kind === 'shuffle') { if (s % 4 === 2) this.hat(t, 0.026 * v, 0.1); else if (s % 4 === 3 || (s % 4 === 1 && rnd < 0.5)) this.hat(t, 0.01 * v, 0.03); }
    if (kind === 'shaker' && s % 2 === 0) this.noise(t, 0.05, (s % 4 === 2 ? 0.018 : 0.008) * v, 'bandpass', 6000, 2);
  },
  clap(t) { [0, 0.012, 0.024].forEach((d) => this.noise(t + d, 0.11, 0.045, 'bandpass', 1400, 1.5)); },
  rim(t) { this.voice('triangle', 1700, t, 0.03, 0.025, this.bus); this.noise(t, 0.02, 0.012, 'bandpass', 3000, 4); },
  tom(t, s) { // absteigender 8-Bit-Tom-Fill
    const c = Sound.ctx, o = c.createOscillator(), g = c.createGain(), f = 260 - (s - 12) * 40;
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.12);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.16);
  },
  riser(t, dur) {
    const c = Sound.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = Sound.noiseBuf; src.loop = true; f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + dur * 0.95); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f).connect(g).connect(this.bus); src.start(t); src.stop(t + dur + 0.05);
  },
  /** Weiche Fläche mit langsamem Ein- und Ausblenden über einen Takt. */
  pad(chord, t) {
    const c = Sound.ctx, dur = (60 / this.BPM) * 4;
    chord.forEach((m, i) => [0.997, 1.003].forEach((det) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = midi(m) * det;
      const v = o.type === 'sawtooth' ? 0.012 : 0.028;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(v * 0.7, t + dur * 0.85); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
      o.connect(g).connect(this.duck); o.start(t); o.stop(t + dur * 1.1);
    }));
  },
  subPad(m, t) {
    const c = Sound.ctx, dur = (60 / this.BPM) * 4, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = midi(m - 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.duck); o.start(t); o.stop(t + dur + 0.05);
  },
  bass(m, t) {
    this.voice('square', midi(m), t, 0.2, 0.07);
    this.voice('sine', midi(m - 12), t, 0.25, 0.16);
  },
  stab(chord, t, dur) {
    chord.forEach((m) => {
      this.voice('square', midi(m) * 1.003, t, dur, 0.012);
      this.voice('triangle', midi(m), t, dur, 0.03);
    });
  },
  arp(m, t) { this.voice('square', midi(m), t, 0.09, 0.012); },
  lead(m, t) {
    const o = this.voice('square', midi(m), t, 0.38, 0.03);
    const c = Sound.ctx, l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = 6; lg.gain.value = 5; l.connect(lg).connect(o.frequency);
    l.start(t + 0.08); l.stop(t + 0.45);
    this.voice('triangle', midi(m + 12), t + 0.19, 0.25, 0.012); // Echo
  },
};

// Browser erlauben Ton erst nach einer echten Interaktion. Safari ist dabei
// besonders streng: AudioContext erst im Klick erzeugen, fortsetzen und
// einen stillen Puffer abspielen. So lange versuchen, bis der Ton läuft.
const AUDIO_UNLOCK_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'click', 'touchend', 'keydown'];
function unlockAudio() {
  try {
    Sound.gestured = true;
    const c = Sound.init();
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination); src.start(0);
    Music.unlocked = true;
    Music.update();
    if (c.state === 'running') AUDIO_UNLOCK_EVENTS.forEach((ev) => removeEventListener(ev, unlockAudio, true));
    else c.resume().then(() => Music.update()).catch(() => {});
  } catch (e) { console.warn('Audio:', e.message); }
}
AUDIO_UNLOCK_EVENTS.forEach((ev) => addEventListener(ev, unlockAudio, true));
// Safari pausiert Audio im Hintergrund-Tab („interrupted“) → beim Zurückkehren fortsetzen
// Im Hintergrund-Tab pausiert die Musik und läuft beim Zurückkommen sauber weiter.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Sound.ctx && Sound.ctx.state !== 'running') Sound.ctx.resume().catch(() => {});
  if (Music.unlocked) Music.update();
});
