# PROJ-10: Kontenverwaltung pro Anstellung

## Übersicht

Dieses Feature ermöglicht die Verwaltung von BVG-Konten pro Anstellung (Employment). Jede Anstellung kann mehrere Konten haben, auf denen Transaktionen gebucht werden. Der Kontozusammenzug zeigt den aggregierten Saldo aller Konten einer Anstellung.

## Scope

### In Scope
- Anlage und Verwaltung von BVG-Konten pro Anstellung
- Buchung von BVG-relevanten Transaktionen auf Konten
- Automatische Berechnung des Kontozusammenzugs (Saldo)
- Eigener Navigationsbereich "Konten"
- Währung: Nur CHF
- Historisierung aller Transaktionen
- **Konfigurierbare Kontotypen** (Hinzufügen, Bearbeiten, Deaktivieren)
- **Konfigurierbare Transaktionstypen** (Hinzufügen, Bearbeiten, Deaktivieren)

### Out of Scope
- Multi-Währungsunterstützung
- Automatische Zinsgutschriften (kann in späterem Feature ergänzt werden)
- Integration mit externem Buchhaltungssystem
- PDF-Export von Kontoauszügen (separates Feature)

---

## Datenmodell

### Tabellen

#### account_types (Konfigurierbar)
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| code | VARCHAR(50) | Eindeutiger Code (z.B. "altersguthaben") |
| name_de | VARCHAR(100) | Deutscher Name |
| name_fr | VARCHAR(100) | Französischer Name |
| name_en | VARCHAR(100) | Englischer Name |
| description | TEXT | Optionale Beschreibung |
| affects_balance | balance_effect | Saldo-Auswirkung: 'positive', 'negative', 'neutral' |
| sort_order | INTEGER | Sortierreihenfolge in Listen |
| is_active | BOOLEAN | Aktiv/Inaktiv (Default: true) |
| is_system | BOOLEAN | System-Typ (kann nicht gelöscht werden) |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letztes Update |

**Standard-Kontotypen (Seed-Daten):**
| Code | Name DE | is_system |
|------|---------|-----------|
| altersguthaben | Altersguthaben (obligatorisch) | true |
| altersguthaben_ueob | Altersguthaben überobligatorisch | true |
| sparbeitraege | Sparbeiträge Arbeitnehmer | true |
| sparbeitraege_ag | Sparbeiträge Arbeitgeber | true |
| risikobeitraege | Risikobeiträge | true |
| verwaltungskosten | Verwaltungskosten | false |
| sanierungsbeitraege | Sanierungsbeiträge | false |
| freizuegigkeit | Freizügigkeitskonto | true |
| wef_vorbezug | WEF-Vorbezugskonto | false |
| scheidung | Scheidungsübertragung | false |

#### transaction_types (Konfigurierbar)
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| code | VARCHAR(50) | Eindeutiger Code (z.B. "einzahlung") |
| name_de | VARCHAR(100) | Deutscher Name |
| name_fr | VARCHAR(100) | Französischer Name |
| name_en | VARCHAR(100) | Englischer Name |
| description | TEXT | Optionale Beschreibung |
| effect | transaction_effect | 'credit' (Gutschrift), 'debit' (Belastung) |
| requires_reference | BOOLEAN | Referenz-Transaktion erforderlich (z.B. für Storno) |
| is_reversible | BOOLEAN | Kann storniert werden |
| sort_order | INTEGER | Sortierreihenfolge in Listen |
| is_active | BOOLEAN | Aktiv/Inaktiv (Default: true) |
| is_system | BOOLEAN | System-Typ (kann nicht gelöscht werden) |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letztes Update |

