# PROJ-7: Versicherten-Detail & Stammdaten

## Status: 🟢 Done (MVP)

## Übersicht

Zeigt die vollständigen Informationen einer versicherten Person in einer strukturierten Detailansicht mit Tabs. Ermöglicht das Bearbeiten von Stammdaten direkt in der Ansicht (Inline-Edit) sowie das Erfassen neuer Versicherter.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - User muss eingeloggt sein
- **Benötigt:** PROJ-5 (i18n) - für mehrsprachige Oberfläche
- **Benötigt:** PROJ-6 (Versicherte Liste) - Navigation von Liste zu Detail
- **Benötigt:** PROJ-9 (Arbeitgeber-Stammdaten) - für Arbeitgeber-Auswahl
- **Benötigt von:** PROJ-8 (Versicherungsdaten), PROJ-10 (Dokumente), PROJ-11 (Kontakthistorie)

## User Stories

### US-1: Versicherten-Details anzeigen
Als Pensionskassen-Admin möchte ich alle Informationen einer versicherten Person auf einen Blick sehen, um einen vollständigen Überblick zu haben.

### US-2: Stammdaten bearbeiten (Inline)
Als Pensionskassen-Admin möchte ich einfache Felder direkt in der Ansicht bearbeiten können (Inline-Edit), um schnell Korrekturen vorzunehmen.

### US-3: Stammdaten bearbeiten (Formular)
Als Pensionskassen-Admin möchte ich komplexe Änderungen in einem strukturierten Formular vornehmen können, um alle Felder übersichtlich zu bearbeiten.

### US-4: Neue versicherte Person erfassen
Als Pensionskassen-Admin möchte ich eine neue versicherte Person erfassen können, um den Versichertenbestand zu erweitern.

### US-5: Versicherten-Status ändern
Als Pensionskassen-Admin möchte ich den Status einer Person ändern können (Aktiv → Austritt → Pensioniert), wobei die Änderung protokolliert wird.

### US-6: Navigation zwischen Tabs
Als Pensionskassen-Admin möchte ich zwischen verschiedenen Informationsbereichen (Stammdaten, Versicherung, Dokumente, Historie) wechseln können.

### US-7: Zurück zur Liste
Als Pensionskassen-Admin möchte ich einfach zur Versichertenliste zurückkehren können, ohne meine Suche/Filter zu verlieren.

### US-8: Anstellungen verwalten (Mehrere Arbeitgeber)
Als Pensionskassen-Admin möchte ich einer versicherten Person mehrere Anstellungen bei verschiedenen Arbeitgebern zuweisen können, inkl. Eintrittsdatum und Stellenprozenten.

### US-9: Anstellung hinzufügen
Als Pensionskassen-Admin möchte ich eine neue Anstellung für eine versicherte Person erfassen können, wenn diese bei einem weiteren Arbeitgeber angestellt wird.

### US-10: Anstellung beenden
Als Pensionskassen-Admin möchte ich eine Anstellung beenden können (Austrittsdatum setzen), wenn eine Person einen Arbeitgeber verlässt.

### US-11: Status-Typen verwalten (Admin)
Als Super-Admin möchte ich die verfügbaren Versicherten-Status (Aktiv, Austritt, etc.) konfigurieren können, um sie an unsere Geschäftsprozesse anzupassen.

## Acceptance Criteria

### Detailansicht - Layout
- [x] Header mit Name, AHV-Nr, Status-Badge und Profilbild-Platzhalter
- [x] Tab-Navigation: Stammdaten | Versicherung | Dokumente | Historie
- [ ] Breadcrumb: Dashboard > Versicherte > [Name] - *Verschoben*
- [x] Zurück-Button zur Liste (behält Filter/Suche)
- [ ] Aktionen-Bereich: Bearbeiten, Status ändern, Löschen (mit Berechtigung) - *Verschoben*

### Tab: Stammdaten
- [x] **Persönliche Daten:** Name, Vorname, Geburtsdatum, Geschlecht, Nationalität, Zivilstand
- [x] **Kontaktdaten:** Email, Telefon, Mobile
- [x] **Adresse:** Strasse, PLZ, Ort, Land
- [x] **Notfallkontakt:** Name, Telefon
- [x] **Interne Notizen:** Freitextfeld für Bemerkungen

