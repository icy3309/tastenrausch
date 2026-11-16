'use strict';
/* =========================================================
   Live-Battles über Supabase Realtime
   Modi: 'race' (Rennen) und 'timed' (Zeit-Duell)
   Schaden an/aus: neue Streak-Stufen schicken Angriffe.
   ========================================================= */
const DURATIONS = [30, 60, 120];
const ATTACKS = {
  fog:   { name: 'NEBEL', desc: 'Text verschwimmt', ms: 2000 },
  ink:   { name: 'TINTE', desc: 'Buchstaben verschwinden', ms: 3000 },
  quake: { name: 'ERDBEBEN', desc: 'Tastatur weg', ms: 3000 },
};
const attackForTier = (t) => (t >= FEVER_TIER ? 'quake' : t >= 3 ? 'ink' : 'fog');

const freshBattle = () => ({
  battle: null, ch: null, isHost: false, phase: 'idle', // idle | room | countdown | playing | waiting | done
  opp: null, oppPresent: false, oppState: null, oppResult: null,
  settings: { mode: 'race', duration_s: 60, attacks: true, level: 13, lang: save.lang },
  run: null, myResult: null, lastSent: 0, timers: [], leftTimer: null, pollTimer: null, autoStart: false, dbSave: null,
});
let B = freshBattle();
const meId = () => NET.user?.id;

/* ---------- Lobby-Aktionen ---------- */
async function quickMatch() {
  try { enterRoom(await rpc('quick_match')); }
  catch (e) { toast('❌ ' + esc(e.message)); }
}
async function createRoom(presetSettings) {
  try { const b = await rpc('create_battle', { p_public: false }); enterRoom(b, presetSettings); return b; }
  catch (e) { toast('❌ ' + esc(e.message)); return null; }
}
async function joinBattleByCode(code) {
  try {
    const b = await rpc('join_battle', { p_code: code });
    if (UI.current === 'game') exitGame('online');
    enterRoom(b);
  } catch (e) { toast('❌ ' + esc(e.message)); }
}
async function inviteFriend(friend) {
  const b = await createRoom();
  if (!b) return;
  await sendToUser(friend.id, 'invite', { from: meId(), username: NET.profile.username, code: b.code });
  toast(`📨 Einladung an <b>${esc(friend.username)}</b> gesendet – warte im Raum.`);
}

/* ---------- Raum ---------- */
function enterRoom(b, presetSettings = null) {
  leaveChannel();
  B = freshBattle();
  B.battle = b;
  B.isHost = b.host_id === meId();
  B.settings = presetSettings ? { ...presetSettings } : { mode: b.mode, duration_s: b.duration_s, attacks: b.attacks, level: b.level, lang: save.lang };
  B.phase = 'room';
  if (presetSettings && B.isHost) saveSettings();

  const ch = NET.sb.channel('battle:' + b.id, { config: { broadcast: { self: false }, presence: { key: meId() } } });
  B.ch = ch;
  ch.on('presence', { event: 'sync' }, onPresence)
    .on('broadcast', { event: 'settings' }, ({ payload }) => { if (!B.isHost) { B.settings = payload; if (B.phase === 'room') renderBattleTab(); } })
    .on('broadcast', { event: 'start' }, ({ payload }) => { if (!B.isHost) beginCountdown(payload); })
    .on('broadcast', { event: 'progress' }, ({ payload }) => { B.oppState = payload; drawRace(); })
    .on('broadcast', { event: 'attack' }, ({ payload }) => receiveAttack(payload))
    .on('broadcast', { event: 'finish' }, ({ payload }) => onOppFinish(payload))
    .on('broadcast', { event: 'result' }, ({ payload }) => showBattleResult(payload))
    .subscribe((s) => { if (s === 'SUBSCRIBED') ch.track({ username: NET.profile.username, rating: NET.profile.rating, layout: save.layout }); });

  if (UI.current !== 'online') showScreen('online');
  setTab('battle');
}