**Standard-Transaktionstypen (Seed-Daten):**
| Code | Name DE | Effect | is_system |
|------|---------|--------|-----------|
| einzahlung | Einzahlung | credit | true |
| auszahlung | Auszahlung | debit | true |
| umbuchung_soll | Umbuchung (Belastung) | debit | true |
| umbuchung_haben | Umbuchung (Gutschrift) | credit | true |
| stornierung | Stornierung | credit/debit | true |
| zinsertrag | Zinsertrag | credit | false |
| einkauf | Einkauf Beitragsjahre | credit | true |
| freizuegigkeit_ein | Freizügigkeit Eingang | credit | true |
| freizuegigkeit_aus | Freizügigkeit Ausgang | debit | true |
| wef_vorbezug | WEF-Vorbezug | debit | false |
| wef_rueckzahlung | WEF-Rückzahlung | credit | false |
| scheidung_ein | Scheidung Eingang | credit | false |
| scheidung_aus | Scheidung Ausgang | debit | false |
| kapitalbezug | Kapitalbezug | debit | true |
| korrektur | Korrektur | credit/debit | true |
| gebuehr | Gebühr | debit | false |

#### accounts
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| employment_id | UUID | FK zu employments |
| account_type_id | UUID | FK zu account_types |
| name | VARCHAR(100) | Optionaler Anzeigename |
| is_active | BOOLEAN | Konto aktiv/inaktiv |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letztes Update |

#### transactions
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| account_id | UUID | FK zu accounts |
| transaction_type_id | UUID | FK zu transaction_types |
| amount | DECIMAL(15,2) | Betrag in CHF (immer positiv)
| booking_date | DATE | Buchungsdatum |
| value_date | DATE | Valutadatum |
| reference | VARCHAR(50) | Buchungsreferenz |
| description | TEXT | Beschreibung |
| related_transaction_id | UUID | FK bei Umbuchungen/Stornos |
| created_by | UUID | FK zu user_profiles |
| created_at | TIMESTAMP | Erstellungszeitpunkt |

#### account_summaries (View oder materialized)
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| employment_id | UUID | FK zu employments |
| total_balance | DECIMAL(15,2) | Gesamtsaldo aller Konten |
| last_transaction_date | DATE | Datum letzte Transaktion |
| account_count | INTEGER | Anzahl aktive Konten |

---

## User Stories

### Epic 1: Kontenverwaltung

#### US-10.1: Konten einer Anstellung anzeigen
**Als** Sachbearbeiter
**möchte ich** alle Konten einer Anstellung sehen können
**damit** ich einen Überblick über die Vermögenssituation habe.

**Acceptance Criteria:**
- [ ] Liste aller Konten der Anstellung wird angezeigt
- [ ] Für jedes Konto wird angezeigt: Kontotyp, Name, Saldo, Status (aktiv/inaktiv)
- [ ] Der Gesamtsaldo (Kontozusammenzug) wird prominent angezeigt
- [ ] Konten können nach Typ gefiltert werden
- [ ] Inaktive Konten können ein-/ausgeblendet werden

**Edge Cases:**
- Anstellung ohne Konten: Leerer Zustand mit Hinweis "Noch keine Konten angelegt"
- Konto mit Saldo 0: Normal anzeigen, nicht ausblenden
- Anstellung bereits beendet: Konten nur lesend anzeigen

---

#### US-10.2: Neues Konto anlegen
**Als** Sachbearbeiter
**möchte ich** ein neues Konto für eine Anstellung anlegen können
**damit** Transaktionen darauf gebucht werden können.

**Acceptance Criteria:**
- [ ] Modal/Dialog zum Anlegen eines Kontos
- [ ] Auswahl des Kontotyps (Dropdown mit allen Typen)
- [ ] Optionaler Anzeigename
- [ ] Konto wird standardmässig als "aktiv" angelegt
- [ ] Nach Anlage wird das Konto in der Liste angezeigt
- [ ] Erfolgsmeldung wird angezeigt

**Validierungen:**
- Pro Anstellung darf jeder Kontotyp nur einmal existieren
- Kontotyp ist Pflichtfeld

**Edge Cases:**
- Kontotyp bereits vorhanden: Fehlermeldung "Dieses Konto existiert bereits"
- Anstellung beendet: Anlage nicht möglich, Hinweis anzeigen

---

#### US-10.3: Konto bearbeiten
**Als** Sachbearbeiter
**möchte ich** den Namen eines Kontos ändern können
**damit** ich es besser identifizieren kann.