### Tab: Stammdaten - Anstellungen (Mehrere Arbeitgeber)
- [x] Liste aller Anstellungen der Person (Tabelle)
- [x] Spalten: Arbeitgeber, Eintrittsdatum, Austrittsdatum, Stellenprozent, Status (aktiv/beendet)
- [x] Aktive Anstellungen zuerst, dann beendete (chronologisch)
- [x] "Anstellung hinzufügen"-Button öffnet Dialog
- [ ] Inline-Edit für Stellenprozent möglich - *Verschoben*
- [x] Summe der Stellenprozente wird angezeigt (kann > 100% sein)
- [ ] Klick auf Arbeitgeber-Name öffnet Arbeitgeber-Detail (PROJ-9) - *Benötigt PROJ-9*

### Anstellung hinzufügen/bearbeiten (Dialog)
- [x] Arbeitgeber-Auswahl (Dropdown mit Suche aus PROJ-9)
- [x] Eintrittsdatum (Pflicht)
- [x] Austrittsdatum (optional, für beendete Anstellungen)
- [x] Stellenprozent (1-100%, Pflicht)
- [x] Validierung: Eintrittsdatum nicht in der Zukunft
- [x] Validierung: Austrittsdatum nach Eintrittsdatum
- [x] Speichern / Abbrechen Buttons

### Tab: Versicherung (Platzhalter für PROJ-8)
- [x] Hinweis "Versicherungsdaten werden in PROJ-8 implementiert"
- [x] Leerer Tab mit Coming-Soon-Meldung

### Tab: Dokumente (Platzhalter für PROJ-10)
- [x] Hinweis "Dokumentenverwaltung wird in PROJ-10 implementiert"
- [x] Leerer Tab mit Coming-Soon-Meldung

### Tab: Historie (Platzhalter für PROJ-11)
- [x] Hinweis "Kontakthistorie wird in PROJ-11 implementiert"
- [x] Leerer Tab mit Coming-Soon-Meldung

### Inline-Edit - *Verschoben auf spätere Version*
- [ ] Einfache Felder zeigen Edit-Icon bei Hover
- [ ] Klick auf Icon aktiviert Inline-Bearbeitung
- [ ] Enter speichert, Escape bricht ab
- [ ] Visuelles Feedback bei Speichern (kurzer Spinner, dann Checkmark)
- [ ] Validierung in Echtzeit (z.B. Email-Format)
- [ ] Felder für Inline-Edit: Email, Telefon, Mobile, Adresse, Notfallkontakt, Notizen

### Formular-Bearbeitung (Edit-Modus) - *Verschoben auf spätere Version*
- [ ] "Bearbeiten"-Button öffnet vollständiges Formular
- [ ] Alle Felder sind bearbeitbar
- [ ] Pflichtfelder sind markiert (*)
- [ ] Validierung vor Speichern
- [ ] Speichern / Abbrechen Buttons
- [ ] Unsaved-Changes-Warnung bei Navigation weg

### Neue Person erfassen
- [x] "Neue Person"-Button in der Versichertenliste (PROJ-6)
- [x] Öffnet leeres Formular mit allen Pflichtfeldern
- [x] AHV-Nummer Validierung (Schweizer Format, Prüfziffer via EAN-13)
- [x] Mindestens eine Anstellung muss erfasst werden (Arbeitgeber + Eintrittsdatum + Stellenprozent)
- [x] Nach Speichern: Weiterleitung zur Detailansicht

### Status-Änderung - *Verschoben auf spätere Version*
- [ ] Status-Badge ist klickbar (öffnet Dropdown)
- [ ] Verfügbare Status werden aus Konfigurationstabelle geladen (dynamisch)
- [ ] Default-Status: Aktiv, Austritt, Pensioniert, Verstorben (können angepasst werden)
- [ ] Bei Statuswechsel: Dialog mit Begründungsfeld (optional)
- [ ] Statusänderung wird in Historie protokolliert
- [ ] Bei bestimmten Status (konfigurierbar): Datum wird abgefragt

### Status-Verwaltung (nur Super-Admin) - *Verschoben auf spätere Version*
- [ ] Zugang über Einstellungen/Administration
- [ ] Liste aller Status-Typen mit: Name, Farbe, Sortierung, Ist-Endstatus
- [ ] Neuen Status hinzufügen
- [ ] Bestehenden Status bearbeiten (Name, Farbe)
- [ ] Status deaktivieren (nicht löschen, da historische Daten)
- [ ] Reihenfolge per Drag & Drop ändern
- [ ] Erlaubte Übergänge definieren (welcher Status kann auf welchen folgen)
- [ ] "Ist Endstatus"-Flag (z.B. Verstorben = keine weitere Änderung möglich)

