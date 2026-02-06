# PROJ-11: BVG-Hochrechnungen (Projections)

## Status: 🔵 Planned

## Übersicht

Dieses Feature ermöglicht BVG-Hochrechnungen pro Konto/Anstellung mit konfigurierbaren Parametern. Sachbearbeiter können verschiedene Szenarien simulieren und vergleichen, um die Auswirkungen auf Rente und Kapital zu visualisieren.

## Abhängigkeiten

- **Benötigt:** PROJ-10 (Kontenverwaltung) - für aktuelle Kontostände und Altersguthaben
- **Benötigt:** PROJ-7 (Versichertendetail) - für Anstellungsdaten und Lohninformationen
- **Benötigt:** PROJ-1 (Authentication) - User muss eingeloggt sein

---

## User Stories

### US-11.1: Hochrechnung für eine Anstellung erstellen
**Als** Sachbearbeiter
**möchte ich** eine BVG-Hochrechnung für eine Anstellung erstellen können
**damit** ich die voraussichtliche Rente/Kapital bei Pensionierung simulieren kann.

### US-11.2: Parameter für Hochrechnung konfigurieren
**Als** Sachbearbeiter
**möchte ich** verschiedene Parameter (Pensionierungsalter, Zinssatz, Lohnentwicklung) einstellen können
**damit** ich realistische Annahmen treffen kann.

### US-11.3: Mehrere Szenarien vergleichen
**Als** Sachbearbeiter
**möchte ich** bis zu 5 verschiedene Szenarien nebeneinander vergleichen können
**damit** ich dem Versicherten verschiedene Optionen aufzeigen kann.

### US-11.4: Ergebnisse als Rente, Kapital oder Mischform anzeigen
**Als** Sachbearbeiter
**möchte ich** die Ergebnisse als monatliche Rente, einmaliges Kapital oder Mischformen sehen
**damit** der Versicherte alle Bezugsoptionen versteht.

### US-11.5: Obligatorisch und überobligatorisch getrennt darstellen
**Als** Sachbearbeiter
**möchte ich** die Aufteilung zwischen obligatorischem und überobligatorischem BVG sehen
**damit** ich dem Versicherten die unterschiedlichen Umwandlungssätze erklären kann.

### US-11.6: Einkaufspotenzial berechnen
**Als** Sachbearbeiter
**möchte ich** das maximale Einkaufspotenzial sehen
**damit** ich dem Versicherten Optimierungsmöglichkeiten aufzeigen kann.

### US-11.7: Szenarien speichern
**Als** Sachbearbeiter
**möchte ich** erstellte Szenarien speichern können
**damit** ich sie später wieder abrufen oder mit dem Versicherten besprechen kann.

### US-11.8: Gespeicherte Szenarien laden
**Als** Sachbearbeiter
**möchte ich** gespeicherte Hochrechnungen einer Anstellung einsehen
**damit** ich frühere Beratungen nachvollziehen kann.

### US-11.9: Einkauf simulieren
**Als** Sachbearbeiter
**möchte ich** einen freiwilligen Einkauf in die Hochrechnung einbeziehen können
**damit** der Versicherte die Auswirkungen eines Einkaufs sieht.

---

## Acceptance Criteria

### Zugang zur Hochrechnung
- [ ] Button "Hochrechnung" auf der Kontenübersicht einer Anstellung (PROJ-10)
- [ ] Alternativ: Neuer Tab "Hochrechnung" in der Anstellungsansicht
- [ ] Nur für aktive Anstellungen mit Altersguthaben verfügbar
- [ ] Hinweis bei Anstellungen ohne ausreichende Daten

### Parameter-Eingabe
- [ ] **Pensionierungsalter:** Slider oder Dropdown (58-70 Jahre, Default: 65)
- [ ] **Projizierter Zinssatz:** Eingabefeld (Default: aktueller BVG-Mindestzins 1.25%)
- [ ] **Umwandlungssatz obligatorisch:** Eingabefeld (Default: 6.8%)
- [ ] **Umwandlungssatz überobligatorisch:** Eingabefeld (Default: kasseneigener Satz)
- [ ] **Lohnentwicklung p.a.:** Eingabefeld in % (Default: 0%)
- [ ] **Einkaufsbetrag:** Optionales Eingabefeld in CHF (Default: 0)
- [ ] Alle Parameter werden beim Szenario gespeichert