**Acceptance Criteria:**
- [ ] Edit-Button beim Konto öffnet Bearbeitungs-Dialog
- [ ] Nur der Anzeigename kann geändert werden
- [ ] Kontotyp kann nicht geändert werden (anzeigen, aber disabled)
- [ ] Änderungen werden gespeichert

---

#### US-10.4: Konto deaktivieren
**Als** Sachbearbeiter
**möchte ich** ein Konto deaktivieren können
**damit** keine weiteren Transaktionen darauf gebucht werden.

**Acceptance Criteria:**
- [ ] Deaktivieren-Button beim Konto
- [ ] Bestätigungsdialog vor Deaktivierung
- [ ] Warnung wenn Saldo ≠ 0: "Konto hat noch Saldo von CHF X"
- [ ] Deaktivierte Konten werden grau/ausgeblendet dargestellt
- [ ] Deaktivierte Konten können reaktiviert werden

**Edge Cases:**
- Letztes aktives Konto: Warnung "Dies ist das letzte aktive Konto"
- Konto mit laufenden Transaktionen: Nicht deaktivierbar (Fehlermeldung)

---

### Epic 2: Transaktionsverwaltung

#### US-10.5: Transaktionen eines Kontos anzeigen
**Als** Sachbearbeiter
**möchte ich** alle Transaktionen eines Kontos sehen
**damit** ich die Kontobewegungen nachvollziehen kann.

**Acceptance Criteria:**
- [ ] Klick auf Konto öffnet Transaktionsübersicht
- [ ] Liste zeigt: Datum, Valuta, Typ, Beschreibung, Betrag, laufender Saldo
- [ ] Sortierung nach Datum (neueste zuerst) als Standard
- [ ] Filterung nach Zeitraum möglich
- [ ] Filterung nach Transaktionstyp möglich
- [ ] Summenzeile am Ende

**Edge Cases:**
- Keine Transaktionen: "Noch keine Transaktionen auf diesem Konto"
- Viele Transaktionen (>100): Pagination mit 50 Einträgen pro Seite

---

#### US-10.6: Neue Transaktion buchen
**Als** Sachbearbeiter
**möchte ich** eine Transaktion auf ein Konto buchen
**damit** Geldbewegungen erfasst werden.

**Acceptance Criteria:**
- [ ] Button "Neue Transaktion" öffnet Buchungsdialog
- [ ] Pflichtfelder: Transaktionstyp, Betrag, Buchungsdatum
- [ ] Optionale Felder: Valutadatum (Default = Buchungsdatum), Referenz, Beschreibung
- [ ] Betrag wird automatisch als positiv (Einzahlung) oder negativ (Auszahlung) interpretiert je nach Typ
- [ ] Vorschau des neuen Saldos vor Buchung
- [ ] Nach Buchung wird Kontozusammenzug automatisch aktualisiert
- [ ] Erfolgsmeldung mit Transaktionsdetails

**Validierungen:**
- Betrag muss > 0 sein
- Buchungsdatum nicht in der Zukunft (Warnung, aber erlaubt)
- Bei Auszahlung: Warnung wenn Saldo negativ wird

**Edge Cases:**
- Konto deaktiviert: Buchung nicht möglich
- Betrag mit mehr als 2 Dezimalstellen: Auf 2 Stellen runden
- Sehr hoher Betrag (>1'000'000): Zusätzliche Bestätigung erforderlich

---

#### US-10.7: Umbuchung zwischen Konten
**Als** Sachbearbeiter
**möchte ich** Beträge zwischen Konten umbuchen können
**damit** interne Verschiebungen korrekt erfasst werden.

**Acceptance Criteria:**
- [ ] Spezielle Funktion "Umbuchung" im Menü
- [ ] Auswahl Quellkonto und Zielkonto
- [ ] Beide Konten müssen zur gleichen Anstellung gehören
- [ ] Eine Transaktion wird auf dem Quellkonto (umbuchung_soll) erstellt
- [ ] Eine korrespondierende Transaktion auf dem Zielkonto (umbuchung_haben)
- [ ] Beide Transaktionen sind über related_transaction_id verknüpft
- [ ] Gesamtsaldo (Kontozusammenzug) bleibt unverändert

