# PROJ-15: Versicherten-Dokumente (Archiv & Anforderung)

## Status: 🔵 Planned

## Übersicht

Ermöglicht versicherten Personen den Zugriff auf ihr persönliches Dokumentenarchiv (historische Korrespondenz, Bescheinigungen, Mitteilungen) sowie die selbstständige Anforderung von Standarddokumenten wie Vorsorgeausweisen oder Bescheinigungen für Behörden.

## Abhängigkeiten

- **Benötigt:** PROJ-12 (Versicherten-Onboarding) - Portal-Account muss existieren
- **Benötigt:** Dokumenten-Storage-Infrastruktur

## User Stories

### US-1: Dokumentenarchiv einsehen
Als versicherte Person möchte ich alle an mich gesendeten Dokumente der Pensionskasse online einsehen können, um nicht nach Papierbriefen suchen zu müssen.

### US-2: Dokument herunterladen
Als versicherte Person möchte ich jedes Dokument als PDF herunterladen können, um es lokal zu speichern oder weiterzuleiten.

### US-3: Bescheinigung anfordern
Als versicherte Person möchte ich Standardbescheinigungen selbst anfordern können (z.B. für Steuerbehörden, Gerichte, Banken), um schnell und ohne Wartezeit offizielle Dokumente zu erhalten.

### US-4: Dokumenten-Benachrichtigung
Als versicherte Person möchte ich benachrichtigt werden, wenn ein neues Dokument für mich bereitsteht, um keine wichtige Korrespondenz zu verpassen.

### US-5: Dokumente durchsuchen
Als versicherte Person möchte ich meine Dokumente nach Datum, Typ oder Suchbegriff filtern können, um schnell das gesuchte Dokument zu finden.

## Acceptance Criteria

### Dokumentenarchiv-Übersicht
- [ ] Menüpunkt "Dokumente" im Portal-Navigation
- [ ] Liste aller verfügbaren Dokumente, sortiert nach Datum (neueste zuerst)
- [ ] Pro Dokument: Icon, Titel, Dokumenttyp, Datum, Status (gelesen/ungelesen)
- [ ] Ungelesene Dokumente sind visuell hervorgehoben
- [ ] Badge im Menü zeigt Anzahl ungelesener Dokumente

### Dokumententypen
- [ ] **Versicherungsausweise** (auch erreichbar via PROJ-14)
- [ ] **Jahresabrechnungen** (Beitragsübersichten)
- [ ] **Korrespondenz** (Briefe, Mitteilungen)
- [ ] **Bescheinigungen** (Vorsorgebescheinigung, Kapitalbezug, etc.)
- [ ] **Formulare** (ausgefüllte Anträge, Entscheide)
- [ ] **Reglement-Änderungen** (Informationen zu Änderungen)

### Filter & Suche
- [ ] Filter nach Dokumenttyp (Dropdown/Chips)
- [ ] Filter nach Jahr/Zeitraum (Datumsbereich)
- [ ] Filter nach Status (gelesen/ungelesen)
- [ ] Freitextsuche in Dokumenttiteln
- [ ] Kombinierte Filter möglich

### Dokumenten-Ansicht
- [ ] Klick auf Dokument öffnet PDF-Viewer im Browser (eingebettet)
- [ ] Vollbild-Modus für PDF-Viewer
- [ ] Zoom, Navigation zwischen Seiten
- [ ] "Herunterladen"-Button im Viewer
- [ ] Dokument wird automatisch als "gelesen" markiert bei Öffnung

### Download
- [ ] Einzelne Dokumente als PDF herunterladen
- [ ] Mehrfachauswahl für Sammel-Download als ZIP
- [ ] Dateinamen sind sprechend: `2024-01-15_Versicherungsausweis.pdf`

### Bescheinigungen anfordern

#### Verfügbare Bescheinigungstypen
- [ ] **Vorsorgebescheinigung:** Aktueller Stand des Altersguthabens
- [ ] **Bescheinigung für Steuerbehörde:** Jahresübersicht Beiträge/Kapital
- [ ] **Bescheinigung für Bank/Hypothek:** Vorsorgekapital als Eigenmittel
- [ ] **Austrittsbescheinigung:** Für ehemalige Versicherte
- [ ] **Bescheinigung Wohneigentumsförderung (WEF):** Für Vorbezug/Verpfändung

#### Anforderungs-Flow
- [ ] Button "Bescheinigung anfordern" prominent platziert
- [ ] Auswahl des Bescheinigungstyps
- [ ] Je nach Typ: Zusätzliche Angaben (z.B. Stichtag, Empfänger-Adresse)
- [ ] Vorschau der Bescheinigung (falls sofort generierbar)
- [ ] Bestätigung der Anforderung
- [ ] Sofort verfügbare Bescheinigungen: Direkt als PDF downloadbar
- [ ] Komplexere Bescheinigungen: "Wird innerhalb von 3 Arbeitstagen erstellt"

#### Automatisch generierbare Bescheinigungen
- [ ] Vorsorgebescheinigung: Sofort generiert aus aktuellen Daten
- [ ] Steuer-Bescheinigung: Sofort generiert (Standardjahr = letztes abgeschlossenes Jahr)
- [ ] Hypothek-Bescheinigung: Sofort generiert

