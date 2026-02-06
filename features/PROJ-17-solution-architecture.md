# PROJ-17: Solution Architecture - Sparbeitragssatze-Verwaltung

## Status: Draft

**Erstellt:** 2026-02-06
**Feature Spec:** [PROJ-17-savings-contribution-rates.md](./PROJ-17-savings-contribution-rates.md)

---

## 1. Ubersicht

Dieses Dokument beschreibt die technische Architektur fur die Sparbeitragssatze-Verwaltung. Das Feature ermoglicht Administratoren, alters- und geschlechtsabhangige Beitragssatze pro Arbeitgeber zu verwalten, mit Versionierung und Excel-Import.

### Scope

```
Sparbeitragssatze-Verwaltung
├── Neue Settings-Seite (CRUD fur Beitragssatze)
├── Zwei neue Datenbank-Tabellen (Versionen + Satze)
├── API-Layer (Server Actions)
├── Excel-Import-Funktion
└── Integration mit PROJ-11 (Hochrechnungen)
```

---

## 2. Komponenten-Struktur

### 2.1 Seitenstruktur (Page Routes)

```
/settings
├── /contribution-rates              [NEU] Ubersicht (Arbeitgeber-Auswahl)
└── /contribution-rates/[employerId] [NEU] Detail-Ansicht fur Arbeitgeber
```

**Dateien:**
```
src/app/[locale]/(protected)/settings/
├── page.tsx                              [ERWEITERN] Neue Card hinzufugen
└── contribution-rates/
    ├── page.tsx                          [NEU] Arbeitgeber-Auswahl
    └── [employerId]/
        └── page.tsx                      [NEU] Hauptansicht
```

### 2.2 UI-Komponenten-Baum

```
Settings-Hauptseite (page.tsx)
└── Card: "Sparbeitragssatze" → Link zu /contribution-rates

Contribution Rates Ubersicht (/contribution-rates)
├── Header mit Zurück-Button
├── Arbeitgeber-Dropdown (Auswahl)
└── Weiterleitung zu /contribution-rates/[employerId]

Contribution Rates Detail (/contribution-rates/[employerId])
├── Header
│   ├── Zurück-Button
│   ├── Titel + Arbeitgeber-Name
│   └── Action-Buttons
│       ├── [Importieren]
│       └── [+ Neue Version]
├── Version-Selector
│   ├── Dropdown mit allen Versionen
│   └── "Gültig ab" Datum
├── Options-Bar
│   ├── Toggle: "Gleiche Satze fur alle Geschlechter"
│   └── Ansicht-Toggle: "Einzelalter" | "Altersgruppen"
├── Rates-Table (Hauptkomponente)
│   ├── Tabellenkopf
│   └── Tabellenzeilen (53 Alter x Geschlecht)
│       ├── Alter
│       ├── Geschlecht (optional)
│       ├── AN-Satz (editierbar)
│       ├── AG-Satz (editierbar)
│       └── Gesamt (berechnet)
├── Age-Group-Editor (Alternative Ansicht)
│   └── Gruppen-Zeilen mit Von/Bis/Satze
├── Footer
│   ├── [BVG-Minimum laden]
│   ├── [Abbrechen]
│   └── [Speichern]
└── Dialogs
    ├── Import-Dialog
    ├── Neue-Version-Dialog
    └── Bestatigung-Dialog
```

### 2.3 Neue Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| `ContributionRatesTable` | `src/components/settings/contribution-rates-table.tsx` | Haupttabelle fur Einzelalter-Ansicht |
| `AgeGroupEditor` | `src/components/settings/age-group-editor.tsx` | Alternative Ansicht fur Altersgruppen |
| `VersionSelector` | `src/components/settings/version-selector.tsx` | Dropdown fur Versionswahl |
| `ImportDialog` | `src/components/settings/contribution-rates-import-dialog.tsx` | Excel/CSV Import |
| `NewVersionDialog` | `src/components/settings/new-version-dialog.tsx` | Neue Version erstellen |
| `BvgMinimumButton` | `src/components/settings/bvg-minimum-button.tsx` | Standard-Werte laden |

---

## 3. Daten-Model

### 3.1 Neue Tabellen

**Tabelle 1: `employer_contribution_rate_versions`**
- Speichert Versionen der Beitragssatze pro Arbeitgeber
- Versionierung uber `valid_from` / `valid_to` Datumsfelder
- Ahnliches Pattern wie bestehende `employer_settings` Tabelle

