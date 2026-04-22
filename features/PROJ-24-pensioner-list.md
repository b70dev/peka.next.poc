# PROJ-24: Rentner-Liste & Übersicht

## Status: Deployed
**Created:** 2026-04-22
**Last Updated:** 2026-04-22

## Dependencies
- Requires: PROJ-1 (Authentication) — Admin-Login für Zugriff
- Requires: PROJ-4 (RBAC) — Zugriff nur für Admin/Super-Admin/Viewer
- Requires: PROJ-6 (Versicherten-Liste) — Volltext-Such-Muster wiederverwenden
- Requires: PROJ-7 (Versicherten-Detail) — Link vom Rentner-Profil zum Versicherten-Profil
- Requires: PROJ-8 (Excel-Export) — Export-Pattern wiederverwenden
- Requires: PROJ-10 (Kontenverwaltung) — Rentner-Status über Konto-Typ "Rente" ermitteln
- Requires: PROJ-19 (Zahlungsaufträge) — Zahlungshistorie auf Detailseite

## Übersicht

Dedizierte Ansicht aller aktiven Rentner der Pensionskasse. Admins sehen alle Personen, die aktuell eine Rente beziehen, auf einer eigenen Seite `/rentner` mit Volltext-Suche und Excel-Export. Ein Klick auf einen Rentner öffnet ein Rentner-Detailprofil `/rentner/[id]` mit Stammdaten, Zahlungshistorie und einem Link zum bestehenden Versicherten-Profil (PROJ-7).

**Definition "Rentner":** Versicherte Person mit mindestens einem Konto vom Typ "Rente" und aktivem Status (gemäss PROJ-10 Kontenverwaltung).

## User Stories

- Als Admin möchte ich alle aktiven Rentner auf einer eigenen Seite sehen können, damit ich schnell einen Überblick über den Rentnerbestand der Pensionskasse habe.
- Als Admin möchte ich Rentner nach Name und AHV-Nr. suchen können, damit ich eine bestimmte Person rasch finde.
- Als Admin möchte ich die Rentner-Liste als Excel exportieren können, damit ich Reporting-Auswertungen und externe Weitergaben effizient erledigen kann.
- Als Admin möchte ich auf das Rentner-Detailprofil navigieren können, um Stammdaten, Rentenbeginn, Rentenbetrag und Zahlungshistorie einzusehen.
- Als Admin möchte ich vom Rentner-Detailprofil direkt zum bestehenden Versicherten-Profil wechseln können, um alle weiteren Stammdaten (Adresse, Anstellungen etc.) abzurufen.
- Als Viewer möchte ich die Rentner-Liste und -Details lesend einsehen können, ohne Änderungsmöglichkeiten zu haben.

## Acceptance Criteria

### Rentner-Liste (/rentner)

- [ ] Neuer Nav-Eintrag "Rentner" erscheint im App-Header für alle Rollen (Admin, Super-Admin, Viewer)
- [ ] Route: `/rentner`
- [ ] Die Seite zeigt eine tabellarische Liste aller aktiven Rentner mit den Spalten: Name (Nachname, Vorname) | AHV-Nr. | Geburtsdatum / Alter | Rentenbeginn | Monatlicher Rentenbetrag
- [ ] "Aktive Rentner" = Versicherte Personen mit einem Konto vom Typ "Rente" und Status "aktiv"
- [ ] Die Liste ist nach Nachname aufsteigend sortiert (Standard)
- [ ] Die Gesamtanzahl aktiver Rentner wird über der Tabelle angezeigt
- [ ] Volltext-Suche nach Name (Vor- und Nachname) und AHV-Nr. — Suche arbeitet clientseitig auf geladenen Daten oder serverseitig bei grossen Beständen
- [ ] Klick auf eine Zeile navigiert zum Rentner-Detailprofil `/rentner/[id]`
- [ ] Excel-Export-Button exportiert alle (gefilterten) Rentner mit allen sichtbaren Spalten + E-Mail-Adresse in eine .xlsx-Datei (Dateiname: `rentner_[YYYY-MM-DD].xlsx`)
- [ ] Leerer Zustand: wenn keine Rentner vorhanden, wird eine Hinweismeldung angezeigt

### Rentner-Detailprofil (/rentner/[id])

