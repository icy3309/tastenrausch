'use strict';
/* =========================================================
   Tipp-Engine – von Kampagne, Endlos und Battles genutzt.
   createRun() steuert Text, Streaks, Multiplikator, Gold,
   Schilde, HUD & Bildschirm-Tastatur und meldet Events:
   'hit', 'miss', 'tier', 'progress', 'finish'.
   ========================================================= */
const KEY_EL = {};

function buildKeyboard() {
  const kb = $('#keyboard');
  kb.innerHTML = '';
  for (const k in KEY_EL) delete KEY_EL[k];
  for (const row of KEY_ROWS) {
    const r = document.createElement('div');
    r.className = 'krow';
    for (const def of row) {
      const d = typeof def === 'string' ? { k: def, label: def.toUpperCase(), w: 1 } : def;
      const el = document.createElement('div');
      el.className = 'key';
      el.style.flexGrow = d.w || 1;
      if (d.k.startsWith('spacer')) el.classList.add('ghost-key');
      if (d.label !== undefined && d.k.length > 1) el.classList.add('mod');
      el.textContent = d.label ?? '';
      const f = KEY_FINGER[d.k];
      if (f) el.dataset.f = f;
      if (d.k === 'f' || d.k === 'j') el.classList.add('bump');
      KEY_EL[d.k] = el;
      r.appendChild(el);
    }
    kb.appendChild(r);
  }
}

