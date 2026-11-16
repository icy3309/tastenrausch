'use strict';
/* =========== Sound: kleiner Chiptune-Synth (WebAudio) =========== */
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const Sound = {
  ctx: null, out: null, noiseBuf: null, lastUi: 0,

  gestured: false,
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); return this.ctx; }
    // Safari: Ein AudioContext, der vor einem Klick entsteht (z.B. beim Hovern), bleibt stumm.
    if (!this.gestured) throw new Error('noch kein Klick');
    const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    this.out = c.createGain(); this.out.gain.value = 0.9;
    this.out.connect(comp).connect(c.destination);
    // 1 s weißes Rauschen für Explosionen, Wusch & Co.
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return c;
  },

  /** Ein Ton mit optionalem Pitch-Slide und Vibrato. */
  note(freq, dur, { type = 'square', vol = 0.06, when = 0, to = 0, vib = 0 } = {}) {
    if (save.muted) return;
    try {
      const c = this.init(), t = c.currentTime + when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      if (vib) {
        const l = c.createOscillator(), lg = c.createGain();
        l.frequency.value = 7; lg.gain.value = vib;
        l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.setValueAtTime(vol, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.out);
      o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  },

  /** Gefiltertes Rauschen (Explosion, Wusch, Snare). */
  noise(dur, { vol = 0.08, when = 0, from = 4000, to = 200, q = 1, type = 'lowpass' } = {}) {
    if (save.muted) return;
    try {
      const c = this.init(), t = c.currentTime + when;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf; src.loop = true;
      f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.out);
      src.start(t); src.stop(t + dur + 0.05);
    } catch {}
  },

  arp(notes, step, opts = {}) {
    notes.forEach((m, i) => m != null && this.note(midi(m), opts.dur || step * 1.1, { ...opts, when: (opts.when || 0) + i * step }));
  },

  /** Arcade-Sprecher: „GODLIKE!“ – über die Sprachausgabe des Browsers. */
  voice(text) {
    if (save.muted || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = speechSynthesis.getVoices().filter((x) => /^en/i.test(x.lang));
      u.voice = v.find((x) => /daniel|fred|alex|male|google uk/i.test(x.name)) || v[0] || null;
      u.lang = 'en-US'; u.pitch = 0.2; u.rate = 0.85; u.volume = 0.9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  },

  /* ---- Spiel ---- */
  // Jeder Treffer klettert eine Tonleiter hoch – je höher die Stufe, desto höher die Lage.
  click(t = 0, streak = 0) {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    this.note(midi(64 + t * 2 + scale[streak % 10]), 0.05, { vol: 0.028 });
  },
  perfect() { this.note(1046, 0.08, { type: 'triangle', vol: 0.04, to: 2093 }); },
  error() {
    this.note(220, 0.14, { type: 'square', vol: 0.05, to: 90 });
    this.noise(0.08, { vol: 0.04, from: 1500, to: 300 });
  },
  gold() { // Münze!
    this.note(midi(83), 0.07, { vol: 0.05 });
    this.note(midi(88), 0.28, { vol: 0.05, when: 0.07 });
  },
  shield() {
    this.arp([84, 91, 96], 0.05, { type: 'square', vol: 0.035, dur: 0.12 });
    this.note(midi(96), 0.4, { type: 'triangle', vol: 0.05, when: 0.15, vib: 12 });
  },
  tier(n) {
    const base = 60 + n * 2;
    if (n >= FEVER_TIER) {
      // Große Fanfare + Riser für GODLIKE & höher
      this.noise(0.5, { vol: 0.05, from: 300, to: 8000, type: 'bandpass', q: 2 });
      this.arp([base, base + 4, base + 7, base + 12, base + 16, base + 19, base + 24], 0.055, { vol: 0.045, dur: 0.1 });
      [0, 7, 12].forEach((iv) => this.note(midi(base + iv), 0.7, { type: 'sawtooth', vol: 0.03, when: 0.4, vib: 6 }));
      this.note(midi(base - 12), 0.7, { type: 'triangle', vol: 0.09, when: 0.4 });
    } else {
      this.arp([base, base + 4, base + 7, base + 12], 0.06, { vol: 0.045, dur: 0.1 });
      this.note(midi(base + 12), 0.3, { type: 'triangle', vol: 0.06, when: 0.24, vib: 8 });
    }
    if (n > 0 && TIERS[n]) this.voice(TIERS[n].title);
  },
  breaker() {
    this.noise(0.5, { vol: 0.12, from: 3000, to: 80 });
    this.note(400, 0.5, { type: 'sawtooth', vol: 0.06, to: 50 });
    this.voice('Combo breaker');
  },
  stage() {
    this.arp([72, 76, 79, 84, 88], 0.05, { vol: 0.04, dur: 0.09 });
    this.note(midi(91), 0.3, { type: 'triangle', vol: 0.05, when: 0.25, vib: 10 });
  },
  attack() {
    this.noise(0.45, { vol: 0.1, from: 200, to: 5000, type: 'bandpass', q: 3 });
    this.note(180, 0.4, { type: 'sawtooth', vol: 0.05, to: 60 });
  },
  win() {
    const m = [72, 76, 79, 84, null, 79, 84];
    this.arp(m, 0.11, { vol: 0.05, dur: 0.12 });
    this.note(midi(88), 0.6, { vol: 0.05, when: 0.77, vib: 10 });
    [48, 52, 55, 60].forEach((b, i) => this.note(midi(b), 0.22, { type: 'triangle', vol: 0.09, when: i * 0.22 }));
    this.note(midi(48), 0.6, { type: 'triangle', vol: 0.09, when: 0.88 });
  },
  lose() { // wah wah wah waaah
    [67, 66, 65].forEach((m, i) => this.note(midi(m), 0.32, { type: 'triangle', vol: 0.08, when: i * 0.36 }));
    this.note(midi(64), 0.9, { type: 'triangle', vol: 0.08, when: 1.08, vib: 8 });
  },
  gameOver() {
    this.noise(0.6, { vol: 0.1, from: 2500, to: 60 });
    this.arp([76, 72, 67, 64, 60, 55], 0.1, { vol: 0.05, dur: 0.12, when: 0.1 });
    this.note(midi(48), 0.8, { type: 'triangle', vol: 0.1, when: 0.7, vib: 5 });
    this.voice('Game over');
  },
  countdown() { this.note(midi(69), 0.14, { vol: 0.06 }); },
  go() {
    this.note(midi(81), 0.4, { vol: 0.06, vib: 10 });
    this.note(midi(57), 0.4, { type: 'triangle', vol: 0.1 });
  },
  beep(hi) { hi ? this.go() : this.countdown(); },
  notify() { this.arp([79, 84, 88], 0.07, { vol: 0.045, dur: 0.12 }); },

  /* ---- Menü ---- */
  hover() {
    const n = performance.now();
    if (n - this.lastUi < 40) return;
    this.lastUi = n;
    this.note(midi(84), 0.03, { vol: 0.015 });
  },
  select() { this.note(midi(76), 0.05, { vol: 0.035 }); this.note(midi(83), 0.08, { vol: 0.035, when: 0.05 }); },
  denied() { this.note(midi(52), 0.12, { vol: 0.04 }); this.note(midi(47), 0.16, { vol: 0.04, when: 0.1 }); },
};
// Stimmen werden in manchen Browsern erst nachgeladen
if (window.speechSynthesis) speechSynthesis.getVoices();

/* =========== Partikel =========== */
const fxCanvas = $('#fx'), fctx = fxCanvas.getContext('2d');
let particles = [], fxRunning = false;
function resizeFx() { fxCanvas.width = innerWidth * devicePixelRatio; fxCanvas.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resizeFx); resizeFx();
function burst(x, y, color, n = 8, power = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random()) * power;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.4, life: 1, color, size: 2 + Math.random() * 3 });
  }
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(tickFx); }
}
function tickFx() {
  const d = devicePixelRatio;
  fctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.025;
    fctx.globalAlpha = Math.max(p.life, 0);
    fctx.fillStyle = p.color;
    fctx.fillRect(p.x * d, p.y * d, p.size * d, p.size * d);
  }
  fctx.globalAlpha = 1;
  if (particles.length) requestAnimationFrame(tickFx); else fxRunning = false;
}

