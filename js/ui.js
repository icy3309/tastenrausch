'use strict';
/* =========== Navigation, Ergebnis-Fenster, Header =========== */
const UI = {
  current: 'home',
  backMap: { sp: 'home', campaign: 'sp', online: 'home' },
  enterHooks: {},
  headerFns: [],
  run: null, gameBack: 'home', gameMode: '', onExit: null,
  resultActions: [],
};

function onEnter(id, fn) { UI.enterHooks[id] = fn; }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  UI.current = id;
  document.body.dataset.screen = id;
  UI.enterHooks[id]?.();
  refreshHeader();
  Music.update();
  if (id !== 'game') window.scrollTo(0, 0);
}
function goBack() { if (UI.backMap[UI.current]) showScreen(UI.backMap[UI.current]); }

function onHeader(fn) { UI.headerFns.push(fn); }
function refreshHeader() { UI.headerFns.forEach((f) => f()); }

/* ---------- Spiel-Screen ---------- */
function startGame({ run, mode, back, onExit = null }) {
  if (UI.run && UI.run !== run) { UI.run.stop(); UI.onExit?.(); }
  UI.run = run; UI.gameMode = mode; UI.gameBack = back; UI.onExit = onExit;
  $('#game').dataset.mode = mode;
  hideResult();
  document.activeElement?.blur();
  showScreen('game');
}
/** Spiel verlassen (Esc / Menü-Button). Battles fragen vorher nach. */
function leaveGame() {
  if (UI.gameMode === 'battle' && UI.run && !UI.run.R.done && !confirm('Match wirklich verlassen? Dein Gegner gewinnt dann.')) return;
  exitGame(UI.gameBack);
}
function exitGame(screen) {
  UI.run?.stop();
  const f = UI.onExit;
  UI.run = null; UI.onExit = null;
  f?.();
  hideResult();
  document.body.classList.remove('fever');
  document.documentElement.style.setProperty('--tier', TIERS[0].color);
  showScreen(screen);
}

/* ---------- Ergebnis-Fenster ---------- */
function showResult({ head, stars = null, stats = [], rows = [], totalLabel = 'Gesamt', total = '', note = '', actions = [] }) {
  $('#resHead').textContent = head;
  const st = $('#resStars');
  st.style.display = stars === null ? 'none' : '';
  if (stars !== null) st.innerHTML = [0, 1, 2].map((s) => `<span class="${s < stars ? 'on' : ''}" style="animation-delay:${s * 0.18}s">★</span>`).join('');
  $('#resStats').innerHTML = stats.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('');
  $('#resBonus').innerHTML = rows.map(([l, v, cls]) => `<li class="${cls || ''}"><span>${l}</span><b>${v}</b></li>`).join('');
  $('#resTotalLabel').textContent = totalLabel;
  if (typeof total === 'number') countUp($('#resTotal'), total); else $('#resTotal').textContent = total;
  $('#resNote').textContent = note;
  const box = $('#resActions');
  box.innerHTML = '';
  UI.resultActions = actions;
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = a.primary ? 'primary' : 'ghost';
    b.disabled = !!a.disabled;
    b.innerHTML = esc(a.label) + (a.kbd ? ` <kbd>${a.kbd}</kbd>` : '');
    b.onclick = () => a.onClick();
    box.appendChild(b);
  }
  $('#result').classList.add('show');
}
function hideResult() { $('#result').classList.remove('show'); }
function countUp(el, target) {
  const t0 = performance.now(), dur = 900;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Modale Fenster ---------- */
function openModal(id) { $('#' + id).classList.add('show'); setTimeout(() => $('#' + id).querySelector('input')?.focus(), 50); }
function closeModal(id) { $('#' + id).classList.remove('show'); }

/** Tasten, solange ein Modal offen ist. true = Taste verbraucht. */
function modalKey(e) {
  if ($('#result').classList.contains('show')) {
    const acts = UI.resultActions;
    if (e.key === 'Enter') {
      e.preventDefault();
      const a = acts.find((x) => x.kbd === 'Enter' && !x.disabled) || acts.find((x) => !x.disabled && x.kbd !== 'Esc');
      a?.onClick();
    } else if (e.key === 'Escape') acts.find((x) => x.kbd === 'Esc')?.onClick();
    return true;
  }
  const open = document.querySelector('.modal.form.show');
  if (open) {
    if (e.key === 'Escape' && open.dataset.closable !== 'false') open.classList.remove('show');
    return true;
  }
  return false;
}
