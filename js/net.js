'use strict';
/* =========================================================
   Supabase: Verbindung, Login (Magic Link), Profil, Scores.
   Wird nur geladen, wenn js/config.js ausgefüllt ist –
   der Singleplayer funktioniert immer auch ohne.
   ========================================================= */
const SB_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const NET = { sb: null, user: null, profile: null, ready: !SUPABASE_CONFIGURED, error: '', subs: [] };

const onNetChange = (fn) => NET.subs.push(fn);
const netNotify = () => NET.subs.forEach((f) => f());
const loggedIn = () => Boolean(NET.profile);

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Supabase-Bibliothek konnte nicht geladen werden (offline?)'));
    document.head.appendChild(s);
  });
}

async function netInit() {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await loadScript(SB_CDN);
    NET.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Kein await auf Supabase direkt im Callback (sonst Deadlock) → setTimeout.
    NET.sb.auth.onAuthStateChange((_e, session) => setTimeout(() => handleSession(session), 0));
  } catch (e) {
    console.warn(e);
    NET.error = e.message;
    NET.ready = true;
    netNotify();
  }
}

async function handleSession(session) {
  const uid = session?.user?.id || null;
  if (NET.ready && uid === (NET.user?.id || null)) return; // z.B. Token-Refresh
  NET.user = session?.user || null;
  cloudLoaded = false;
  NET.profile = NET.user ? await fetchProfile(NET.user.id) : null;
  NET.ready = true;
  netNotify();
}

async function fetchProfile(id) {
  const { data, error } = await NET.sb.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) console.warn(error);
  return data || null;
}
async function refreshProfile() {
  if (!NET.user) return;
  NET.profile = await fetchProfile(NET.user.id);
  netNotify();
}

async function sendMagicLink(email) {
  const { error } = await NET.sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

async function createProfile(username) {
  const { error } = await NET.sb.from('profiles').insert({ id: NET.user.id, username });
  if (error) {
    if (error.code === '23505') throw new Error('Dieser Name ist schon vergeben.');
    if (error.code === '23514') throw new Error('3–16 Zeichen: Buchstaben, Zahlen und _');
    throw error;
  }
  await refreshProfile();
}

async function signOut() {
  await NET.sb.auth.signOut();
}

async function rpc(name, args = {}) {
  const { data, error } = await NET.sb.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

/** Ergebnis online speichern (still – Fehler landen nur in der Konsole). */
async function submitScore({ level, score, wpm, acc, maxStreak, chars }) {
  if (!loggedIn()) return;
  try {
    await rpc('submit_score', {
      p_level: level, p_score: Math.round(score), p_wpm: Math.round(wpm * 10) / 10,
      p_acc: Math.round(acc * 10) / 10, p_streak: maxStreak, p_chars: chars,
    });
    refreshProfile();
  } catch (e) { console.warn('Score nicht gespeichert:', e.message); }
}

/* ---------- Singleplayer-Spielstand in der Cloud ---------- */
let cloudTimer = null, cloudLoaded = false, cloudLoading = null;

/** Beim Login: Cloud-Stand holen, mit dem lokalen zusammenführen, beide Seiten aktualisieren. */
function cloudLoad() {
  if (!NET.user || cloudLoaded) return Promise.resolve();
  return (cloudLoading ||= cloudFetchMerge().finally(() => { cloudLoading = null; }));
}
async function cloudFetchMerge() {
  const uid = NET.user.id;
  const { data, error } = await NET.sb.from('progress').select('data').eq('user_id', uid).maybeSingle();
  if (NET.user?.id !== uid) return;
  if (error) { console.warn('Spielstand nicht geladen:', error.message); return; }
  const merged = mergeSave(save, data?.data || {});
  const changed = JSON.stringify(cloudFields(merged)) !== JSON.stringify(cloudFields(save));
  Object.assign(save, merged);
  cloudLoaded = true;
  persist(); // speichert lokal und lädt den zusammengeführten Stand hoch
  refreshHeader();
  if (UI.current === 'sp') renderSpHub();
  if (UI.current === 'campaign') renderCampaign();
  if (changed && data) toast('☁️ Dein Spielstand wurde aus deinem Account geladen.');
}

/** Nach jedem Speichern (gebündelt) hochladen. */
function cloudSave() {
  if (!NET.sb || !NET.user || !cloudLoaded) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(async () => {
    const { error } = await NET.sb.from('progress').upsert({
      user_id: NET.user.id, data: cloudFields(save), updated_at: new Date().toISOString(),
    });
    if (error) console.warn('Spielstand nicht gesichert:', error.message);
  }, 800);
}

/** Lokalen Singleplayer-Fortschritt beim ersten Login übernehmen. */
async function importLocalOnce() {
  if (!NET.profile || NET.profile.imported) return;
  try {
    await rpc('import_local', { p_total: save.total, p_endless: save.endlessBest || 0 });
    await refreshProfile();
    if (save.total > 0) toast(`📥 Dein lokaler Fortschritt (${fmt(save.total)} Punkte) wurde in dein Profil übernommen.`);
  } catch (e) { console.warn(e.message); }
}
