# PROJ-14: Versicherungsausweis (Anzeige & Download)

## Status: 🔵 Planned

## Übersicht

Ermöglicht versicherten Personen den Zugriff auf ihren aktuellen Versicherungsausweis sowie auf historische Ausweise vergangener Jahre. Der Ausweis kann online angezeigt und als PDF heruntergeladen werden.

## Abhängigkeiten

- **Benötigt:** PROJ-12 (Versicherten-Onboarding) - Portal-Account muss existieren
- **Benötigt:** Versicherungsausweis-Daten müssen im System vorhanden sein

## User Stories

### US-1: Aktuellen Versicherungsausweis anzeigen
Als versicherte Person möchte ich meinen aktuellen Versicherungsausweis online einsehen können, um meine Versicherungssituation zu prüfen.

### US-2: Versicherungsausweis als PDF herunterladen
Als versicherte Person möchte ich meinen Versicherungsausweis als PDF herunterladen können, um ihn für Steuererklärung oder andere Zwecke zu verwenden.

### US-3: Historische Ausweise einsehen
Als versicherte Person möchte ich Versicherungsausweise vergangener Jahre einsehen können, um historische Daten nachzuschlagen.

### US-4: Ausweis per Email erhalten
Als versicherte Person möchte ich mir den Versicherungsausweis per Email zusenden lassen können, um ihn auf meinem Smartphone zu haben.

## Acceptance Criteria

### Navigation & Übersicht
- [ ] Menüpunkt "Versicherungsausweis" im Portal-Navigation
- [ ] Übersichtsseite zeigt aktuellen Ausweis prominent
- [ ] Dropdown oder Liste für Auswahl historischer Jahre
- [ ] Verfügbare Jahre werden dynamisch geladen (alle vorhandenen Ausweise)

### Versicherungsausweis-Anzeige (Online-Ansicht)

#### Angezeigte Informationen
- [ ] **Kopfbereich:** Pensionskassen-Logo, Bezeichnung "Versicherungsausweis", Jahr
- [ ] **Personalien:** Name, Geburtsdatum, AHV-Nummer, Versichertennummer
- [ ] **Arbeitgeber:** Firmenname, Anschlussnummer
- [ ] **Versicherungsdaten:**
  - Jahreslohn / Versicherter Lohn
  - Koordinationsabzug
  - Beschäftigungsgrad
  - BVG-Lohn
- [ ] **Altersguthaben:**
  - Stand per 01.01.
  - Arbeitnehmer-Beiträge
  - Arbeitgeber-Beiträge
  - Zinsgutschrift
  - Einkäufe
  - Stand per 31.12. (Projektion oder effektiv)
- [ ] **Risikoleistungen:**
  - Invalidenrente
  - Ehegattenrente bei Tod
  - Waisenrente
  - Todesfallkapital
- [ ] **Altersleistungen (Projektion):**
  - Voraussichtliches Altersguthaben bei 65
  - Umwandlungssatz
  - Voraussichtliche Altersrente
  - Maximales Einkaufspotenzial
- [ ] **Fussbereich:** Erstellungsdatum, Hinweise, Kontaktdaten PK

### PDF-Download
- [ ] "Als PDF herunterladen"-Button gut sichtbar
- [ ] PDF wird serverseitig generiert (nicht nur Browser-Print)
- [ ] PDF entspricht offiziellem Layout der Pensionskasse
- [ ] PDF enthält Wasserzeichen oder Echtheitsmerkmal (optional)
- [ ] Dateiname: `Versicherungsausweis_2024_[Name].pdf`
- [ ] PDF ist A4-Format, druckoptimiert

### Email-Versand
- [ ] "Per Email senden"-Button
- [ ] PDF wird an registrierte Email-Adresse gesendet
- [ ] Bestätigungsmeldung "Versicherungsausweis wurde an [email] gesendet"
- [ ] Email enthält kurzen Begleittext + PDF als Anhang
- [ ] Rate-Limiting: Max. 3 Emails pro Tag

### Historische Ausweise
- [ ] Dropdown mit verfügbaren Jahren (z.B. 2024, 2023, 2022, ...)
- [ ] Bei Auswahl wird entsprechender Ausweis geladen
- [ ] Historische Ausweise können ebenfalls als PDF geladen werden
- [ ] Hinweis bei alten Ausweisen: "Historischer Ausweis - Stand [Datum]"

### Responsive Design
- [ ] Online-Ansicht ist mobile-optimiert (Daten in lesbaren Blöcken)
- [ ] PDF-Download funktioniert auf allen Geräten
- [ ] Wichtige Zahlen sind auch auf kleinen Screens gut lesbar

## Edge Cases

### E1: Kein Ausweis vorhanden
- **Szenario:** Versicherter ist neu, noch kein Ausweis erstellt
- **Verhalten:** Hinweis "Ihr Versicherungsausweis wird erstellt. Bitte schauen Sie in einigen Tagen nochmals vorbei."

### E2: Mehrere Arbeitgeber
- **Szenario:** Versicherter hat mehrere Anschlüsse im gleichen Jahr
- **Verhalten:** Separate Ausweise pro Arbeitgeber oder konsolidierte Ansicht (je nach PK-Policy)

### E3: Unterjähriger Eintritt/Austritt
- **Szenario:** Versicherter ist nur Teil des Jahres versichert
- **Verhalten:** Ausweis zeigt Pro-rata-Werte für den versicherten Zeitraum

### E4: PDF-Generierung fehlgeschlagen
- **Szenario:** Server-Fehler bei PDF-Erstellung
- **Verhalten:** Fehlermeldung "PDF konnte nicht erstellt werden. Bitte versuchen Sie es später erneut."

### E5: Sehr alte Ausweise
- **Szenario:** Versicherter fragt Ausweis von vor 10+ Jahren an
- **Verhalten:** Falls verfügbar: anzeigen. Falls nicht: "Für dieses Jahr liegt kein digitaler Ausweis vor."

### E6: Daten noch in Berechnung
- **Szenario:** Jahresabschluss läuft noch, Ausweis nicht finalisiert
- **Verhalten:** Hinweis "Der Ausweis für [Jahr] wird aktuell erstellt und ist in Kürze verfügbar."

### E7: Abweichung Online vs. Papier
- **Szenario:** Online-Daten weichen vom per Post erhaltenen Ausweis ab
- **Verhalten:** Link zu Korrekturanfrage (wie in PROJ-13)

## Nicht im Scope

- ❌ Ausweis-Generierung selbst (wird durch Backend/Batch-Prozess erstellt)
- ❌ Interaktive Berechnungen (separate Features: PROJ-11 Projektionen, PROJ-16 Einkauf)
- ❌ Vergleich zwischen Jahren (könnte späteres Feature sein)

## Technische Anforderungen

- **Performance:** Ausweis-Anzeige < 1s, PDF-Download < 3s
- **PDF-Engine:** Serverseitige PDF-Generierung (nicht Browser-Print)
- **Caching:** Generierte PDFs können gecacht werden (immutable nach Jahresabschluss)
- **Storage:** PDFs werden in Supabase Storage oder externem Blob-Storage gespeichert
- **Email:** Transaktionale Email via konfiguriertem SMTP-Provider

## UI/UX Anforderungen

- Übersichtliche Darstellung der wichtigsten Zahlen
- Visuelle Hierarchie: Altersguthaben und Altersrente prominent
- Print-Stylesheet für direkte Browser-Druckfunktion als Fallback
- Barrierefreiheit: WCAG 2.1 AA konform
- Zahlenformatierung: Schweizer Format (1'234.56)

