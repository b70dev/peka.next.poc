# PROJ-21: pain.001 XML-Generierung (ISO 20022)

## Status: Planned
**Created:** 2026-04-13
**Last Updated:** 2026-04-13

## Dependencies
- Requires: PROJ-20 (Zahlungsläufe & Freigabe) - nur freigegebene Zahlungsläufe können als XML exportiert werden
- Requires: PROJ-4 (Rollen und Berechtigungen) - nur Admin/Super-Admin darf XML generieren
- Requires: PROJ-1 (Authentication) - für eingeloggten Benutzer

## User Stories

### US-1: pain.001-Version wählen
Als **Admin** möchte ich beim Export die pain.001-Version wählen können (pain.001.001.03.ch.02 oder pain.001.001.09.ch.03), damit ich die Datei passend für meine Bank generieren kann.

### US-2: XML-Datei generieren
Als **Admin** möchte ich aus einem freigegebenen Zahlungslauf eine pain.001-XML-Datei generieren, damit ich diese in mein E-Banking hochladen kann.

### US-3: XML validieren
Als **Admin** möchte ich, dass die generierte XML-Datei automatisch gegen das offizielle SIX-Schema validiert wird, damit ich sicher bin, dass die Datei von der Bank akzeptiert wird.

### US-4: XML herunterladen
Als **Admin** möchte ich die generierte und validierte XML-Datei herunterladen, damit ich sie im E-Banking-System meiner Bank importieren kann.

### US-5: Export-Historie einsehen
Als **Admin** möchte ich sehen, welche Zahlungsläufe bereits als pain.001 exportiert wurden (mit Zeitstempel und Dateiname), damit ich den Überblick behalte und bei Bedarf erneut herunterladen kann.

### US-6: Auftraggeber-Stammdaten konfigurieren
Als **Super-Admin** möchte ich die Auftraggeber-Informationen (Name der Pensionskasse, Adresse, IBAN des Auszahlungskontos) einmalig konfigurieren, damit diese automatisch in jeder pain.001-Datei verwendet werden.

## Acceptance Criteria

### Versions-Auswahl
- [ ] Dropdown zur Auswahl der pain.001-Version vor dem Export
- [ ] pain.001.001.03.ch.02 (SIX-Standard, aktuell verbreitet)
- [ ] pain.001.001.09.ch.03 (neueste Version)
- [ ] Letzte Auswahl wird als Benutzer-Präferenz gespeichert

### XML-Generierung
- [ ] Generierung startet nur bei freigegebenen Zahlungsläufen (Status "Freigegeben")
- [ ] XML enthält korrekten Message-Header (MsgId, CreDtTm, NbOfTxs, CtrlSum)
- [ ] XML enthält Payment-Information-Block mit Auftraggeber-Daten (Debtor)
- [ ] Jeder Zahlungsauftrag wird als eigene CreditTransferTransactionInformation abgebildet
- [ ] Verwendungszweck wird als Unstructured Remittance Information (Ustrd) eingetragen
- [ ] Bei QR-Referenz oder ISR-Referenz wird diese als Structured Remittance Information eingetragen
- [ ] Ausführungsdatum (ReqdExctnDt) aus Zahlungslauf übernommen
- [ ] Währung ist immer CHF
- [ ] Dateiname-Format: pain001_[YYYY-MM-DD]_[Lauf-ID].xml

### XML-Validierung
- [ ] Automatische Validierung gegen das offizielle XSD-Schema der gewählten Version
- [ ] Bei Validierungsfehler: Fehlermeldung mit Details (welches Feld, welcher Auftrag)
- [ ] Download ist nur möglich, wenn die Validierung erfolgreich war
- [ ] Validierungsergebnis wird protokolliert

### Download & Historie
- [ ] Download als .xml-Datei im Browser
- [ ] Export-Historie pro Zahlungslauf: Zeitstempel, Version, Dateiname, exportierender Admin
- [ ] Erneuter Download einer bereits generierten Datei möglich
- [ ] Zahlungslauf-Status wechselt nach erstem Export auf "Exportiert"

### Auftraggeber-Konfiguration
- [ ] Konfigurationsseite für Auftraggeber-Stammdaten (nur Super-Admin)
- [ ] Pflichtfelder: Name, Strasse, PLZ, Ort, Land, IBAN des Auszahlungskontos
- [ ] IBAN-Validierung für das Auszahlungskonto (nur CH/LI)
- [ ] Änderungen werden sofort für neue Exporte wirksam

## Edge Cases

