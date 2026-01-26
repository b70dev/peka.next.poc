# PROJ-6: Versicherte Personen - Liste & Suche

## Status: 🟢 Done (MVP)

## Übersicht

Ermöglicht Pensionskassen-Admins eine Übersicht aller versicherten Personen mit Volltextsuche. Die Liste zeigt die wichtigsten Informationen auf einen Blick und ermöglicht schnellen Zugriff auf Detailansichten.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - User muss eingeloggt sein
- **Benötigt:** PROJ-5 (i18n) - für mehrsprachige Oberfläche
- **Benötigt:** PROJ-9 (Arbeitgeber-Stammdaten) - für Arbeitgeber-Anzeige in Liste
- **Benötigt von:** PROJ-7 (Versicherten-Detail), PROJ-8 (Versicherungsdaten)

## User Stories

### US-1: Versichertenliste anzeigen
Als Pensionskassen-Admin möchte ich eine Übersicht aller versicherten Personen sehen, um schnell einen Überblick über meinen Versichertenbestand zu haben.

### US-2: Versicherte suchen
Als Pensionskassen-Admin möchte ich nach Versicherten suchen können (Name, AHV-Nummer), um eine bestimmte Person schnell zu finden.

### US-3: Liste sortieren
Als Pensionskassen-Admin möchte ich die Liste nach verschiedenen Kriterien sortieren können (Name, Eintrittsdatum, Arbeitgeber), um die Daten besser zu organisieren.

### US-4: Pagination
Als Pensionskassen-Admin möchte ich bei vielen Versicherten durch Seiten blättern können, um die Übersichtlichkeit zu bewahren.

### US-5: Schnellzugriff auf Details
Als Pensionskassen-Admin möchte ich durch Klick auf einen Versicherten zur Detailansicht gelangen, um weitere Informationen einzusehen.

### US-6: Versichertenstatus erkennen
Als Pensionskassen-Admin möchte ich den Status jeder Person auf einen Blick erkennen (Aktiv, Austritt, Pensioniert, Verstorben), um den aktuellen Stand zu sehen.

### US-7: Spaltenreihenfolge anpassen
Als Pensionskassen-Admin möchte ich die Spaltenreihenfolge per Drag & Drop anpassen können, um die für mich wichtigsten Informationen zuerst zu sehen.

### US-8: Nach Spalte gruppieren
Als Pensionskassen-Admin möchte ich die Liste nach einer Spalte gruppieren können (z.B. nach Status oder Arbeitgeber), um zusammengehörige Daten übersichtlich zu sehen.

### US-9: Spalteneinstellungen speichern
Als Pensionskassen-Admin möchte ich, dass meine Spalteneinstellungen (Reihenfolge, Gruppierung) gespeichert werden, damit ich sie beim nächsten Besuch nicht erneut anpassen muss.

## Acceptance Criteria

### Liste
- [x] Liste zeigt alle versicherten Personen der Pensionskasse
- [x] Spalten: Name, Vorname, Geburtsdatum, AHV-Nr, Arbeitgeber, Status, Eintrittsdatum
- [x] Status wird farblich hervorgehoben (Aktiv=grün, Austritt=orange, Pensioniert=blau, Verstorben=grau)
- [x] Zeilen sind klickbar und führen zur Detailansicht (PROJ-7)
- [x] Leere Liste zeigt freundliche Meldung "Keine Versicherten gefunden"

### Suche
- [x] Suchfeld oberhalb der Liste, prominent platziert
- [x] Volltextsuche über: Name, Vorname, AHV-Nummer
- [x] Suche startet automatisch nach 300ms Tippverzögerung (Debounce)
- [x] Suchergebnisse werden sofort in der Liste angezeigt
- [x] "X" Button zum Löschen der Suche
- [x] Anzahl Treffer wird angezeigt ("23 Versicherte gefunden")

### Sortierung
- [x] Klick auf Spaltenheader sortiert die Liste
- [x] Sortierrichtung wird durch Pfeil-Icon angezeigt (↑/↓)
- [x] Standard-Sortierung: Nachname A-Z
- [x] Sortierung bleibt bei Suche erhalten

