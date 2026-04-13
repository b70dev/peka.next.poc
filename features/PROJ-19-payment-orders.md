# PROJ-19: Zahlungsaufträge (Payment Orders)

## Status: Deployed
**Created:** 2026-04-13
**Last Updated:** 2026-04-13

## Dependencies
- Requires: PROJ-10 (Kontenverwaltung) - für automatische Übernahme von Kontodaten und Beträgen
- Requires: PROJ-4 (Rollen und Berechtigungen) - nur Admin/Super-Admin darf Zahlungsaufträge erstellen
- Requires: PROJ-1 (Authentication) - für eingeloggten Benutzer

## User Stories

### US-1: Zahlungsauftrag manuell erstellen
Als **Admin** möchte ich einen Zahlungsauftrag manuell erfassen (Empfänger, IBAN, Betrag, Verwendungszweck), damit ich eine Auszahlung vorbereiten kann.

### US-2: Zahlungsauftrag aus Kontodaten erstellen
Als **Admin** möchte ich einen Zahlungsauftrag aus bestehenden Versicherten- und Kontodaten (PROJ-10) automatisch vorausfüllen lassen, damit ich Zeit spare und Fehler vermeide.

### US-3: IBAN validieren
Als **Admin** möchte ich beim Erfassen einer IBAN sofort eine Validierung sehen (Format, Prüfziffer, Land), damit ich fehlerhafte Bankverbindungen frühzeitig erkenne.

### US-4: Warnung bei ausländischer IBAN
Als **Admin** möchte ich bei Eingabe einer nicht-schweizerischen/nicht-liechtensteinischen IBAN eine Warnung erhalten und diese explizit bestätigen müssen, damit versehentliche Auslandszahlungen vermieden werden.

### US-5: Duplikat-Erkennung
Als **Admin** möchte ich gewarnt werden, wenn ein ähnlicher Zahlungsauftrag bereits existiert (gleicher Empfänger, ähnlicher Betrag, gleicher Zeitraum), damit keine versehentlichen Doppelzahlungen entstehen.

### US-6: Zahlungsaufträge auflisten und filtern
Als **Admin** möchte ich eine Übersicht aller Zahlungsaufträge sehen und nach Status, Empfänger, Betrag und Datum filtern können, damit ich den Überblick behalte.

### US-7: Zahlungsauftrag bearbeiten/stornieren
Als **Admin** möchte ich einen noch nicht freigegebenen Zahlungsauftrag bearbeiten oder stornieren können, damit ich Fehler korrigieren kann.

## Acceptance Criteria

### Zahlungsauftrag erstellen
- [ ] Admin kann einen neuen Zahlungsauftrag über ein Formular erstellen
- [ ] Pflichtfelder: Empfänger-Name, IBAN, Betrag (CHF), Verwendungszweck
- [ ] Optionale Felder: Referenznummer (QR-Referenz oder ISR), Ausführungsdatum, interne Notiz
- [ ] Bei Verknüpfung mit einer versicherten Person werden Name, IBAN und Betrag automatisch vorausgefüllt
- [ ] Nur Benutzer mit Rolle Admin oder Super-Admin können Zahlungsaufträge erstellen
- [ ] Viewer-Rolle hat keinen Zugriff auf Zahlungsaufträge

### IBAN-Validierung
- [ ] IBAN-Format wird clientseitig validiert (Länge, Prüfziffer, Länderkennzeichen)
- [ ] CH- und LI-IBANs werden ohne Warnung akzeptiert
- [ ] Ausländische IBANs lösen einen Warn-Dialog aus, der explizit bestätigt werden muss
- [ ] Ungültige IBANs (falsche Prüfziffer, falsches Format) werden abgelehnt mit Fehlermeldung

### Duplikat-Erkennung
- [ ] System prüft bei Erstellung auf bestehende Zahlungsaufträge mit gleichem Empfänger und ähnlichem Betrag (±5%) innerhalb der letzten 30 Tage
- [ ] Bei Verdacht auf Duplikat wird ein Warn-Dialog angezeigt mit Details zum bestehenden Auftrag
- [ ] Admin kann die Warnung bestätigen und trotzdem fortfahren