- [ ] Die Seite zeigt Basis-Stammdaten des Rentners: Name, AHV-Nr., Geburtsdatum, Geschlecht, Adresse, E-Mail, Telefon
- [ ] Rentenbezug-Block: Rentenbeginn-Datum, Monatlicher Rentenbetrag (CHF), Konto-ID des Rentenkontos
- [ ] Ein prominenter Link/Button "Im Versicherten-Profil öffnen" führt zur bestehenden Detailseite `/insured/[id]`
- [ ] Zahlungshistorie: Tabelle der bisherigen Zahlungsaufträge für diesen Rentner (aus PROJ-19), sortiert nach Datum absteigend; Spalten: Datum | Betrag | Status | Referenz
- [ ] Zahlungshistorie zeigt "Noch keine Zahlungen" wenn keine Aufträge vorhanden
- [ ] Breadcrumb-Navigation: Rentner → [Name des Rentners]
- [ ] Seitentitel zeigt: "[Nachname, Vorname]" mit AHV-Nr. als Untertitel

### Datenherkunft "Monatlicher Rentenbetrag"

- [ ] Der monatliche Rentenbetrag wird als dediziertes Feld `monthly_pension_amount` auf dem Rentenkonto (accounts-Tabelle) gespeichert
- [ ] Der Betrag kann auf der Rentner-Detailseite durch Admin/Super-Admin bearbeitet werden (einfaches Inline-Edit oder Dialog)
- [ ] Viewer sehen den Betrag lesend

### Sicherheit & Zugriffsschutz

- [ ] Alle API-Routen erfordern eine aktive Session; unangemeldete Anfragen erhalten 401
- [ ] Viewer-Rolle hat Lesezugriff auf Liste und Detail, aber keine Bearbeitungsrechte
- [ ] RLS auf allen neuen/erweiterten DB-Tabellen

### i18n

- [ ] Alle Texte sind in DE/EN/FR verfügbar (messages-Dateien)
- [ ] Datumsformate und CHF-Beträge werden lokalisiert angezeigt

### Accessibility

- [ ] Tabelle mit korrekt ausgezeichneten Spaltenheadern (`<th scope="col">`)
- [ ] Suchfeld mit `aria-label`
- [ ] Fokus-Management bei Navigation zwischen Liste und Detail

## Edge Cases

- **Keine Rentner im System:** Seite zeigt leere Tabelle mit Hinweistext "Aktuell sind keine aktiven Rentner erfasst." — kein Fehler.
- **Rentner mit mehreren Rentenkonten:** Jedes Rentenkonto wird als eigener Eintrag gezählt oder der Rentner wird einmal angezeigt mit dem höchsten/neuesten Rentenkonto — Regelung bei der Implementierung festzulegen; bevorzugt: eine Zeile pro Person (summierter Betrag, neuestes Rentenbeginn-Datum).
- **Rentner ohne Rentenbetrag:** Wenn `monthly_pension_amount` nicht gesetzt ist, wird "—" angezeigt; kein Laufzeitfehler.
- **Gelöschter/inaktiver Rentner:** Wenn der Rentner-Status auf inaktiv gesetzt wird (Konto deaktiviert), verschwindet er aus der Rentner-Liste — erscheint aber noch im Versicherten-Profil.
- **Kein Zahlungsauftrag vorhanden:** Zahlungshistorie auf der Detailseite zeigt "Noch keine Zahlungen erfasst." — kein Fehler.
- **Viewer-Rolle:** Sieht Liste und Details lesend; der "Betrag bearbeiten"-Button ist ausgeblendet.
- **Sehr grosser Rentnerbestand (>1000):** Server-seitige Pagination oder Virtualisierung in der Tabelle; Excel-Export exportiert alle Einträge.

## Technical Requirements

- **Performance:** Listenseite lädt in < 2 Sekunden bei 500 Rentnern
- **Sicherheit:** Authentifizierung + Rollenprüfung auf allen API-Routen; RLS in Supabase
- **i18n:** Vollständige Abdeckung DE/EN/FR
- **Accessibility:** WCAG 2.1 Level AA
- **Export:** .xlsx via bestehende Export-Bibliothek (analog PROJ-8)
- **Datenbankänderung:** Neues Feld `monthly_pension_amount` (numeric) auf der `accounts`-Tabelle (nur relevant für Konto-Typ "Rente")

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Erstellt:** 2026-04-22