```
Jede Version enthalt:
- Eindeutige ID
- Arbeitgeber-Referenz
- Gültig-ab-Datum
- Gültig-bis-Datum (NULL = aktuelle Version)
- Flag: Gleiche Satze fur alle Geschlechter
- Audit-Felder (created_at, created_by, updated_at)
```

**Tabelle 2: `employer_contribution_rates`**
- Speichert die einzelnen Beitragssatze
- Eine Zeile pro Alter/Geschlecht-Kombination

```
Jeder Satz enthalt:
- Eindeutige ID
- Version-Referenz
- Alter (18-70)
- Geschlecht (M/W/NULL)
- Arbeitnehmer-Anteil in Prozent
- Arbeitgeber-Anteil in Prozent
```

### 3.2 Beziehungen

```
employers (1) ─────────────────┐
                               │
employer_contribution_rate_versions
    │  - employer_id (FK)      │
    │  - valid_from            │
    │  - valid_to              │
    │  - same_for_all_genders  │
    │                          │
    └──(1:n)───────────────────┤
                               │
employer_contribution_rates    │
    - version_id (FK)          │
    - age (18-70)              │
    - gender (M/W/NULL)        │
    - employee_rate            │
    - employer_rate            │
```

### 3.3 Datenbank-Migration

Die Migration erstellt:
1. Zwei neue Tabellen mit Constraints
2. Indizes fur Performance
3. Row Level Security Policies
4. Trigger fur `updated_at`

**Constraints:**
- Alter muss zwischen 18 und 70 liegen
- Prozentsatze zwischen 0 und 100
- Geschlecht muss 'M', 'W' oder NULL sein
- Keine doppelten Alter/Geschlecht pro Version

---

## 4. API-Design

### 4.1 Server Actions

Das Projekt verwendet Server Actions (nicht REST APIs). Neue Actions werden in einer separaten Datei definiert.

**Datei:** `src/app/[locale]/(protected)/settings/contribution-rates/actions.ts`

| Action | Beschreibung |
|--------|--------------|
| `getContributionRateVersions(employerId)` | Alle Versionen eines Arbeitgebers laden |
| `getContributionRates(versionId)` | Satze einer Version laden |
| `getCurrentContributionRates(employerId)` | Aktuelle Satze laden (fur Hochrechnungen) |
| `createNewVersion(employerId, validFrom, rates)` | Neue Version erstellen |
| `updateContributionRates(versionId, rates)` | Satze aktualisieren |
| `deleteVersion(versionId)` | Version loschen (nur wenn nicht einzige) |
| `importFromExcel(employerId, file)` | Excel/CSV importieren |
| `getExcelTemplate()` | Vorlage herunterladen |

### 4.2 Datenfluss

```
Client                          Server                      Datenbank
──────                          ──────                      ──────────

1. Seite laden
   ───────────────────────────►
                                getContributionRateVersions()
                                ──────────────────────────────────────►
                                ◄──────────────────────────────────────
                                getContributionRates()
                                ──────────────────────────────────────►
                                ◄──────────────────────────────────────
   ◄───────────────────────────

2. Werte bearbeiten
   (lokal im State)

3. Speichern
   ───────────────────────────►
                                updateContributionRates()
                                ──────────────────────────────────────►
                                ◄──────────────────────────────────────
   ◄───────────────────────────
   revalidatePath()
```

---

## 5. Wiederverwendbare Komponenten

### 5.1 Bestehende UI-Komponenten (nutzen)

| Komponente | Verwendung |
|------------|------------|
| `Table`, `TableHeader`, `TableRow`, `TableCell` | Haupttabelle |
| `Dialog`, `DialogContent`, `DialogHeader` | Import/Version-Dialogs |
| `Button` | Alle Buttons |
| `Input` | Prozent-Eingabefelder |
| `Select`, `SelectContent`, `SelectItem` | Version-Dropdown, Geschlecht-Filter |
| `Switch` | "Gleiche Satze" Toggle |
| `Badge` | Version-Status |
| `Card`, `CardHeader`, `CardContent` | Settings-Ubersicht |
| `toast` (sonner) | Erfolgs-/Fehlermeldungen |
| `Loader2` | Lade-Spinner |

### 5.2 Bestehende Patterns (ubernehmen)

