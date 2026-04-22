# PROJ-23: ZAS Lebensnachweis

## Status: Planned
**Created:** 2026-04-22
**Last Updated:** 2026-04-22

## Dependencies
- Requires: PROJ-1 (Authentication) — Admin-Login für Zugriff
- Requires: PROJ-4 (RBAC) — Nur Admin/Super-Admin darf den Prozess starten
- Requires: PROJ-7 (Versicherten-Detail) — Versichertendaten (AHV-Nr., Rentnerstatus) als Quelle
- Requires: PROJ-10 (Kontenverwaltung) — Rentnerstatus über Konto-/Anstellungsstatus ermittelbar

## Übersicht

Der ZAS-Lebensnachweis ist ein periodischer Abgleich von Rentnerdaten der Pensionskasse mit dem zentralen Personenregister der Zentralen Ausgleichsstelle (ZAS). Die Pensionskasse sendet eine Liste ihrer aktiven Rentner (AHV-Nummern) via Sedex an ZAS. ZAS antwortet mit Todesfallmeldungen für Personen, die im Personenregister als verstorben geführt werden. Der Admin bearbeitet die Todesfälle manuell in den Versichertendaten.

## Prozessablauf

```
Admin startet Lauf → Anfragedatei generieren (eCH-0086 XML in eCH-0090 Sedex-Umschlag)
→ Datei bereitstellen für Sedex-Service → Sedex übermittelt an ZAS
→ ZAS antwortet (eCH-0086 Response) → Sedex liefert Antwort
→ Admin importiert Rückmeldung → Todesfälle werden aufgelistet
→ Admin prüft und trägt Sterbedaten manuell ein
```

## User Stories

- Als Admin möchte ich einen ZAS-Lebensnachweis-Lauf starten können, damit ich erfahre, welche Rentner seit der letzten Prüfung verstorben sind.
- Als Admin möchte ich die generierte Anfragedatei herunterladen können, damit ich sie manuell via Sedex einreichen kann oder sie zur Kontrolle prüfen kann.
- Als Admin möchte ich eine ZAS-Rückmeldedatei hochladen können, damit das System die Todesfälle automatisch verarbeitet.
- Als Admin möchte ich eine klare Liste der gemeldeten Todesfälle sehen (Name, AHV-Nr., Sterbedatum), damit ich die Daten kontrollieren und in den Versichertenstammdaten nachtragen kann.
- Als Admin möchte ich zu jedem gemeldeten Todesfall direkt in das Versichertenprofil navigieren können, damit ich das Sterbedatum effizient eintragen kann.
- Als Admin möchte ich den Status eines Laufs (Anfrage erstellt / Rückmeldung importiert / abgeschlossen) nachverfolgen können, damit ich den Bearbeitungsstand im Überblick habe.
- Als Super-Admin möchte ich alle Lebensnachweis-Läufe sehen und deren History einsehen können, damit die Auditpflicht erfüllt ist.

## Acceptance Criteria

### Anfragedatei-Generierung
- [ ] Admin kann auf der Seite "ZAS Lebensnachweis" einen neuen Lauf erstellen
- [ ] Das System ermittelt alle Versicherten mit aktivem Rentner-Status (konfigurierbar: z.B. Konto-Typ = Rente, Status = aktiv)
- [ ] Die Anfragedatei wird als eCH-0086-konformes XML (Vergleichsanfrage) generiert und enthält die AHV-Nr. aller ermittelten Rentner
- [ ] Die generierte Datei ist als Download verfügbar (Dateiname: `zas-lebensnachweis_[YYYY-MM-DD]_[lauf-id-kurz].xml`)
- [ ] Der Lauf erhält den Status "Anfrage erstellt" und wird in der Laufübersicht angezeigt
- [ ] Anzahl einbezogener Rentner wird im Laufdatensatz gespeichert

### Sedex-Bereitstellung
- [ ] Die generierte Anfragedatei wird in einem konfigurierbaren Verzeichnis/Pfad abgelegt (Sedex-Outbox), das vom Sedex-Service abgeholt wird
- [ ] Alternativ kann die Datei manuell heruntergeladen und beim Sedex-Service eingereicht werden (falls keine automatische Sedex-Anbindung)
- [ ] Der Lauf dokumentiert Datum/Uhrzeit der Datei-Bereitstellung