### Szenarien-Verwaltung
- [ ] "Neues Szenario"-Button zum Hinzufügen
- [ ] Maximale Anzahl: 5 Szenarien gleichzeitig
- [ ] Szenarien können benannt werden (z.B. "Frühpensionierung 63")
- [ ] Szenarien können dupliziert werden (zum Variieren einzelner Parameter)
- [ ] Szenarien können gelöscht werden (mindestens 1 muss bleiben)
- [ ] Reihenfolge per Drag & Drop ändern

### Berechnung
- [ ] Berechnung erfolgt automatisch bei Parameteränderung (mit Debounce)
- [ ] Alternativ: "Berechnen"-Button für manuelle Auslösung
- [ ] Berechnung berücksichtigt:
  - Aktuelles Altersguthaben (aus PROJ-10)
  - Projizierte Sparbeiträge bis Pensionierung
  - Verzinsung mit eingestelltem Zinssatz
  - Lohnentwicklung (falls angegeben)
  - Optionalen Einkaufsbetrag
- [ ] Separate Berechnung für obl. und überobligatorisch
- [ ] Anzeige der Berechnungsgrundlagen (Transparenz)

### Ergebnis-Darstellung (Vergleichsansicht)
- [ ] Spaltenweise Darstellung: 1 Spalte pro Szenario
- [ ] **Header:** Szenario-Name + Pensionierungsalter
- [ ] **Körper:**
  - Projiziertes Altersguthaben (obl. / überob. / Total)
  - Monatliche Rente (obl. / überob. / Total)
  - Kapital bei Kapitalbezug (obl. / überob. / Total)
  - Mischform (z.B. 50/50)
- [ ] **Highlight:** Unterschiede zwischen Szenarien farblich hervorheben
- [ ] **Grafik:** Balkendiagramm zum Vergleich der Szenarien

### Einkaufspotenzial
- [ ] Anzeige des maximal möglichen Einkaufs basierend auf:
  - Versichertem Lohn
  - Alter
  - Bisherigen Beitragsjahren
  - Bereits vorhandenem Altersguthaben
- [ ] Hinweis wenn Einkaufspotenzial = 0 (vollständig eingekauft)
- [ ] Button "Max. Einkauf übernehmen" füllt Einkaufsfeld

### Grafische Darstellung
- [ ] Balkendiagramm: Vergleich Altersguthaben pro Szenario
- [ ] Optional: Liniendiagramm mit Verlauf über Zeit (pro Szenario)
- [ ] Farbliche Unterscheidung obl./überob.
- [ ] Interaktiv: Hover zeigt exakte Werte
- [ ] Responsive: Funktioniert auch auf kleineren Bildschirmen

### Speichern & Laden
- [ ] "Speichern"-Button speichert alle aktuellen Szenarien
- [ ] Automatische Benennung mit Datum (kann überschrieben werden)
- [ ] Liste gespeicherter Hochrechnungen unter "Gespeicherte Projektionen"
- [ ] Gespeicherte Hochrechnung zeigt: Name, Datum, Anzahl Szenarien
- [ ] Klick auf gespeicherte Hochrechnung lädt alle Szenarien
- [ ] Gespeicherte Hochrechnungen können gelöscht werden
- [ ] Warnung bei ungespeicherten Änderungen

---

## Edge Cases

### E1: Kein Altersguthaben vorhanden
- **Szenario:** Anstellung hat noch keine Konten/Transaktionen
- **Verhalten:** Hinweis "Hochrechnung nicht möglich - kein Altersguthaben vorhanden"

### E2: Versicherte Person nahe Pensionierungsalter
- **Szenario:** Person ist bereits 64, Pensionierungsalter auf 63 gesetzt
- **Verhalten:** Warnung "Pensionierungsalter liegt vor aktuellem Alter", Berechnung trotzdem möglich

### E3: Unrealistische Parameter
- **Szenario:** Zinssatz von 20% oder Lohnentwicklung von 50%
- **Verhalten:** Warnung anzeigen, aber Berechnung erlauben

### E4: Einkauf übersteigt Potenzial
- **Szenario:** Eingegebener Einkaufsbetrag > maximal möglicher Einkauf
- **Verhalten:** Fehlermeldung "Einkauf übersteigt Potenzial von CHF X"

### E5: Kontodaten ändern sich während Hochrechnung
- **Szenario:** Neue Transaktion wird gebucht während User hochrechnet
- **Verhalten:** Hinweis "Kontostände haben sich geändert - Hochrechnung aktualisieren?"