**Edge Cases:**
- Quellkonto = Zielkonto: Nicht erlaubt
- Eines der Konten deaktiviert: Nicht erlaubt
- Quellkonto hat ungenügend Saldo: Warnung, aber erlaubt

---

#### US-10.8: Transaktion stornieren
**Als** Sachbearbeiter
**möchte ich** eine fehlerhafte Transaktion stornieren können
**damit** Buchungsfehler korrigiert werden können.

**Acceptance Criteria:**
- [ ] Stornieren-Button bei jeder Transaktion
- [ ] Bestätigungsdialog mit Anzeige der Transaktion
- [ ] Pflichtfeld: Stornierungsgrund
- [ ] Eine Gegenbuchung (stornierung) wird erstellt
- [ ] Ursprüngliche Transaktion wird als "storniert" markiert (nicht gelöscht)
- [ ] related_transaction_id verknüpft Storno mit Original
- [ ] Kontozusammenzug wird automatisch aktualisiert

**Edge Cases:**
- Bereits stornierte Transaktion: Nochmalige Stornierung nicht möglich
- Storno eines Stornos: Nicht erlaubt
- Umbuchung stornieren: Beide Seiten werden automatisch storniert

---

### Epic 3: Kontozusammenzug

#### US-10.9: Kontozusammenzug anzeigen
**Als** Sachbearbeiter
**möchte ich** den Kontozusammenzug (Gesamtsaldo) einer Anstellung sehen
**damit** ich die Gesamtsituation auf einen Blick erfasse.

**Acceptance Criteria:**
- [ ] Prominente Anzeige des Gesamtsaldos auf der Kontenübersicht
- [ ] Aufschlüsselung nach Kontotypen
- [ ] Letzte Aktualisierung (Datum der letzten Transaktion)
- [ ] Trend-Indikator (Saldo gestiegen/gefallen seit letztem Monat)

---

#### US-10.10: Kontozusammenzug-Historie
**Als** Sachbearbeiter
**möchte ich** die historische Entwicklung des Gesamtsaldos sehen
**damit** ich die Entwicklung nachvollziehen kann.

**Acceptance Criteria:**
- [ ] Grafische Darstellung der Saldo-Entwicklung (Liniendiagramm)
- [ ] Zeitraum wählbar: 1 Jahr, 3 Jahre, 5 Jahre, Gesamt
- [ ] Monatliche Datenpunkte
- [ ] Hover zeigt Detailwerte

---

### Epic 4: Navigation und Suche

#### US-10.11: Kontenbereich in Navigation
**Als** Benutzer
**möchte ich** einen eigenen Bereich "Konten" in der Navigation haben
**damit** ich schnell auf die Kontenverwaltung zugreifen kann.

**Acceptance Criteria:**
- [ ] Neuer Navigationspunkt "Konten" im Hauptmenü
- [ ] Icon: Wallet oder Landmark
- [ ] Unterhalb von "Assurés" (Versicherte)
- [ ] Klick öffnet Kontenübersicht

---

#### US-10.12: Kontensuche
**Als** Sachbearbeiter
**möchte ich** nach Konten suchen können
**damit** ich schnell das richtige Konto finde.

**Acceptance Criteria:**
- [ ] Suchfeld auf der Kontenübersicht
- [ ] Suche nach: Name der versicherten Person, AHV-Nummer, Arbeitgeber
- [ ] Ergebnis zeigt: Person, Arbeitgeber, Anzahl Konten, Gesamtsaldo
- [ ] Klick auf Ergebnis öffnet Kontendetail der Anstellung

---

#### US-10.13: Schnellzugriff von Anstellung
**Als** Sachbearbeiter
**möchte ich** von der Anstellungsansicht direkt zu den Konten gelangen
**damit** ich nicht erst suchen muss.

**Acceptance Criteria:**
- [ ] Link/Button "Konten anzeigen" auf der Anstellungsseite
- [ ] Zeigt Kurzinfo: Anzahl Konten, Gesamtsaldo
- [ ] Klick navigiert zur Kontendetailansicht

---

### Epic 5: Konfiguration (Admin)

