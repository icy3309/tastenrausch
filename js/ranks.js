'use strict';
/* =========================================================
   Ränge: Dropdown in der Kopfleiste (alle Ränge, Anteil der
   Spieler, was zum Aufstieg fehlt) und Vollbild-Animation
   beim Rank-Up.
   ========================================================= */
const RANK_META = [
  { icon: '🐣', color: '#9aa4d6' },
  { icon: '🔨', color: '#38d9a9' },
  { icon: '🤸', color: '#4dabf7' },
  { icon: '⚔️', color: '#ffa94d' },
  { icon: '🥷', color: '#ff6b6b' },
  { icon: '👑', color: '#ffd23f' },
  { icon: '⚡', color: '#ff4dd8' },
];
const rankIndex = (total) => RANKS.reduce((idx, [min], i) => (total >= min ? i : idx), 0);
const currentTotal = () => (loggedIn() ? Math.max(save.total, NET.profile.total_score) : save.total);

/* ---------- Verteilung der Spieler (aus der Datenbank, 60 s zwischengespeichert) ---------- */
const RANK_DIST = { at: 0, data: null, loading: null, failed: false };
async function loadRankDistribution() {
  if (!SUPABASE_CONFIGURED || !NET.sb) return null;
  if (RANK_DIST.data && Date.now() - RANK_DIST.at < 60000) return RANK_DIST.data;
  if (!RANK_DIST.loading) {
    RANK_DIST.loading = NET.sb.rpc('rank_distribution', { p_thresholds: RANKS.map(([min]) => min) })
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = RANKS.map(() => 0);
        for (const r of data || []) {
          const i = Math.round(Number(r.rank_idx)), n = Number(r.players);
          if (i >= 0 && i < counts.length && Number.isFinite(n)) counts[i] = n;
        }
        RANK_DIST.data = counts; RANK_DIST.at = Date.now(); RANK_DIST.failed = false;
        return counts;
      })
      .catch((e) => { console.warn('Rang-Verteilung:', e.message); RANK_DIST.failed = true; return null; })
      .finally(() => { RANK_DIST.loading = null; });
  }
  return RANK_DIST.loading;
}

/* ---------- Dropdown ---------- */
function renderRankMenu(dist) {
  const total = currentTotal(), cur = rankIndex(total), next = RANKS[cur + 1];
  const sum = dist ? dist.reduce((a, b) => a + b, 0) : 0;
  const pct = (i) => (sum ? (dist[i] / sum) * 100 : 0);
  const waiting = !dist && SUPABASE_CONFIGURED && !RANK_DIST.failed;
  const pctText = (i) => {
    if (!dist) return waiting ? '…' : '–';
    const p = pct(i);
    return p === 0 ? '0 %' : p < 1 ? '< 1 %' : `${Math.round(p)} %`;
  };
  const progress = next ? Math.min(100, ((total - RANKS[cur][0]) / (next[0] - RANKS[cur][0])) * 100) : 100;

  $('#rankMenu').innerHTML = `
    <div class="rm-head">
      <div class="rm-icon">${RANK_META[cur].icon}</div>
      <div>
        <div class="rm-title" style="color:${RANK_META[cur].color}">${esc(RANKS[cur][1])}</div>
        <div class="muted">${fmt(total)} Punkte</div>
      </div>
    </div>
    ${next ? `
      <div class="rm-next">
        <div class="bar"><div class="bar-fill" style="width:${progress}%;background:${RANK_META[cur + 1].color}"></div></div>
        <div>Noch <b>${fmt(next[0] - total)} Punkte</b> bis <b style="color:${RANK_META[cur + 1].color}">${RANK_META[cur + 1].icon} ${esc(next[1])}</b></div>
      </div>` : '<div class="rm-next"><b>Höchster Rang erreicht – du bist ein Tipp-Gott! ⚡</b></div>'}
    <ul class="rm-list">
      ${RANKS.map(([min, name], i) => `
        <li class="${i === cur ? 'me' : i < cur ? 'done' : ''}" style="--rc:${RANK_META[i].color}">
          <span class="rm-i">${RANK_META[i].icon}</span>
          <span class="rm-n"><b>${esc(name)}</b><small>ab ${fmt(min)} Punkten</small></span>
          <span class="rm-p"><span class="rm-pbar"><span style="width:${dist ? Math.max(pct(i), pct(i) > 0 ? 2 : 0) : 0}%"></span></span>${pctText(i)}</span>
        </li>`).join('')}
    </ul>
    <div class="rm-foot">
      ${dist ? `Anteil aller ${fmt(sum)} Online-Spieler in jedem Rang.` : waiting ? 'Lade Spielerzahlen …' : 'Spielerzahlen sind gerade nicht verfügbar.'}
      <details>
        <summary>So steigst du auf</summary>
        <ul>
          <li>Jedes <b>Kampagnen-Level</b> und jede <b>Endlos-Runde</b> bringt Punkte – auch wenn du ein Level nicht schaffst.</li>
          <li>Ein <b>hoher Streak</b> erhöht deinen Multiplikator (bis ×10) – fehlerfrei tippen lohnt sich am meisten.</li>
          <li><b>Goldene Buchstaben</b>, <b>perfekte Wörter</b> und Boni für Tempo und Genauigkeit geben extra.</li>
          <li>Battles zählen für deine <b>Elo-Wertung</b>, nicht für den Rang.</li>
        </ul>
      </details>
    </div>`;
}

