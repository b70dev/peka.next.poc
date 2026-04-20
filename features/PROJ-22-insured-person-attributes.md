# PROJ-22: Versicherten-Merkmale (Attribut-Verwaltung)

## Status: Complete
**Created:** 2026-04-20
**Last Updated:** 2026-04-20

## Dependencies
- Requires: PROJ-1 (Authentication) — Nur authentifizierte Benutzer haben Zugriff
- Requires: PROJ-4 (Rollen und Berechtigungen) — Nur Admins/Sachbearbeiter dürfen Merkmale verwalten
- Requires: PROJ-7 (Versicherten-Detail) — Einstiegspunkt zur Merkmale-Seite

## Overview

Admins können zu jeder versicherten Person eine beliebige Anzahl von **Merkmalen** (Attributen) erfassen. Jedes Merkmal besteht aus:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| Merkmals-Art | Dropdown (vordefiniert, DB) | Kategorie des Merkmals, z.B. "Invaliditätsgrad", "Sonderregelung" |
| Ausprägung | Dropdown (vordefiniert, kaskadierend) | Konkreter Wert abhängig von der gewählten Merkmals-Art, z.B. "25%", "50%", "100%" |
| Bemerkung | Freitext | Optionale Zusatzangabe pro Merkmal-Zeile |

## User Stories

- Als Admin möchte ich für eine versicherte Person eine Merkmals-Seite aufrufen können, um alle erfassten Merkmale auf einen Blick zu sehen.
- Als Admin möchte ich ein neues Merkmal erfassen können (Merkmals-Art + Ausprägung + Bemerkung), um relevante Attribute zur versicherten Person zu dokumentieren.
- Als Admin möchte ich ein bestehendes Merkmal bearbeiten können, um fehlerhafte oder veraltete Angaben zu korrigieren.
- Als Admin möchte ich ein Merkmal löschen können, wenn es nicht mehr zutreffend ist.
- Als Admin möchte ich beim Erfassen einer Merkmals-Art nur die dazu passenden Ausprägungen sehen (kaskadierendes Dropdown), um Fehleingaben zu vermeiden.
- Als Admin möchte ich eine Warnung erhalten, wenn ich eine Merkmals-Art erfassen will, die für diese Person bereits existiert, damit keine Duplikate entstehen.

## Acceptance Criteria

### Merkmale-Übersicht
- [ ] Die Merkmale-Seite ist als eigene Route unterhalb der Versicherten-Detail-Seite erreichbar (z.B. `/admin/insured-persons/[id]/attributes`)
- [ ] Die Seite zeigt alle erfassten Merkmale der versicherten Person in einer Tabelle an (Spalten: Merkmals-Art, Ausprägung, Bemerkung, Aktionen)
- [ ] Bei noch keinen Merkmalen wird ein leerer Zustand ("Keine Merkmale erfasst") mit einem "Merkmal hinzufügen"-Button angezeigt
- [ ] Die Seite ist nur für authentifizierte Benutzer mit Admin- oder Sachbearbeiter-Rolle zugänglich

### Merkmal hinzufügen
- [ ] Ein Button "Merkmal hinzufügen" öffnet ein Formular (inline oder in einem Dialog)
- [ ] Das Formular enthält: Dropdown Merkmals-Art (Pflichtfeld), Dropdown Ausprägung (Pflichtfeld, deaktiviert bis Merkmals-Art gewählt), Textfeld Bemerkung (optional)
- [ ] Nach Auswahl einer Merkmals-Art werden im Ausprägung-Dropdown nur die dazu gehörenden Werte geladen
- [ ] Beim Speichern wird geprüft, ob die gewählte Merkmals-Art für diese Person bereits existiert → Fehlermeldung bei Duplikat
- [ ] Nach erfolgreichem Speichern erscheint das neue Merkmal sofort in der Tabelle

### Merkmal bearbeiten
- [ ] Jede Tabellenzeile hat eine "Bearbeiten"-Aktion
- [ ] Das Bearbeitungsformular ist vorausgefüllt mit den aktuellen Werten
- [ ] Nach dem Speichern wird die Zeile in der Tabelle sofort aktualisiert
- [ ] Die Merkmals-Art kann beim Bearbeiten geändert werden (Duplikat-Prüfung gilt auch hier, eigene Zeile ausgenommen)