### Validierung
- [x] AHV-Nummer: Format 756.xxxx.xxxx.xx, Prüfziffer validieren (Display)
- [ ] Email: Gültiges Format - *Edit verschoben*
- [ ] Geburtsdatum: In der Vergangenheit, Person max. 120 Jahre alt - *Edit verschoben*
- [ ] Eintrittsdatum: Nach Geburtsdatum, Person min. 17 Jahre alt - *Edit verschoben*
- [ ] Austrittsdatum: Nach Eintrittsdatum (wenn vorhanden) - *Edit verschoben*
- [ ] PLZ: 4-stellig für Schweiz - *Edit verschoben*

### Berechtigungen
- [x] Viewer: Nur Lesen
- [ ] Admin: Lesen + Bearbeiten - *Edit verschoben*
- [ ] Super-Admin: Lesen + Bearbeiten + Löschen - *Edit verschoben*

## Edge Cases

### E1: Person nicht gefunden
- **Szenario:** URL mit ungültiger ID aufgerufen
- **Verhalten:** 404-Seite mit Link zurück zur Liste

### E2: Gleichzeitige Bearbeitung
- **Szenario:** Admin A und Admin B bearbeiten dieselbe Person
- **Verhalten:** Optimistic Locking - Konflikt-Meldung bei Speichern, wenn Daten geändert wurden

### E3: Unsaved Changes bei Navigation
- **Szenario:** User hat Änderungen gemacht und klickt auf anderen Tab/Link
- **Verhalten:** Warnung "Ungespeicherte Änderungen. Wirklich verlassen?"

### E4: AHV-Nummer bereits vorhanden
- **Szenario:** User gibt AHV-Nummer ein, die bereits existiert
- **Verhalten:** Validierungsfehler "Diese AHV-Nummer ist bereits erfasst"

### E5: Arbeitgeber deaktiviert
- **Szenario:** Zugewiesener Arbeitgeber wird inaktiv gesetzt
- **Verhalten:** Bestehende Zuordnung bleibt, Hinweis "Arbeitgeber inaktiv" anzeigen

### E6: Löschversuch bei verknüpften Daten
- **Szenario:** User versucht Person zu löschen, die Versicherungsdaten hat
- **Verhalten:** Soft-Delete (is_deleted Flag) oder Hinweis auf verknüpfte Daten

### E7: Statuswechsel nicht erlaubt
- **Szenario:** Versuch "Verstorben" auf "Aktiv" zu ändern
- **Verhalten:** Nicht erlaubte Übergänge sind ausgegraut/deaktiviert

### E8: Inline-Edit Netzwerkfehler
- **Szenario:** Speichern schlägt fehl (Netzwerk-Problem)
- **Verhalten:** Fehler-Toast, Feld bleibt im Edit-Modus, Retry möglich

### E9: Überlappende Anstellungen beim gleichen Arbeitgeber
- **Szenario:** Person hat bereits aktive Anstellung bei Arbeitgeber X, neue wird erfasst
- **Verhalten:** Warnung anzeigen, aber erlauben (Wiedereintritt möglich)

### E10: Stellenprozent über 100%
- **Szenario:** Person hat 80% bei Arbeitgeber A und 50% bei Arbeitgeber B
- **Verhalten:** Erlauben (ist im PK-Umfeld möglich), Hinweis "Gesamtpensum: 130%"

### E11: Letzter Status-Typ wird gelöscht
- **Szenario:** Admin versucht einzigen aktiven Status zu deaktivieren
- **Verhalten:** Nicht erlaubt, mindestens ein Status muss aktiv sein

### E12: Status mit Daten wird deaktiviert
- **Szenario:** Status "Austritt" wird deaktiviert, aber Personen haben diesen Status
- **Verhalten:** Deaktivieren erlauben, Status bleibt für bestehende Personen sichtbar, kann aber nicht mehr neu zugewiesen werden

## Datenmodell

### Anpassung: `insured_persons` Tabelle