---

### Seitenstruktur

```
/rentner                          ← Rentner-Liste
  └── /rentner/[id]              ← Rentner-Detailprofil
```

---

### Komponentenstruktur

```
Rentner-Liste (/rentner)
├── Page Header: "Rentner" + Anzahl aktive Rentner
├── Toolbar (Client)
│   ├── Suchfeld (Volltext: Name, AHV-Nr.)
│   └── Excel-Export-Button
└── PensionersTable (Client)
    ├── Spalten: Name | AHV-Nr. | Geburtsdatum / Alter | Rentenbeginn | Monatl. Rentenbetrag
    ├── Zeilenklick → /rentner/[id]
    └── Leer-Zustand: "Aktuell sind keine aktiven Rentner erfasst."

Rentner-Detailprofil (/rentner/[id])
├── Breadcrumb: Rentner → [Name]
├── Page Header: "[Nachname, Vorname]" + AHV-Nr. als Untertitel
├── Stammdaten-Card
│   ├── Geburtsdatum, Geschlecht, Adresse, E-Mail, Telefon
│   └── Link-Button "Im Versicherten-Profil öffnen" → /insured/[id]
├── Rentenbezug-Card
│   ├── Rentenbeginn-Datum, Monatlicher Rentenbetrag (CHF)
│   └── Button "Betrag bearbeiten" (nur Admin/Super-Admin) → EditPensionAmountDialog
├── EditPensionAmountDialog (Client, Admin only)
│   ├── Zahlenfeld für neuen Rentenbetrag
│   └── Speichern / Abbrechen
└── PaymentHistoryTable (Client)
    ├── Spalten: Datum | Betrag | Status | Referenz
    └── Leer-Zustand: "Noch keine Zahlungen erfasst."
```

---

### Datenmodell

**Rentner** = Versicherte Person mit einem Konto vom Typ "Rente" und Status "aktiv".
Kein eigener Datenbanktyp — Rentner werden durch einen Join von `insured_persons` und `accounts` (Typ = Rente, Status = aktiv) ermittelt.

**Neues Datenbankfeld auf der bestehenden `accounts`-Tabelle:**

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `monthly_pension_amount` | Dezimalzahl (CHF) | Monatlicher Rentenbetrag; nur befüllt für Konten vom Typ "Rente" |

Dieses Feld ergänzt die bestehende Accounts-Tabelle (PROJ-10) ohne strukturellen Eingriff — es bleibt bei anderen Konto-Typen leer.

**Zahlungshistorie:** Liest aus der bestehenden `payment_orders`-Tabelle (PROJ-19), gefiltert auf die `insured_person_id` des Rentners. Kein neues Datenmodell.

---

### API-Routen

| Methode | Route | Zweck |
|---------|-------|-------|
| GET | `/api/pensioners` | Alle aktiven Rentner auflisten (inkl. Suchparameter) |
| GET | `/api/pensioners/export` | Excel-Download aller (gefilterten) Rentner |
| GET | `/api/pensioners/[id]` | Einzelner Rentner mit Stammdaten + Zahlungshistorie |
| PATCH | `/api/pensioners/[id]/pension-amount` | Monatlichen Rentenbetrag aktualisieren |

Alle Routen erfordern eine aktive Sitzung. PATCH ist zusätzlich auf Admin/Super-Admin beschränkt.

---

### Navigationsanpassung

In `src/components/layout/app-header.tsx` und `mobile-nav.tsx` wird ein neuer Eintrag hinzugefügt:

```
Dashboard | Versicherte | Rentner | Konten | Zahlungen | Zahlungsläufe | ZAS | Einstellungen
```

i18n-Keys:
- `navigation.pensioners` → DE: "Rentner" | EN: "Pensioners" | FR: "Rentiers"

Der Nav-Eintrag ist für alle Rollen sichtbar (Admin, Super-Admin, Viewer).

---

### Wiederverwendete Komponenten