| Pattern | Quelle | Verwendung |
|---------|--------|------------|
| Settings-Seiten-Layout | `account-types/page.tsx` | Header, Zurück-Button, Titel |
| Table mit Actions | `account-types-table.tsx` | Tabellen-Struktur |
| Create/Edit Dialog | `create-account-type-dialog.tsx` | Dialog-Struktur |
| Server Actions | `projections/actions.ts` | Action-Pattern mit Auth-Check |
| Versionierung | `employer_settings` | valid_from/valid_to Pattern |
| Internationalisierung | Alle Komponenten | `useTranslations()` Hook |

---

## 6. Zustandsverwaltung

### 6.1 Client State

```
ContributionRatesPage (State)
├── selectedVersionId: string           // Ausgewahlte Version
├── sameForAllGenders: boolean          // Toggle-Zustand
├── viewMode: 'individual' | 'groups'   // Ansichtsmodus
├── rates: ContributionRate[]           // Aktuelle Satze (editierbar)
├── hasUnsavedChanges: boolean          // Dirty-Flag
└── isLoading: boolean                  // Lade-Zustand
```

### 6.2 Server State

- Versionen und Satze werden initial vom Server geladen
- Nach Speichern: `revalidatePath()` fur Cache-Invalidierung
- `router.refresh()` fur Client-Update

---

## 7. Validierung

### 7.1 Client-seitige Validierung

| Feld | Regel | Nachricht |
|------|-------|-----------|
| Prozentsatz | 0 - 100 | "Wert muss zwischen 0% und 100% liegen" |
| Prozentsatz | max. 2 Dezimalstellen | "Maximal 2 Dezimalstellen erlaubt" |
| Prozentsatz | > 25% (Warnung) | "Ungewohnlich hoher Wert - bitte prufen" |
| Altersgruppe | keine Uberlappung | "Alter X ist doppelt definiert" |
| Altersgruppe | keine Lucken | "Alter X-Y fehlt" |
| Gültig-ab | >= heute | "Datum muss heute oder in der Zukunft liegen" |

### 7.2 Server-seitige Validierung

- Gleiche Regeln wie Client
- Zusatzlich: Berechtigungsprufung (nur Admins)
- Vollstandigkeitsprufung (alle Alter abgedeckt)

---

## 8. Integration PROJ-11 (Hochrechnungen)

### 8.1 Anpassung erforderlich

Die Hochrechnungs-Logik in `projections/actions.ts` muss erweitert werden.

**Aktuell:**
- Verwendet feste `annual_contribution` aus Transaktionshistorie

**Neu:**
- Holt Sparbeitragssatze vom Arbeitgeber
- Berechnet Beitrag basierend auf Alter und versichertem Lohn
- Berucksichtigt Satzwechsel bei Altersgrenzen

**Neue Helper-Funktion:**
```
getContributionRateForAge(employerId, age, gender, referenceDate)
→ { employee_rate, employer_rate, total_rate }
```

### 8.2 BVG-Versicherungsalter

```
BVG-Alter = Referenzjahr - Geburtsjahr

Beispiel:
- Geboren: 15.08.1985
- Referenzjahr: 2024
- BVG-Alter: 39 (ganzes Jahr)
```

---

## 9. Excel-Import

### 9.1 Akzeptierte Formate

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- `.csv` (Comma-separated)

### 9.2 Erwartetes Format

| Alter | Geschlecht | AN-Satz | AG-Satz |
|-------|------------|---------|---------|
| 25    | M          | 3.50    | 3.50    |
| 25    | W          | 3.50    | 3.50    |
| 26    | M          | 3.50    | 3.50    |
| ...   | ...        | ...     | ...     |

### 9.3 Import-Ablauf

```
1. Datei hochladen
2. Spalten erkennen (oder manuell zuordnen)
3. Vorschau anzeigen mit Validierung
4. Benutzer bestatigt
5. Daten importieren
```

### 9.4 Dependencies

Fur Excel-Parsing wird ein Package benotigt:
- **xlsx** (SheetJS) - Liest .xlsx, .xls, .csv

---

## 10. Internationalisierung

### 10.1 Neue Ubersetzungsschlüssel

**Datei:** `messages/de.json` (+ en.json, fr.json)