### E6: Mehr als 5 Szenarien gewünscht
- **Szenario:** User versucht 6. Szenario anzulegen
- **Verhalten:** Button deaktiviert, Hinweis "Maximum 5 Szenarien erreicht"

### E7: Gespeicherte Hochrechnung mit alten Daten
- **Szenario:** Gespeicherte Hochrechnung basiert auf veralteten Kontoständen
- **Verhalten:** Warnung beim Laden "Diese Hochrechnung basiert auf Daten vom [Datum]. Aktuelle Kontostände können abweichen."

### E8: Anstellung beendet
- **Szenario:** Anstellung wurde zwischenzeitlich beendet
- **Verhalten:** Hochrechnung weiterhin möglich mit Hinweis "Anstellung beendet am [Datum]"

### E9: Negativer Zinssatz
- **Szenario:** User gibt -0.5% als Zinssatz ein
- **Verhalten:** Erlauben (theoretisch möglich), Warnung anzeigen

### E10: Mischform Berechnung
- **Szenario:** 60% Kapital / 40% Rente gewünscht
- **Verhalten:** Slider für Aufteilung, Berechnung zeigt beide Komponenten

---

## Datenmodell

### Neue Tabelle: `projections`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| employment_id | UUID | FK zu employments |
| name | VARCHAR(100) | Name der Hochrechnung |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letzte Änderung |
| created_by | UUID | FK zu user_profiles |
| base_balance_date | DATE | Stichtag der verwendeten Kontostände |
| base_balance_obl | DECIMAL(15,2) | Verwendetes Altersguthaben obligatorisch |
| base_balance_ueob | DECIMAL(15,2) | Verwendetes Altersguthaben überobligatorisch |

### Neue Tabelle: `projection_scenarios`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| projection_id | UUID | FK zu projections |
| name | VARCHAR(100) | Name des Szenarios |
| sort_order | INTEGER | Reihenfolge in Anzeige |
| retirement_age | INTEGER | Pensionierungsalter (58-70) |
| interest_rate | DECIMAL(5,3) | Projizierter Zinssatz (z.B. 1.250 für 1.25%) |
| conversion_rate_obl | DECIMAL(5,3) | Umwandlungssatz obligatorisch (z.B. 6.800) |
| conversion_rate_ueob | DECIMAL(5,3) | Umwandlungssatz überobligatorisch |
| salary_growth_rate | DECIMAL(5,3) | Lohnentwicklung p.a. (z.B. 1.000 für 1%) |
| purchase_amount | DECIMAL(15,2) | Simulierter Einkaufsbetrag |
| result_capital_obl | DECIMAL(15,2) | Berechnetes Kapital obl. |
| result_capital_ueob | DECIMAL(15,2) | Berechnetes Kapital überob. |
| result_pension_obl | DECIMAL(15,2) | Berechnete Rente obl. (monatlich) |
| result_pension_ueob | DECIMAL(15,2) | Berechnete Rente überob. (monatlich) |
| result_purchase_potential | DECIMAL(15,2) | Max. Einkaufspotenzial |
| created_at | TIMESTAMP | Erstellungsdatum |

### Neue Tabelle: `projection_parameters` (Systemkonfiguration)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID | Primary Key |
| key | VARCHAR(50) | Parameter-Schlüssel |
| value | DECIMAL(10,4) | Wert |
| valid_from | DATE | Gültig ab |
| valid_to | DATE | Gültig bis (nullable) |
| description | TEXT | Beschreibung |

**Standard-Einträge:**
| key | value | description |
|-----|-------|-------------|
| bvg_min_interest_rate | 1.2500 | BVG-Mindestzinssatz 2024 |
| bvg_conversion_rate_obl | 6.8000 | Gesetzlicher Umwandlungssatz obligatorisch |
| default_retirement_age | 65 | Standard-Pensionierungsalter |
| min_retirement_age | 58 | Frühestes Pensionierungsalter |
| max_retirement_age | 70 | Spätestes Pensionierungsalter |

---

## Berechnungslogik (Pseudocode)