### Auftrags-Übersicht
- [ ] Tabellarische Ansicht aller Zahlungsaufträge mit Sortierung und Filterung
- [ ] Status-Anzeige: Entwurf, In Zahlungslauf, Freigegeben, Exportiert, Storniert
- [ ] Schnellsuche nach Empfänger-Name oder IBAN

### Bearbeiten/Stornieren
- [ ] Aufträge im Status "Entwurf" können bearbeitet werden
- [ ] Aufträge im Status "Entwurf" oder "In Zahlungslauf" können storniert werden
- [ ] Aufträge im Status "Freigegeben" oder "Exportiert" können nicht mehr geändert werden

## Edge Cases

### E-1: IBAN ohne Bankverbindung
Was passiert, wenn die IBAN keiner bekannten Bank zugeordnet werden kann?
→ Zahlung trotzdem erlauben, BIC/Bank-Name als "Unbekannt" anzeigen. Die Bank löst die Zuordnung beim Verarbeiten der pain.001-Datei selbst auf.

### E-2: Betrag 0 oder negativ
Was passiert bei Betrag 0 oder negativem Betrag?
→ Validierung: Betrag muss > 0 sein. Fehlermeldung bei 0 oder negativem Wert.

### E-3: Sehr langer Verwendungszweck
Was passiert, wenn der Verwendungszweck die pain.001-Maximallänge (140 Zeichen) überschreitet?
→ Eingabefeld auf 140 Zeichen begrenzen mit Zeichenzähler.

### E-4: Gleichzeitige Bearbeitung
Was passiert, wenn zwei Admins denselben Zahlungsauftrag gleichzeitig bearbeiten?
→ Optimistic Locking: Beim Speichern prüfen, ob der Auftrag seit dem Laden geändert wurde. Bei Konflikt Fehlermeldung mit Option zum Neuladen.

### E-5: Versicherte Person wird gelöscht
Was passiert mit verknüpften Zahlungsaufträgen, wenn die versicherte Person gelöscht/deaktiviert wird?
→ Bestehende Zahlungsaufträge bleiben erhalten (Empfängerdaten sind kopiert, nicht referenziert). Neue Aufträge können nicht mehr aus dieser Person erstellt werden.

### E-6: Währung
Aktuell nur CHF unterstützt. Eingabe einer anderen Währung ist nicht möglich.

