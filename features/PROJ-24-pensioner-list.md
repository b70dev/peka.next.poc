# PROJ-24: Rentner-Liste & Übersicht

## Status: In Progress
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
_To be added by /qa_

## Deployment
_To be added by /deploy_
