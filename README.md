# ⌨️ Tastenrausch

10-Finger-Tippen lernen wie ein Arcade-Game: Streaks, Multiplikatoren bis **GODLIKE**, goldene Buchstaben, Schilde – allein oder live gegen Freunde.

## Modi

**🎮 Singleplayer** (ohne Login; eingeloggt wird der Fortschritt in deinem Account gesichert und geräteübergreifend synchronisiert)
- **Kampagne**: 15 Level, die Schritt für Schritt die QWERTZ-Tastatur freischalten, bis zu 3 Sterne pro Level.
- **Endlos**: Eine Zeitleiste läuft ab. Treffer geben Zeit zurück, Fehler kosten Zeit. Es wird immer schneller und schwerer.

**🌐 Online** (Login per E-Mail-Link)
- **Battles**: *Rennen* (wer zuerst fertig ist, gewinnt) oder *Zeit-Duell* (30/60/120 s, höchste Punktzahl gewinnt).
  - **Schaden an/aus**: Neue Streak-Stufen schicken Angriffe (Nebel → Tinte → Erdbeben). Schilde blocken sie.
  - Schnelles Match, Raum mit Code oder Freund direkt herausfordern. Elo-Wertung, Revanche.
- **Freunde**: Über den Spielernamen hinzufügen. Du siehst, wer online ist, und kannst Freunde herausfordern.
- **Rangliste**: Gesamt, diese Woche, Battle-Elo, Endlos, pro Level, nur Freunde.

## Lokal starten

Singleplayer: `index.html` einfach doppelklicken.

Der Online-Modus (Login-Link) braucht eine echte Adresse, also einen lokalen Server:

```bash
cd "Typing Website"
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

## Online-Modus einrichten (einmalig, ca. 10 Minuten)

1. Auf <https://supabase.com> einen kostenlosen Account anlegen und **New project** erstellen.
2. **SQL Editor → New query**: den kompletten Inhalt von `supabase/schema.sql` einfügen und **Run** klicken.
3. **Project Settings → API**: die *Project URL* und den *anon public key* in `js/config.js` eintragen.
4. **Authentication → URL Configuration**:
   - **Site URL**: deine spätere Website-Adresse, z.B. `https://DEINNAME.github.io/tastenrausch/`
   - **Redirect URLs**: dieselbe Adresse und zusätzlich `http://localhost:8000`
5. Fertig. Unter **Online** kannst du dich jetzt anmelden.

> Die eingebaute Supabase-Mail schafft nur wenige Login-Mails pro Stunde. Zum Testen reicht das. Für viele Spieler trägst du unter *Authentication → Emails → SMTP* einen eigenen Mail-Dienst ein, z.B. Resend (kostenlos).

Zum Testen mit zwei Accounts: ein normales und ein privates Browserfenster, mit zwei verschiedenen E-Mails anmelden.

## Veröffentlichen mit GitHub Pages (kostenlos)

1. Auf GitHub ein neues, öffentliches Repository `tastenrausch` anlegen.
2. In diesem Ordner:
   ```bash
   git init -b main
   git add .
   git commit -m "Tastenrausch"
   git remote add origin https://github.com/DEINNAME/tastenrausch.git
   git push -u origin main
   ```
3. Auf GitHub: **Settings → Pages → Branch `main` / root → Save**.
4. Nach 1–2 Minuten ist das Spiel unter `https://DEINNAME.github.io/tastenrausch/` online. Diese Adresse bei Supabase eintragen (Schritt 4 oben).

Updates: Dateien ändern, dann `git commit -am "Update"` und `git push`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css` | Alle Screens und das Design |
| `js/config.js` | Supabase-Zugangsdaten |
| `js/data.js` | Level, Wörter, Sätze, Streak-Stufen, Textgenerator |
| `js/store.js` | Lokaler Spielstand (localStorage) |
| `js/fx.js` | Sound, Partikel, Einblendungen, Toasts |
| `js/ui.js` | Navigation, Ergebnis-Fenster |
| `js/engine.js` | Tipp-Kern: Streaks, Multiplikator, Gold, Schilde |
| `js/game.js` / `js/endless.js` | Kampagne / Endlos-Modus |
| `js/net.js` | Supabase-Verbindung, Login, Scores |
| `js/social.js` | Online-Hub, Freunde, Präsenz, Rangliste, Profil |
| `js/battle.js` | Live-Battles über Supabase Realtime |
| `supabase/schema.sql` | Datenbank, Zugriffsregeln, Server-Funktionen |

## Sicherheit

- **Passwörter & E-Mails** liegen ausschließlich bei Supabase Auth (Tabelle `auth.users`, Passwörter nur als bcrypt-Hash). Sie stehen weder im Code noch in den öffentlichen Tabellen.
- **Im Repo** steht nur die Projekt-URL und der *Publishable/anon Key* – beide sind öffentlich gedacht. Den *Secret/service_role Key* und das Datenbank-Passwort niemals ins Repo!
- Zugriffsregeln (RLS) und Server-Funktionen: `supabase/schema.sql`. Bestehende Projekte führen zusätzlich `supabase/update-2-security.sql` und `supabase/update-3-ranks.sql` aus.
- Schriften liegen lokal in `fonts/` (keine Verbindung zu Google). Die Supabase-Bibliothek wird mit Prüfsumme (SRI) geladen, eine Content-Security-Policy blockt fremde Skripte.
- Impressum- und Datenschutz-Angaben: `SITE_OWNER` in `js/config.js`, Texte in `js/legal.js`.
- Alles, was über den Live-Kanal vom Gegner kommt, wird im Browser geprüft; Ergebnisse und Elo berechnet nur die Datenbank.

## Hinweise

- Der *anon key* ist öffentlich, das ist so gewollt. Geschützt wird alles über Row-Level-Security: Niemand kann fremde Profile, Punkte oder Elo direkt ändern.
- Ergebnisse meldet der Browser selbst. Plausibilitätsprüfungen auf dem Server verhindern offensichtliches Schummeln, sicher gegen Cheater ist das aber nicht. Für ein Spiel unter Freunden reicht es.