#### US-10.14: Kontotypen verwalten
**Als** Administrator
**möchte ich** Kontotypen hinzufügen und bearbeiten können
**damit** die Anwendung an neue Anforderungen angepasst werden kann.

**Acceptance Criteria:**
- [ ] Admin-Bereich "Einstellungen > Kontotypen"
- [ ] Liste aller Kontotypen mit Status (aktiv/inaktiv)
- [ ] Neuen Kontotyp anlegen: Code, Name (DE/FR/EN), Beschreibung
- [ ] Bestehenden Kontotyp bearbeiten (Name, Beschreibung änderbar)
- [ ] Kontotyp deaktivieren (nicht löschen, wenn bereits verwendet)
- [ ] Sortierreihenfolge per Drag & Drop ändern
- [ ] System-Typen (is_system=true) können nicht deaktiviert werden

**Validierungen:**
- Code muss eindeutig sein (snake_case, nur a-z, 0-9, _)
- Name in mindestens einer Sprache erforderlich
- Deaktivieren nur möglich, wenn kein aktives Konto diesen Typ verwendet

**Edge Cases:**
- Kontotyp wird verwendet: Deaktivierung mit Warnung, aber erlaubt
- System-Typ bearbeiten: Nur Name/Beschreibung änderbar, Code fix

---

#### US-10.15: Transaktionstypen verwalten
**Als** Administrator
**möchte ich** Transaktionstypen hinzufügen und bearbeiten können
**damit** neue Buchungsarten erfasst werden können.

**Acceptance Criteria:**
- [ ] Admin-Bereich "Einstellungen > Transaktionstypen"
- [ ] Liste aller Transaktionstypen mit Status und Effekt (credit/debit)
- [ ] Neuen Transaktionstyp anlegen: Code, Name (DE/FR/EN), Effekt, Beschreibung
- [ ] Bestehenden Transaktionstyp bearbeiten
- [ ] Transaktionstyp deaktivieren
- [ ] Effekt festlegen: Gutschrift (credit) oder Belastung (debit)
- [ ] Stornierbarkeit festlegen (is_reversible)
- [ ] Sortierreihenfolge per Drag & Drop ändern
- [ ] System-Typen können nicht deaktiviert werden

**Validierungen:**
- Code muss eindeutig sein
- Effekt ist Pflichtfeld
- Deaktivieren nur möglich, wenn keine Transaktion diesen Typ verwendet (Warnung)

**Edge Cases:**
- Transaktionstyp in Verwendung: Deaktivierung mit Warnung
- Effekt ändern bei bestehendem Typ: Nicht erlaubt (würde Saldo verfälschen)

---

#### US-10.16: Kontotypen in Auswahllisten
**Als** Sachbearbeiter
**möchte ich** bei der Kontoerstellung nur aktive Kontotypen sehen
**damit** keine veralteten Typen verwendet werden.

**Acceptance Criteria:**
- [ ] Dropdown zeigt nur aktive Kontotypen (is_active=true)
- [ ] Sortierung nach sort_order
- [ ] Anzeige in der aktuellen Sprache (name_de/fr/en)
- [ ] Bei bestehendem Konto: Deaktivierter Typ wird angezeigt, aber ausgegraut

---

#### US-10.17: Transaktionstypen in Auswahllisten
**Als** Sachbearbeiter
**möchte ich** bei der Buchung nur aktive Transaktionstypen sehen
**damit** keine veralteten Typen verwendet werden.

**Acceptance Criteria:**
- [ ] Dropdown zeigt nur aktive Transaktionstypen (is_active=true)
- [ ] Sortierung nach sort_order
- [ ] Anzeige mit Icon für Effekt (↑ Gutschrift, ↓ Belastung)
- [ ] Anzeige in der aktuellen Sprache
- [ ] Bei bestehender Transaktion: Deaktivierter Typ wird angezeigt, aber ausgegraut

---

## Technische Anforderungen

### Performance
- Kontenliste: < 200ms Ladezeit für bis zu 20 Konten
- Transaktionsliste: < 500ms für bis zu 1000 Transaktionen
- Saldoaktualisierung: < 100ms nach Transaktion