### Merkmal löschen
- [ ] Jede Tabellenzeile hat eine "Löschen"-Aktion
- [ ] Vor dem Löschen erscheint eine Bestätigungsabfrage ("Merkmal wirklich löschen?")
- [ ] Nach Bestätigung wird das Merkmal entfernt und die Tabelle aktualisiert

### Stammdaten (Merkmals-Arten & Ausprägungen)
- [ ] Merkmals-Arten und ihre Ausprägungen sind in der Datenbank konfiguriert (nicht hardcoded)
- [ ] Die Dropdowns laden ihre Werte dynamisch aus der Datenbank
- [ ] Eine Merkmals-Art kann mehrere Ausprägungen haben; die Ausprägungen werden nur für die gewählte Merkmals-Art angezeigt

## Edge Cases

- **Duplikat-Prüfung:** Wenn eine Merkmals-Art für diese Person bereits erfasst ist, wird das Speichern blockiert und eine klare Fehlermeldung angezeigt ("Diese Merkmals-Art ist für diese Person bereits vorhanden").
- **Keine Ausprägungen verfügbar:** Wenn eine Merkmals-Art keine definierten Ausprägungen hat, bleibt das Dropdown leer und das Speichern ist gesperrt.
- **Leerer Freitext:** Das Bemerkungsfeld ist optional; leere Werte werden als NULL gespeichert und in der Tabelle nicht angezeigt (oder als "-").
- **Lange Freitexte:** Das Bemerkungsfeld ist auf eine sinnvolle Länge begrenzt (z.B. 500 Zeichen); Überschreitungen werden mit Fehlermeldung abgefangen.
- **Gleichzeitige Bearbeitung:** Wenn zwei Admins gleichzeitig Merkmale derselben Person bearbeiten, gewinnt die zuletzt gespeicherte Änderung (Last-Write-Wins); keine spezielle Konfliktauflösung notwendig.
- **Keine Merkmals-Arten in DB:** Wenn die Datenbank noch keine Merkmals-Arten enthält, zeigt das Dropdown einen Hinweis ("Keine Merkmals-Arten konfiguriert") und der Hinzufügen-Button ist deaktiviert.
- **Berechtigungsfehler:** Viewer-Rolle sieht die Merkmale (read-only), hat aber keine Bearbeiten/Löschen-Aktionen.

## Technical Requirements

- **Performance:** Seite lädt in < 2 Sekunden; Dropdown-Werte < 500ms
- **Security:** RLS auf allen Merkmale-Tabellen; nur authentifizierte Admins dürfen schreiben
- **i18n:** Alle Labels und Fehlermeldungen übersetzt (DE/EN/FR, PROJ-5)
- **Accessibility:** Formularfelder mit ARIA-Labels; Tastaturnavigation durch Tabelle und Formular (PROJ-9)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur

```
/insured/[id]/attributes (neue Route)
+-- AttributesPage (Server Component)
|   +-- Breadcrumb (zurück zu /insured/[id])
|   +-- AttributesClient (Client Component)
|       +-- "Merkmal hinzufügen"-Button
|       +-- AttributesTable
|       |   +-- Zeilen: Merkmals-Art | Ausprägung | Bemerkung | Aktionen
|       |   +-- [Bearbeiten-Button] → EditAttributeDialog
|       |   +-- [Löschen-Button] → AlertDialog (Bestätigung)
|       +-- CreateAttributeDialog
|           +-- Select: Merkmals-Art (Pflicht)
|           +-- Select: Ausprägung (kaskadierend, Pflicht)
|           +-- Textarea: Bemerkung (optional, max 500 Zeichen)
+-- Leer-Zustand (wenn keine Merkmale)
```

### Datenbankstruktur (3 neue Tabellen)

```
attribute_types (Stammdaten: Merkmals-Arten)
  id            Eindeutige ID
  name          Name der Art, z.B. "Invaliditätsgrad"
  created_at    Erstellungsdatum

attribute_values (Stammdaten: Ausprägungen)
  id                   Eindeutige ID
  attribute_type_id    → Verweis auf attribute_types
  name                 Wert, z.B. "25%", "50%", "100%"
  sort_order           Reihenfolge im Dropdown
  created_at           Erstellungsdatum

insured_person_attributes (Daten pro Person)
  id                    Eindeutige ID
  insured_person_id     → Verweis auf versicherte Person
  attribute_type_id     → Verweis auf attribute_types
  attribute_value_id    → Verweis auf attribute_values
  note                  Freitext (optional, max 500 Zeichen)
  created_at / updated_at

UNIQUE-Constraint: (insured_person_id, attribute_type_id)
→ verhindert Duplikate auf Datenbankebene
```

