'use strict';
/* =========================================================
   Online-Hub: Login-Fenster, Tabs, Freunde, Präsenz,
   Einladungen, Rangliste, Profil.
   ========================================================= */
const SOC = {
  tab: 'battle', lobby: null, inbox: null, online: new Set(),
  friends: [], requestsIn: [], requestsOut: [], invites: [],
  lbKind: 'all', lbLevel: 13,
};

/* ---------- Login & Name ---------- */
function openLogin() {
  $('#loginStep1').hidden = false; $('#loginStep2').hidden = true; $('#loginErr').textContent = '';
  openModal('loginModal');
}
function openNameModal() {
  $('#nameErr').textContent = '';
  openModal('nameModal');
}
function initAuthForms() {
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const btn = e.submitter; btn.disabled = true;
    $('#loginErr').textContent = '';
    try {
      await sendMagicLink(email);
      $('#loginStep1').hidden = true; $('#loginStep2').hidden = false;
      $('#loginSentTo').textContent = email;
    } catch (err) { $('#loginErr').textContent = err.message; }
    btn.disabled = false;
  };
  $('#nameForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#nameInput').value.trim();
    $('#nameErr').textContent = '';
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { $('#nameErr').textContent = '3–16 Zeichen: Buchstaben, Zahlen und _'; return; }
    try { await createProfile(name); closeModal('nameModal'); }
    catch (err) { $('#nameErr').textContent = err.message; }
  };
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => b.closest('.modal').classList.remove('show')));
}

/* ---------- Online-Screen ---------- */
function renderOnline(openModals = false) {
  const gate = $('#onlineGate'), hub = $('#onlineHub');
  const showGate = (html) => { gate.hidden = false; hub.hidden = true; gate.innerHTML = html; };

  if (!SUPABASE_CONFIGURED) {
    return showGate(`<div class="gate-icon">🛠</div><h3>Online-Modus noch nicht eingerichtet</h3>
      <p>Trage deine Supabase-Daten in <code>js/config.js</code> ein und führe <code>supabase/schema.sql</code> aus – Schritt für Schritt erklärt in der <code>README.md</code>.</p>`);
  }
  if (NET.error) return showGate(`<div class="gate-icon">📡</div><h3>Keine Verbindung</h3><p>${esc(NET.error)}</p>`);
  if (!NET.ready) return showGate('<div class="gate-icon spin">⏳</div><h3>Verbinde …</h3>');
  if (!NET.user) {
    showGate(`<div class="gate-icon">🔑</div><h3>Melde dich an, um online zu spielen</h3>
      <p>Battles, Freunde und Rangliste brauchen einen Account – du bekommst einfach einen Login-Link per E-Mail.</p>
      <button class="primary" id="gateLogin">Anmelden</button>`);
    $('#gateLogin').onclick = openLogin;
    if (openModals) openLogin();
    return;
  }
  if (!NET.profile) {
    showGate(`<div class="gate-icon">🏷</div><h3>Wähle deinen Spielernamen</h3><button class="primary" id="gateName">Namen wählen</button>`);
    $('#gateName').onclick = openNameModal;
    if (openModals) openNameModal();
    return;
  }
  gate.hidden = true; hub.hidden = false;
  setTab(SOC.tab);
}

