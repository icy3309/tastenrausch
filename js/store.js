'use strict';
/* =========== Lokaler Spielstand (localStorage) =========== */
const SAVE_KEY = 'tastenrausch-v1';
const browserDE = /^de\b/i.test(navigator.language || '');
const saveDefaults = () => ({
  best: {}, stars: {}, total: 0, dayStreak: 0, lastDay: null, muted: false, endlessBest: 0,
  lang: browserDE ? 'de' : 'en', layout: browserDE ? 'qwertz' : 'qwerty',
});
const save = (() => {
  try { return Object.assign(saveDefaults(), JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch { return saveDefaults(); }
})();
applyLayout(save.layout);

const persist = () => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
  if (typeof cloudSave === 'function') cloudSave(); // Online-Sicherung (net.js), falls eingeloggt
};

/** Zwei Spielstände zusammenführen: pro Level das Beste, sonst das Höhere. */
function mergeSave(a, b) {
  const out = { best: {}, stars: {} };
  for (const k of ['best', 'stars']) {
    const keys = new Set([...Object.keys(a[k] || {}), ...Object.keys(b[k] || {})]);
    keys.forEach((i) => { out[k][i] = Math.max(a[k]?.[i] || 0, b[k]?.[i] || 0); });
  }
  out.total = Math.max(a.total || 0, b.total || 0);
  out.endlessBest = Math.max(a.endlessBest || 0, b.endlessBest || 0);
  const [newer, older] = (a.lastDay || '') >= (b.lastDay || '') ? [a, b] : [b, a];
  out.lastDay = newer.lastDay || null;
  out.dayStreak = newer.dayStreak || 0;
  // Gestern auf dem einen, heute auf dem anderen Gerät gespielt → Streak läuft weiter
  if (newer.lastDay && older.lastDay && older.lastDay === new Date(new Date(newer.lastDay).getTime() - 864e5).toISOString().slice(0, 10))
    out.dayStreak = Math.max(out.dayStreak, (older.dayStreak || 0) + 1);
  return out;
}
const cloudFields = (s) => ({ best: s.best, stars: s.stars, total: s.total, endlessBest: s.endlessBest, lastDay: s.lastDay, dayStreak: s.dayStreak });

const dayStr = (offset = 0) => new Date(Date.now() - offset * 864e5).toLocaleDateString('sv');
function touchDay() {
  const today = dayStr();
  if (save.lastDay === today) return;
  save.dayStreak = save.lastDay === dayStr(1) ? save.dayStreak + 1 : 1;
  save.lastDay = today;
}
const currentDayStreak = () => (save.lastDay === dayStr() || save.lastDay === dayStr(1) ? save.dayStreak : 0);
const isUnlocked = (i) => i === 0 || (save.stars[i - 1] || 0) >= 1;