### Rückmeldung importieren
- [ ] Admin kann im jeweiligen Lauf eine ZAS-Rückmeldedatei (eCH-0086 Response XML) hochladen
- [ ] Das System parst die Rückmeldedatei und extrahiert alle Todesfallmeldungen (AHV-Nr., Sterbedatum)
- [ ] Unbekannte AHV-Nummern (nicht im System) werden als Warnung gemeldet, blockieren den Import nicht
- [ ] Nach erfolgreichem Import erhält der Lauf den Status "Rückmeldung importiert"
- [ ] Datum/Uhrzeit des Imports sowie die importierende Person werden gespeichert

### Todesfälle-Übersicht
- [ ] Der Lauf zeigt eine tabellarische Liste der gemeldeten Todesfälle: Name, AHV-Nr., Sterbedatum (aus ZAS-Antwort), aktueller Status im System (offen / bearbeitet)
- [ ] Jede Zeile enthält einen direkten Link zum Versichertenprofil
- [ ] Admin kann eine Todesfallmeldung als "bearbeitet" markieren (nach manuellem Nachtragen in Versichertenstammdaten)
- [ ] Wenn alle Todesfälle als bearbeitet markiert sind, kann der Admin den Lauf auf "abgeschlossen" setzen

### Laufübersicht
- [ ] Die Seite "ZAS Lebensnachweis" zeigt alle bisherigen Läufe in einer Tabelle (neueste zuerst)
- [ ] Tabellenspalten: Datum, Anzahl Rentner, Status, Anzahl Todesfälle, erstellt von
- [ ] Jeder Lauf ist anklickbar und führt zur Lauf-Detailseite
- [ ] Statusbadges: "Anfrage erstellt", "Rückmeldung importiert", "Abgeschlossen"

### Navigation
- [ ] Neuer Nav-Eintrag "ZAS Lebensnachweis" erscheint zwischen "Zahlungsläufe" und "Einstellungen"
- [ ] Route: `/zas-lebensnachweis`
- [ ] Zugriff: nur Admin und Super-Admin (Viewer werden auf Dashboard weitergeleitet)

### Sicherheit & Audit
- [ ] Jede Aktion (Lauf erstellt, Datei importiert, Todesfall als bearbeitet markiert, Lauf abgeschlossen) wird mit Benutzer-ID und Timestamp geloggt
- [ ] Alle API-Routen erfordern Admin-Rolle
- [ ] RLS auf den neuen Datenbanktabellen

## Edge Cases