## Technical Requirements (optional)
- Performance: Auftragsübersicht mit Filterung < 2 Sekunden (bis 10'000 Aufträge)
- Security: RLS-Policies auf Zahlungsaufträge (nur eigene PK sichtbar)
- Browser Support: Chrome, Firefox, Safari, Edge
- Accessibility: WCAG 2.1 AA (Formulare, Fehlermeldungen, Tabellen)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Übersicht

Zahlungsaufträge werden als neuer eigenständiger Bereich im Admin-Portal umgesetzt. Dieser bildet das Bindeglied zwischen der Kontenverwaltung (PROJ-10, liefert Konto- und Versichertendaten zum Vorausfüllen) und den geplanten Features Zahlungsläufe (PROJ-20) sowie pain.001-Export (PROJ-21). Aufträge werden hier erfasst, in PROJ-20 gebündelt und freigegeben, in PROJ-21 exportiert.

---

### Komponentenstruktur

```
/payments (neue geschützte Route)
+-- PaymentOrdersPage (Server-Komponente — lädt Initialdaten)
    +-- PaymentOrdersClient (Client-Komponente)
        +-- PaymentOrdersToolbar
        |   +-- Suchfeld (nach Empfängername oder IBAN)
        |   +-- Statusfilter (Auswahl: alle / Entwurf / In Zahlungslauf / ...)
        |   +-- Datumsbereichsfilter (optionaler Filter nach Ausführungsdatum)
        |   +-- Neuer-Zahlungsauftrag-Button [nur Admin/Super-Admin]
        +-- PaymentOrdersTable
        |   +-- Zeile: Name, IBAN, Betrag, Verwendungszweck, Statusbadge, Datum
        |   +-- Aktionen: Bearbeiten-Button (nur Entwurf), Stornieren-Button
        +-- CreatePaymentOrderDialog
        |   +-- VersichertePersonAuswahl (optional — Vorausfüllen aus PROJ-10)
        |   +-- EmpfängerNameEingabe
        |   +-- IBANEingabe (Echtzeit-Format- und Prüfziffernvalidierung)
        |   +-- BetragEingabe (CHF, > 0)
        |   +-- VerwendungszweckEingabe (max. 140 Zeichen mit Zeichenzähler)
        |   +-- ReferenznummerEingabe (optional, QR-Referenz/ISR)
        |   +-- AusführungsdatumAuswahl (optional)
        |   +-- InternNotizEingabe (optional, nicht im pain.001)
        |   +-- AusländischeIBANWarnDialog (bei nicht-CH/LI-IBANs)
        |   +-- DuplikatWarnDialog (ausgelöst durch serverseitige Prüfung)
        +-- EditPaymentOrderDialog (gleiches Formular, nur im Status Entwurf)
        +-- StornierungBestätigungDialog
```

---

### Datenmodell

**Neue Tabelle: `payment_orders`**

| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| recipient_name | VARCHAR(140) | Bei Erstellung kopiert — keine direkte Verknüpfung mit der Versicherten-Tabelle |
| iban | VARCHAR(34) | Normalisiert (keine Leerzeichen, Grossbuchstaben) |
| amount | DECIMAL(15,2) | Immer > 0, immer CHF |
| currency | VARCHAR(3) | Fest: 'CHF' |
| purpose | VARCHAR(140) | pain.001 Verwendungszweck, max. 140 Zeichen |
| reference_number | VARCHAR(35) | Optional: QR-Referenz oder ISR |
| execution_date | DATE | Optional: gewünschtes Ausführungsdatum |
| note | TEXT | Optional: nur intern sichtbar, nicht im pain.001 |
| status | ENUM | `draft` → `in_payment_run` → `approved` → `exported`, oder `cancelled` |
| insured_person_id | UUID | Optional: nur für Vorausfüll-Kontext (kein harter Fremdschlüssel) |
| employment_id | UUID | Optional: Vorausfüll-Kontext |
| created_by | UUID | Fremdschlüssel → user_profiles |
| updated_by | UUID | Fremdschlüssel → user_profiles |
| version | INTEGER | Optimistic Locking (Startwert: 1) |
| created_at | TIMESTAMP | Automatisch |
| updated_at | TIMESTAMP | Automatisch |

**Statusablauf:**
```
draft ──────────────────────────────► cancelled
  │                                        ▲
  └─► in_payment_run (PROJ-20) ────────────┤
          │                                │
          └─► approved (PROJ-20) ──────────┘ (kein Storno nach Freigabe)
                  │
                  └─► exported (PROJ-21)
```

Stornierung ist nur in den Status `draft` und `in_payment_run` möglich.
`approved` und `exported` sind unveränderlich.

---

### Technische Entscheidungen

**1. IBAN-Validierung — clientseitig mit der Bibliothek `ibantools`**
`ibantools` übernimmt Formatprüfung, Prüfziffernberechnung (Modulo 97) und Länderkennzeichenerkennung für alle IBAN-Länder. Damit entfällt ein unnötiger Server-Roundtrip beim häufigsten Fall. Serverseitige Zod-Validierung dient als zweite Absicherung.

**2. Duplikat-Erkennung — serverseitige API-Prüfung vor dem Speichern**
Das 30-Tage-Zeitfenster und der ±5%-Betragsvergleich erfordern eine Datenbankabfrage. Der Client ruft einen Prüf-Endpunkt auf, sobald der Benutzer auf "Speichern" klickt. Bei gefundenen Duplikaten erscheint ein Warnhinweis-Dialog. Der Benutzer kann die Warnung bestätigen und trotzdem fortfahren (der finale Speicher-Request trägt ein `force: true`-Flag).

**3. Optimistic Locking bei gleichzeitiger Bearbeitung (E-4)**
Das `version`-Feld wird beim Öffnen des Bearbeitungsdialogs ausgelesen und beim Speichern mitgeschickt. Hat ein anderer Benutzer zwischenzeitlich gespeichert, antwortet der Server mit einem Konfliktfehler (HTTP 409). Das Formular zeigt dann eine Meldung: „Dieser Auftrag wurde zwischenzeitlich geändert — bitte neu laden."

**4. Empfängerdaten werden kopiert, nicht referenziert (E-5)**
Nach der Erstellung ist ein Zahlungsauftrag eigenständig. Das Löschen oder Deaktivieren einer versicherten Person hat keinen Einfluss auf bestehende Aufträge.

**5. Neue Top-Level-Route `/payments`**
Zahlungsaufträge sind ein eigenständiger Verwaltungsworkflow und keine Unterseite einer versicherten Person oder eines Kontos. Ein eigener Navigationseintrag neben „Versicherte" und „Konten" wird ergänzt.

---

### API-Endpunkte

| Methode | Route | Zweck |
|---|---|---|
| GET | `/api/payment-orders` | Liste mit Filtern (Status, Suche, Datumsbereich) — paginiert |
| POST | `/api/payment-orders` | Neuen Auftrag erstellen |
| PATCH | `/api/payment-orders/[id]` | Auftrag bearbeiten (nur Status Entwurf) |
| POST | `/api/payment-orders/[id]/cancel` | Auftrag stornieren (nur Entwurf / In Zahlungslauf) |
| GET | `/api/payment-orders/duplicate-check` | Vor-Speicher-Prüfung (gleicher Empfänger, ±5% Betrag, letzte 30 Tage) |

---

### Sicherheit & Zugriffssteuerung

- **RLS-Policy:** `payment_orders` ist nur für authentifizierte Benutzer mit der Rolle `admin` oder `super_admin` les- und schreibbar. Die Viewer-Rolle ist auf Datenbankebene ausgeschlossen.
- **Route Guard:** Die `PermissionGate`-Komponente schützt Erstellen- und Bearbeiten-Aktionen (bewährtes Muster aus PROJ-4).
- **Kein Zugriff im Versicherten-Portal:** Zahlungsaufträge erscheinen nie im Self-Service-Portal.

---

### Abhängigkeiten (neue Pakete)

| Paket | Zweck |
|---|---|
| `ibantools` | IBAN-Formatvalidierung, Prüfziffernberechnung (Mod 97), Ländererkennung |

Alle weiteren UI-Komponenten werden aus den bereits installierten shadcn/ui-Bausteinen zusammengestellt.

---

### Navigation

Ein neuer Sidebar-Eintrag „Zahlungen" wird der Admin-Navigation hinzugefügt. Er verweist auf `/payments` und ist zwischen „Konten" und „Einstellungen" eingeordnet.

## QA Test Results

**Tested:** 2026-04-13
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS (production build succeeds with no compile errors)

---

### Acceptance Criteria Status

#### AC-1: Zahlungsauftrag erstellen
- [x] Admin kann einen neuen Zahlungsauftrag ueber ein Formular erstellen (CreatePaymentOrderDialog with PaymentOrderForm)
- [x] Pflichtfelder: Empfaenger-Name, IBAN, Betrag (CHF), Verwendungszweck -- all marked with `*`, validated client-side and server-side
- [x] Optionale Felder: Referenznummer, Ausfuehrungsdatum, interne Notiz -- present and correctly optional
- [ ] **PARTIAL:** Bei Verknuepfung mit einer versicherten Person werden Name, IBAN und Betrag automatisch vorausgefuellt -- The `insured_person_id` and `employment_id` fields exist in the schema but no UI for selecting/linking a person exists yet (VersichertePersonAuswahl component from the architecture is not implemented)
- [x] Nur Benutzer mit Rolle Admin oder Super-Admin koennen Zahlungsauftraege erstellen -- `requireRole('admin')` on API + `PermissionGate permission="payment_orders.create"` on UI
- [x] Viewer-Rolle hat keinen Zugriff auf Zahlungsauftraege -- Page redirects viewers to dashboard (line 37-39 of page.tsx), API returns 403

#### AC-2: IBAN-Validierung
- [x] IBAN-Format wird clientseitig validiert (Laenge, Pruefziffer, Laenderkennzeichen) -- using `ibantools` library
- [x] CH- und LI-IBANs werden ohne Warnung akzeptiert -- `DOMESTIC_COUNTRY_CODES = ['CH', 'LI']`
- [x] Auslaendische IBANs loesen einen Warn-Dialog aus, der explizit bestaetigt werden muss -- ForeignIBANWarningDialog component
- [x] Ungueltige IBANs (falsche Pruefziffer, falsches Format) werden abgelehnt mit Fehlermeldung -- mapped error codes with i18n messages

#### AC-3: Duplikat-Erkennung
- [x] System prueft bei Erstellung auf bestehende Zahlungsauftraege mit aehnlichem Betrag (+/-5%) innerhalb der letzten 30 Tage -- POST route lines 53-79
- [x] Bei Verdacht auf Duplikat wird ein Warn-Dialog angezeigt mit Details zum bestehenden Auftrag -- AlertDialog with duplicate details
- [x] Admin kann die Warnung bestaetigen und trotzdem fortfahren -- `force: true` flag

#### AC-4: Auftrags-Uebersicht
- [x] Tabellarische Ansicht aller Zahlungsauftraege mit Sortierung und Filterung -- PaymentOrdersTable with server-side query
- [x] Status-Anzeige: Entwurf, In Zahlungslauf, Freigegeben, Exportiert, Storniert -- Badge with color-coded variants
- [x] Schnellsuche nach Empfaenger-Name oder IBAN -- debounced search with URL params

#### AC-5: Bearbeiten/Stornieren
- [x] Auftraege im Status "Entwurf" koennen bearbeitet werden -- `EDITABLE_STATUSES: ['draft']`
- [x] Auftraege im Status "Entwurf" oder "In Zahlungslauf" koennen storniert werden -- `CANCELLABLE_STATUSES: ['draft', 'in_payment_run']`
- [x] Auftraege im Status "Freigegeben" oder "Exportiert" koennen nicht mehr geaendert werden -- API returns 422, UI hides buttons

---

### Edge Cases Status

#### EC-1: IBAN ohne Bankverbindung
- [x] Handled correctly. No BIC/bank name lookup is performed. IBAN is accepted as long as format/checksum are valid.

#### EC-2: Betrag 0 oder negativ
- [x] Client-side: `parseFloat(formData.amount) <= 0` check + `min="0.01"` on input
- [x] Server-side: `z.number().positive()` in Zod schema

#### EC-3: Sehr langer Verwendungszweck
- [x] Textarea `maxLength={140}` + JS slice `e.target.value.slice(0, 140)`
- [x] Character counter displayed: `{count}/140`
- [x] Server-side: `z.string().max(140)` in Zod schema

#### EC-4: Gleichzeitige Bearbeitung
- [x] Optimistic locking implemented with `version` field
- [x] PATCH route checks version match before and during update (double-check)
- [x] UI shows conflict error message with reload option

#### EC-5: Versicherte Person wird geloescht
- [x] `insured_person_id` is stored as a soft reference (no hard FK constraint per design)
- [x] Recipient data is copied at creation time, not referenced

#### EC-6: Waehrung
- [x] Currency is hardcoded to 'CHF' (`z.literal('CHF').default('CHF')`)
- [x] No currency selection UI exists

---

### Cross-Browser Testing (Code Review)
- [x] Chrome: Standard HTML5 elements, no browser-specific APIs
- [x] Firefox: No `-webkit-` only styles detected, uses Tailwind (autoprefixed)
- [x] Safari: Uses standard date handling; Calendar component uses react-day-picker (cross-browser safe)

### Responsive Testing (Code Review)
- [x] 375px (Mobile): Toolbar stacks vertically (`flex-col gap-4 sm:flex-row`), IBAN column hidden (`hidden md:table-cell`), purpose hidden (`hidden lg:table-cell`), date hidden (`hidden sm:table-cell`)
- [x] 768px (Tablet): IBAN visible, purpose still hidden on md
- [x] 1440px (Desktop): All columns visible
- [x] Dialog has `max-h-[90vh] overflow-y-auto` for small screens

### i18n Testing
- [x] DE: All 95 translation keys present and complete
- [x] EN: All 95 translation keys present and complete
- [x] FR: All 95 translation keys present and complete
- [x] Navigation label present in all 3 locales

---

### Security Audit Results

#### Authentication & Authorization
- [x] Page-level auth: Redirects unauthenticated users to login
- [x] Page-level RBAC: Redirects viewers to dashboard
- [x] API-level auth: All 4 API routes use `requireRole('admin')`
- [x] Deactivated users: `requireRole` calls `getCurrentUserRole` which checks `is_active` and signs out deactivated users
- [ ] **BUG (SEC-1):** No `payment_orders.view` permission defined in roles.ts -- the page itself does a direct role check (`profile.role === 'viewer'`), bypassing the PermissionGate system. This is inconsistent with the rest of the RBAC architecture.

#### Input Validation
- [x] All POST/PATCH inputs validated with Zod schemas server-side
- [x] IBAN normalized (spaces removed, uppercase) before DB storage
- [ ] **BUG (SEC-2):** Search query injection via PostgREST filter syntax. In `page.tsx` line 56, the `searchTerm` is string-interpolated directly into `.or()`:
  ```
  query.or(`recipient_name.ilike.%${searchTerm}%,iban.ilike.%${searchTerm.replace(/\s/g, '')}%`)
  ```
  A crafted search term containing commas or PostgREST operators (e.g. `%,status.eq.cancelled,recipient_name.ilike.%`) could manipulate the filter logic. The search term should be sanitized or use parameterized filter patterns.
- [ ] **BUG (SEC-3):** The `note` field in the POST/PATCH Zod schemas has no max length validation (`z.string().nullish()`). An attacker could send an arbitrarily large string, potentially causing storage/memory issues.
- [x] Amount validation: `z.number().positive()` prevents zero/negative amounts
- [x] Purpose length: capped at 140 chars server-side

#### Route Parameter Validation
- [ ] **BUG (SEC-4):** The `id` parameter from URL routes (`/api/payment-orders/[id]` and `/api/payment-orders/[id]/cancel`) is not validated as a UUID format before being used in database queries. While Supabase will reject invalid UUIDs, explicit validation would prevent unnecessary DB round-trips and provide clearer error messages.

#### Data Exposure
- [x] API responses return only the order's own data (no cross-tenant data leakage via RLS)
- [x] Internal notes are not exposed in any public-facing context
- [x] Error messages are generic (no stack traces or internal details)

#### Rate Limiting
- [ ] **BUG (SEC-5):** No rate limiting on any of the payment order API endpoints. An attacker could flood the system with create requests. This is noted as a technical requirement in the spec ("Security: RLS-Policies auf Zahlungsauftraege") but rate limiting is not implemented.

---

### Bugs Found

#### BUG-1: Missing VersichertePersonAuswahl (Insured Person Picker)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open the Create Payment Order dialog
  2. Expected: An option to link/select an insured person to auto-fill recipient data
  3. Actual: No person picker exists. The `insured_person_id` and `employment_id` fields are in the API schema but have no UI
- **Priority:** Fix in next sprint (US-2 functionality is incomplete)

#### BUG-2: Search Query PostgREST Filter Injection (SEC-2)
- **Severity:** High
- **Steps to Reproduce:**
  1. Navigate to /payments
  2. Enter a search term containing PostgREST filter syntax, e.g.: `test%,status.eq.cancelled,recipient_name.ilike.%`
  3. Expected: The search term is treated as a literal string
  4. Actual: The crafted input could manipulate the `.or()` filter, potentially revealing data that should be filtered out or causing query errors
- **Priority:** Fix before deployment
- **Recommendation:** Escape special characters (commas, dots, percent signs) in the search term before interpolation, or use Supabase's `.ilike()` method with proper parameterization

#### BUG-3: No Max Length on Note Field (Server-Side) (SEC-3)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Send a POST request to /api/payment-orders with a `note` field containing a very large string (e.g., 10MB)
  2. Expected: Server rejects the request or truncates
  3. Actual: The Zod schema allows arbitrarily long strings for the `note` field
- **Priority:** Fix before deployment
- **Recommendation:** Add `.max(5000)` or similar to the `note` field in both Create and Update Zod schemas

#### BUG-4: Missing Date Range Filter in Toolbar
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open the payment orders page
  2. Expected: A date range filter (from/to) as described in the architecture doc (PaymentOrdersToolbar > Datumsbereichsfilter)
  3. Actual: Only search and status filter are implemented. Translation keys `filter.dateFrom` and `filter.dateTo` exist but are unused.
- **Priority:** Fix in next sprint (nice-to-have for MVP)

#### BUG-5: No UUID Validation on Route Parameters (SEC-4)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Send PATCH request to /api/payment-orders/not-a-uuid
  2. Expected: 400 Bad Request with clear error
  3. Actual: The request reaches the database query, which returns an error, and a generic 404 is returned
- **Priority:** Nice to have
- **Recommendation:** Add `z.string().uuid()` validation for the `id` parameter at the top of PATCH and cancel routes

#### BUG-6: No Rate Limiting on Payment Order Endpoints (SEC-5)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Send rapid repeated POST requests to /api/payment-orders
  2. Expected: Rate limiting after N requests per time window
  3. Actual: No rate limiting; all requests are processed
- **Priority:** Fix before deployment (financial operations should be rate-limited)

#### BUG-7: Cancel Dialog Uses Wrong Translation Key for Cancel Button
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open the cancel payment order confirmation dialog
  2. Observe the "Cancel" button text
  3. Expected: Uses `cancel.cancel` or `actions.cancel` key
  4. Actual: Uses `duplicateWarning.cancel` key (line 70 of cancel-payment-order-dialog.tsx). While the text happens to be the same in all languages ("Abbrechen"/"Cancel"/"Annuler"), it is semantically incorrect and could diverge if translations are updated independently.
- **Priority:** Nice to have

#### BUG-8: Inconsistent RBAC Pattern (SEC-1)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Review roles.ts -- no `payment_orders.view` permission exists
  2. The page uses a direct role check (`profile.role === 'viewer'`) instead of using the PermissionGate/hasPermission pattern
  3. Expected: A `payment_orders.view` permission should be defined, and the page should use the permission system consistently
  4. Actual: Mixed RBAC approach
- **Priority:** Fix in next sprint (consistency improvement)

#### BUG-9: Duplicate Check Uses IBAN Only, Not Recipient Name
- **Severity:** Low
- **Steps to Reproduce:**
  1. Create a payment order for "John Doe" with IBAN CH1234...
  2. Create another payment order for "Jane Smith" with the same IBAN and similar amount
  3. Expected per spec: Duplicate warning based on "same recipient" (name-based)
  4. Actual: Duplicate check is IBAN-based, which may be more precise but deviates from the literal spec wording
- **Priority:** Nice to have (IBAN-based matching is arguably better than name-based)

#### BUG-10: Pagination Buttons Not Localized
- **Severity:** Low
- **Steps to Reproduce:**
  1. Switch to DE or FR locale
  2. View paginated payment orders list
  3. Observe pagination button aria-labels: "First page", "Previous page", "Next page", "Last page"
  4. Expected: Localized aria-labels
  5. Actual: Hardcoded English strings in payment-orders-table.tsx lines 210-241
- **Priority:** Nice to have (accessibility/i18n issue)

---

### Summary
- **Acceptance Criteria:** 17/18 passed (1 partial -- insured person auto-fill UI missing)
- **Edge Cases:** 6/6 passed
- **Bugs Found:** 10 total (0 critical, 1 high, 3 medium, 6 low)
- **Security:** 1 high-priority issue (PostgREST filter injection), 3 medium/low issues
- **i18n:** Complete across DE/EN/FR
- **Responsive:** Properly handled with Tailwind breakpoints
- **Production Ready:** **NO** -- BUG-2 (search injection) must be fixed before deployment

---

### Recommendation
Fix the following before deployment:
1. **BUG-2 (High):** Sanitize search input in PostgREST `.or()` filter to prevent filter injection
2. **BUG-3 (Medium):** Add max length to `note` field in Zod schemas
3. **BUG-6 (Medium):** Add rate limiting to payment order API endpoints

After fixes, the remaining medium/low bugs can be addressed in subsequent sprints.

## Deployment

**Deployed:** 2026-04-13
**Branch:** main
**Build:** ✅ Passing

### Pre-Deployment Fixes Applied
- **BUG-2 (High):** PostgREST filter injection in search — sanitize `,()` from search term
- **BUG-3 (Medium):** Added `z.string().max(5000)` to `note` field in POST and PATCH Zod schemas
- **BUG-6 (Medium):** In-memory rate limiting added (20/30/20 requests per 10 min per IP on create/update/cancel)

### Database Migration
- Run `supabase/migrations/20260413_create_payment_orders.sql` in Supabase SQL Editor before use

### Remaining Known Issues (next sprint)
- BUG-1 (Medium): Insured person auto-fill UI not implemented (US-2)
- BUG-4 (Low): Date range filter in toolbar not implemented
- BUG-8 (Low): Inconsistent RBAC pattern (direct role check vs. PermissionGate)
- BUG-10 (Low): Pagination aria-labels not localized