### Spaltenanpassung (Drag & Drop)
- [x] Spaltenheader können per Drag & Drop horizontal verschoben werden
- [x] Visuelles Feedback während des Ziehens (Spalte wird hervorgehoben)
- [x] Drop-Zone zwischen anderen Spalten ist klar erkennbar
- [x] Neue Spaltenreihenfolge wird sofort angewendet
- [x] Spaltenreihenfolge wird pro User im Browser (localStorage) gespeichert
- [x] "Zurücksetzen"-Button stellt Standard-Reihenfolge wieder her

### Gruppierung
- [x] Gruppierungs-Dropdown oder Drag-to-Group-Bereich oberhalb der Tabelle
- [x] Gruppierung nach: Status, Arbeitgeber, Eintrittsjahr möglich
- [x] Gruppierte Ansicht zeigt Gruppen-Header mit Anzahl Einträgen
- [x] Gruppen können ein-/ausgeklappt werden (Collapse/Expand)
- [x] "Alle aufklappen" / "Alle zuklappen" Buttons
- [x] Gruppierung kann entfernt werden (zurück zur flachen Liste)
- [x] Gruppierungseinstellung wird pro User gespeichert

### Pagination
- [x] Standardmässig 25 Einträge pro Seite
- [x] Pagination-Controls am Seitenende
- [x] Anzeige "Seite 1 von 10" bzw. "1-25 von 234"
- [x] Erste/Letzte Seite Buttons
- [x] Seitenanzahl pro Seite wählbar: 10, 25, 50, 100

### Performance
- [x] Liste lädt in < 500ms (bei bis zu 1000 Versicherten)
- [x] Suche reagiert in < 200ms
- [x] Bei grossen Datenmengen: Server-Side Pagination

### Responsive Design
- [x] Desktop: Vollständige Tabelle mit allen Spalten
- [x] Tablet: Weniger Spalten, horizontales Scrollen möglich
- [ ] Mobile: Card-basierte Darstellung statt Tabelle - *Verschoben auf spätere Version*

## Edge Cases

### E1: Keine Versicherten vorhanden
- **Szenario:** Neue Pensionskasse ohne Versicherte
- **Verhalten:** Freundliche Meldung mit Hinweis "Noch keine Versicherten erfasst. Erfassen Sie den ersten Versicherten."

### E2: Suche ohne Treffer
- **Szenario:** Suchbegriff liefert keine Ergebnisse
- **Verhalten:** "Keine Versicherten für '[Suchbegriff]' gefunden. Prüfen Sie die Schreibweise oder suchen Sie nach anderen Kriterien."

### E3: Sehr viele Versicherte (>10'000)
- **Szenario:** Grosse Pensionskasse mit vielen Versicherten
- **Verhalten:** Server-Side Pagination und Suche, keine Vollladung aller Daten

### E4: Sonderzeichen in Suche
- **Szenario:** User gibt Sonderzeichen ein (z.B. "Müller-Meier")
- **Verhalten:** Sonderzeichen werden korrekt verarbeitet, keine SQL-Injection

### E5: AHV-Nummer Formatierung
- **Szenario:** User sucht mit/ohne Punkte (756.1234.5678.97 vs 7561234567897)
- **Verhalten:** Beide Formate werden erkannt und liefern gleiche Ergebnisse

### E6: Gleichzeitige Bearbeitung
- **Szenario:** Admin A schaut Liste an, Admin B ändert einen Versicherten
- **Verhalten:** Liste zeigt aktuelle Daten bei nächstem Laden (kein Echtzeit-Update nötig für MVP)

### E7: Session abgelaufen während Anzeige
- **Szenario:** User ist lange auf der Seite, Session läuft ab
- **Verhalten:** Bei nächster Interaktion Redirect zum Login

### E8: Spalteneinstellungen bei neuem Browser/Gerät
- **Szenario:** User wechselt Browser oder Gerät
- **Verhalten:** Standard-Spaltenreihenfolge wird angezeigt (localStorage ist gerätespezifisch)

### E9: Gruppierung mit leeren Gruppen
- **Szenario:** Gruppierung nach Status, aber keine Versicherten mit Status "Verstorben"
- **Verhalten:** Leere Gruppen werden nicht angezeigt

### E10: Gruppierung bei Suche
- **Szenario:** User hat gruppierte Ansicht und führt Suche durch
- **Verhalten:** Gruppierung bleibt erhalten, nur passende Einträge werden in ihren Gruppen angezeigt

### E11: Drag & Drop auf Touch-Geräten
- **Szenario:** User nutzt Tablet mit Touch-Bedienung
- **Verhalten:** Long-Press startet Drag-Modus, alternative Spalten-Konfiguration über Menü