```
settings.contributionRates.*
├── title: "Sparbeitragssatze"
├── description: "Verwalten Sie die Sparbeitragssatze..."
├── table.*
│   ├── age: "Alter"
│   ├── gender: "Geschlecht"
│   ├── employeeRate: "AN-Satz %"
│   ├── employerRate: "AG-Satz %"
│   └── totalRate: "Gesamt %"
├── version.*
│   ├── current: "Aktuelle Version"
│   ├── validFrom: "Gültig ab"
│   └── newVersion: "Neue Version"
├── import.*
│   ├── title: "Importieren"
│   ├── dropzone: "Datei hierher ziehen..."
│   └── template: "Vorlage herunterladen"
└── actions.*
    ├── loadBvgMinimum: "BVG-Minimum laden"
    ├── save: "Speichern"
    └── cancel: "Abbrechen"
```

---

## 11. Sicherheit

### 11.1 Row Level Security (RLS)

```
Policies fur employer_contribution_rate_versions:
- SELECT: Authentifizierte Benutzer konnen lesen
- INSERT/UPDATE/DELETE: Nur Admins (is_admin_user())

Policies fur employer_contribution_rates:
- Gleiche Regeln wie Versionen-Tabelle
```

### 11.2 Berechtigungen

| Rolle | Lesen | Bearbeiten | Loschen |
|-------|-------|------------|---------|
| Sachbearbeiter | Ja | Nein | Nein |
| Admin | Ja | Ja | Ja |
| Super Admin | Ja | Ja | Ja |

---

## 12. Abhangigkeiten

### 12.1 Bestehende Dependencies (bereits installiert)

- `next-intl` - Internationalisierung
- `@supabase/supabase-js` - Datenbank-Client
- `sonner` - Toast-Benachrichtigungen
- `lucide-react` - Icons
- `tailwindcss` - Styling

### 12.2 Neue Dependencies

| Package | Version | Zweck |
|---------|---------|-------|
| `xlsx` | ^0.18.x | Excel/CSV-Import |

---

## 13. Implementierungs-Reihenfolge

### Phase 1: Datenbank (Backend Developer)
1. Migration erstellen (Tabellen + Constraints)
2. RLS Policies konfigurieren
3. database.types.ts aktualisieren

### Phase 2: API-Layer (Backend Developer)
1. Server Actions implementieren
2. Validierungs-Logik
3. Tests

### Phase 3: UI Grundstruktur (Frontend Developer)
1. Settings-Seite erweitern (neue Card)
2. Contribution Rates Seiten erstellen
3. Haupttabelle implementieren

### Phase 4: Features (Frontend Developer)
1. Version-Selector
2. Altersgruppen-Modus
3. BVG-Minimum-Vorlage

### Phase 5: Import (Frontend Developer)
1. Import-Dialog
2. Excel-Parsing
3. Vorschau + Validierung

### Phase 6: Integration (Backend Developer)
1. PROJ-11 Anpassungen
2. Helper-Funktionen

### Phase 7: Finishing
1. Ubersetzungen
2. Tests
3. Review

---

## 14. Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Grosse Datenmenge (106 Zeilen) | Mittel | Virtualisierte Tabelle oder Pagination |
| Excel-Import Fehler | Hoch | Ausführliche Validierung + Vorschau |
| Concurrent Editing | Niedrig | Optimistic Locking (Version-Check vor Speichern) |
| Performance bei Hochrechnung | Niedrig | Caching der Satze pro Anfrage |

---

## 15. Offene Fragen

1. **Risikobeitrage:** Sollen auch Risikobeitragssatze (Invaliditat/Tod) verwaltet werden?
   - Entscheidung: TBD (nicht in diesem Scope)

2. **Export-Funktion:** Soll ein Excel-Export moglich sein?
   - Entscheidung: TBD (Nice-to-have)

3. **Audit-Log:** Soll jede Anderung detailliert geloggt werden?
   - Entscheidung: Ja, uber `created_at`, `created_by`, `updated_at`

---

## 16. Checkliste fur Review

- [ ] Datenbank-Schema bestatigt
- [ ] API-Design bestatigt
- [ ] UI-Komponenten bestatigt
- [ ] Sicherheitskonzept bestatigt
- [ ] Abhangigkeiten genehmigt
- [ ] Implementierungs-Reihenfolge akzeptiert

---

**Nachster Schritt:** Review durch Produkt-Manager, dann Handoff an Backend Developer fur Phase 1.