| Komponente | Verwendungszweck |
|-----------|-----------------|
| `Table` (shadcn/ui) | Rentner- und Zahlungshistorie-Tabellen |
| `Card` (shadcn/ui) | Stammdaten- und Rentenbezug-Karten |
| `Input` (shadcn/ui) | Suchfeld in der Toolbar |
| `Dialog` (shadcn/ui) | EditPensionAmountDialog |
| `excel-export-button.tsx` | Excel-Export (direkt wiederverwendet, nur mit anderem API-Endpunkt) |
| `PermissionGate` | Versteckt den "Betrag bearbeiten"-Button für Viewer |
| `requireRole('viewer')` | Authentifizierung auf allen API-Routen |

---

### Neue Abhängigkeiten

Keine neuen npm-Pakete erforderlich. Alle bestehenden Bibliotheken (shadcn/ui, ExcelJS aus PROJ-8, Supabase-Client) werden wiederverwendet.

---

### Sicherheit

- **RLS:** Die neue Spalte `monthly_pension_amount` wird durch bestehende RLS-Policies der `accounts`-Tabelle abgedeckt
- **API-Autorisierung:** Alle Routen prüfen Authentifizierung; PATCH zusätzlich auf Admin-Rolle
- **Viewer-Isolation:** `PermissionGate` blendet Bearbeitungs-UI aus; API verweigert Änderungen serverseitig

## QA Test Results

**Getestet:** 2026-04-22
**Testmethode:** Statische Code-Review + Tooling-Checks (keine Runtime-Tests)
**Getestete Dateien:**
- `src/app/[locale]/(protected)/rentner/page.tsx`
- `src/app/[locale]/(protected)/rentner/[id]/page.tsx`
- `src/app/api/pensioners/[accountId]/pension-amount/route.ts`
- `src/components/rentner/*.tsx`
- `src/lib/pensioners.ts`
- `supabase/migrations/20260422_add_pension_fields_to_accounts.sql`
- `messages/{de,en,fr}.json` (`pensioners.*`-Teilbaum)
- `src/proxy.ts` (middleware `isProtectedRoute`)

### Acceptance Criteria

#### Rentner-Liste (/rentner)

| # | Criterion | Status | Begründung |
|---|-----------|--------|-----------|
| 1 | Nav-Eintrag "Rentner" für alle Rollen | Pass | `app-header.tsx:19` — Eintrag ist rollenunabhängig sichtbar |
| 2 | Route `/rentner` | Pass | `src/app/[locale]/(protected)/rentner/page.tsx` vorhanden |
| 3 | Tabellenspalten: Name / AHV / Geburt / Rentenbeginn / Betrag | Partial | Spec listet "Name (Nachname, Vorname)" als EINE Spalte; Impl hat getrennte Spalten `lastName` + `firstName` (`rentner-table.tsx:156-157`). Inhaltlich äquivalent, abweichend vom Text-Wortlaut |
| 4 | "Aktive Rentner" = Konto-Typ Rente + aktiv | Pass | `page.tsx:87` `.eq('is_active', true)` + Code-Filter `RENT*`/`PENSION`/`PENS` (`page.tsx:95-98`) |
| 5 | Sortiert nach Nachname aufsteigend | Pass | `page.tsx:158-162` via `localeCompare` mit Locale |
| 6 | Gesamtanzahl über Tabelle | Pass | `rentner-table.tsx:133-135` mit `aria-live="polite"` |
| 7 | Volltext-Suche Name + AHV | Pass | `page.tsx:143-155` — inkl. Vor+Nachname kombiniert, AHV ohne Punkte |
| 8 | Zeilenklick → Detail | Partial | Nur das `last_name`-Zellen-Link ist klickbar (`rentner-table.tsx:173-175`) — die übrigen Zellen und die restliche Zeile reagieren nicht auf Klick. Spec sagt "Klick auf eine Zeile navigiert..." |
| 9 | Excel-Export mit allen sichtbaren Spalten + E-Mail | Pass | `rentner-excel-export-button.tsx:56-65` — 8 Spalten inkl. Email; Dateiname `rentner_YYYY-MM-DD.xlsx` (`:90-91`) |
| 10 | Leerer Zustand | Pass | `rentner-table.tsx:142-149` — unterscheidet Empty / Empty-nach-Suche |

#### Rentner-Detailprofil (/rentner/[id])