function setTab(t) {
  SOC.tab = t;
  document.querySelectorAll('#onlineTabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.id !== 'tab-' + t));
  if (t === 'battle') renderBattleTab();
  if (t === 'friends') loadFriends();
  if (t === 'leaderboard') loadLeaderboard();
  if (t === 'profile') renderProfile();
}
const onlineVisible = (tab) => UI.current === 'online' && SOC.tab === tab && loggedIn();

/* ---------- Präsenz & Postfach ---------- */
function socialStart() {
  if (SOC.lobby || !loggedIn()) return;
  const me = NET.user.id;
  SOC.lobby = NET.sb.channel('lobby', { config: { presence: { key: me } } });
  SOC.lobby
    .on('presence', { event: 'sync' }, () => {
      SOC.online = new Set(Object.keys(SOC.lobby.presenceState()));
      if (onlineVisible('friends')) renderFriends();
    })
    .subscribe((s) => { if (s === 'SUBSCRIBED') SOC.lobby.track({ username: NET.profile.username }); });

  SOC.inbox = NET.sb.channel('user:' + me);
  SOC.inbox
    .on('broadcast', { event: 'invite' }, ({ payload }) => onInvite(payload))
    .on('broadcast', { event: 'decline' }, ({ payload }) => toast(`🙅 <b>${esc(payload.username)}</b> hat deine Herausforderung abgelehnt.`))
    .on('broadcast', { event: 'friend' }, ({ payload }) => {
      toast(`👋 <b>${esc(payload.username)}</b> ${payload.accepted ? 'hat deine Freundschaftsanfrage angenommen!' : 'möchte mit dir befreundet sein.'}`,
        payload.accepted ? [] : [{ label: 'Ansehen', primary: true, onClick: () => { showScreen('online'); setTab('friends'); } }]);
      loadFriends(onlineVisible('friends'));
    })
    .subscribe();
  loadFriends(false);
}
function socialStop() {
  if (SOC.lobby) NET.sb.removeChannel(SOC.lobby);
  if (SOC.inbox) NET.sb.removeChannel(SOC.inbox);
  SOC.lobby = SOC.inbox = null;
  SOC.online = new Set(); SOC.friends = []; SOC.requestsIn = []; SOC.requestsOut = []; SOC.invites = [];
}

/** Einmalige Nachricht an das Postfach eines anderen Spielers. */
async function sendToUser(uid, event, payload) {
  const ch = NET.sb.channel('user:' + uid);
  await new Promise((res) => {
    const t = setTimeout(res, 4000);
    ch.subscribe((s) => { if (s === 'SUBSCRIBED') { clearTimeout(t); res(); } });
  });
  await ch.send({ type: 'broadcast', event, payload });
  setTimeout(() => NET.sb.removeChannel(ch), 1000);
}

function onInvite(p) {
  SOC.invites = SOC.invites.filter((i) => i.from !== p.from);
  SOC.invites.push(p);
  Sound.notify();
  toast(p.rematch ? `🔁 <b>${esc(p.username)}</b> will eine Revanche!` : `⚔️ <b>${esc(p.username)}</b> fordert dich zum Battle heraus!`, [
    { label: 'Annehmen', primary: true, onClick: () => acceptInvite(p) },
    { label: 'Ablehnen', onClick: () => declineInvite(p) },
  ], 20000);
  if (onlineVisible('battle')) renderBattleTab();
}
function acceptInvite(p) {
  SOC.invites = SOC.invites.filter((i) => i !== p);
  joinBattleByCode(p.code);
}
function declineInvite(p) {
  SOC.invites = SOC.invites.filter((i) => i !== p);
  sendToUser(p.from, 'decline', { username: NET.profile.username });
  if (onlineVisible('battle')) renderBattleTab();
}

/* ---------- Freunde ---------- */
async function loadFriends(render = true) {
  if (!loggedIn()) return;
  const me = NET.user.id;
  const { data: rows, error } = await NET.sb.from('friendships').select('*');
  if (error) { console.warn(error); return; }
  const other = (r) => (r.requester_id === me ? r.addressee_id : r.requester_id);
  const ids = [...new Set(rows.map(other))];
  let P = {};
  if (ids.length) {
    const { data } = await NET.sb.from('profiles').select('id,username,rating,total_score').in('id', ids);
    P = Object.fromEntries((data || []).map((p) => [p.id, p]));
  }
  SOC.friends = rows.filter((r) => r.status === 'accepted').map((r) => P[other(r)]).filter(Boolean);
  SOC.requestsIn = rows.filter((r) => r.status === 'pending' && r.addressee_id === me).map((r) => P[r.requester_id]).filter(Boolean);
  SOC.requestsOut = rows.filter((r) => r.status === 'pending' && r.requester_id === me).map((r) => P[r.addressee_id]).filter(Boolean);
  const badge = $('#friendBadge');
  badge.hidden = !SOC.requestsIn.length;
  badge.textContent = SOC.requestsIn.length;
  if (render) renderFriends();
}

function renderFriends() {
  const isOn = (id) => SOC.online.has(id);
  const sorted = [...SOC.friends].sort((a, b) => isOn(b.id) - isOn(a.id) || a.username.localeCompare(b.username));
  $('#friendRequests').innerHTML =
    SOC.requestsIn.map((p) => `<div class="frow"><span class="fname">${esc(p.username)}</span><span class="muted">möchte dein Freund sein</span>
      <button class="primary sm" data-act="accept" data-id="${p.id}">Annehmen</button><button class="ghost sm" data-act="remove" data-id="${p.id}">Ablehnen</button></div>`).join('') +
    SOC.requestsOut.map((p) => `<div class="frow"><span class="fname">${esc(p.username)}</span><span class="muted">Anfrage ausstehend …</span>
      <button class="ghost sm" data-act="remove" data-id="${p.id}">Zurückziehen</button></div>`).join('') ||
    '<p class="muted">Keine offenen Anfragen.</p>';
  $('#friendList').innerHTML = sorted.map((p) => `
    <div class="frow">
      <span class="dot ${isOn(p.id) ? 'on' : ''}" title="${isOn(p.id) ? 'online' : 'offline'}"></span>
      <span class="fname">${esc(p.username)}</span>
      <span class="muted">${p.rating} Elo · ${fmt(p.total_score)} Punkte</span>
      <button class="primary sm" data-act="challenge" data-id="${p.id}" ${isOn(p.id) ? '' : 'disabled title="Gerade offline"'}>⚔ Herausfordern</button>
      <button class="ghost sm icon" data-act="remove" data-id="${p.id}" title="Freund entfernen">✕</button>
    </div>`).join('') || '<p class="muted">Noch keine Freunde – füge oben jemanden über den Spielernamen hinzu!</p>';
}

function initFriends() {
  $('#friendForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#friendInput').value.trim();
    const msg = $('#friendMsg');
    if (!name) return;
    try {
      const res = await rpc('add_friend', { p_username: name });
      const texts = { not_found: '❌ Spieler nicht gefunden.', self: '😄 Das bist du selbst.', exists: 'ℹ️ Anfrage wurde schon gesendet.', accepted: '🎉 Ihr seid jetzt Freunde!', requested: '✅ Anfrage gesendet!' };
      msg.textContent = texts[res] || res;
      if (res === 'requested' || res === 'accepted') {
        $('#friendInput').value = '';
        const { data } = await NET.sb.from('profiles').select('id').ilike('username', name.replace(/_/g, '\\_')).maybeSingle();
        if (data) sendToUser(data.id, 'friend', { username: NET.profile.username, accepted: res === 'accepted' });
      }
      loadFriends();
    } catch (err) { msg.textContent = err.message; }
  };
  $('#tab-friends').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.dataset.id, me = NET.user.id;
    if (b.dataset.act === 'accept') {
      await NET.sb.from('friendships').update({ status: 'accepted' }).eq('requester_id', id).eq('addressee_id', me);
      sendToUser(id, 'friend', { username: NET.profile.username, accepted: true });
    } else if (b.dataset.act === 'remove') {
      await NET.sb.from('friendships').delete().or(`and(requester_id.eq.${id},addressee_id.eq.${me}),and(requester_id.eq.${me},addressee_id.eq.${id})`);
    } else if (b.dataset.act === 'challenge') {
      const f = SOC.friends.find((x) => x.id === id);
      if (f) inviteFriend(f);
      return;
    }
    loadFriends();
  });
}