### E-1: Zahlungslauf enthält ungültige Daten
Was passiert, wenn ein freigegebener Lauf Aufträge mit fehlerhaften Daten enthält (z.B. IBAN wurde nach Freigabe als ungültig erkannt)?
→ XML-Validierung schlägt fehl. Detaillierte Fehlermeldung zeigt betroffene Aufträge. Admin muss neuen korrigierten Lauf erstellen.

### E-2: Auftraggeber-Daten nicht konfiguriert
Was passiert, wenn noch keine Auftraggeber-Stammdaten hinterlegt sind?
→ Export-Button ist deaktiviert mit Hinweis: "Bitte konfigurieren Sie zuerst die Auftraggeber-Daten unter Einstellungen."

### E-3: Sehr grosse XML-Datei
Was passiert bei einem Lauf mit > 1'000 Transaktionen?
→ XML wird serverseitig generiert. Progress-Indikator während der Generierung. Timeout auf 60 Sekunden.

### E-4: Doppelter Export
Was passiert, wenn dieselbe Datei mehrfach heruntergeladen wird?
→ Erlaubt. Identische Datei wird erneut heruntergeladen. In der Historie wird jeder Download protokolliert.

### E-5: Sonderzeichen in Empfänger-Namen
Was passiert bei Sonderzeichen (Umlaute, Akzente, Sonderzeichen)?
→ Gemäss SIX-Richtlinien: Erlaubter Zeichensatz ist Latin (inkl. Umlaute). Nicht-erlaubte Zeichen werden automatisch ersetzt/entfernt mit Hinweis.

### E-6: Message-ID Eindeutigkeit
Wie wird sichergestellt, dass die MsgId pro pain.001-Datei eindeutig ist?
→ Format: [PK-Kürzel]-[Lauf-ID]-[Timestamp]. Garantiert Eindeutigkeit über alle generierten Dateien.

## Technical Requirements (optional)
- Performance: XML-Generierung < 10 Sekunden für Läufe bis 1'000 Transaktionen
- Security: Generierte XML-Dateien nur für den erstellenden Admin und Super-Admin zugänglich
- Compliance: XML muss den SIX Swiss Payment Standards entsprechen
- Accessibility: WCAG 2.1 AA (Export-Dialog, Konfigurationsseite)
- XSD-Schemas: Offizielle SIX-Schemas für beide unterstützte Versionen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick

PROJ-21 erweitert die bestehende Zahlungslauf-Detailseite (PROJ-20) um einen XML-Export-Button. Die XML-Datei wird vollständig serverseitig generiert und als Download ausgeliefert. Es gibt keine separate Seite – der Einstiegspunkt ist die bestehende `/payment-runs/[id]`-Seite.

---

### Komponentenstruktur

```
/payment-runs/[id] (bestehende Detailseite)
└── PaymentRunDetail (bestehend – erhält neuen "XML exportieren"-Button)
    └── ExportXmlDialog (NEU – Versionsauswahl + Vorprüfung)
        ├── Dropdown: pain.001-Version (03.ch.02 / 09.ch.03)
        ├── Warnung wenn Auftraggeber-Daten fehlen
        └── Button: "Generieren & Herunterladen"

/settings (bestehende oder neue Einstellungsseite)
└── DebtorSettingsForm (NEU – nur Super-Admin)
    ├── Name der Pensionskasse
    ├── Strasse, PLZ, Ort, Land
    └── IBAN des Auszahlungskontos (CH/LI-Validierung)

PaymentRunDetail – neue Sektion "Export-Historie" (NEU)
└── Tabelle: Zeitstempel, Version, Dateiname, exportierender Admin, Download-Link
```

---

### Datenbankmodell (Ergänzungen)

#### Neue Tabelle: `payment_run_exports`
Protokolliert jeden generierten XML-Export unveränderlich.

```
payment_run_exports
  id              UUID (PK)
  payment_run_id  UUID → payment_runs.id
  exported_at     TIMESTAMPTZ
  exported_by     UUID → auth.users
  pain_version    TEXT  ('pain.001.001.03.ch.02' | 'pain.001.001.09.ch.03')
  filename        TEXT  (z.B. pain001_2026-04-13_<lauf-id>.xml)
  xml_content     TEXT  (vollständige XML für Re-Download)
  created_at      TIMESTAMPTZ
```

**RLS:** SELECT + INSERT für Admin/Super-Admin; kein UPDATE/DELETE (immutabel wie `payment_run_events`).

#### Neue `app_settings`-Einträge (bestehende Tabelle)
| Key | Beschreibung |
|-----|--------------|
| `debtor.name` | Name der Pensionskasse |
| `debtor.street` | Strasse und Hausnummer |
| `debtor.postal_code` | PLZ |
| `debtor.city` | Ort |
| `debtor.country` | Länderkürzel (CH / LI) |
| `debtor.iban` | IBAN des Auszahlungskontos |