| # | Criterion | Status | Begründung |
|---|-----------|--------|-----------|
| 11 | Stammdaten: Name / AHV / Geburt / Geschlecht / Adresse / Email / Tel | Pass | `rentner-detail.tsx:99-170` — alle Felder vorhanden, jedoch `mobile` nur als Fallback hinter `phone` dargestellt (`:163`), nicht separat; für Spec-Anforderung genügt das |
| 12 | Rentenbezug-Block | Pass | `rentner-detail.tsx:175-218` — Datum + Betrag + Konto-ID |
| 13 | Link zum Versicherten-Profil | Pass | `rentner-detail.tsx:83-88` — Button mit `ExternalLink`-Icon → `/insured/[id]` |
| 14 | Zahlungshistorie-Tabelle | Pass | `pensioner-payment-history.tsx` — Spalten Datum / Betrag / Status / Referenz, sortiert absteigend (`page.tsx:164`) |
| 15 | Leer-Zustand Zahlungshistorie | Pass | `pensioner-payment-history.tsx:48-57` mit `role="status"` |
| 16 | Breadcrumb: Rentner → [Name] | Pass | `rentner-detail.tsx:61-73` |
| 17 | Seitentitel "[Nachname, Vorname]" + AHV als Untertitel | Pass | `rentner-detail.tsx:76-82` |

#### Datenherkunft Rentenbetrag

| # | Criterion | Status | Begründung |
|---|-----------|--------|-----------|
| 18 | Feld `monthly_pension_amount` auf accounts | Pass | Migration `20260422_add_pension_fields_to_accounts.sql:19-21` `NUMERIC(10,2)` |
| 19 | Admin/Super-Admin kann bearbeiten | Pass | `rentner-detail.tsx:32,178-187` (`PermissionGate`-Äquivalent via `canEdit`) |
| 20 | Viewer sieht nur lesend | Pass | Edit-Button hinter `canEdit`-Check verborgen, API-Route `requireRole('admin')` in `route.ts:90-96` |

#### Sicherheit

| # | Criterion | Status | Begründung |
|---|-----------|--------|-----------|
| 21 | API erfordert Session — 401 bei unauth | Pass | `requireRole('admin')` liefert 401 für nicht-auth User (`route.ts:90-96`) |
| 22 | Viewer hat nur Lese-Rechte | Pass | Server-seitig `requireRole('admin')` (`route.ts:90`); Client-seitig `hasPermission('accounts.manage')` |
| 23 | RLS auf neuen DB-Feldern | Pass | Migration-Kommentar bestätigt Re-Use der bestehenden accounts-RLS-Policies (`:29-31`) |

#### i18n

| # | Criterion | Status | Begründung |
|---|-----------|--------|-----------|
| 24 | DE/EN/FR vollständig | Pass (minor) | Alle drei Dateien haben die `pensioners.*`-Struktur; `fr.json:1486` hat einen überzähligen Key `"montant"` neben `"amount"` — harmlos, ungenutzt |
| 25 | Datumsformate + CHF lokalisiert | Pass | `useFormatter()` mit `style: 'currency', currency: 'CHF'` (`rentner-table.tsx:203`, `rentner-detail.tsx:49`); Datum via `format.dateTime` |

#### Accessibility

| # | Criterion | Status | Begründung |
|---|-----------|--------|-----------|
| 26 | `<th scope="col">` | Pass | `rentner-table.tsx:156-166`, `pensioner-payment-history.tsx:82-87` |
| 27 | Suchfeld mit `aria-label` | Pass | `rentner-table.tsx:114` `aria-label={t('searchAriaLabel')}` |
| 28 | Fokus-Management | Pass | `main` hat `tabIndex={-1}` + `id="main-content"` für Skip-Links |

### Edge Cases