function toggleRankMenu(force) {
  const menu = $('#rankMenu'), btn = $('#rank');
  const open = force ?? menu.hidden;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (!open) return;
  const r = btn.getBoundingClientRect();
  menu.style.top = r.bottom + 8 + 'px';
  menu.style.left = Math.max(12, Math.min(r.left, innerWidth - menu.offsetWidth - 12)) + 'px';
  renderRankMenu(RANK_DIST.data);
  loadRankDistribution().then((d) => { if (!menu.hidden) renderRankMenu(d); });
}

/* ---------- Rank-Up ---------- */
let rankUpTimer = null;
/** Beim Neuzeichnen der Kopfleiste aufrufen. Animation nur, wenn der Aufstieg aus dem Spiel kommt. */
function checkRankUp() {
  const idx = rankIndex(currentTotal());
  if (save.rankSeen == null || idx <= save.rankSeen) {
    if (save.rankSeen == null || idx > save.rankSeen) { save.rankSeen = idx; persist(); }
    return;
  }
  const fromGame = UI.current === 'game';
  save.rankSeen = idx;
  persist();
  if (fromGame) setTimeout(() => showRankUp(idx), 900); // erst kurz das Ergebnis zeigen
}

function showRankUp(idx) {
  const el = $('#rankUp'), meta = RANK_META[idx], next = RANKS[idx + 1];
  el.style.setProperty('--rc', meta.color);
  $('#ruIcon').textContent = meta.icon;
  $('#ruName').textContent = RANKS[idx][1];
  $('#ruSub').textContent = next ? `Nächster Rang: ${next[1]} ab ${fmt(next[0])} Punkten` : 'Der höchste Rang im Spiel!';
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  el.dataset.since = Date.now();
  Sound.rankUp();
  for (let k = 0; k < 10; k++) {
    setTimeout(() => !el.hidden && burst(innerWidth * (0.1 + Math.random() * 0.8), innerHeight * (0.2 + Math.random() * 0.5),
      [meta.color, '#ffd23f', '#ffffff', '#7c5cff'][k % 4], 45, 9), k * 220);
  }
  clearTimeout(rankUpTimer);
  rankUpTimer = setTimeout(hideRankUp, 5500);
}
function hideRankUp() {
  const el = $('#rankUp');
  if (el.hidden) return false;
  if (Date.now() - Number(el.dataset.since || 0) < 700) return true; // nicht aus Versehen sofort wegtippen
  clearTimeout(rankUpTimer);
  el.classList.remove('show');
  el.hidden = true;
  return true;
}

function initRanks() {
  $('#rank').addEventListener('click', (e) => { e.stopPropagation(); toggleRankMenu(); });
  document.addEventListener('click', (e) => {
    if (!$('#rankMenu').hidden && !e.target.closest('#rankMenu')) toggleRankMenu(false);
  });
  addEventListener('resize', () => toggleRankMenu(false));
  $('#rankUp').addEventListener('click', hideRankUp);
}