function createRun(opts) {
  const o = Object.assign({
    text: '', rng: Math.random, more: null, timeLimit: 0, autoStart: true,
    hint: '', title: '', goldRate: 0.035, onEvent: () => {},
  }, opts);

  const R = {
    text: '', gold: new Set(), spans: [], pos: 0, errors: 0, streak: 0, maxStreak: 0, score: 0,
    tier: 0, shields: 0, start: 0, wordErr: false, wordLen: 0, errAt: new Set(), done: false, locked: false,
    bonus: { gold: 0, perfect: 0, shieldSaves: 0, goldCount: 0 },
  };
  const inner = $('#textInner');
  let curWord = null, timer = null;
  const emit = (t, d = {}) => o.onEvent(t, d, R);

  /* ---------- Text ---------- */
  function appendText(str) {
    const from = R.text.length;
    R.text += (R.text ? ' ' : '') + str;
    for (let k = Math.max(from, 5); k < R.text.length; k++) if (R.text[k] !== ' ' && o.rng() < o.goldRate) R.gold.add(k);
    for (let i = from; i < R.text.length; i++) {
      const c = R.text[i];
      const s = document.createElement('span');
      s.className = 'ch' + (R.gold.has(i) ? ' gold' : '');
      if (c === ' ') {
        s.classList.add('sp'); s.textContent = ' ';
        inner.appendChild(s); curWord = null;
      } else {
        if (!curWord) { curWord = document.createElement('span'); curWord.className = 'word'; inner.appendChild(curWord); }
        s.textContent = c; curWord.appendChild(s);
      }
      R.spans.push(s);
    }
  }

  /* ---------- Werte ---------- */
  function stats() {
    let ms = R.start ? performance.now() - R.start : 0;
    if (o.timeLimit) ms = Math.min(ms, o.timeLimit * 1000);
    const mins = ms / 60000;
    return {
      ms,
      wpm: mins > 0.02 ? R.pos / 5 / mins : 0,
      acc: R.pos + R.errors ? (R.pos / (R.pos + R.errors)) * 100 : 100,
    };
  }
  function updateHUD() {
    const { ms, wpm, acc } = stats();
    $('#score').textContent = fmt(R.score);
    $('#wpm').textContent = Math.round(wpm);
    $('#acc').textContent = Math.floor(acc) + '%';
    const s = o.timeLimit ? Math.max(0, Math.ceil(o.timeLimit - ms / 1000)) : Math.floor(ms / 1000);
    $('#time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('#timeLabelHud').textContent = o.timeLimit ? 'Restzeit' : 'Zeit';
    if (o.timeLimit && R.start && !R.done && ms >= o.timeLimit * 1000) finish('time');
  }
  function updateCombo() {
    const t = tierIndex(R.streak), tier = TIERS[t], next = TIERS[t + 1];
    document.documentElement.style.setProperty('--tier', tier.color);
    document.body.classList.toggle('fever', t >= FEVER_TIER && !R.done);
    $('#streak').textContent = R.streak;
    $('#mult').textContent = '×' + tier.mult;
    $('#tierTitle').textContent = R.streak === 0 && R.start ? 'Neuer Anlauf!' : tier.title;
    if (next) {
      $('#tierBar').style.width = ((R.streak - tier.at) / (next.at - tier.at)) * 100 + '%';
      $('#tierNext').textContent = `Noch ${next.at - R.streak} bis ${next.title} (×${next.mult})`;
    } else {
      $('#tierBar').style.width = '100%';
      $('#tierNext').textContent = 'Maximale Stufe erreicht – unaufhaltsam!';
    }
    $('#shields').innerHTML = [0, 1, 2].map((k) => `<span class="${k < R.shields ? '' : 'off'}">🛡</span>`).join('');
  }

  /* ---------- Ziel-Taste & Finger ---------- */
  function activateFinger(f) {
    if (!f) return;
    document.querySelectorAll(`.hand .f[data-f="${f}"]`).forEach((e) => {
      if (f === 'th' || (f[0] === 'l') === e.closest('.hand').classList.contains('left')) e.classList.add('active');
    });
  }
  function updateTarget() {
    document.querySelectorAll('.key.target, .hand .f.active').forEach((e) => e.classList.remove('target', 'active'));
    R.spans[R.pos - 1]?.classList.remove('cur');
    if (R.done || R.pos >= R.text.length) { $('#fingerHint').innerHTML = '&nbsp;'; return; }
    const ch = R.text[R.pos];
    const span = R.spans[R.pos];
    span.classList.add('cur');

    const lh = parseFloat(getComputedStyle(inner).lineHeight);
    inner.style.transform = `translateY(${-Math.max(0, Math.round(span.offsetTop / lh) - 1) * lh}px)`;

    const base = ch.toLowerCase();
    const f = KEY_FINGER[base];
    KEY_EL[base]?.classList.add('target');
    activateFinger(f);
    let hint = `<b style="--fc:var(--${f})">${FINGERS[f]?.name || ''}</b>`;
    if (ch !== base) {
      const shiftKey = f && f.startsWith('l') ? 'shiftR' : 'shiftL';
      KEY_EL[shiftKey].classList.add('target');
      activateFinger(KEY_FINGER[shiftKey]);
      hint += ` + <b style="--fc:var(--${KEY_FINGER[shiftKey]})">${shiftKey === 'shiftR' ? 'rechte' : 'linke'} Shift-Taste</b>`;
    }
    $('#fingerHint').innerHTML = hint;
  }
  function flashKey(k, cls) {
    const el = KEY_EL[k] || KEY_EL[k.toLowerCase()];
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 130);
  }

  /* ---------- Eingabe ---------- */
  function key(e) {
    if (R.done || R.locked) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    e.preventDefault();
    if (!R.start) { if (!o.autoStart) return; startClock(); }
    if (e.key === R.text[R.pos]) hit(e.key); else miss(e.key);
  }
  function startClock() {
    R.start = performance.now();
    $('#startHint').classList.add('hide');
  }

  function hit(k) {
    const i = R.pos, ch = R.text[i], span = R.spans[i];
    const rect = span.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;

    R.streak++;
    R.maxStreak = Math.max(R.maxStreak, R.streak);
    const t = tierIndex(R.streak), tier = TIERS[t];
    let pts = 10 * tier.mult;

    if (R.gold.has(i)) {
      const g = 100 * tier.mult;
      pts += g; R.bonus.gold += g; R.bonus.goldCount++;
      floatText(`GOLD +${g}`, cx, cy - 20, '#ffd23f');
      burst(cx, cy, '#ffd23f', 22, 5);
      Sound.gold();
    }

    if (ch !== ' ') R.wordLen++;
    if (ch === ' ' || i === R.text.length - 1) {
      if (!R.wordErr && R.wordLen >= 3) {
        const b = R.wordLen * 5 * tier.mult;
        pts += b; R.bonus.perfect += b;
        floatText(`PERFEKT +${b}`, cx, cy - 34, tier.color);
        Sound.perfect();
      }
      R.wordErr = false; R.wordLen = 0;
    }

    R.score += pts;
    span.classList.add('done');
    if (R.errAt.has(i)) span.classList.add('fixed');

    if (R.streak % 50 === 0 && R.shields < 3) {
      R.shields++;
      floatText('🛡 SCHILD +1', cx, cy - 48, '#00e5ff');
      Sound.shield();
    }

    if (t > R.tier) {
      R.tier = t;
      announce(tier.title, `×${tier.mult} Multiplikator`, tier.color);
      Sound.tier(t);
      shake(t >= FEVER_TIER);
      for (let n = 0; n < 4; n++) burst(innerWidth * (0.2 + n * 0.2), innerHeight * 0.45, tier.color, 30, 7);
      const m = $('#mult'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
      emit('tier', { t, tier });
    }

    burst(cx, cy, tier.color, 3 + t, 1.5 + t * 0.4);
    Sound.click(t, R.streak);
    flashKey(k, 'hit');

    R.pos++;
    if (o.more && R.text.length - R.pos < 80) appendText(o.more());
    updateCombo();
    const sc = $('#score'); sc.classList.remove('pump'); void sc.offsetWidth; sc.classList.add('pump');
    emit('hit', { pts });
    emit('progress');
    if (R.pos >= R.text.length) finish('done');
    else updateTarget();
  }

  function miss(k) {
    R.errors++;
    R.wordErr = true;
    R.errAt.add(R.pos);
    const span = R.spans[R.pos];
    span.classList.remove('wrong'); void span.offsetWidth; span.classList.add('wrong');
    flashKey(k, 'miss');
    const rect = span.getBoundingClientRect();

    if (R.shields > 0 && R.streak >= 10) {
      R.shields--; R.bonus.shieldSaves++;
      floatText('🛡 GERETTET!', rect.left, rect.top - 20, '#00e5ff');
      Sound.shield();
    } else {
      if (R.streak >= 25) {
        announce('COMBO BREAKER', `Streak von ${R.streak} verloren`, '#ff4d6d');
        Sound.breaker();
      } else Sound.error();
      R.streak = 0; R.tier = 0;
      shake(false);
    }
    updateCombo();
    emit('miss');
    emit('progress');
  }

  /** Verbraucht ein Schild (z.B. um einen Battle-Angriff abzuwehren). */
  function useShield() {
    if (R.shields <= 0) return false;
    R.shields--;
    updateCombo();
    return true;
  }

  function finish(reason) {
    if (R.done) return;
    R.done = true;
    clearInterval(timer);
    updateHUD();
    updateTarget();
    document.body.classList.remove('fever');
    emit('finish', { reason, ...stats() });
  }
  function stop() {
    R.done = true;
    clearInterval(timer);
    document.body.classList.remove('fever');
  }

  /* ---------- Start ---------- */
  inner.innerHTML = '';
  inner.style.transform = '';
  appendText(o.text);
  $('#lvlName').textContent = o.title;
  $('#startHint').innerHTML = o.hint;
  $('#startHint').classList.toggle('hide', !o.hint);
  document.body.classList.remove('fever');
  updateHUD(); updateCombo(); updateTarget();
  timer = setInterval(updateHUD, 250);

  return {
    R, key, finish, stop, stats, appendText, startClock, useShield,
    lock: (b) => { R.locked = b; },
  };
}