/* =========== Text-Effekte =========== */
function floatText(text, x, y, color, big = false) {
  const el = document.createElement('div');
  el.className = 'float' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), big ? 1400 : 900);
}
function shake(big) {
  const el = $('#game');
  el.classList.remove('shake', 'shake-big'); void el.offsetWidth;
  el.classList.add(big ? 'shake-big' : 'shake');
}
/**
 * Große Einblendung („GODLIKE“). Im Spiel landet sie nicht mehr mitten auf dem Text,
 * sondern unter der Bildschirm-Tastatur – oder, wenn dort kein Platz ist, über ihr.
 * `center: true` = klassisch bildschirmfüllend (z.B. Countdown, bei dem man noch nicht tippt).
 */
function announce(title, sub, color, { center = false } = {}) {
  const a = $('#announce');
  a.style.setProperty('--tier', color);
  $('#aTitle').textContent = title; $('#aSub').textContent = sub || '';
  a.classList.remove('show', 'zone');
  a.style.top = a.style.height = a.style.fontSize = '';
  const trainer = document.querySelector('#game .trainer');
  if (!center && UI.current === 'game' && trainer) {
    const t = trainer.getBoundingClientRect();
    const below = innerHeight - t.bottom;
    const [top, h] = below >= 100 ? [t.bottom, below] : [Math.max(t.top, 0), Math.min(t.height, innerHeight - Math.max(t.top, 0))];
    a.classList.add('zone');
    a.style.top = top + 'px';
    a.style.height = h + 'px';
    // Schrift passt sich der Höhe und der Wortlänge an
    const byHeight = h * (sub ? 0.42 : 0.6), byWidth = (innerWidth * 0.9) / (Math.max(title.length, 4) * 0.82);
    a.style.fontSize = Math.round(Math.max(26, Math.min(80, byHeight, byWidth))) + 'px';
  }
  void a.offsetWidth; a.classList.add('show');
}

/* =========== Toasts =========== */
function toast(html, actions = [], ms = 6000) {
  const box = document.createElement('div');
  box.className = 'toast';
  box.innerHTML = `<div class="toast-msg">${html}</div>`;
  const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'toast-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = a.primary ? 'primary' : 'ghost';
      b.textContent = a.label;
      b.onclick = () => { close(); a.onClick?.(); };
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  $('#toasts').appendChild(box);
  if (ms) setTimeout(close, ms);
  return close;
}