/* ---------- Rangliste ---------- */
async function loadLeaderboard() {
  const k = SOC.lbKind, sb = NET.sb, me = NET.user.id;
  document.querySelectorAll('#lbTabs button').forEach((b) => b.classList.toggle('active', b.dataset.lb === k));
  $('#lbLevel').hidden = k !== 'level';
  $('#lbTable').innerHTML = '<p class="muted">Lade …</p>';
  let rows = [], unit = 'Punkte', myRank = null;
  try {
    if (['all', 'rating', 'endless', 'friends'].includes(k)) {
      const col = k === 'rating' ? 'rating' : k === 'endless' ? 'endless_best' : 'total_score';
      unit = k === 'rating' ? 'Elo' : 'Punkte';
      let q = sb.from('profiles').select('id,username,total_score,rating,wins,losses,endless_best').order(col, { ascending: false }).limit(50);
      if (k === 'endless') q = q.gt('endless_best', 0);
      if (k === 'friends') { await loadFriends(false); q = q.in('id', [me, ...SOC.friends.map((f) => f.id)]); }
      const { data, error } = await q;
      if (error) throw error;
      rows = data.map((r) => ({ id: r.id, name: r.username, v: r[col], extra: k === 'rating' ? `${r.wins} S · ${r.losses} N` : '' }));
      if ((k === 'all' || k === 'rating') && !rows.some((r) => r.id === me) && NET.profile) {
        const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true }).gt(col, NET.profile[col]);
        myRank = { rank: (count || 0) + 1, name: NET.profile.username, v: NET.profile[col] };
      }
    } else if (k === 'week') {
      const { data, error } = await sb.from('leaderboard_week').select('*').order('score', { ascending: false }).limit(50);
      if (error) throw error;
      rows = data.map((r) => ({ id: r.id, name: r.username, v: r.score, extra: '' }));
    } else {
      const { data, error } = await sb.from('leaderboard_level').select('*').eq('level', SOC.lbLevel).order('score', { ascending: false }).limit(50);
      if (error) throw error;
      rows = data.map((r) => ({ id: r.id, name: r.username, v: r.score, extra: `${Math.round(r.wpm)} WPM` }));
    }
  } catch (err) {
    $('#lbTable').innerHTML = `<p class="muted">Fehler: ${esc(err.message)}</p>`;
    return;
  }
  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
  $('#lbTable').innerHTML = rows.length ? `<table class="lb">
      ${rows.map((r, i) => `<tr class="${r.id === me ? 'me' : ''}"><td class="rk">${medal(i)}</td><td class="nm">${esc(r.name)}</td><td class="ex">${r.extra}</td><td class="vl">${fmt(r.v)} <small>${unit}</small></td></tr>`).join('')}
      ${myRank ? `<tr class="gap"><td colspan="4">⋯</td></tr><tr class="me"><td class="rk">#${myRank.rank}</td><td class="nm">${esc(myRank.name)}</td><td></td><td class="vl">${fmt(myRank.v)} <small>${unit}</small></td></tr>` : ''}
    </table>` : '<p class="muted">Noch keine Einträge – sei der Erste!</p>';
}
function initLeaderboard() {
  $('#lbTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lb]');
    if (!b) return;
    SOC.lbKind = b.dataset.lb;
    loadLeaderboard();
  });
  $('#lbLevel').innerHTML = LEVELS.map((l, i) => `<option value="${i}" ${i === SOC.lbLevel ? 'selected' : ''}>Level ${i + 1}: ${esc(l.name)}</option>`).join('');
  $('#lbLevel').onchange = (e) => { SOC.lbLevel = +e.target.value; loadLeaderboard(); };
}

/* ---------- Profil ---------- */
async function renderProfile() {
  const p = NET.profile, me = NET.user.id;
  const el = $('#tab-profile');
  el.innerHTML = `
    <div class="profile-head">
      <div class="avatar">${esc(p.username[0].toUpperCase())}</div>
      <div><div class="pname">${esc(p.username)}</div><div class="muted">${esc(NET.user.email || '')} · ${rankFor(p.total_score)}</div></div>
      <button class="ghost" id="logoutBtn">Abmelden</button>
    </div>
    <div class="res-stats profile-stats">
      <div><span>Elo</span><b>${p.rating}</b></div>
      <div><span>Siege</span><b>${p.wins}</b></div>
      <div><span>Niederlagen</span><b>${p.losses}</b></div>
      <div><span>Gesamtpunkte</span><b>${fmt(p.total_score)}</b></div>
      <div><span>Endlos-Rekord</span><b>${fmt(p.endless_best)}</b></div>
    </div>
    <h3>Letzte Battles</h3><div id="recentBattles"><p class="muted">Lade …</p></div>`;
  $('#logoutBtn').onclick = async () => { await signOut(); showScreen('home'); };

  const { data: bs } = await NET.sb.from('battles').select('*').eq('status', 'finished')
    .or(`host_id.eq.${me},guest_id.eq.${me}`).order('finished_at', { ascending: false }).limit(10);
  if (!bs?.length) { $('#recentBattles').innerHTML = '<p class="muted">Noch keine Battles gespielt.</p>'; return; }
  const oppIds = [...new Set(bs.map((b) => (b.host_id === me ? b.guest_id : b.host_id)))];
  const { data: ps } = await NET.sb.from('profiles').select('id,username').in('id', oppIds);
  const N = Object.fromEntries((ps || []).map((x) => [x.id, x.username]));
  $('#recentBattles').innerHTML = bs.map((b) => {
    const host = b.host_id === me, won = b.winner_id === me, d = host ? b.host_delta : b.guest_delta;
    const opp = N[host ? b.guest_id : b.host_id] || '?';
    return `<div class="frow"><span class="tag ${won ? 'win' : 'loss'}">${won ? 'SIEG' : 'NIEDERLAGE'}</span>
      <span class="fname">vs ${esc(opp)}</span><span class="muted">${b.mode === 'race' ? '🏁 Rennen' : `⏱ Zeit-Duell ${b.duration_s}s`}${b.attacks ? ' · 💥' : ''}</span>
      <span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d} Elo</span></div>`;
  }).join('');
}