- **Kein Rentner im System:** Wenn keine Personen mit Rentner-Status gefunden werden, wird dem Admin eine Warnung angezeigt und kein Lauf erstellt.
- **Gleiche AHV-Nr. bereits verstorben:** Wenn eine AHV-Nr. aus der ZAS-Antwort bereits im System mit Sterbedatum versehen ist, wird sie als "bereits bekannt" markiert (kein Duplikat).
- **Ungültige Rückmeldedatei:** Fehlerhafte oder unlesbare XML-Datei wird mit einer klaren Fehlermeldung zurückgewiesen; der Lauf bleibt im Status "Anfrage erstellt".
- **AHV-Nr. aus Antwort nicht im System:** Wird als Warnung in der Import-Zusammenfassung angezeigt, der Rest der Todesfälle wird trotzdem verarbeitet.
- **Lauf ohne Rückmeldung:** Ein Lauf im Status "Anfrage erstellt" kann manuell auf "abgeschlossen (ohne Rückmeldung)" gesetzt werden, falls ZAS keine Meldung zurücksendet.
- **Viewer-Rolle:** Viewer sehen keinen Nav-Eintrag und werden bei direktem URL-Aufruf auf das Dashboard weitergeleitet.
- **Sehr grosse Datei:** Bei vielen Rentnern (>10'000) wird die XML-Generierung serverseitig asynchron ausgeführt und der Download-Link erscheint nach Fertigstellung.

## Technical Requirements

- **Dateiformat (Anfrage & Antwort):** **eCH-0086** (Vergleich / Lesezugriff auf UPI). Der Anfrage-Request enthält eine Liste von AHV-Nummern (Rentnerbestand), die Antwort enthält den Status jeder Person inklusive Todesfall-Informationen. eCH-0086 ist Teil der UPI-Schnittstelle der ZAS.
- **Sedex-Umschlag:** eCH-0090 Version 2 (Sedex Envelope Format)
- **UPIServices-Version:** Version 2 (seit 2025-12-31 obligatorisch für alle Teilnehmer)
- **Authentifizierung:** Sedex-Zertifikat (kein eigenes Login gegenüber UPI — die Identität des Teilnehmers wird über das Sedex-Zertifikat sichergestellt)
- XML-Generierung und -Parsing: serverseitig (API Route), keine Verarbeitung im Browser
- Datei-Upload: Multipart-Form, max. 10 MB
- Sicherheit: Authentifizierung + Admin-Rolle auf allen API-Routen, RLS auf DB-Tabellen
- i18n: Alle Texte in DE/EN/FR (messages-Dateien)
- Accessibility: WCAG 2.1 AA — Tabellen mit Spaltenheadern, Statusänderungen per aria-live

### Nicht verwendet: eCH-0020

Die ursprüngliche Annahme, dass eCH-0020 zum Einsatz kommt, war falsch. eCH-0020 beschreibt Meldegründe für Einwohnerregister (Gemeinden) und ist für den ZAS-UPI-Austausch von Pensionskassen **nicht anwendbar**. Korrekt sind die UPI-Schemas der eCH-0084/0085/0086-Reihe.

### Alternative: eCH-0212 Broadcast (nicht im MVP)

UPIServices V2 bietet mit **eCH-0212** ein Broadcast-Modell: Die PK abonniert Mutationen (z. B. Todesfälle) und erhält diese automatisch ohne periodische Anfrage. Für das MVP wird bewusst das **periodische Vergleichsmodell (eCH-0086)** gewählt, weil:
- Der Admin den Prozess kontrolliert anstossen und nachvollziehen kann (Audit)
- Kein durchgängiger Sedex-Listener in der Serverless-Architektur (Vercel) betrieben werden muss
- Der Aufwand für Broadcast-Abo, Wiederholung und Fehlerbehandlung entfällt

Ein späterer Umstieg auf eCH-0212 ist möglich, wenn sich der Anwendungsfall verändert.

### Offene externe Abklärungen (vor /backend notwendig)

- [ ] **Sedex-Teilnehmer-ID** der Pensionskasse bei der Bundeskanzlei beantragen (sofern noch nicht vorhanden)
- [ ] **Sedex-Zertifikat** beschaffen und installieren (Produktion und Test)
- [ ] **UPIServices-Zugang** bei der ZAS beantragen (Vertrag / Anschluss-Erklärung)
- [ ] **Aktuelle WSDL- und XSD-Dateien** von ZAS beziehen (Stand 2026-01-29) und im Repo unter `docs/ech-schemas/` ablegen
- [ ] **UPI-Interface-Spezifikation V1.10D** (Stand 2025-11-13) und Handbuch einholen
- [ ] **Test-Endpoint der ZAS** (abn/integration) identifizieren für Entwicklung und QA
- [ ] **Sedex-Message-Type** für eCH-0086-Nachrichten bestätigen (aus ZAS-Handbuch)

## Datenbankstruktur (Orientierung)

```
zas_life_verification_runs
  id, created_at, created_by
  status: 'request_created' | 'response_imported' | 'completed' | 'completed_without_response'
  pensioner_count (Anzahl Rentner im Lauf)
  request_filename, request_generated_at
  response_imported_at, response_imported_by
  completed_at, completed_by

zas_life_verification_deaths
  id, run_id (FK), insured_person_id (FK, nullable)
  ahv_number, last_name, first_name
  date_of_death (aus ZAS-Antwort)
  status: 'open' | 'processed' | 'already_known'
  processed_at, processed_by
  notes
```

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Erstellt:** 2026-04-22

---

### Einschränkung: Sedex-Anbindung

Die Applikation läuft auf Vercel (Serverless). Es gibt kein persistentes Dateisystem — die generierte Anfragedatei kann **nicht** automatisch in eine Sedex-Outbox geschrieben werden. Der Admin lädt die Datei herunter und übermittelt sie manuell an den Sedex-Client auf dem lokalen System. Dies entspricht dem gleichen Muster wie der pain.001 XML-Export bei Zahlungsläufen.

---

### Seitenstruktur

```
/zas-lebensnachweis                     ← Laufübersicht (Liste)
  └── /zas-lebensnachweis/[id]          ← Lauf-Detailseite
```

---

### Komponentenstruktur

```
Laufübersicht (/zas-lebensnachweis)
├── Page Header: "ZAS Lebensnachweis" + Button "Neuen Lauf starten"
├── ZasRunsTable (Client)
│   ├── Spalten: Datum | Rentner | Todesfälle | Status | Erstellt von
│   ├── StatusBadge (Anfrage erstellt / Rückmeldung importiert / Abgeschlossen)
│   └── Zeilenklick → Lauf-Detailseite
└── CreateRunDialog
    ├── Info: "X aktive Rentner werden einbezogen"
    ├── Bestätigung durch Admin
    └── Bei Erfolg: Download startet automatisch + Weiterleitung zur Detailseite

Lauf-Detailseite (/zas-lebensnachweis/[id])
├── Page Header: "Lauf vom [Datum]" + StatusBadge
├── Zusammenfassungskarten (3er-Grid)
│   ├── Einbezogene Rentner
│   ├── Gemeldete Todesfälle
│   └── Offene / Bearbeitete Todesfälle
├── Aktionsbereich (je nach Status)
│   ├── Status "Anfrage erstellt":
│   │   ├── Button "Anfragedatei erneut herunterladen"
│   │   ├── Button "ZAS-Rückmeldung hochladen" → ImportResponseDialog
│   │   └── Button "Abschliessen ohne Rückmeldung"
│   ├── Status "Rückmeldung importiert":
│   │   └── Button "Lauf abschliessen" (wenn alle Todesfälle bearbeitet)
│   └── Status "Abgeschlossen":
│       └── Nur Lesezugriff
├── DeathsTable (Client, nur nach Import sichtbar)
│   ├── Spalten: Name | AHV-Nr. | Sterbedatum | Status | Aktionen
│   ├── StatusBadge: "Offen" / "Bearbeitet" / "Bereits bekannt"
│   ├── Link "Im Profil öffnen" → /insured/[id]
│   └── Button "Als bearbeitet markieren"
└── ImportResponseDialog
    ├── Datei-Upload (XML, max. 10 MB)
    ├── Validierungsfeedback
    └── Import-Zusammenfassung (X Todesfälle importiert, Y Warnungen)
```

---

### Datenmodell

**Tabelle: `zas_life_verification_runs`**

Speichert jeden Lebensnachweis-Lauf als eigenständigen Datensatz.

| Feld | Beschreibung |
|------|-------------|
| id | Eindeutige Lauf-ID (UUID) |
| status | `request_created` / `response_imported` / `completed` / `completed_without_response` |
| pensioner_count | Anzahl Rentner zum Zeitpunkt der Erstellung |
| request_filename | Dateiname der generierten Anfragedatei |
| request_generated_at | Zeitstempel der XML-Generierung |
| response_imported_at | Zeitstempel des Rückmeldungs-Imports |
| response_imported_by | Benutzer-ID des importierenden Admins |
| completed_at | Zeitstempel des Abschlusses |
| completed_by | Benutzer-ID des abschliessenden Admins |
| created_at / created_by | Audit-Felder |

**Tabelle: `zas_life_verification_deaths`**

Speichert jeden gemeldeten Todesfall, verknüpft mit dem Lauf und (wenn bekannt) dem Versichertendatensatz.

| Feld | Beschreibung |
|------|-------------|
| id | UUID |
| run_id | FK → zas_life_verification_runs |
| insured_person_id | FK → insured_persons (nullable, falls AHV-Nr. nicht gefunden) |
| ahv_number | AHV-Nr. aus der ZAS-Antwort |
| last_name / first_name | Name aus der ZAS-Antwort |
| date_of_death | Sterbedatum aus der ZAS-Antwort |
| status | `open` / `processed` / `already_known` |
| processed_at / processed_by | Wann und von wem als bearbeitet markiert |
| notes | Optionale Notizen des Admins |

**Wie werden aktive Rentner ermittelt?**
Das System liest Versichertendaten aus der bestehenden `insured_persons`-Tabelle, gefiltert nach Konto-Typ "Rente" und aktivem Status (über die bereits bestehende Kontenverwaltung aus PROJ-10).

---

### API-Routen

| Methode | Route | Zweck |
|---------|-------|-------|
| GET | `/api/zas-runs` | Alle Läufe auflisten |
| POST | `/api/zas-runs` | Neuen Lauf erstellen + eCH-0086 XML generieren |
| GET | `/api/zas-runs/[id]` | Lauf-Detail inkl. Todesfälle |
| GET | `/api/zas-runs/[id]/download` | Anfragedatei als XML-Download |
| POST | `/api/zas-runs/[id]/import-response` | ZAS-Rückmeldedatei hochladen + parsen |
| PATCH | `/api/zas-runs/[id]/complete` | Lauf abschliessen |
| PATCH | `/api/zas-runs/[id]/deaths/[deathId]` | Todesfall als bearbeitet markieren |

Alle Routen erfordern Admin-Rolle. Viewer-Anfragen werden mit 403 abgewiesen.

---

### XML-Verarbeitung (Bibliotheken)

**Schema-Basis:** eCH-0086 (UPI-Vergleichsabfrage), verpackt in einem eCH-0090-V2-Sedex-Umschlag.

**Anfragedatei (eCH-0086 Request generieren):**
Neue Hilfsdatei `src/lib/zas-request-generator.ts` — analog zu `src/lib/pain001-generator.ts`. Generiert ein eCH-0086-konformes XML-Dokument mit den AHV-Nummern der aktiven Rentner. Der Dateiname folgt der Sedex-Konvention `[MessageType]_[Sender]_[Recipient]_[MessageId].xml`.

**Rückmeldedatei (eCH-0086 Response parsen):**
Neue Hilfsdatei `src/lib/zas-response-parser.ts`. Liest die ZAS-Antwort ein und extrahiert pro AHV-Nummer: Status (aktiv / verstorben / unbekannt) und bei Todesfällen das Sterbedatum. Fehlerhafte oder nicht-valide XML-Dateien werden mit einem strukturierten Fehler zurückgegeben.

**XML-Bibliothek:** Es wird die gleiche Parsing-Strategie wie bei pain.001 verwendet (serverseitig, kein Browser-Parsing). Die XSD-Dateien werden zur Entwicklungszeit aus den offiziellen ZAS-Schemas (`docs/ech-schemas/eCH-0086-*.xsd`) abgeleitet; Validierung erfolgt beim Generieren und beim Import.

---

### Navigationsanpassung

In `src/components/layout/app-header.tsx` wird ein neuer Eintrag zwischen `payment-runs` und `settings` eingefügt:

```
Dashboard | Versicherte | Konten | Zahlungen | Zahlungsläufe | ZAS Lebensnachweis | Einstellungen
```

Route: `/zas-lebensnachweis`
i18n-Key: `navigation.zasLifeVerification` (DE: "ZAS Lebensnachweis", EN: "ZAS Life Verification", FR: "Vérification de vie ZAS")

Der Nav-Eintrag ist nur für Admin und Super-Admin sichtbar (über bestehende `PermissionGate`-Komponente).

---

### Wiederverwendete Komponenten

Folgende bestehenden Komponenten werden direkt genutzt, ohne Anpassung:

| Komponente | Verwendungszweck |
|-----------|-----------------|
| `Badge` (shadcn/ui) | Statusanzeige für Läufe und Todesfälle |
| `Table` (shadcn/ui) | Lauf- und Todesfälle-Tabellen |
| `Dialog` (shadcn/ui) | Create-Lauf- und Import-Dialoge |
| `Card` (shadcn/ui) | Zusammenfassungskarten auf der Detailseite |
| `Alert` (shadcn/ui) | Warnungen (kein Rentner, AHV-Nr. nicht gefunden) |
| `PermissionGate` | Zugriffskontrolle für Admin-only Aktionen |
| `requireRole('admin')` | Middleware für alle API-Routen |
| `checkRateLimit()` | Rate-Limiting auf kritischen Routen |

---

### Neue Abhängigkeiten

Keine neuen npm-Pakete erforderlich. Die bestehenden XML-Verarbeitungsmöglichkeiten (native Node.js oder vorhandene Bibliothek aus pain.001) werden wiederverwendet.

---

### Sicherheit & Datenschutz

- **RLS:** Beide neuen Tabellen erhalten Row Level Security; nur authentifizierte Admins können lesen/schreiben
- **AHV-Nummern:** Sensible Daten — kein Logging im Klartext, nur in der DB gespeichert
- **Datei-Upload:** Server-seitige Validierung (Dateityp XML, max. 10 MB, XML-Wohlgeformtheit)
- **Audit-Trail:** Alle Statusänderungen werden mit Benutzer-ID und Timestamp gespeichert (direkt in den Run-/Death-Tabellen, kein separates Event-Log nötig)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