function onPresence() {
  const state = B.ch.presenceState();
  const otherKey = Object.keys(state).find((k) => k !== meId());
  const was = B.oppPresent;
  B.oppPresent = Boolean(otherKey);
  if (otherKey) {
    const meta = state[otherKey][0] || {};
    B.opp = { id: otherKey, username: meta.username || 'Gegner', rating: meta.rating ?? 1000, layout: meta.layout || 'qwertz' };
    clearTimeout(B.leftTimer); B.leftTimer = null;
    if (!was && B.phase === 'room') {
      Sound.notify();
      if (B.isHost) {
        sendBattle('settings', B.settings);
        if (B.battle.is_public && !B.autoStart) { B.autoStart = true; setTimeout(() => B.phase === 'room' && B.oppPresent && startMatch(), 1500); }
      }
    }
  } else if (was && ['countdown', 'playing', 'waiting'].includes(B.phase)) {
    B.leftTimer = setTimeout(opponentLeft, 10000);
  }
  if (B.phase === 'room' && onlineVisible('battle')) renderBattleTab();
}

function sendBattle(event, payload) { B.ch?.send({ type: 'broadcast', event, payload }); }

// Sprache gibt es nur im Live-Kanal, nicht als Datenbank-Spalte
const dbSettings = ({ lang, ...rest }) => rest;
/** Battle-Level: Haben nicht beide Spieler Umlaute auf der Tastatur, wird ohne geschrieben. */
const battleLevels = (ascii) => buildLevels(ascii ? 'qwerty' : 'qwertz');

function saveSettings() {
  clearTimeout(B.dbSave);
  const s = dbSettings(B.settings), id = B.battle.id;
  B.dbSave = setTimeout(() => NET.sb.from('battles').update(s).eq('id', id).then(({ error }) => error && console.warn(error)), 300);
}

function leaveChannel() {
  B.timers.forEach(clearInterval); B.timers.forEach(clearTimeout);
  clearTimeout(B.leftTimer); clearInterval(B.pollTimer);
  if (B.ch) NET.sb.removeChannel(B.ch);
  B.ch = null;
}
function leaveRoom() {
  leaveChannel();
  B = freshBattle();
  if (onlineVisible('battle')) renderBattleTab();
}

/* ---------- Battle-Tab rendern ---------- */
function renderBattleTab() {
  const el = $('#tab-battle');
  if (B.battle && B.phase === 'room') return renderRoom(el);
  el.innerHTML = `
    <div class="battle-home">
      <button class="mode-card" data-act="quick"><div class="mc-icon">⚡</div><div class="mc-title">Schnelles Match</div>
        <div class="mc-desc">Zufälliger Gegner · Rennen mit Schaden.</div></button>
      <button class="mode-card" data-act="create"><div class="mc-icon">🏠</div><div class="mc-title">Raum erstellen</div>
        <div class="mc-desc">Modus, Text &amp; Schaden selbst wählen und Code teilen.</div></button>
      <form class="mode-card join" id="joinForm"><div class="mc-icon">🔑</div><div class="mc-title">Mit Code beitreten</div>
        <div class="join-row"><input id="joinCode" maxlength="6" placeholder="ABC123" autocomplete="off" spellcheck="false"><button class="primary">Los</button></div></form>
    </div>
    <h3>Einladungen</h3>
    <div>${SOC.invites.map((p, i) => `<div class="frow"><span class="fname">⚔️ ${esc(p.username)}</span><span class="muted">fordert dich heraus</span>
      <button class="primary sm" data-act="inv-accept" data-i="${i}">Annehmen</button><button class="ghost sm" data-act="inv-decline" data-i="${i}">Ablehnen</button></div>`).join('') ||
      '<p class="muted">Keine offenen Einladungen. Im Tab <b>Freunde</b> kannst du Freunde direkt herausfordern.</p>'}</div>`;
  $('#joinForm').onsubmit = (e) => { e.preventDefault(); const c = $('#joinCode').value.trim(); if (c) joinBattleByCode(c); };
}

