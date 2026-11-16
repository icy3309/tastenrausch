'use strict';
/* =========== Start & Verkabelung =========== */

function renderHeader() {
  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('#dayStreak').textContent = currentDayStreak();
  $('#starCount').textContent = `${totalStars}/${LEVELS.length * 3}`;
  const total = currentTotal(), ri = rankIndex(total);
  $('#totalScore').textContent = fmt(total);
  $('#rank').textContent = `${RANK_META[ri].icon} ${RANKS[ri][1]} ▾`;
  checkRankUp();
  $('#muteBtn').textContent = save.muted ? '🔇' : '🔊';
  $('#musicBtn').style.opacity = Music.enabled ? 1 : 0.35;
  $('#musicBtn').disabled = save.muted;

  const acc = $('#accountBtn');
  acc.hidden = !SUPABASE_CONFIGURED;
  if (!NET.ready) acc.textContent = '⏳';
  else if (NET.profile) acc.innerHTML = `👤 <b>${esc(NET.profile.username)}</b> <small>${NET.profile.rating} Elo</small>`;
  else if (NET.user) acc.textContent = '🏷 Name wählen';
  else acc.textContent = '🔑 Anmelden';
}

function renderSettings() {
  $('#settingsLabel').textContent = `${save.lang.toUpperCase()} · ${LAYOUTS[save.layout].name}`;
  $('#langSeg').innerHTML = Object.entries(LANGS).map(([id, l]) =>
    `<button type="button" data-lang="${id}" class="${save.lang === id ? 'on' : ''}">${l.flag} ${l.name}</button>`).join('');
  $('#layoutSeg').innerHTML = Object.entries(LAYOUTS).map(([id, l]) =>
    `<button type="button" data-layout="${id}" class="${save.layout === id ? 'on' : ''}">⌨️ ${l.name}</button>`).join('');
  const L = LAYOUTS[save.layout];
  $('#layoutDesc').textContent = `${L.desc}. Wähle das Layout deiner echten Tastatur.`
    + (save.lang === 'de' && !L.umlauts ? ' Umlaute werden als ae, oe, ue und ss geschrieben.' : '');
}
function changeSettings(lang, layout) {
  if (lang) save.lang = lang;
  if (layout && layout !== save.layout) { save.layout = layout; applyLayout(layout); buildKeyboard(); }
  persist();
  renderSettings();
  if (UI.current === 'campaign') renderCampaign();
  if (UI.current === 'online') renderOnline(false);
}

function renderSpHub() {
  const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  const done = Object.keys(save.stars).filter((k) => save.stars[k] > 0).length;
  $('#campMeta').textContent = `⭐ ${stars}/${LEVELS.length * 3} · ${done}/${LEVELS.length} Level geschafft`;
  $('#endlessMeta').textContent = save.endlessBest ? `🏆 Rekord: ${fmt(save.endlessBest)}` : 'Noch kein Rekord';
}

function init() {
  buildKeyboard();
  $('#tierLegend').innerHTML = TIERS.slice(1).map((t) =>
    `<span class="tier-chip" style="color:${t.color}">${t.title}<small>${t.at}+ · ×${t.mult}</small></span>`).join('');

  onHeader(renderHeader);
  renderSettings();
  $('#settingsBtn').onclick = () => { if (UI.current !== 'game') { renderSettings(); openModal('settingsModal'); } };
  $('#settingsModal').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang], button[data-layout]');
    if (b) changeSettings(b.dataset.lang, b.dataset.layout);
  });
  onEnter('sp', renderSpHub);
  onEnter('campaign', renderCampaign);
  onEnter('online', () => renderOnline(true));

  // Navigation
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { showScreen(go.dataset.go); return; }
    if (e.target.closest('[data-back]')) goBack();
    if (e.target.closest('[data-act="endless"]')) startEndless();
  });
  $('#logo').onclick = () => (UI.current === 'game' ? leaveGame() : showScreen('home'));
  $('#backBtn').onclick = leaveGame;
  $('#muteBtn').onclick = (e) => { save.muted = !save.muted; persist(); renderHeader(); Music.update(); e.currentTarget.blur(); };
  $('#musicBtn').onclick = (e) => { save.music = save.music === false; persist(); renderHeader(); Music.update(); e.currentTarget.blur(); };
  $('#accountBtn').onclick = () => {
    if (UI.current === 'game') return;
    if (NET.profile) { showScreen('online'); setTab('profile'); }
    else if (NET.user) openNameModal();
    else if (NET.ready) openLogin();
  };
  $('#onlineTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) setTab(b.dataset.tab);
  });

  // Menü-Sounds
  const uiSel = 'button, .mode-card, .level-card, [data-tab], [data-lb]';
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest(uiSel);
    if (!el || UI.current === 'game' || el.contains(e.relatedTarget)) return;
    if (!el.disabled && !el.classList.contains('locked')) Sound.hover();
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest(uiSel);
    if (!el || el.id === 'muteBtn' || el.id === 'musicBtn') return;
    el.disabled || el.classList.contains('locked') ? Sound.denied() : Sound.select();
  }, true);

  // Tastatur
  document.addEventListener('keydown', (e) => {
    if (hideRankUp()) { e.preventDefault(); return; }
    if (e.key === 'Escape' && !$('#rankMenu').hidden) { toggleRankMenu(false); return; }
    if (modalKey(e)) return;
    if (UI.current === 'game' && UI.run) {
      if (e.key === 'Escape') { leaveGame(); return; }
      UI.run.key(e);
      return;
    }
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'Escape') goBack();
  });

  initAuthForms();
  initLegal();
  initRanks();
  initFriends();
  initLeaderboard();
  initBattleTab();

  // Online-Status
  let wasLoggedIn = false;
  onNetChange(() => {
    refreshHeader();
    if (NET.user) cloudLoad();
    if (loggedIn() && !wasLoggedIn) { socialStart(); importLocalOnce(); closeModal('loginModal'); }
    if (!loggedIn() && wasLoggedIn) { leaveRoom(); socialStop(); }
    if (NET.user && !NET.profile) { closeModal('loginModal'); openNameModal(); }
    wasLoggedIn = loggedIn();
    if (UI.current === 'online') renderOnline(false);
  });

  // Nach Klick auf den Magic Link direkt in den Online-Bereich
  if (/access_token|code=|error_description/.test(location.hash + location.search)) showScreen('online');
  else showScreen('home');

  netInit();
}

init();