---

### API-Routen (neu)

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `POST /api/payment-runs/[id]/export` | POST | XML generieren, als Datei zurückgeben, Lauf auf `exported` setzen, Export protokollieren |
| `GET /api/payment-runs/[id]/exports` | GET | Export-Historie eines Laufs abrufen |
| `GET /api/payment-runs/[id]/exports/[exportId]` | GET | Bereits generierte XML erneut herunterladen |
| `GET /api/settings/debtor` | GET | Auftraggeber-Konfiguration lesen |
| `PATCH /api/settings/debtor` | PATCH | Auftraggeber-Konfiguration speichern (nur Super-Admin) |

**Sicherheitsregeln für alle neuen Routen:**
- Authentifizierung prüfen
- `requireRole('admin' | 'super_admin')`
- Zod-Validierung aller Eingaben
- Rate Limiting (bestehende `src/lib/rate-limit.ts`)

---

### XML-Generierung (serverseitig)

Die Generierung erfolgt in einer dedizierten Hilfsfunktion `src/lib/pain001-generator.ts`.

**Ablauf:**
1. Auftraggeber-Daten aus `app_settings` laden – fehlen sie, wird ein `400`-Fehler zurückgegeben
2. Alle Zahlungsaufträge des Laufs laden
3. XML-String nach SIX-Schema aufbauen (native String-Konstruktion, kein externes Paket notwendig)
4. Automatische Zeichensatz-Bereinigung: Nicht-erlaubte Zeichen durch Latin-Entsprechungen ersetzen (Umlaute bleiben erhalten, exotische Sonderzeichen werden entfernt)
5. Validierung gegen das eingebettete XSD-Schema
6. Bei Fehler: HTTP 422 mit Feldlevel-Details zurückgeben
7. Bei Erfolg: `payment_run_exports`-Eintrag erstellen, Lauf-Status auf `exported` setzen, XML als Download ausliefern

**Dateiname:** `pain001_[YYYY-MM-DD]_[Lauf-ID-Kurzform].xml`  
**Message-ID-Format:** `[PK-Kürzel]-[LaufID]-[Timestamp]` (Eindeutigkeit garantiert)  
**Währung:** immer `CHF`

---

### Integration in bestehende Detailseite

In `src/components/payment-runs/payment-run-detail.tsx`:
- Neuer Button **"XML exportieren"** erscheint ausschliesslich wenn `run.status === 'approved'` und `canManage === true`
- Öffnet `ExportXmlDialog` (neue Client-Komponente)
- Nach erfolgreichem Export: Router.refresh() → Lauf zeigt Status `exported`, neue Sektion "Export-Historie" sichtbar
- Auch bei `exported`-Status: Button **"Erneut herunterladen"** mit Dropdown der bisherigen Exporte

---

### Abhängigkeiten (neue npm-Pakete)

| Paket | Zweck |
|-------|-------|
| `fast-xml-parser` | Leichtgewichtige XSD-Validierung des generierten XML |

Die XML-Generierung selbst benötigt kein Paket – modernes TypeScript/Node.js reicht für saubes String-Building.

---

### Auftraggeber-Konfigurationsseite

- Neue Route: `/settings/debtor` (oder eingebettet in bestehende `/payment-runs/settings`)
- Nur für Super-Admin sichtbar (PermissionGate)
- Formular mit IBAN-Validierung (nur CH/LI, bestehende `src/lib/iban-validation.ts`)
- Speichert in `app_settings`-Tabelle (wie der Schwellenwert-Threshold)

---

### Migrations-Datei

Neue SQL-Migrationsdatei: `supabase/migrations/20260413_create_payment_run_exports.sql`
- Tabelle `payment_run_exports` mit RLS
- Neue `app_settings`-Einträge als Seed (mit leerem Standardwert)

---

### Technische Entscheidungen

| Entscheidung | Begründung |
|---|---|
| XML serverseitig generieren | Sicherheit (keine Bankdaten im Browser), Performance bei grossen Läufen |
| XML-Inhalt in DB speichern (nicht Supabase Storage) | Re-Download ohne erneute Generierung; Läufe bis 1'000 Tx ≈ max. 3 MB XML |
| XSD-Validierung mit fast-xml-parser | Leichtgewichtig, keine nativen Bindings nötig (Vercel-kompatibel) |
| Keine separate Export-Seite | User-Wunsch: Export-Trigger direkt auf Lauf-Detailseite |
| app_settings für Debtor-Config | Konsistent mit bestehender Threshold-Konfiguration |

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