function renderRoom(el) {
  const b = B.battle, s = B.settings, host = B.isHost, opp = B.oppPresent ? B.opp : null;
  const dis = host ? '' : 'disabled';
  el.innerHTML = `
    <div class="room">
      <div class="room-head">
        <div><div class="muted">Raum-Code</div><div class="room-code">${esc(b.code)}</div></div>
        <div class="room-btns"><button class="ghost" data-act="copy">📋 Code kopieren</button><button class="ghost" data-act="leave">Verlassen</button></div>
      </div>
      <div class="vs">
        <div class="player"><div class="pl-name">${esc(NET.profile.username)}</div><small>${NET.profile.rating} Elo${host ? ' · Host' : ''}</small></div>
        <div class="vs-x">VS</div>
        <div class="player ${opp ? '' : 'waiting'}">${opp
          ? `<div class="pl-name">${esc(opp.username)}</div><small>${opp.rating} Elo${host ? '' : ' · Host'}</small>`
          : `<div class="pl-name">${b.is_public ? 'Suche Gegner …' : 'Warte auf Gegner …'}</div><small>${b.is_public ? 'Schnelles Match' : 'Teile den Code oder lade einen Freund ein'}</small>`}</div>
      </div>
      <div class="settings ${host ? '' : 'readonly'}">
        <div class="set">
          <label>Modus</label>
          <div class="seg">
            <button data-set="mode" data-v="race" class="${s.mode === 'race' ? 'on' : ''}" ${dis}>🏁 Rennen</button>
            <button data-set="mode" data-v="timed" class="${s.mode === 'timed' ? 'on' : ''}" ${dis}>⏱ Zeit-Duell</button>
          </div>
          <small>${s.mode === 'race' ? 'Gleicher Text – wer zuerst fertig ist, gewinnt.' : 'Gleicher Text – die höchste Punktzahl nach Ablauf der Zeit gewinnt.'}</small>
        </div>
        <div class="set" ${s.mode === 'timed' ? '' : 'hidden'}>
          <label>Dauer: <b>${s.duration_s} Sekunden</b></label>
          <input type="range" min="0" max="2" step="1" value="${Math.max(0, DURATIONS.indexOf(s.duration_s))}" data-set="duration" ${dis}>
          <div class="range-labels"><span>30 s</span><span>60 s</span><span>120 s</span></div>
        </div>
        <div class="set">
          <label>Sprache</label>
          <div class="seg">${Object.entries(LANGS).map(([id, l]) =>
            `<button data-set="lang" data-v="${id}" class="${(s.lang || 'de') === id ? 'on' : ''}" ${dis}>${l.flag} ${l.name}</button>`).join('')}</div>
        </div>
        <div class="set">
          <label>Text</label>
          <select data-set="level" ${dis}>${LEVELS.map((l, i) => `<option value="${i}" ${i === s.level ? 'selected' : ''}>${i + 1}. ${esc(l.name)}</option>`).join('')}</select>
        </div>
        <div class="set">
          <label class="switch"><input type="checkbox" data-set="attacks" ${s.attacks ? 'checked' : ''} ${dis}><span class="slider"></span>
            <span>Schaden <b>${s.attacks ? 'AN' : 'AUS'}</b></span></label>
          <small>${s.attacks ? '💥 Neue Streak-Stufen schicken Angriffe: Nebel → Tinte → Erdbeben (ab GODLIKE). Schilde blocken.' : 'Reines Tippen, keine Angriffe.'}</small>
        </div>
      </div>
      ${host ? `<button class="primary big" data-act="start" ${opp ? '' : 'disabled'}>${opp ? '⚔ Match starten' : 'Warte auf Gegner …'}</button>`
             : '<p class="muted center">Der Host wählt die Einstellungen und startet das Match …</p>'}
    </div>`;
}