### Sicherheit
- Row Level Security auf allen neuen Tabellen
- Nur authentifizierte Benutzer haben Zugriff
- Audit-Trail: Alle Transaktionen mit created_by

### Datenintegrität
- Transaktionen können nicht gelöscht werden (nur storniert)
- Saldo wird aus Transaktionen berechnet (nicht manuell gepflegt)
- Foreign Key Constraints auf alle Referenzen

---

## Internationalisierung

Neue Übersetzungsschlüssel benötigt:
- `accounts.*` - Kontenbereich
- `transactions.*` - Transaktionen
- `accountTypes.*` - Alle Kontotypen
- `transactionTypes.*` - Alle Transaktionstypen

---

## Wireframes

### Kontenübersicht (Navigation)
```
┌─────────────────────────────────────────────────────────────┐
│ Konten                                    [Suche...    🔍]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Zeige: [Alle Anstellungen ▼]  [Aktive Konten ▼]          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Max Mustermann (756.1234.5678.97)                   │   │
│  │ Arbeitgeber AG | Anstellung seit 01.01.2020         │   │
│  │ 3 Konten | Saldo: CHF 125'432.50                    │   │
│  │                                         [Anzeigen →]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Anna Beispiel (756.9876.5432.10)                    │   │
│  │ Muster GmbH | Anstellung seit 15.03.2018           │   │
│  │ 5 Konten | Saldo: CHF 89'120.00                     │   │
│  │                                         [Anzeigen →]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Seite 1 von 45                        [← Prev] [Next →]   │
└─────────────────────────────────────────────────────────────┘
```

### Kontendetail einer Anstellung
```
┌─────────────────────────────────────────────────────────────┐
│ ← Zurück zur Übersicht                                      │
│                                                             │
│ Max Mustermann                                              │
│ Arbeitgeber AG | Anstellung seit 01.01.2020                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ KONTOZUSAMMENZUG                                        ││
│ │ Gesamtsaldo: CHF 125'432.50           ▲ +2.3% (Monat)  ││
│ │ Letzte Buchung: 15.01.2024                              ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Konten                                    [+ Neues Konto]   │
│                                                             │
│ ┌──────────────────┬──────────────────┬──────────────────┐ │
│ │ Altersguthaben   │ Sparbeiträge AN  │ Risikobeiträge   │ │
│ │ CHF 98'250.00    │ CHF 22'180.50    │ CHF 5'002.00     │ │
│ │ ● Aktiv          │ ● Aktiv          │ ● Aktiv          │ │
│ └──────────────────┴──────────────────┴──────────────────┘ │
│                                                             │
│ [Umbuchung]  [Alle Transaktionen]                          │
└─────────────────────────────────────────────────────────────┘
```

### Transaktionsbuchung
```
┌─────────────────────────────────────────────────────────────┐
│ Neue Transaktion                                     [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Konto: Altersguthaben                                       │
│ Aktueller Saldo: CHF 98'250.00                             │
│                                                             │
│ Transaktionstyp *                                           │
│ [Einzahlung                                            ▼]   │
│                                                             │
│ Betrag (CHF) *              Buchungsdatum *                │
│ [___________]               [15.01.2024        📅]         │
│                                                             │
│ Valutadatum                 Referenz                        │
│ [15.01.2024        📅]      [___________]                  │
│                                                             │
│ Beschreibung                                                │
│ [_______________________________________________________]  │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│ Neuer Saldo nach Buchung: CHF 98'250.00                    │
│                                                             │
│                              [Abbrechen]  [Buchen]         │
└─────────────────────────────────────────────────────────────┘
```

### Admin: Kontotypen verwalten
```
┌─────────────────────────────────────────────────────────────┐
│ Einstellungen > Kontotypen                  [+ Neuer Typ]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ≡ │ altersguthaben      │ Altersguthaben (obl.)  │ 🔒  │ │
│ │   │ System              │ ● Aktiv                │     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ≡ │ altersguthaben_ueob │ Altersguthaben (üob.)  │ 🔒  │ │
│ │   │ System              │ ● Aktiv                │     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ≡ │ sparbeitraege       │ Sparbeiträge AN        │ 🔒  │ │
│ │   │ System              │ ● Aktiv                │     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ≡ │ zusatzkonto         │ Zusatzkonto            │ ✏️🗑│ │
│ │   │ Benutzerdefiniert   │ ● Aktiv                │     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🔒 = System-Typ (kann nicht gelöscht werden)               │
│ ≡  = Drag & Drop für Sortierung                            │
└─────────────────────────────────────────────────────────────┘
```