### Datenstrom

```
Seitenaufruf
  → Server lädt alle Merkmale der Person + alle Merkmals-Arten + alle Ausprägungen
  → Alles in einem Datenbankaufruf (Joins)

Beim Öffnen des Formulars
  → Merkmals-Arten im Dropdown anzeigen (vorab geladen)
  → Nach Auswahl: Ausprägungen clientseitig filtern (keine extra API-Anfrage)

Speichern / Löschen
  → Server Action (wie in /insured/[id]/actions.ts üblich)
  → Seite wird automatisch aktualisiert (revalidatePath)
```

### Tech-Entscheidungen

| Entscheidung | Wahl | Grund |
|---|---|---|
| Formular-Muster | Dialog (wie `create-insured-person-dialog.tsx`) | Konsistent mit dem Rest der App |
| CRUD-Mechanismus | Server Actions | Kein separater API-Endpunkt nötig |
| Dropdown-Kaskadierung | Client-seitig (alle Werte vorab geladen) | Keine Extra-Anfrage, Stammdaten ändern selten |
| Duplikat-Schutz | DB-Constraint + Fehlermeldung im UI | Sicherheit auf DB-Ebene + gute UX |
| Sicherheit | RLS auf allen 3 Tabellen | Konsistent mit Projektstandard |

### Neue Dateien

```
src/app/[locale]/(protected)/insured/[id]/attributes/
  page.tsx          Seite (Server Component, lädt Daten)
  actions.ts        Server Actions: create, update, delete

src/components/insured/
  attributes-table.tsx          Tabelle mit Bearbeiten/Löschen
  create-attribute-dialog.tsx   Dialog: Merkmal hinzufügen
  edit-attribute-dialog.tsx     Dialog: Merkmal bearbeiten
```

### Keine neuen Packages nötig

Alle benötigten UI-Komponenten (`Select`, `Dialog`, `Table`, `AlertDialog`, `Textarea`) sind bereits installiert.

## QA Test Results

**Tested:** 2026-04-20
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) - Static code review + architectural analysis
**Test Mode:** Code review (no live browser session); build + lint executed

### Build Health

- `npm run build` passes (Next.js 16 compiles cleanly, all routes produced)
- `npm run lint` shows 1 warning (`react-hooks/set-state-in-effect` in `edit-attribute-dialog.tsx:61`)
- Database types (`src/lib/database.types.ts`) correctly include the 3 new tables

### Acceptance Criteria Status

#### AC-1: Merkmale-Übersicht

- [ ] BUG-1 (Design deviation): The spec requires **a dedicated route** (`/admin/insured-persons/[id]/attributes`). The implementation is a **tab** inside the existing detail page (`/insured/[id]` → tab "Merkmale"). The "e.g." in the spec indicates the exact path was an example, but the core requirement — *own route below the detail page* — is not met.
- [x] The view shows all recorded attributes in a table with columns: Merkmals-Art, Ausprägung, Bemerkung, Aktionen.
- [x] Empty state: displays "Keine Merkmale erfasst" + "Merkmal hinzufügen" button.
- [x] Access restricted: Server Actions use `requireRole('admin')` and the page enforces authentication via `supabase.auth.getUser()`. RLS is also in place.

#### AC-2: Merkmal hinzufügen

- [x] "Merkmal hinzufügen" button opens a Dialog (`CreateAttributeDialog`).
- [x] Form contains: Merkmals-Art (required), Ausprägung (required, disabled until type is selected), Bemerkung (optional, textarea).
- [x] Ausprägung dropdown is cascaded: `filteredValues` only shows values whose `attribute_type_id` matches the selected type.
- [x] Duplicate check on save: DB UNIQUE constraint + PostgREST error code `23505` → UI shows translated `duplicateError`.
- [x] After success, the dialog closes and `revalidatePath` refreshes the page — the new row appears immediately.

#### AC-3: Merkmal bearbeiten

- [x] Each row has an Edit action (pencil icon button, properly aria-labeled).
- [x] The edit form is pre-filled with current values (`useEffect` initializes state from `attribute` prop).
- [x] After save the row updates (via `revalidatePath`).
- [x] Merkmals-Art can be changed. The `availableTypes` filter in edit dialog correctly includes the current type (`!existingTypeIds.includes(t.id) || t.id === attribute.attribute_type_id`), so the duplicate check excludes the row itself.