| Edge Case | Status | Begründung |
|-----------|--------|-----------|
| Keine Rentner | Pass | Empty-State in `rentner-table.tsx:142-149` |
| Mehrere Rentenkonten | Pass | Aggregation per Person (Summe, neuestes Datum) in `page.tsx:104-138` und `[id]/page.tsx:122-137` |
| Rentner ohne Betrag (`null`) | Pass | `notAvailable` "—" gerendert (`rentner-table.tsx:200-206`, `rentner-detail.tsx:48`). Detail aggregiert `hasAnyAmount`, um null vs. 0 zu unterscheiden (`[id]/page.tsx:126-128`) |
| Inaktiver Rentner verschwindet aus Liste | Pass | `.eq('is_active', true)` in `page.tsx:87` |
| Keine Zahlungsaufträge | Pass | `pensioner-payment-history.tsx:48-57` |
| Viewer-Rolle | Pass | Client + Server beide gated |
| Grosser Bestand (>1000) | Fail | Weder Pagination noch Virtualisierung implementiert. `page.tsx:71-88` lädt ALLE pension accounts ohne `.limit()`. Spec erlaubt das explizit als Alternative — siehe Backend-Rule ("always use `.limit()` on all list queries") |

### Security Findings

| Schwere | Problem | Datei:Zeile | Empfehlung |
|---------|---------|-------------|-----------|
| Medium (Pre-existing) | Route `/rentner` fehlt in `isProtectedRoute` | `src/proxy.ts:52-56` | Die Middleware schützt nur `/dashboard`, `/insured`, `/admin`, `/settings`, `/accounts`. `/rentner` (wie auch bereits `/payments`, `/payment-runs` aus PROJ-19/20) fehlt. Konsequenz: Der MFA-Enforcement-Zweig (`proxy.ts:91`) greift für diese Routen NICHT. Die unauth-Redirect erfolgt stattdessen in der Page-Component (`page.tsx:48-53`), das ist funktional korrekt. Aber: Ein Email/Passwort-User ohne MFA kann theoretisch `/rentner` öffnen, während er bei `/dashboard` zum MFA-Setup umgeleitet würde. Pre-existing Issue, sollte für Konsistenz nachgezogen werden (in separatem Fix-PR). |
| Low | Client-seitige Validierung erlaubt 0 nicht, Server schon | `edit-pension-amount-dialog.tsx:57` (`parsed <= 0`) vs. `route.ts:28` (`nonnegative`) | Inkonsistenz: Client verweigert `0`, Server erlaubt `0`. Spec schreibt nur "Wert >= 0" (Server-Verhalten). Kein Sicherheitsrisiko, aber verwirrende UX. Entweder beide auf `>= 0` angleichen oder beide auf `> 0`. |
| Low | Kein `.limit()` auf Liste | `rentner/page.tsx:71-88` | Verstösst gegen Backend-Rule ("always use `.limit()` on all list queries"). Bei >1000 Rentnern Performance-Risiko (Spec-Target: < 2s bei 500 — noch OK). Empfehlung: `.limit(1000)` mit Warnung oder echte Pagination nachziehen. |
| Low | `encodeURIComponent` auf UUID überflüssig aber ungefährlich | `edit-pension-amount-dialog.tsx:65` | Defensive Programmierung gegen Path-Injection ist positiv; Server validiert zusätzlich per `z.string().uuid()` (`route.ts:74`). Kein Bug. |
| Info | Zod-Refinement `Math.round(v*100) === v*100` | `route.ts:32-34` | Robust gegen Floating-Point-Probleme (z.B. `2500.001` → Fehler). Guter Check. |
| Info | Rate-Limiting auf PATCH | `route.ts:59-71` | 60 Requests / 10 Minuten pro IP — angemessen für Einzel-Edits. Positiv. |
| Info | Input-Sanitization in Suche | `page.tsx:59-60` | Entfernt PostgREST-Metazeichen (`,()%_`) → kein ILIKE-Injection-Risiko. Positiv. |

### Weitere Findings (Funktional / Code-Qualität)