Das Feld `employer_id` wird entfernt, da Anstellungen nun in separater Tabelle geführt werden.
Das Feld `status` wird zu FK auf `insured_person_status_types`.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| ... | ... | (bestehende Felder aus PROJ-6) |
| status_id | UUID | FK zu insured_person_status_types (statt ENUM) |
| ~~employer_id~~ | ~~UUID~~ | ~~entfernt - siehe employments Tabelle~~ |

### Neue Tabelle: `insured_person_status_types` (Konfigurierbare Status)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| name | VARCHAR(50) | Status-Name (z.B. "Aktiv", "Austritt") |
| name_en | VARCHAR(50) | Englische Bezeichnung |
| name_fr | VARCHAR(50) | Französische Bezeichnung |
| color | VARCHAR(7) | Hex-Farbcode (z.B. "#22c55e") |
| sort_order | INTEGER | Reihenfolge in Dropdown |
| is_final | BOOLEAN | Endstatus (keine weitere Änderung möglich) |
| requires_date | BOOLEAN | Datum muss bei Statuswechsel angegeben werden |
| is_active | BOOLEAN | Status kann zugewiesen werden |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Letzte Änderung |

**Default-Einträge:**
| name | color | is_final | requires_date |
|------|-------|----------|---------------|
| Aktiv | #22c55e (grün) | false | false |
| Austritt | #f97316 (orange) | false | true |
| Pensioniert | #3b82f6 (blau) | false | true |
| Verstorben | #6b7280 (grau) | true | true |

### Neue Tabelle: `insured_person_status_transitions` (Erlaubte Übergänge)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| from_status_id | UUID | FK zu status_types (Ausgangsstatus) |
| to_status_id | UUID | FK zu status_types (Zielstatus) |

**Default-Übergänge:** (wie bisher, aber konfigurierbar)

### Neue Tabelle: `employments` (Anstellungen)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| insured_person_id | UUID | FK zu insured_persons |
| employer_id | UUID | FK zu employers |
| entry_date | DATE | Eintrittsdatum beim Arbeitgeber |
| exit_date | DATE | Austrittsdatum (nullable, wenn noch aktiv) |
| employment_rate | DECIMAL(5,2) | Stellenprozent (z.B. 80.00 für 80%) |
| is_primary | BOOLEAN | Hauptarbeitgeber (für Anzeige) |
| notes | TEXT | Bemerkungen zur Anstellung |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Letzte Änderung |
| created_by | UUID | FK zu user_profiles |
| updated_by | UUID | FK zu user_profiles |

**Constraints:**
- employment_rate zwischen 1 und 100
- exit_date >= entry_date (wenn vorhanden)
- Unique: insured_person_id + employer_id + entry_date (verhindert exakte Duplikate)

### Tabelle: `insured_person_status_history` (Statushistorie)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| insured_person_id | UUID | FK zu insured_persons |
| old_status_id | UUID | FK zu status_types (vorheriger Status) |
| new_status_id | UUID | FK zu status_types (neuer Status) |
| effective_date | DATE | Datum ab wann Status gilt |
| reason | TEXT | Begründung (optional) |
| changed_at | TIMESTAMPTZ | Änderungszeitpunkt |
| changed_by | UUID | FK zu user_profiles |

## UI/UX Anforderungen

- Klare visuelle Hierarchie mit Tab-Navigation
- Inline-Edit: Subtil, nicht aufdringlich (Stift-Icon bei Hover)
- Status-Badge: Farbcodiert, prominent im Header
- Responsive: Auf Mobile werden Tabs zu Akkordeon
- Loading-States für alle Aktionen
- Toast-Benachrichtigungen bei Erfolg/Fehler

## Technische Hinweise

- URL-Struktur: `/insured-persons/[id]`
- React Query oder SWR für Daten-Fetching
- Optimistic Updates für Inline-Edit
- Form-Library: react-hook-form mit Zod-Validierung

## Nicht im Scope

- ❌ Versicherungsdaten (Lohn, Beiträge) → PROJ-8
- ❌ Arbeitgeber-Stammdaten verwalten → PROJ-9
- ❌ Dokumente hochladen → PROJ-10
- ❌ Kontakthistorie/Notizen → PROJ-11
- ❌ Audit-Log → PROJ-12
- ❌ Angehörige/Kinder erfassen → späteres Feature
- ❌ Bulk-Edit (mehrere Personen) → späteres Feature
- ❌ Import aus CSV/Excel → späteres Feature
- ❌ Status-Verwaltungs-UI → könnte separates Admin-Feature werden (PROJ-13)