#### AC-4: Merkmal löschen

- [x] Each row has a Delete action (trash icon, destructive styling).
- [x] Confirmation via `AlertDialog` before deletion ("Merkmal wirklich löschen?").
- [x] After confirmation, attribute is removed and the table refreshes.

#### AC-5: Stammdaten (Merkmals-Arten & Ausprägungen)

- [x] Seed data in migration provides 3 types: Invaliditätsgrad, Sonderregelung, Kontaktpräferenz — loaded from DB.
- [x] Dropdowns load values dynamically from `attribute_types` / `attribute_values` via `getAttributeMasterData()`.
- [x] A type can have multiple values; values are filtered by `attribute_type_id` client-side.

### Edge Cases Status

#### EC-1: Duplikat-Prüfung
- [x] DB unique constraint blocks duplicates.
- [x] Server Action returns `{ error: 'duplicateAttribute' }`.
- [x] UI in create/edit dialog shows translated error message.
- [x] Additionally, the create dialog filters out types that are already used — a user cannot even pick them (secondary safeguard).

#### EC-2: Keine Ausprägungen verfügbar
- [x] `filteredValues.length === 0` → Dropdown shows "Keine Ausprägungen verfügbar".
- [x] Save button stays disabled via `!selectedTypeId || !selectedValueId`.

#### EC-3: Leerer Freitext
- [x] `note` is optional, trimmed, and stored as `null` when empty (both client and server).
- [x] In the table, empty note renders as `-`.

#### EC-4: Lange Freitexte (>500 Zeichen)
- [x] Textarea `maxLength={500}` enforces client-side limit.
- [x] Server-side Zod schema also enforces 500-char max.
- [x] DB column type is `VARCHAR(500)`.

#### EC-5: Gleichzeitige Bearbeitung (Last-Write-Wins)
- [x] No optimistic locking / versioning needed per spec; `updated_at` is updated automatically via trigger.

#### EC-6: Keine Merkmals-Arten in DB
- [x] Add-Button is disabled when `attributeTypes.length === 0`.
- [x] Dropdown shows "Keine Merkmals-Arten konfiguriert".

#### EC-7: Berechtigungsfehler (Viewer-Rolle)
- [x] UI: `canEdit` is derived from `hasPermission('insured.edit')` (requires admin). For viewers, the Actions column is hidden and the add button is not rendered.
- [x] Backend: Server Actions enforce `requireRole('admin')`; RLS blocks inserts/updates/deletes for viewers.
- [x] Defense in depth: both UI and server-side checks are in place.

#### Additional Edge Case: All attribute types already used
- [x] Add-Button is disabled when `existingTypeIds.length >= attributeTypes.length`. Good UX touch (not explicitly required by spec).

### Security Audit Results

- [x] **Authentication:** Page requires user via `supabase.auth.getUser()`; all 5 Server Actions (get read/write) reject when unauthenticated.
- [x] **Authorization (RBAC):** Write actions (`createAttribute`, `updateAttribute`, `deleteAttribute`) require at least `admin` via `requireRole('admin')`. RLS policies on `insured_person_attributes` enforce the same at the DB level.
- [x] **RLS:** All 3 new tables (`attribute_types`, `attribute_values`, `insured_person_attributes`) have RLS enabled; read is restricted to active authenticated users only; write on stammdaten is restricted to `super_admin`; write on movement data is restricted to `admin`+.
- [x] **Input validation (Zod):** Server action validates `attribute_type_id`, `attribute_value_id` as UUIDs, note as ≤500 chars. Trimmed and normalized to `null` when empty.
- [x] **FK integrity:** Trigger `enforce_attribute_value_matches_type` prevents saving an Ausprägung that belongs to a different Art (defense against crafted requests that bypass UI cascading).
- [x] **SQL/XSS injection:** Supabase uses parameterized queries. Note is rendered as plain text (React escapes by default) — no `dangerouslySetInnerHTML` anywhere.
- [x] **ID forgery (IDOR):** The delete/update scoping `.eq('id', attributeId).eq('insured_person_id', insuredPersonId)` prevents deleting someone else's attribute by passing only the attribute ID. Defense in depth; RLS would also block this. Good.
- [x] **No sensitive data leaks:** No secrets / PII exposed in API responses beyond the already-protected insured person data.
- [ ] **BUG-SEC-1 (Low, informational):** No rate limiting on Server Actions. This is consistent with the rest of the app (only API routes have rate limits). A rapid repeated write could trigger many `updated_at` changes. Not a blocker.