```
function calculateProjection(scenario, employment, accounts):

    // Grunddaten
    currentAge = calculateAge(employment.insuredPerson.birthDate)
    yearsToRetirement = scenario.retirementAge - currentAge
    currentBalanceObl = getAccountBalance('altersguthaben')
    currentBalanceUeob = getAccountBalance('altersguthaben_ueob')
    annualContribution = getAnnualContribution(employment)

    // Projektion Altersguthaben
    projectedBalanceObl = currentBalanceObl
    projectedBalanceUeob = currentBalanceUeob

    for year in 1..yearsToRetirement:
        // Verzinsung
        projectedBalanceObl *= (1 + scenario.interestRate / 100)
        projectedBalanceUeob *= (1 + scenario.interestRate / 100)

        // Beiträge (mit Lohnentwicklung)
        adjustedContribution = annualContribution * (1 + scenario.salaryGrowthRate / 100) ^ year
        projectedBalanceObl += adjustedContribution * oblRatio
        projectedBalanceUeob += adjustedContribution * ueobRatio

    // Einkauf berücksichtigen
    if scenario.purchaseAmount > 0:
        projectedBalanceObl += scenario.purchaseAmount * oblRatio
        projectedBalanceUeob += scenario.purchaseAmount * ueobRatio

    // Rente berechnen
    annualPensionObl = projectedBalanceObl * (scenario.conversionRateObl / 100)
    annualPensionUeob = projectedBalanceUeob * (scenario.conversionRateUeob / 100)
    monthlyPensionObl = annualPensionObl / 12
    monthlyPensionUeob = annualPensionUeob / 12

    // Einkaufspotenzial
    purchasePotential = calculatePurchasePotential(employment, projectedBalanceObl + projectedBalanceUeob)

    return {
        capitalObl: projectedBalanceObl,
        capitalUeob: projectedBalanceUeob,
        pensionObl: monthlyPensionObl,
        pensionUeob: monthlyPensionUeob,
        purchasePotential: purchasePotential
    }
```

---

## Technische Anforderungen

### Performance
- Berechnung: < 500ms für 5 Szenarien
- Lazy Loading für gespeicherte Hochrechnungen
- Debounce bei Parameter-Änderungen (300ms)

### Sicherheit
- Row Level Security auf projections und projection_scenarios
- Nur Sachbearbeiter mit Zugriff auf die Anstellung können Hochrechnungen sehen
- Audit-Trail: Wer hat welche Hochrechnung erstellt/geändert

### Datenintegrität
- Kontostände werden bei Erstellung der Hochrechnung eingefroren (Snapshot)
- Gespeicherte Hochrechnungen bleiben auch nach Kontoänderungen erhalten

---

## Internationalisierung

Neue Übersetzungsschlüssel:
- `projections.*` - Hochrechnungs-Bereich
- `projections.scenarios.*` - Szenarien
- `projections.parameters.*` - Parameter-Labels
- `projections.results.*` - Ergebnis-Beschriftungen

---

## Wireframes