### Admin: Neuer Kontotyp Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Neuer Kontotyp                                       [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Code *                                                      │
│ [zusatzkonto_xyz         ]  (nur a-z, 0-9, _)              │
│                                                             │
│ Name (Deutsch) *                                            │
│ [Zusatzkonto XYZ                                       ]    │
│                                                             │
│ Name (Französisch)                                          │
│ [Compte supplémentaire XYZ                             ]    │
│                                                             │
│ Name (Englisch)                                             │
│ [Additional account XYZ                                ]    │
│                                                             │
│ Beschreibung                                                │
│ [_______________________________________________________]  │
│                                                             │
│                              [Abbrechen]  [Speichern]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Abhängigkeiten

- **PROJ-6**: Versichertenliste (für Personensuche)
- **PROJ-7**: Versichertendetail (für Link zu Anstellung)
- **Employments-Tabelle**: Muss existieren (bereits vorhanden)

---

## Testszenarien

### Funktionale Tests
1. Konto anlegen → erscheint in Liste
2. Einzahlung buchen → Saldo erhöht sich
3. Auszahlung buchen → Saldo reduziert sich
4. Umbuchung → Quellkonto minus, Zielkonto plus, Gesamt gleich
5. Stornierung → Gegenbuchung erstellt, Saldo korrigiert
6. Deaktiviertes Konto → keine Buchungen möglich

### Konfigurations-Tests
1. Neuen Kontotyp anlegen → erscheint in Dropdown
2. Kontotyp deaktivieren → nicht mehr in Dropdown, bestehende Konten behalten Typ
3. Neuen Transaktionstyp anlegen → erscheint bei Buchung
4. Transaktionstyp deaktivieren → nicht mehr wählbar
5. System-Typ deaktivieren → nicht möglich (Fehlermeldung)
6. Kontotyp mit verwendetem Konto löschen → nicht möglich

### Edge Case Tests
1. Saldo wird negativ → Warnung, aber erlaubt
2. Sehr hoher Betrag → Zusätzliche Bestätigung
3. Doppelte Kontotypen → Fehlermeldung
4. Storno eines Stornos → Nicht möglich
5. Doppelter Typ-Code → Fehlermeldung
6. Transaktionstyp-Effekt ändern → nicht erlaubt wenn verwendet

### Performance Tests
1. 100 Konten pro Anstellung laden
2. 10'000 Transaktionen auf einem Konto
3. Suche über 20'000 Anstellungen
4. 50+ konfigurierte Kontotypen in Dropdown

---

## Schätzung

| Phase | Aufwand |
|-------|---------|
| Datenbankschema | M |
| API/Backend | L |
| Konten-UI | L |
| Transaktions-UI | L |
| Kontozusammenzug | M |
| Navigation/Suche | M |
| **Admin-Konfiguration** | **M** |
| Tests | M |
| **Gesamt** | **XL** |

---

## Open Questions

1. ~~Welche Kontotypen genau?~~ → Standard BVG-Konten (konfigurierbar)
2. ~~Welche Transaktionstypen?~~ → Vollständig BVG (konfigurierbar)
3. ~~Multi-Währung?~~ → Nein, nur CHF
4. ~~Kontotypen/Transaktionstypen konfigurierbar?~~ → Ja, über Admin-Bereich
5. Sollen Konten automatisch bei Anstellungsbeginn angelegt werden?
6. Gibt es einen Freigabe-Workflow für Transaktionen ab einem bestimmten Betrag?
7. Sollen Kontoauszüge als PDF exportiert werden können? (→ separates Feature)
8. Wer darf Konto-/Transaktionstypen verwalten? (Admin-Rolle erforderlich?)