### Regression Testing (existing features)

- [x] **PROJ-7 (Versicherten-Detail):** The detail page now has one extra tab. The grid layout is conditional on `canCreatePayment` (5 or 6 columns) — both configurations correctly fit the new tab. No fields removed, all existing tabs still work (Insurance/Documents/History remain "Coming soon" placeholders, unchanged).
- [x] **PROJ-4 (RBAC):** Viewer role is correctly blocked from write actions both in UI (no buttons) and backend (`requireRole('admin')` + RLS). No regression.
- [x] **PROJ-5 (i18n):** New keys `insured.attributes.*` and `insured.detail.tabs.attributes` are present in all 3 locale files (de/en/fr).
- [x] **PROJ-1 (Auth):** All new server actions call `supabase.auth.getUser()` or `requireRole()`. No regression.
- [x] **Database types:** Regenerated types (`src/lib/database.types.ts`) correctly reflect the 3 new tables + FK relationships.
- [x] **Build:** `npm run build` passes — no TypeScript errors across the codebase.

### Bugs Found

#### BUG-1: Tab implementation instead of separate route — ACCEPTED
- **Severity:** Low — **Accepted as product decision (2026-04-20)**
- **Decision:** Merkmale werden als Tab in der bestehenden Detail-Seite gezeigt (konsistent mit Insurance/Documents/History-Tabs). Keine separate Route. Spec-Abweichung akzeptiert.

#### BUG-2: ESLint warning — setState inside useEffect in edit dialog
- **Severity:** Low (lint warning, not a functional bug)
- **Steps to Reproduce:**
  1. Run `npm run lint`
  2. Observe warning: `react-hooks/set-state-in-effect` at `src/components/insured/edit-attribute-dialog.tsx:61`
- **Root Cause:** `useEffect` initializes local state from props; React 19/Next 16 recommends using a `key` prop or derived state instead.
- **Impact:** The effect runs synchronously on open, causing a second render. Functional behavior is correct, but this is flagged as non-idiomatic.
- **Priority:** Fix in next sprint (code-quality improvement, not blocking).

#### BUG-3: Redundant index on attribute_types.name
- **Severity:** Low (minor DB hygiene)
- **Steps to Reproduce:**
  1. Inspect migration `20260420_create_insured_person_attributes.sql`
  2. `name` column has both `UNIQUE` constraint (which creates an index automatically) AND an explicit `CREATE INDEX idx_attribute_types_name`.
- **Impact:** Extra storage/maintenance overhead for negligible benefit. Functionally fine.
- **Priority:** Nice to have; fix when convenient.

#### BUG-4: Master data always fetched, even for non-existent persons
- **Severity:** Low (minor perf)
- **Steps to Reproduce:**
  1. Open `/de/insured/<non-existent-uuid>`
  2. Page runs `getAttributeMasterData()` + `getInsuredPersonAttributes()` in parallel with insured-person fetch, even though these results will be thrown away when we hit the "not found" branch.
- **Impact:** One extra DB roundtrip for 404 cases. No security impact.
- **Priority:** Nice to have.

#### BUG-5: Variable shadowing (`t` used for both useTranslations and filter parameter)
- **Severity:** Low (code clarity)
- **File:** `src/components/insured/create-attribute-dialog.tsx:60-61`
- **Details:** `const t = useTranslations(...)` at line 47, then `attributeTypes.filter((t) => ...)` at line 60. The inner `t` shadows the outer. Works correctly but hurts readability.
- **Priority:** Nice to have; rename inner arg to `type`.

### Summary

- **Acceptance Criteria:** 17/18 passed (1 design deviation on routing — see BUG-1; likely intentional product decision)
- **Bugs Found:** 5 total (0 critical, 0 high, 0 medium, 5 low)
- **Security:** Pass — defense in depth (UI + RBAC + RLS + FK trigger + UUID validation + scoped updates/deletes)
- **i18n:** Complete in DE/EN/FR
- **Accessibility:** ARIA labels on Edit/Delete buttons; form fields use `<Label htmlFor>`; using shadcn/ui primitives (Dialog, Select, AlertDialog, Textarea) which are accessible by default.
- **Build:** Pass
- **Production Ready:** YES
- **Recommendation:** Ready to deploy. BUG-1 accepted as product decision. Remaining findings (BUG-2–5) are low-priority and can be addressed in a follow-up sprint.

## Deployment
_To be added by /deploy_
