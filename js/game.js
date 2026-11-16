'use strict';
/* =========== Singleplayer: Kampagne =========== */

function renderCampaign() {
  const grid = $('#levelGrid');
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const unlocked = isUnlocked(i);
    const stars = save.stars[i] || 0;
    const keys = lv.sentences ? ['Aa', '.,'] : lv.caps ? ['⇧', 'Aa'] : lv.newKeys ? [...lv.newKeys].map((c) => c.toUpperCase()) : ['Kombi'];
    const btn = document.createElement('button');
    btn.className = 'level-card' + (unlocked ? '' : ' locked') + (lv.boss ? ' boss' : '');
    btn.innerHTML = `
      <div class="lc-num">${lv.boss ? '☠ BOSS' : 'LEVEL ' + (i + 1)}</div>
      <div class="lc-name">${lv.name}</div>
      <div class="lc-keys">${keys.map((k) => `<span>${k}</span>`).join('')}</div>
      <div class="lc-foot">
        <span class="lc-stars">${[0, 1, 2].map((s) => `<span class="${s < stars ? 'on' : 'off'}">★</span>`).join('')}</span>
        <span>${save.best[i] ? '🏆 ' + fmt(save.best[i]) : 'Ziel: ' + lv.wpm + ' WPM'}</span>
      </div>
      ${unlocked ? '' : '<div class="lc-lock">🔒</div>'}`;
    if (unlocked) btn.onclick = () => startLevel(i);
    grid.appendChild(btn);
  });
}

function startLevel(i) {
  const lv = LEVELS[i];
  const run = createRun({
    text: genText(lv),
    title: (lv.boss ? '☠ ' : `Level ${i + 1} · `) + lv.name,
    hint: `💡 ${lv.tip} <b>Tipp einfach los!</b>`,
    onEvent: (t, d, R) => { if (t === 'finish') finishLevel(i, d, R); },
  });
  startGame({ run, mode: 'campaign', back: 'campaign' });
}

function finishLevel(i, { wpm, acc }, R) {
  const lv = LEVELS[i];
  const passed = acc >= 90;
  const stars = passed ? 1 + (acc >= 95 && wpm >= lv.wpm ? 1 : 0) + (acc >= 98 && wpm >= lv.wpm * 1.3 ? 1 : 0) : 0;

  const bonuses = [];
  if (R.bonus.gold) bonuses.push([`Goldene Buchstaben (${R.bonus.goldCount}×)`, R.bonus.gold, true]);
  if (R.bonus.perfect) bonuses.push(['Perfekte Wörter', R.bonus.perfect, true]);
  bonuses.push([`Tempo-Bonus (${Math.round(wpm)} WPM)`, Math.round(wpm * 20)]);
  if (wpm >= lv.wpm) bonuses.push([`Tempo-Ziel ${lv.wpm} WPM erreicht`, 500]);
  bonuses.push([`Max. Streak (${R.maxStreak})`, R.maxStreak * 10]);
  if (R.errors === 0) bonuses.push(['✨ FLAWLESS – kein einziger Fehler', 1500, false, 'flawless']);
  else if (acc >= 98) bonuses.push(['Präzision 98%+', 800]);
  else if (acc >= 95) bonuses.push(['Präzision 95%+', 400]);
  if (lv.boss && R.maxStreak >= 100) bonuses.push(['☠ Boss im GODLIKE-Modus besiegt', 5000, false, 'flawless']);

  const extra = bonuses.filter((b) => !b[2]).reduce((a, b) => a + b[1], 0);
  const total = R.score + extra;

  let note = '';
  if (passed) {
    const wasLocked = i + 1 < LEVELS.length && !isUnlocked(i + 1);
    if (total > (save.best[i] || 0)) { note = '🏆 Neuer Rekord!'; save.best[i] = total; }
    save.stars[i] = Math.max(save.stars[i] || 0, stars);
    if (wasLocked && isUnlocked(i + 1)) note += ' 🔓 Nächstes Level freigeschaltet!';
  } else {
    note = 'Mindestens 90% Genauigkeit nötig, um das Level zu schaffen. Lieber langsamer und sauber!';
  }
  save.total += total;
  touchDay();
  persist();
  submitScore({ level: i, score: total, wpm, acc, maxStreak: R.maxStreak, chars: R.text.length });

  const hasNext = i + 1 < LEVELS.length && isUnlocked(i + 1);
  showResult({
    head: passed ? (stars === 3 ? 'PERFEKT!' : 'Level geschafft!') : 'Fast geschafft…',
    stars,
    stats: [['WPM', Math.round(wpm)], ['Genauigkeit', Math.floor(acc) + '%'], ['Max. Streak', R.maxStreak], ['Fehler', R.errors]],
    rows: [['Punkte aus dem Level', fmt(R.score - R.bonus.gold - R.bonus.perfect)],
      ...bonuses.map(([l, v, , cls]) => [l, '+' + fmt(v), cls])],
    total,
    note,
    actions: [
      { label: 'Menü', kbd: 'Esc', onClick: () => exitGame('campaign') },
      { label: 'Nochmal', onClick: () => startLevel(i) },
      { label: 'Weiter', kbd: 'Enter', primary: true, disabled: !hasNext, onClick: () => startLevel(i + 1) },
    ],
  });
  refreshHeader();
  if (passed) celebrate(); else Sound.lose();
}

function celebrate() {
  Sound.win();
  for (let k = 0; k < 6; k++) setTimeout(() => burst(innerWidth * Math.random(), innerHeight * 0.3, ['#ffd23f', '#7c5cff', '#00e5ff', '#ff4dd8'][k % 4], 40, 8), k * 150);
}
