'use strict';
/* =========================================================
   Impressum & Datenschutzerklärung (öffnen sich als Fenster).
   Die Angaben zum Betreiber stehen in js/config.js (SITE_OWNER).
   ========================================================= */
const LEGAL_UPDATED = '16. November 2026';

function ownerBlock() {
  const o = SITE_OWNER;
  return `${esc(o.name)}<br>${esc(o.street)}<br>${esc(o.city)}`
    + (o.email ? `<br>E-Mail: <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : '');
}

function imprintHTML() {
  return `
    <h2>Impressum</h2>
    <h3>Angaben gemäß § 5 DDG</h3>
    <p>${ownerBlock()}</p>
    ${SITE_OWNER.email ? '' : '<p class="muted">Kontakt per E-Mail: Adresse wird noch ergänzt.</p>'}
    <h3>Hinweis</h3>
    <p>Tastenrausch ist ein privates, nicht-kommerzielles Hobbyprojekt. Es gibt keine Werbung und keine kostenpflichtigen Inhalte.</p>
    <p>Der Quellcode ist öffentlich auf <a href="https://github.com/icy3309/tastenrausch" target="_blank" rel="noopener noreferrer">GitHub</a> einsehbar.</p>`;
}

function privacyHTML() {
  const contact = SITE_OWNER.email
    ? `per E-Mail an <a href="mailto:${esc(SITE_OWNER.email)}">${esc(SITE_OWNER.email)}</a> oder per Post an die oben genannte Adresse`
    : 'per Post an die oben genannte Adresse';
  return `
    <h2>Datenschutzerklärung</h2>
    <p class="muted">Stand: ${LEGAL_UPDATED}</p>

    <h3>1. Kurz gesagt</h3>
    <ul>
      <li>Der <b>Singleplayer</b> funktioniert ohne Anmeldung. Dein Spielstand bleibt dann nur in deinem Browser.</li>
      <li>Für den <b>Online-Modus</b> brauchst du einen Account (E-Mail-Adresse und Spielername).</li>
      <li>Keine Werbung, kein Tracking, keine Analyse-Tools, keine Cookies zu Werbezwecken.</li>
      <li>Du kannst deinen Account jederzeit selbst löschen (Online → Profil → „Account löschen“).</li>
    </ul>

    <h3>2. Verantwortlicher</h3>
    <p>${ownerBlock()}</p>

    <h3>3. Aufruf der Website (GitHub Pages)</h3>
    <p>Die Website wird über <b>GitHub Pages</b> der GitHub Inc. (USA) bereitgestellt.
      Beim Aufruf verarbeitet GitHub technisch notwendige Daten wie deine IP-Adresse, Datum und Uhrzeit, die aufgerufene Seite und deinen Browser,
      um die Seite auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren Betrieb).
      GitHub ist nach dem EU-US Data Privacy Framework zertifiziert. Mehr dazu in der
      <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von GitHub</a>.</p>

    <h3>4. Speicherung im Browser</h3>
    <p>Im lokalen Speicher deines Browsers (localStorage) werden gespeichert: dein Singleplayer-Spielstand, deine Einstellungen
      (Sprache, Tastatur-Layout, Ton) und – wenn du dich anmeldest – dein Login-Schlüssel, damit du angemeldet bleibst.
      Diese Daten verlassen deinen Browser nicht von selbst und sind für die Funktionen technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG).
      Du kannst sie jederzeit über die Browser-Einstellungen löschen („Website-Daten entfernen“).</p>

    <h3>5. Account und Online-Modus (Supabase)</h3>
    <p>Für Login, Rangliste, Freunde und Battles nutzen wir <b>Supabase</b> (Supabase Inc., USA). Die Datenbank-Server stehen in Frankfurt am Main, Deutschland. Dabei werden verarbeitet:</p>
    <ul>
      <li><b>Account:</b> E-Mail-Adresse, optional ein Passwort (nur verschlüsselt als Hash gespeichert, für niemanden lesbar), Zeitpunkt von Registrierung und Logins.</li>
      <li><b>Spielerprofil:</b> Spielername, Gesamtpunkte, Endlos-Rekord, Elo-Wertung, Siege und Niederlagen.</li>
      <li><b>Spieldaten:</b> Ergebnisse einzelner Runden (Punkte, Tempo, Genauigkeit), Battles, Freundschaften und dein Singleplayer-Spielstand.</li>
      <li><b>Technische Daten:</b> IP-Adresse und Zeitpunkt der Anfragen (Server-Protokolle von Supabase).</li>
    </ul>
    <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, denn ohne diese Daten können wir dir die Online-Funktionen nicht anbieten.
      Supabase verarbeitet die Daten in unserem Auftrag (Art. 28 DSGVO) und verschickt auch die Login-Mails.
      Soweit dabei Daten in die USA gelangen können, geschieht das auf Grundlage der EU-Standardvertragsklauseln (Art. 46 DSGVO).
      Mehr dazu in der <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von Supabase</a>.</p>
    <p><b>Für andere sichtbar</b> sind nur: dein Spielername, deine Punkte, Rekorde, Elo, Siege/Niederlagen (Rangliste) sowie,
      ob du gerade online bist. Deine E-Mail-Adresse sieht niemand außer dir.</p>

    <h3>6. Programm-Bibliothek (jsDelivr)</h3>
    <p>Für den Online-Modus lädt die Seite die Programm-Bibliothek von Supabase über das Content Delivery Network <b>jsDelivr</b>
      (betrieben von Prospect One sp. z o.o., Polen, mit Servern u.a. von Cloudflare und Fastly). Dabei wird deine IP-Adresse an jsDelivr übermittelt,
      damit die Datei ausgeliefert werden kann. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (zuverlässige und schnelle Bereitstellung).
      Die Datei wird mit einer Prüfsumme geladen, damit sie nicht unbemerkt verändert werden kann.</p>

    <h3>7. Sprachausgabe</h3>
    <p>Die Ansagen wie „GODLIKE“ erzeugt die Sprachausgabe deines eigenen Geräts. Es werden nur Stimmen verwendet, die lokal auf deinem Gerät laufen.</p>

    <h3>8. Speicherdauer</h3>
    <p>Account- und Spieldaten speichern wir, bis du deinen Account löschst. Battles werden dabei ebenfalls gelöscht.
      Server-Protokolle löschen GitHub und Supabase nach ihren eigenen, kurzen Fristen.</p>

    <h3>9. Deine Rechte</h3>
    <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
      Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Deinen Account kannst du selbst löschen: <b>Online → Profil → Account löschen</b>.
      Für alles andere wende dich ${contact}.</p>
    <p>Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim
      <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">Bayerischen Landesamt für Datenschutzaufsicht</a>.</p>

    <h3>10. Keine automatisierten Entscheidungen</h3>
    <p>Es findet kein Profiling und keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO statt.
      Rang und Elo-Wertung ergeben sich nur aus deinen Spielergebnissen.</p>`;
}

function openLegal(kind) {
  $('#legalBody').innerHTML = kind === 'imprint' ? imprintHTML() : privacyHTML();
  $('#legalBody').scrollTop = 0;
  openModal('legalModal');
}

function initLegal() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-legal]');
    if (!a) return;
    e.preventDefault();
    if (UI.current === 'game') return;
    openLegal(a.dataset.legal);
  });
}
