# PROJ-13: Versicherten-Stammdaten (Ansicht & Adressänderung)

## Status: 🔵 Planned

## Übersicht

Ermöglicht versicherten Personen die Einsicht in ihre persönlichen Stammdaten und die selbstständige Aktualisierung ihrer Adressdaten. Alle anderen Daten sind read-only und können nur durch die Pensionskasse geändert werden.

## Abhängigkeiten

- **Benötigt:** PROJ-12 (Versicherten-Onboarding) - Portal-Account muss existieren
- **Benötigt:** PROJ-6 (Insured Persons List) - Stammdaten-Struktur

## User Stories

### US-1: Stammdaten einsehen
Als versicherte Person möchte ich meine bei der Pensionskasse hinterlegten Stammdaten einsehen können, um zu prüfen ob diese korrekt sind.

### US-2: Adresse ändern
Als versicherte Person möchte ich meine Adresse selbst aktualisieren können, um bei einem Umzug nicht die Pensionskasse kontaktieren zu müssen.

### US-3: Korrektur beantragen
Als versicherte Person möchte ich eine Korrektur meiner Stammdaten beantragen können, wenn ich einen Fehler entdecke (z.B. falsches Geburtsdatum).

### US-4: Änderungshistorie einsehen
Als versicherte Person möchte ich sehen können, wann meine Daten zuletzt geändert wurden, um Transparenz über Änderungen zu haben.

## Acceptance Criteria

### Stammdaten-Übersicht
- [ ] Menüpunkt "Meine Daten" im Portal-Navigation
- [ ] Übersichtliche Darstellung aller Stammdaten in Kategorien
- [ ] Klar erkennbar welche Felder änderbar sind (Adresse) und welche nicht

### Angezeigte Daten

#### Kategorie: Personalien (read-only)
- [ ] Name (Vorname, Nachname)
- [ ] Geburtsdatum
- [ ] AHV-Nummer (teilweise maskiert: 756.XXXX.XXXX.XX → 756.****.****.90)
- [ ] Geschlecht
- [ ] Zivilstand
- [ ] Nationalität

#### Kategorie: Adresse (editierbar)
- [ ] Strasse und Hausnummer
- [ ] Adresszusatz (optional)
- [ ] PLZ
- [ ] Ort
- [ ] Land

#### Kategorie: Kontaktdaten (read-only, ausser Email via Account-Settings)
- [ ] Email-Adresse (aus Portal-Account, änderbar via Account-Einstellungen)
- [ ] Telefonnummer (falls vorhanden)

#### Kategorie: Versicherungsdaten (read-only)
- [ ] Versichertennummer (intern)
- [ ] Eintrittsdatum
- [ ] Beschäftigungsgrad (aktuell)
- [ ] Versicherter Lohn
- [ ] Arbeitgeber (falls mehrere Anschlüsse)
- [ ] Status (aktiv/passiv)

### Adressänderung
- [ ] "Adresse ändern"-Button in Adress-Sektion
- [ ] Modal oder separate Seite mit Formular
- [ ] Felder: Strasse, Hausnummer, Adresszusatz, PLZ, Ort, Land
- [ ] PLZ-Validierung (Schweizer PLZ 1000-9999, oder ausländische Adressen)
- [ ] Ort wird bei Schweizer PLZ automatisch vorgeschlagen (PLZ-Datenbank)
- [ ] Land-Dropdown mit Schweiz als Default
- [ ] Vorschau der neuen Adresse vor Bestätigung
- [ ] Bestätigungsbutton "Adresse speichern"
- [ ] Erfolgsmeldung nach Speicherung
- [ ] Änderung wird sofort wirksam (kein Approval-Workflow nötig)

### Korrektur beantragen (für read-only Felder)
- [ ] Link "Daten stimmen nicht? Korrektur beantragen" unter read-only Sektionen
- [ ] Modal mit Textfeld für Korrekturbeschreibung
- [ ] Dropdown: Welches Feld ist betroffen?
- [ ] Absenden erstellt Ticket/Anfrage für PK-Admin
- [ ] Versicherter sieht Status der Anfrage (offen, in Bearbeitung, erledigt)
- [ ] PK-Admin erhält Benachrichtigung über neue Korrekturanfrage

### Änderungshistorie
- [ ] Bereich "Letzte Änderungen" auf Stammdaten-Seite
- [ ] Zeigt letzte 10 Änderungen mit Datum und geändertem Feld
- [ ] Bei Adressänderung: Alte und neue Adresse anzeigen
- [ ] Unterscheidung: Selbst geändert vs. durch PK geändert

### Security & Datenschutz
- [ ] Nur eigene Daten sichtbar (RLS Policy)
- [ ] Sensible Daten teilweise maskiert (AHV-Nummer)
- [ ] Alle Zugriffe werden geloggt (Audit-Trail)
- [ ] Session-Timeout nach 15 Min Inaktivität

## Edge Cases

### E1: Ungültige PLZ
- **Szenario:** Versicherter gibt ungültige PLZ ein
- **Verhalten:** Fehlermeldung "Bitte geben Sie eine gültige Postleitzahl ein"

### E2: Auslandsadresse
- **Szenario:** Versicherter zieht ins Ausland
- **Verhalten:** Land-Dropdown ermöglicht alle Länder, PLZ-Validierung wird deaktiviert für nicht-CH

### E3: Mehrere Adressen
- **Szenario:** Versicherter hat Wohn- und Korrespondenzadresse
- **Verhalten:** Beide Adressen anzeigen und separat änderbar (falls im Datenmodell vorhanden)

### E4: Parallele Änderung
- **Szenario:** Versicherter und PK-Admin ändern gleichzeitig
- **Verhalten:** Last-Write-Wins, aber Änderungshistorie zeigt beide Änderungen

### E5: Adresse mit Sonderzeichen
- **Szenario:** Adresse enthält Umlaute, Akzente (ü, é, etc.)
- **Verhalten:** UTF-8 wird unterstützt, korrekte Anzeige und Speicherung

### E6: Leere Pflichtfelder
- **Szenario:** Versicherter versucht Strasse zu löschen
- **Verhalten:** Validierung verhindert Speicherung ohne Pflichtfelder (Strasse, PLZ, Ort, Land)

### E7: Daten noch nicht geladen
- **Szenario:** Langsame Verbindung, Daten laden länger
- **Verhalten:** Skeleton-Loading-States während Daten geladen werden

## Nicht im Scope

- ❌ Änderung von Personalien (Name, Geburtsdatum) - nur via PK
- ❌ Änderung von Versicherungsdaten - nur via PK
- ❌ Email-Änderung - separater Flow in Account-Einstellungen
- ❌ Telefonnummer-Änderung - via PK oder separates Feature

## Technische Anforderungen

- **Performance:** Stammdaten-Seite < 500ms Ladezeit
- **Caching:** Stammdaten können client-seitig gecacht werden (5 Min TTL)
- **Audit:** Jede Änderung wird mit Timestamp und User-ID geloggt
- **Validierung:** PLZ/Ort-Datenbank für Schweizer Adressen

## UI/UX Anforderungen

- Klare visuelle Trennung editierbarer/read-only Felder
- Mobile-optimiert (Formular muss auf Smartphone nutzbar sein)
- Inline-Validierung bei Formulareingabe
- Erfolgs-/Fehlermeldungen als Toast-Notifications
- Barrierefreiheit: WCAG 2.1 AA konform