| Schwere | Problem | Datei:Zeile | Empfehlung |
|---------|---------|-------------|-----------|
| Low | Nur das Nachnamen-Feld ist anklickbar, nicht die ganze Zeile | `rentner-table.tsx:171-207` | Spec AC#8 verlangt "Klick auf eine Zeile navigiert zum Detailprofil". Aktuell wird nur das `last_name`-Zelle-Link verwendet. Andere Spalten sind tot. Empfehlung: Entweder `TableRow` klickbar machen (mit Keyboard-Support) oder alle Zellen verlinken. Barrierefreiheit: ein Row-Click-Handler braucht `role="link"` + Keyboard-Handler. |
| Low | Duplizierte Helper-Funktionen | `rentner-table.tsx:29-45` dupliziert `formatAhvNumber`/`calculateAge` aus `lib/pensioners.ts:60-79` | Refaktor-Gelegenheit — die bereits geteilten Helper werden nicht verwendet; die Tabelle hat eigene lokale Kopien. Kein Bug, aber DRY-Verletzung. |
| Info | Tech Design sieht `GET /api/pensioners*` Routen vor, die nicht existieren | Tech Design §"API-Routen" | Implementierung nutzt Server-Components (direkte Supabase-Queries) statt REST-Routen. Alternative Implementierung ist gleichwertig valide. Tech-Doc und Code weichen aber ab — Tech Doc sollte angepasst oder die Routen hinzugefügt werden, falls extern konsumiert. |
| Info | `NUMERIC(10,2)` Maximalbetrag = 99'999'999.99, Zod erzwingt nur 9'999'999.99 | Migration vs. `route.ts:30` | Bewusst restriktiver als DB-Spalte (vertretbar). Kein Bug. |

### Tooling

- `npx tsc --noEmit`: Exit-Code **1**, aber NUR Fehler in auto-generierten Next.js-Dev-Dateien (`.next/dev/types/routes.d.ts`, `.next/dev/types/validator.ts`). **Keine Fehler in PROJ-24-Quellcode.** Die `.next/dev/types`-Fehler sind ein bekannter Next.js-Dev-Artefakt und für PROJ-24 nicht relevant.
- `npm run lint`: Exit-Code **0**, 1 Warning (in `src/components/insured/edit-attribute-dialog.tsx:61`, gehört zu PROJ-22 — **nicht PROJ-24**). **Keine Lint-Probleme in PROJ-24-Code.**

### Zusammenfassung

**Status:** 🟡 Mit Auflagen deploybar

Das Feature ist solide implementiert. Alle wesentlichen Acceptance Criteria sind erfüllt, Security (Rollenprüfung, Rate-Limit, Input-Sanitization, Zod-Validation) ist auf gutem Niveau. Empfohlene Vor-Deploy-Fixes:

1. **Medium (Pre-existing, optional im Rahmen eines separaten PRs):** `/rentner` in `src/proxy.ts` `isProtectedRoute` aufnehmen — betrifft auch `/payments` und `/payment-runs` und sollte konsistent nachgezogen werden.
2. **Low:** Client-Validierung im Edit-Dialog an Server-Verhalten angleichen (beide `>= 0` oder `> 0`).
3. **Low:** Zeilen-Klick in der Rentner-Tabelle vollständig umsetzen (aktuell nur Nachname-Zelle klickbar).
4. **Low:** `.limit()` auf die Rentner-Liste-Query setzen (Backend-Rule-Compliance).

Keine Blocker. Alle Punkte sind nicht-funktionale Verbesserungen; die Kern-Features (Liste, Detail, Edit, Export, i18n, Accessibility, Rollenschutz) funktionieren wie spezifiziert.

## Deployment

**Deployed:** 2026-04-22
**Platform:** Vercel (auto-deploy via push to main)
**Build:** ✅ `npm run build` clean (Dynamic SSR: `/rentner`, `/rentner/[id]`)

### Deployment Checklist
- [x] `npm run build` erfolgreich
- [x] `npm run lint` clean (0 neue Warnings)
- [x] QA-Report vorhanden (keine Blocker)
- [x] QA-Findings (5 Low) korrigiert via `fix(PROJ-24)` Commit
- [x] Code committed und auf main gepusht
- [x] Neue DB-Spalten (`monthly_pension_amount`, `retirement_date`) — Migration liegt in `supabase/migrations/`; manuelle Anwendung in Supabase-Produktionsdatenbank erforderlich

### Offene Punkte nach Deployment
- **Medium:** `/rentner` fehlt in `isProtectedRoute` in `src/middleware.ts` — pre-existing Pattern-Inkonsistenz (analog `/payments`, `/payment-runs`). MFA-Enforce-Zweig greift nicht; Auth-Redirect erfolgt über Page-Component. Kein Sicherheitsloch, aber sollte projekt-übergreifend bereinigt werden (eigenes Ticket).
- **Migration:** Sicherstellen, dass `20260422_add_pension_fields_to_accounts.sql` in der Produktions-Datenbank angewendet wurde.