function initBattleTab() {
  const el = $('#tab-battle');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act], button[data-set]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'quick') quickMatch();
    else if (act === 'create') createRoom();
    else if (act === 'leave') leaveRoom();
    else if (act === 'start') startMatch();
    else if (act === 'copy') { navigator.clipboard?.writeText(B.battle.code); toast('📋 Code kopiert: <b>' + esc(B.battle.code) + '</b>', [], 2500); }
    else if (act === 'inv-accept') acceptInvite(SOC.invites[+b.dataset.i]);
    else if (act === 'inv-decline') declineInvite(SOC.invites[+b.dataset.i]);
    else if (b.dataset.set === 'mode') changeSetting('mode', b.dataset.v);
    else if (b.dataset.set === 'lang') changeSetting('lang', b.dataset.v);
  });
  el.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.set === 'duration') changeSetting('duration_s', DURATIONS[+t.value]);
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.set === 'level') changeSetting('level', +t.value);
    if (t.dataset.set === 'attacks') changeSetting('attacks', t.checked);
  });
}
function changeSetting(k, v) {
  if (!B.isHost || B.phase !== 'room' || B.settings[k] === v) return;
  B.settings[k] = v;
  sendBattle('settings', B.settings);
  saveSettings();
  renderBattleTab();
}

/* ---------- Match-Ablauf ---------- */
async function startMatch() {
  if (!B.isHost || B.phase !== 'room' || !B.oppPresent) return;
  const ascii = !LAYOUTS[save.layout]?.umlauts || !LAYOUTS[B.opp?.layout]?.umlauts;
  const payload = { ...B.settings, ascii, seed: 1 + Math.floor(Math.random() * 2147483000) };
  clearTimeout(B.dbSave);
  NET.sb.from('battles').update({ ...dbSettings(B.settings), seed: payload.seed, status: 'running' }).eq('id', B.battle.id)
    .then(({ error }) => error && console.warn(error));
  sendBattle('start', payload);
  beginCountdown(payload);
}

function beginCountdown(p) {
  if (B.phase !== 'room') return;
  B.phase = 'countdown';
  B.settings = { mode: p.mode, duration_s: p.duration_s, attacks: p.attacks, level: p.level, lang: p.lang || 'de' };
  const lv = battleLevels(p.ascii)[p.level], lang = B.settings.lang, rng = mulberry32(p.seed), timed = p.mode === 'timed';
  const oppName = B.opp?.username || 'Gegner';

  B.run = createRun({
    text: genText(lv, rng, timed ? 300 : Math.max(lv.len, 180), lang),
    rng,
    more: timed ? () => genText(lv, rng, 150, lang) : null,
    timeLimit: timed ? p.duration_s : 0,
    autoStart: false,
    title: `⚔ ${timed ? `Zeit-Duell ${p.duration_s}s` : 'Rennen'} vs ${oppName}${p.attacks ? ' · 💥 Schaden an' : ''}`,
    hint: '⏳ Gleich geht’s los – Finger auf die Grundreihe!',
    onEvent: onBattleEvent,
  });
  B.run.lock(true);
  $('#oppName').textContent = oppName;
  $('#oppLaneLabel').textContent = oppName;
  B.oppState = { pos: 0, len: B.run.R.text.length, score: 0, streak: 0, tier: 0 };
  drawRace();
  startGame({ run: B.run, mode: 'battle', back: 'online', onExit: () => { leaveRoom(); } });

  let n = 3;
  announce('3', 'Mach dich bereit!', '#00e5ff'); Sound.beep(false);
  const iv = setInterval(() => {
    n--;
    if (n > 0) { announce(String(n), '', '#00e5ff'); Sound.beep(false); return; }
    clearInterval(iv);
    announce('LOS!', '', '#3ddc97'); Sound.beep(true);
    B.phase = 'playing';
    B.run.lock(false);
    B.run.startClock();
  }, 900);
  B.timers.push(iv);
}