## Datenmodell (Vorschlag für Solution Architect)

### Tabelle: `insured_persons` (Versicherte)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| ahv_number | VARCHAR(16) | AHV-Nummer (756.xxxx.xxxx.xx) |
| first_name | VARCHAR(100) | Vorname |
| last_name | VARCHAR(100) | Nachname |
| date_of_birth | DATE | Geburtsdatum |
| gender | ENUM | m/f/d |
| nationality | VARCHAR(2) | ISO-Ländercode |
| marital_status | ENUM | ledig, verheiratet, geschieden, verwitwet, eingetragene Partnerschaft |
| email | VARCHAR(255) | E-Mail (optional) |
| phone | VARCHAR(20) | Telefon (optional) |
| mobile | VARCHAR(20) | Mobile (optional) |
| street | VARCHAR(200) | Strasse + Nr |
| postal_code | VARCHAR(10) | PLZ |
| city | VARCHAR(100) | Ort |
| country | VARCHAR(2) | ISO-Ländercode (default: CH) |
| employer_id | UUID | FK zu employers |
| entry_date | DATE | Eintrittsdatum PK |
| exit_date | DATE | Austrittsdatum (nullable) |
| status | ENUM | active, exited, retired, deceased |
| emergency_contact_name | VARCHAR(200) | Notfallkontakt Name |
| emergency_contact_phone | VARCHAR(20) | Notfallkontakt Telefon |
| notes | TEXT | Interne Bemerkungen |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Letzte Änderung |
| created_by | UUID | FK zu user_profiles |
| updated_by | UUID | FK zu user_profiles |

### Tabelle: `employers` (Arbeitgeber)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| name | VARCHAR(200) | Firmenname |
| uid | VARCHAR(15) | UID-Nummer (CHE-xxx.xxx.xxx) |
| street | VARCHAR(200) | Strasse |
| postal_code | VARCHAR(10) | PLZ |
| city | VARCHAR(100) | Ort |
| country | VARCHAR(2) | ISO-Ländercode |
| contact_name | VARCHAR(200) | Ansprechpartner |
| contact_email | VARCHAR(255) | E-Mail |
| contact_phone | VARCHAR(20) | Telefon |
| is_active | BOOLEAN | Aktiver Arbeitgeber |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Letzte Änderung |

### Tabelle: `user_table_preferences` (Benutzer-Tabelleneinstellungen)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| user_id | UUID | FK zu user_profiles |
| table_name | VARCHAR(50) | Identifikator der Tabelle (z.B. "insured_persons_list") |
| column_order | JSONB | Array der Spalten-IDs in gewünschter Reihenfolge |
| group_by | VARCHAR(50) | Aktive Gruppierungsspalte (nullable) |
| sort_by | VARCHAR(50) | Aktive Sortierspalte |
| sort_direction | ENUM | asc/desc |
| page_size | INTEGER | Einträge pro Seite |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Letzte Änderung |

**Hinweis:** Alternativ kann localStorage im Browser verwendet werden (einfacher, aber nicht geräteübergreifend).

### Tabelle: `insured_person_status_history` (Statushistorie)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| insured_person_id | UUID | FK zu insured_persons |
| old_status | ENUM | Vorheriger Status |
| new_status | ENUM | Neuer Status |
| changed_at | TIMESTAMPTZ | Änderungszeitpunkt |
| changed_by | UUID | FK zu user_profiles |
| reason | TEXT | Begründung (optional) |

## UI/UX Anforderungen

- Clean, professionelle Darstellung passend zu Schweizer Finanzbranche
- Konsistentes Design mit Login/Dashboard (shadcn/ui)
- Breadcrumb-Navigation: Dashboard > Versicherte
- Schnelle Ladezeiten mit Loading-Skeleton

## Nicht im Scope (andere Features)

- ❌ Detailansicht einer Person → PROJ-6
- ❌ Bearbeiten/Erfassen von Versicherten → PROJ-6
- ❌ Versicherungsdaten (Lohn, Beiträge) → PROJ-7
- ❌ Arbeitgeber-Verwaltung → PROJ-8
- ❌ Dokumenten-Upload → PROJ-9
- ❌ Kontakthistorie → PROJ-10
- ❌ Audit-Log → PROJ-11
- ❌ Export (Excel, CSV) → späteres Feature
- ❌ Erweiterte Filter → späteres Feature