#### Manuell erstellte Bescheinigungen
- [ ] Komplexe Anfragen: Ticket wird erstellt, PK-Admin bearbeitet
- [ ] Versicherter sieht Status der Anfrage (offen, in Bearbeitung, fertig)
- [ ] Bei Fertigstellung: Dokument erscheint im Archiv + Email-Benachrichtigung

### Benachrichtigungen
- [ ] Bei neuem Dokument: Email an Versicherten
- [ ] Email enthält: Dokumenttyp, Datum, Link zum Portal
- [ ] Keine Dokument-Inhalte per Email (Datenschutz)
- [ ] Versicherter kann Email-Benachrichtigungen in Einstellungen an/abschalten

### Pagination & Performance
- [ ] Lazy Loading bei vielen Dokumenten
- [ ] Initial werden 20 Dokumente geladen
- [ ] "Mehr laden"-Button oder Infinite Scroll
- [ ] Schnelle Filter-Reaktion (client-seitig wenn möglich)

## Edge Cases

### E1: Keine Dokumente vorhanden
- **Szenario:** Neuer Versicherter, noch keine Dokumente
- **Verhalten:** Freundliche Meldung "Noch keine Dokumente vorhanden. Neue Dokumente erscheinen hier automatisch."

### E2: Sehr viele Dokumente
- **Szenario:** Versicherter mit 20+ Jahren Geschichte, hunderte Dokumente
- **Verhalten:** Pagination/Infinite Scroll, performante Filter

### E3: PDF nicht ladbar
- **Szenario:** PDF-Datei ist korrupt oder nicht verfügbar
- **Verhalten:** Fehlermeldung "Dokument konnte nicht geladen werden. Bitte versuchen Sie es später erneut."

### E4: Bescheinigung nicht möglich
- **Szenario:** Versicherter fordert Bescheinigung an, aber Daten fehlen
- **Verhalten:** Hinweis "Diese Bescheinigung kann aktuell nicht erstellt werden. Bitte kontaktieren Sie Ihre Pensionskasse."

### E5: Doppelte Anforderung
- **Szenario:** Versicherter fordert gleiche Bescheinigung mehrfach an
- **Verhalten:** Idempotent - gleiches Dokument wird zurückgegeben, kein Duplikat

### E6: Dokument mit sensiblen Daten
- **Szenario:** Dokument enthält medizinische Informationen (IV-Fall)
- **Verhalten:** Spezielles Flag, eventuell zusätzliche Bestätigung vor Anzeige

### E7: Browser ohne PDF-Support
- **Szenario:** Älterer Browser kann PDF nicht einbetten
- **Verhalten:** Fallback zu direktem Download-Link

### E8: Email-Bounce bei Benachrichtigung
- **Szenario:** Email-Adresse nicht mehr gültig
- **Verhalten:** Bounce wird geloggt, Admin kann sehen welche User nicht erreichbar sind

## Nicht im Scope

- ❌ Dokument-Upload durch Versicherten → separates Feature
- ❌ Zwei-Wege-Kommunikation (Chat/Messaging) → separates Feature
- ❌ Digitale Signatur durch Versicherten → spätere Phase
- ❌ OCR/Volltext-Suche in Dokumentinhalten → spätere Phase

## Technische Anforderungen

- **Storage:** Dokumente in Supabase Storage oder S3-kompatiblem Storage
- **Performance:** Dokumentenliste < 500ms, PDF-Vorschau < 2s
- **Sicherheit:** Signierte URLs für PDF-Zugriff (temporär gültig)
- **PDF-Generierung:** Server-seitige Generierung für Bescheinigungen
- **Caching:** Bescheinigungen mit gleichem Stichtag werden gecacht

## UI/UX Anforderungen

- Inbox-ähnliches Design (vertraut von Email-Clients)
- Klare visuelle Unterscheidung von Dokumenttypen (Icons/Farben)
- Responsive: Dokumente müssen auf Mobile gut nutzbar sein
- Barrierefreiheit: WCAG 2.1 AA konform
- Loading States während PDF lädt

## Datenmodell (Konzept)

### Tabelle: `portal_documents`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| insured_person_id | UUID | FK zu insured_persons |
| document_type | ENUM | certificate, correspondence, statement, form, etc. |
| title | TEXT | Anzeige-Titel |
| file_path | TEXT | Pfad im Storage |
| file_size | INT | Dateigrösse in Bytes |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| is_read | BOOLEAN | Gelesen-Status |
| read_at | TIMESTAMPTZ | Zeitpunkt des ersten Lesens |

### Tabelle: `document_requests`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| insured_person_id | UUID | FK zu insured_persons |
| request_type | ENUM | certificate_vorsoge, certificate_tax, etc. |
| status | ENUM | pending, processing, completed, failed |
| requested_at | TIMESTAMPTZ | Anfragezeitpunkt |
| completed_at | TIMESTAMPTZ | Fertigstellungszeitpunkt |
| result_document_id | UUID | FK zu portal_documents (wenn fertig) |

