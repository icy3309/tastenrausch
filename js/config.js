'use strict';
/* ---------------------------------------------------------
   Supabase-Zugangsdaten für den Online-Modus.
   Zu finden in Supabase unter: Project Settings → API
   - Project URL      → SUPABASE_URL
   - anon public key  → SUPABASE_ANON_KEY
   Beide Werte sind öffentlich und dürfen ins Repo – geschützt
   wird alles über die Row-Level-Security in supabase/schema.sql.
   Leer lassen = Online-Modus aus, Singleplayer läuft trotzdem.
   --------------------------------------------------------- */
const SUPABASE_URL = 'https://snukzearccqogwdzguhw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eSEk_wwNGUVAnE6kkQQtjw_mlUM4BKg';

/* ---------------------------------------------------------
   Angaben für Impressum und Datenschutzerklärung.
   Die E-Mail-Adresse ist für das Impressum Pflicht (§ 5 DDG).
   --------------------------------------------------------- */
const SITE_OWNER = {
  name: 'Jasper Haag',
  street: '',           // ← Postanschrift (Straße, Hausnummer) – noch offen
  city: '',             // ← PLZ und Ort – noch offen
  email: 'icy3309adi@gmail.com',
};

const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