function onBattleEvent(type, d, R) {
  if (type === 'progress') {
    const now = performance.now();
    if (now - B.lastSent > 100) { B.lastSent = now; sendProgress(R); }
    drawRace();
  } else if (type === 'tier' && B.settings.attacks && d.t >= 1) {
    const kind = attackForTier(d.t);
    sendBattle('attack', { kind, tier: d.t });
    const r = $('#oppPanel').getBoundingClientRect();
    floatText(`💥 ${ATTACKS[kind].name} gesendet!`, r.left + r.width / 2, r.bottom, '#ff4d6d');
  } else if (type === 'finish') {
    sendProgress(R);
    const res = {
      finished: d.reason === 'done', time: Math.round(d.ms), pos: R.pos, score: R.score,
      wpm: Math.round(d.wpm), acc: Math.round(d.acc), maxStreak: R.maxStreak,
    };
    B.myResult = res;
    sendBattle('finish', res);
    reportResult(res);
  }
}
function sendProgress(R) {
  sendBattle('progress', { pos: R.pos, len: R.text.length, score: R.score, streak: R.streak, tier: tierIndex(R.streak) });
}

function drawRace() {
  if (!B.run) return;
  const R = B.run.R, o = B.oppState || { pos: 0, len: 1, score: 0, streak: 0, tier: 0 };
  let me, op;
  if (B.settings.mode === 'race') { me = R.pos / R.text.length; op = o.pos / Math.max(1, o.len); }
  else { const max = Math.max(R.score, o.score, 1); me = R.score / max; op = o.score / max; }
  $('#raceMe').style.width = me * 100 + '%';
  $('#raceOpp').style.width = op * 100 + '%';
  const t = TIERS[o.tier || 0];
  $('#oppTier').textContent = `${o.streak || 0} Streak · ${t.title === 'Leg los!' ? '–' : t.title} · ×${t.mult}`;
  $('#oppTier').style.color = t.color;
  $('#oppScore').textContent = fmt(o.score || 0);
}

/* ---------- Angriffe ---------- */
function receiveAttack({ kind }) {
  if (B.phase !== 'playing' || !B.run || B.run.R.done) return;
  const a = ATTACKS[kind] || ATTACKS.fog;
  const box = $('#textbox').getBoundingClientRect();
  const cx = box.left + box.width / 2, cy = box.top + 10;
  if (B.run.useShield()) {
    floatText('🛡 GEBLOCKT!', cx, cy, '#00e5ff', true);
    Sound.shield();
    return;
  }
  floatText(`💥 ${a.name}! ${a.desc}`, cx, cy, '#ff4d6d', true);
  Sound.attack();
  if (kind === 'fog') {
    const tb = $('#textbox');
    tb.classList.add('atk-fog');
    B.timers.push(setTimeout(() => tb.classList.remove('atk-fog'), a.ms));
  } else if (kind === 'ink') {
    const R = B.run.R;
    const spans = R.spans.slice(R.pos, R.pos + 6);
    spans.forEach((s) => s.classList.add('inked'));
    B.timers.push(setTimeout(() => spans.forEach((s) => s.classList.remove('inked')), a.ms));
  } else if (kind === 'quake') {
    shake(true);
    const kb = $('.trainer');
    kb.classList.add('atk-hidden');
    B.timers.push(setTimeout(() => kb.classList.remove('atk-hidden'), a.ms));
  }
}

/* ---------- Ende & Ergebnis ---------- */
function onOppFinish(p) {
  B.oppResult = p;
  B.oppState = { ...(B.oppState || {}), pos: p.pos, score: p.score };
  drawRace();
  // Im Rennen ist das Match vorbei, sobald einer durch ist.
  if (B.settings.mode === 'race' && B.run && !B.run.R.done) {
    announce('ZIEL!', `${B.opp?.username || 'Gegner'} ist durch`, '#ff4d6d');
    B.run.finish('opponent');
  }
}