### Hochrechnungs-Hauptansicht
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Zurück zu Konten                                                       │
│                                                                          │
│ BVG-Hochrechnung                                                         │
│ Max Mustermann | Arbeitgeber AG | Eingeloggt seit 01.01.2020            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Aktuelle Kontostände (per 15.01.2024)                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Altersguthaben obl.:    CHF  85'432.50                              │ │
│ │ Altersguthaben überob.: CHF  39'817.50                              │ │
│ │ Total:                  CHF 125'250.00                              │ │
│ │ Einkaufspotenzial:      CHF  45'000.00                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Szenarien                                            [+ Neues Szenario]  │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                          │
│ ┌─────────────────┬─────────────────┬─────────────────┐                 │
│ │ Standard        │ Frühpension.    │ Mit Einkauf     │                 │
│ │ [✏️] [🗑️]       │ [✏️] [🗑️]       │ [✏️] [🗑️]       │                 │
│ ├─────────────────┼─────────────────┼─────────────────┤                 │
│ │ Alter: 65       │ Alter: 63       │ Alter: 65       │                 │
│ │ Zins: 1.25%     │ Zins: 1.25%     │ Zins: 1.25%     │                 │
│ │ Lohn: 0%        │ Lohn: 0%        │ Lohn: 1.5%      │                 │
│ │ Einkauf: -      │ Einkauf: -      │ Einkauf: 45k    │                 │
│ ├─────────────────┼─────────────────┼─────────────────┤                 │
│ │ KAPITAL         │ KAPITAL         │ KAPITAL         │                 │
│ │ Obl:   142'500  │ Obl:   128'200  │ Obl:   185'300  │                 │
│ │ Überob: 65'300  │ Überob: 58'100  │ Überob: 78'200  │                 │
│ │ Total: 207'800  │ Total: 186'300  │ Total: 263'500  │                 │
│ ├─────────────────┼─────────────────┼─────────────────┤                 │
│ │ RENTE/Mt.       │ RENTE/Mt.       │ RENTE/Mt.       │                 │
│ │ Obl:     807    │ Obl:     726    │ Obl:   1'050    │                 │
│ │ Überob:  326    │ Überob:  290    │ Überob:  391    │                 │
│ │ Total: 1'133    │ Total:  1'016   │ Total:  1'441   │                 │
│ └─────────────────┴─────────────────┴─────────────────┘                 │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                    [Balkendiagramm Vergleich]                       │ │
│ │  Standard    ████████████████████  207'800                          │ │
│ │  Frühpens.   ████████████████      186'300                          │ │
│ │  Mit Einkauf ██████████████████████████  263'500                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ [Speichern]                              Gespeicherte Projektionen (2) ▼ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Szenario-Bearbeitung (Modal)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Szenario bearbeiten                                               [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Name                                                                     │
│ [Frühpensionierung 63                                              ]    │
│                                                                          │
│ Pensionierungsalter                                                      │
│ [━━━━━━━━━●━━━━━━━] 63 Jahre                                            │
│  58              70                                                      │
│                                                                          │
│ Projizierter Zinssatz (%)                    Umwandlungssatz obl. (%)   │
│ [1.25          ]                             [6.80          ]            │
│                                                                          │
│ Umwandlungssatz überob. (%)                  Lohnentwicklung p.a. (%)   │
│ [5.40          ]                             [0.00          ]            │
│                                                                          │
│ Simulierter Einkauf (CHF)                                               │
│ [                    ]  [Max. 45'000 übernehmen]                        │
│                                                                          │
│                                         [Abbrechen]  [Übernehmen]       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Testszenarien

### Funktionale Tests
1. Hochrechnung erstellen → Ergebnisse werden angezeigt
2. Parameter ändern → Ergebnisse aktualisieren automatisch
3. Szenario hinzufügen → Max. 5 Szenarien möglich
4. Szenario löschen → Mindestens 1 bleibt
5. Hochrechnung speichern → Erscheint in gespeicherten Projektionen
6. Gespeicherte Hochrechnung laden → Alle Szenarien werden wiederhergestellt
7. Einkauf simulieren → Kapital und Rente erhöhen sich

### Edge Case Tests
1. Pensionierungsalter < aktuelles Alter → Warnung
2. Einkauf > Potenzial → Fehlermeldung
3. 6. Szenario anlegen → Nicht möglich
4. Negativer Zinssatz → Warnung, aber möglich
5. Konto ohne Altersguthaben → Hochrechnung nicht verfügbar

### Performance Tests
1. 5 Szenarien gleichzeitig berechnen
2. Schnelle Parameter-Änderungen (Debounce)
3. Viele gespeicherte Hochrechnungen (>50)

---

## Schätzung

| Phase | Aufwand |
|-------|---------|
| Datenbankschema | S |
| Berechnungs-Engine | M |
| Parameter-UI | M |
| Vergleichsansicht | L |
| Grafische Darstellung | M |
| Speichern/Laden | M |
| Tests | M |
| **Gesamt** | **L** |

---

## Open Questions

1. ~~Wer kann Hochrechnungen erstellen?~~ → Sachbearbeiter
2. ~~Welche Parameter?~~ → Pensionierungsalter, Zinssatz, Lohnentwicklung, Einkauf
3. ~~Max. Szenarien?~~ → 5
4. ~~Ergebnisdarstellung?~~ → Rente, Kapital, Mischformen + Grafik
5. ~~obl./überob. getrennt?~~ → Ja
6. ~~Speicherung?~~ → Ja, Szenarien können gespeichert werden
7. ~~PDF-Export?~~ → Nicht im MVP, kann als separates Feature ergänzt werden
8. ~~Woher kommt der überobligatorische Umwandlungssatz?~~ → Aus Kassenkonfiguration (pro Arbeitgeber/Pensionskasse konfigurierbar)
9. ~~Sollen Arbeitnehmer-/Arbeitgeberbeiträge separat projiziert werden?~~ → Nein, Beiträge werden als Gesamtsumme projiziert
