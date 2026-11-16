'use strict';
/* =========================================================
   Singleplayer: Endlos-Modus
   Eine Zeitleiste läuft ab. Treffer füllen sie auf, Fehler
   kosten Zeit. Die Leiste läuft immer schneller ab und die
   Texte werden schwerer. Leer = Game Over.
   ========================================================= */
const ENDLESS_STAGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // Level-Indizes
const ENDLESS_BAR_MAX = 15;      // Sekunden
const ENDLESS_STAGE_CHARS = 150; // Zeichen pro Stufe
let endlessLoop = null;

function startEndless() {
  clearInterval(endlessLoop);
  let bar = ENDLESS_BAR_MAX, stage = 0, lastT = performance.now(), run;
  const stageFor = (pos) => Math.min(ENDLESS_STAGES.length - 1, Math.floor(pos / ENDLESS_STAGE_CHARS));
  const lvAt = (s) => LEVELS[ENDLESS_STAGES[s]];
  const elapsed = () => (run.R.start ? (performance.now() - run.R.start) / 1000 : 0);
  const title = (s) => `∞ Endlos · Stufe ${s + 1} – ${lvAt(s).name}`;

  run = createRun({
    text: genText(lvAt(0), Math.random, 150),
    more: () => genText(lvAt(stageFor(run.R.pos + 80)), Math.random, 120),
    title: title(0),
    hint: '⏱ Die Zeitleiste läuft ab – jeder richtige Anschlag gibt Zeit zurück, Fehler kosten Zeit. <b>Tipp los!</b>',
    onEvent(t, d, R) {
      if (t === 'hit') bar = Math.min(ENDLESS_BAR_MAX, bar + 0.55 * Math.max(0.45, 1 - elapsed() / 300));
      else if (t === 'miss') {
        bar -= 1.5;
        const tb = $('#timebar'); tb.classList.remove('hurt'); void tb.offsetWidth; tb.classList.add('hurt');
      } else if (t === 'finish') endEndless(R, d, stage);
    },
  });

  startGame({ run, mode: 'endless', back: 'sp', onExit: () => clearInterval(endlessLoop) });
  draw();

  endlessLoop = setInterval(() => {
    const now = performance.now(), dt = (now - lastT) / 1000;
    lastT = now;
    if (!run.R.start || run.R.done) return;
    bar -= dt * (1 + elapsed() / 90);
    const s = stageFor(run.R.pos);
    if (s > stage) {
      stage = s;
      announce(`STUFE ${s + 1}`, lvAt(s).name, '#00e5ff');
      Sound.stage();
      $('#lvlName').textContent = title(s);
    }
    if (bar <= 0) { bar = 0; draw(); run.finish('gameover'); return; }
    draw();
  }, 50);

  function draw() {
    const p = Math.max(0, bar / ENDLESS_BAR_MAX);
    $('#timeFill').style.width = p * 100 + '%';
    $('#timebar').classList.toggle('low', p < 0.25);
    $('#timeText').textContent = bar.toFixed(1) + ' s';
  }
}

function endEndless(R, { wpm, acc, ms }, stage) {
  clearInterval(endlessLoop);
  Sound.gameOver();
  const streakBonus = R.maxStreak * 10;
  const total = R.score + streakBonus;
  const prev = save.endlessBest || 0;
  const record = total > prev;
  save.endlessBest = Math.max(prev, total);
  save.total += total;
  touchDay();
  persist();
  submitScore({ level: -1, score: total, wpm, acc, maxStreak: R.maxStreak, chars: Math.max(1, R.pos) });

  const s = Math.floor(ms / 1000);
  showResult({
    head: 'GAME OVER',
    stats: [['WPM', Math.round(wpm)], ['Genauigkeit', Math.floor(acc) + '%'], ['Max. Streak', R.maxStreak], ['Stufe', stage + 1]],
    rows: [
      ['Überlebt', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`],
      ['Getippte Zeichen', fmt(R.pos)],
      ['Punkte', fmt(R.score)],
      [`Max. Streak (${R.maxStreak})`, '+' + fmt(streakBonus)],
    ],
    total,
    note: record ? '🏆 Neuer Endlos-Rekord!' : `Dein Rekord: ${fmt(prev)}`,
    actions: [
      { label: 'Menü', kbd: 'Esc', onClick: () => exitGame('sp') },
      { label: 'Nochmal', kbd: 'Enter', primary: true, onClick: () => startEndless() },
    ],
  });
  refreshHeader();
  if (record) setTimeout(celebrate, 1300);
}