async function reportResult(res, opponentLeft = false) {
  if (B.phase === 'done') return;
  B.phase = 'waiting';
  $('#startHint').innerHTML = '⏳ Warte auf das Ergebnis deines Gegners …';
  $('#startHint').classList.remove('hide');
  try {
    const b = await rpc('report_result', { p_id: B.battle.id, p_result: res, p_opponent_left: opponentLeft });
    if (b.status === 'finished') { sendBattle('result', b); showBattleResult(b); return; }
  } catch (e) { console.warn(e); toast('❌ Ergebnis konnte nicht gespeichert werden: ' + esc(e.message)); }
  // Fallback: Ergebnis regelmäßig abfragen
  clearInterval(B.pollTimer);
  const id = B.battle.id;
  B.pollTimer = setInterval(async () => {
    const { data } = await NET.sb.from('battles').select('*').eq('id', id).maybeSingle();
    if (data?.status === 'finished') showBattleResult(data);
  }, 2000);
}

function opponentLeft() {
  if (!['countdown', 'playing', 'waiting'].includes(B.phase)) return;
  toast(`🏃 <b>${esc(B.opp?.username || 'Dein Gegner')}</b> hat das Match verlassen.`);
  const R = B.run?.R;
  if (B.run && !R.done) B.run.stop();
  const st = B.run ? B.run.stats() : { ms: 0, wpm: 0, acc: 100 };
  const res = B.myResult || { finished: false, time: Math.round(st.ms), pos: R?.pos || 0, score: R?.score || 0, wpm: Math.round(st.wpm), acc: Math.round(st.acc), maxStreak: R?.maxStreak || 0 };
  B.phase = 'playing'; // reportResult darf erneut senden
  reportResult(res, true);
}

function showBattleResult(b) {
  if (B.phase === 'done' || !B.battle || b.id !== B.battle.id) return;
  B.phase = 'done';
  clearInterval(B.pollTimer); clearTimeout(B.leftTimer);
  if (B.run && !B.run.R.done) B.run.stop();
  $('#startHint').classList.add('hide');

  const host = b.host_id === meId();
  const mine = (host ? b.host_result : b.guest_result) || B.myResult || {};
  const theirs = (host ? b.guest_result : b.host_result) || B.oppResult || null;
  const won = b.winner_id === meId();
  const delta = (host ? b.host_delta : b.guest_delta) ?? 0;
  const oppName = B.opp?.username || 'Gegner';
  const line = (r) => r ? `${fmt(r.score)} Pkt · ${r.wpm} WPM · ${r.acc}%${b.mode === 'race' ? (r.finished ? ` · ${(r.time / 1000).toFixed(1)} s` : ' · nicht im Ziel') : ''}` : 'hat aufgegeben';

  showResult({
    head: won ? '🏆 SIEG!' : '💀 NIEDERLAGE',
    stats: [['WPM', mine.wpm ?? 0], ['Genauigkeit', (mine.acc ?? 0) + '%'], ['Punkte', fmt(mine.score ?? 0)], ['Max. Streak', mine.maxStreak ?? 0]],
    rows: [
      ['Du', line(mine), won ? 'flawless' : ''],
      [esc(oppName), line(theirs), won ? '' : 'flawless'],
      ['Modus', b.mode === 'race' ? '🏁 Rennen' : `⏱ Zeit-Duell (${b.duration_s} s)`],
      ['Schaden', b.attacks ? '💥 an' : 'aus'],
    ],
    totalLabel: 'Elo',
    total: `${delta >= 0 ? '+' : ''}${delta}`,
    note: won ? 'Stark getippt!' : 'Revanche? Beim nächsten Mal klappt’s!',
    actions: [
      { label: 'Lobby', kbd: 'Esc', onClick: () => exitGame('online') },
      { label: 'Revanche', kbd: 'Enter', primary: true, onClick: () => requestRematch() },
    ],
  });
  if (won) celebrate(); else Sound.lose();
  touchDay(); persist();
  refreshProfile();
}

async function requestRematch() {
  const old = { settings: { ...B.settings }, opp: B.opp };
  exitGame('online'); // beendet auch den alten Raum
  const b = await createRoom(old.settings);
  if (b && old.opp) {
    await sendToUser(old.opp.id, 'invite', { from: meId(), username: NET.profile.username, code: b.code, rematch: true });
    toast(`🔁 Revanche an <b>${esc(old.opp.username)}</b> geschickt – warte im Raum.`);
  }
}
