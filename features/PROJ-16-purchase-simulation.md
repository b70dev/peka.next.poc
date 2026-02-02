# PROJ-16: Einkauf-Simulation (Freiwillige Einkäufe berechnen)

## Status: 🔵 Planned

## Übersicht

Ermöglicht versicherten Personen die selbstständige Berechnung und Simulation von freiwilligen Einkäufen in die Pensionskasse. Der Versicherte kann verschiedene Szenarien durchspielen und die steuerlichen sowie vorsorgerechtlichen Auswirkungen eines Einkaufs verstehen.

## Abhängigkeiten

- **Benötigt:** PROJ-12 (Versicherten-Onboarding) - Portal-Account muss existieren
- **Benötigt:** PROJ-11 (BVG-Projektionen) - Berechnungslogik für Altersleistungen
- **Benötigt:** Aktuelles Einkaufspotenzial muss berechnet sein

## User Stories

### US-1: Einkaufspotenzial einsehen
Als versicherte Person möchte ich sehen, wie viel ich maximal in die Pensionskasse einzahlen kann, um meine Steuerplanung zu optimieren.

### US-2: Einkaufsbetrag simulieren
Als versicherte Person möchte ich verschiedene Einkaufsbeträge eingeben und die Auswirkungen auf mein Altersguthaben sehen können.

### US-3: Auswirkung auf Altersrente berechnen
Als versicherte Person möchte ich sehen, wie ein Einkauf meine zukünftige Altersrente erhöht, um den Nutzen einschätzen zu können.

### US-4: Steuerliche Auswirkungen verstehen
Als versicherte Person möchte ich eine Schätzung der Steuerersparnis durch einen Einkauf sehen, um die finanzielle Attraktivität zu bewerten.

### US-5: Einkauf über mehrere Jahre planen
Als versicherte Person möchte ich Einkäufe über mehrere Jahre verteilen können, um die steuerliche Optimierung zu maximieren.

### US-6: Einkaufsanfrage einreichen
Als versicherte Person möchte ich nach der Simulation direkt eine Einkaufsanfrage bei der Pensionskasse einreichen können.

## Acceptance Criteria

### Einkaufspotenzial-Übersicht
- [ ] Menüpunkt "Einkauf simulieren" im Portal-Navigation
- [ ] Anzeige des aktuellen maximalen Einkaufspotenzials
- [ ] Aufschlüsselung: BVG-Minimum, Überobligatorium, Total
- [ ] Hinweis auf Basis der Berechnung (aktueller Lohn, Alter, bisheriges Guthaben)
- [ ] Datum der letzten Aktualisierung des Einkaufspotenzials

### Einkaufs-Rechner (Hauptfunktion)

#### Eingaben
- [ ] Slider oder Eingabefeld für Einkaufsbetrag (0 bis max. Einkaufspotenzial)
- [ ] Schnellauswahl-Buttons: 5'000 / 10'000 / 25'000 / Max
- [ ] Eingabe von Grenzsteuersatz (optional, für genauere Steuerberechnung)
- [ ] Wohnsitzkanton (für kantonale Steuerberechnung, Default: PK-Stammdaten)

#### Berechnete Ausgaben (Echtzeit-Update)
- [ ] **Einzahlungsbetrag:** CHF [Betrag]
- [ ] **Erhöhung Altersguthaben:** Direkt um Einkaufsbetrag + projizierte Zinsen bis 65
- [ ] **Zusätzliche Altersrente:** CHF [Betrag] pro Jahr (= Guthabenerhöhung × Umwandlungssatz)
- [ ] **Geschätzte Steuerersparnis:** CHF [Betrag] (= Einkauf × Grenzsteuersatz)
- [ ] **Effektive Kosten:** CHF [Betrag] (= Einkauf - Steuerersparnis)
- [ ] **Rendite:** Vergleich Steuerersparnis vs. langfristiger Nutzen

### Mehrjahres-Planung
- [ ] Option "Einkauf auf mehrere Jahre verteilen"
- [ ] Eingabe: Anzahl Jahre (2-5)
- [ ] System berechnet optimale Verteilung
- [ ] Grafische Darstellung der Einkaufsstrategie über Jahre
- [ ] Hinweis auf steuerliche Vorteile der Verteilung (Progression brechen)

### Vergleichsansicht
- [ ] Tabelle/Grafik: "Ohne Einkauf" vs. "Mit Einkauf"
- [ ] Vergleich Altersguthaben bei 65
- [ ] Vergleich monatliche Altersrente
- [ ] Visualisierung: Balkendiagramm oder einfache Grafik

### Einschränkungen & Hinweise
- [ ] Warnung wenn Einkauf > Jahreseinkommen (steuerlich nicht voll abzugsfähig)
- [ ] Hinweis auf 3-Jahres-Sperrfrist für Kapitalbezug nach Einkauf
- [ ] Hinweis: "Dies ist eine Simulation. Verbindliche Auskünfte erteilt die Pensionskasse."
- [ ] Link zu detaillierten Erklärungen (Reglement, FAQ)

### Einkaufsanfrage einreichen
- [ ] Button "Einkauf anfragen" nach Simulation
- [ ] Bestätigung des simulierten Betrags
- [ ] Bestätigung: "Ich habe die Hinweise zur 3-Jahres-Sperrfrist gelesen"
- [ ] Absenden erstellt Anfrage bei der Pensionskasse
- [ ] Versicherter erhält Einzahlungsschein / Zahlungsinformationen
- [ ] Status der Anfrage wird im Portal angezeigt

### Einzahlungsprozess (nach Anfrage)
- [ ] Anzeige der Zahlungsinformationen (IBAN, Referenz, Betrag)
- [ ] QR-Rechnung als PDF downloadbar (falls integriert)
- [ ] Nach Zahlungseingang: Bestätigung im Portal
- [ ] Einkauf erscheint im nächsten Versicherungsausweis

## Edge Cases

### E1: Kein Einkaufspotenzial
- **Szenario:** Versicherter hat bereits maximal eingekauft
- **Verhalten:** Hinweis "Sie haben Ihr maximales Einkaufspotenzial bereits ausgeschöpft."

### E2: Negatives Einkaufspotenzial (theoretisch)
- **Szenario:** Berechnungsfehler oder Sonderfall
- **Verhalten:** Einkaufspotenzial wird als 0 angezeigt, Hinweis zur Kontaktaufnahme

### E3: Sehr hoher Einkauf
- **Szenario:** Versicherter will Einkauf > Jahreseinkommen
- **Verhalten:** Warnung zu steuerlicher Abzugsfähigkeit, trotzdem möglich

### E4: Einkauf kurz vor Pensionierung
- **Szenario:** Versicherter ist 63, will noch einkaufen
- **Verhalten:** Simulation zeigt kürzere Zinseszins-Phase, Hinweis auf 3-Jahres-Sperrfrist

### E5: Lohnänderung bevorstehend
- **Szenario:** Versicherter weiss, dass Lohn steigt/sinkt
- **Verhalten:** Simulation basiert auf aktuellem Lohn, Hinweis dass sich Potenzial ändern kann

### E6: Bereits getätigter Einkauf im laufenden Jahr
- **Szenario:** Versicherter hat dieses Jahr schon eingekauft
- **Verhalten:** Verbleibendes Potenzial wird korrekt angezeigt

### E7: Einkauf bei Teilzeit
- **Szenario:** Versicherter arbeitet Teilzeit, hat hohes Einkaufspotenzial
- **Verhalten:** Korrekte Berechnung basierend auf BVG-Skala für Teilzeit

### E8: WEF-Vorbezug noch nicht zurückgezahlt
- **Szenario:** Versicherter hat WEF-Vorbezug, muss erst zurückzahlen
- **Verhalten:** Hinweis: "Vor weiteren Einkäufen muss der WEF-Vorbezug zurückgezahlt werden."

## Nicht im Scope

- ❌ Tatsächliche Steuerberechnung (nur Schätzung mit Grenzsteuersatz)
- ❌ Integration mit Steuer-Software
- ❌ Automatische Zahlungsabwicklung (nur Zahlungsinformationen)
- ❌ Simulation von Kapitalbezug-Szenarien → separates Feature
- ❌ Einkauf in Überbrückungsrente → spätere Phase

## Technische Anforderungen

- **Performance:** Berechnungen < 100ms (client-seitig möglich)
- **Echtzeit:** Slider/Input aktualisiert Berechnung sofort
- **Formeln:** Basierend auf aktuellem Reglement und BVG-Parametern
- **Aktualisierung:** Einkaufspotenzial muss regelmässig aktualisiert werden (Jahresabschluss)

## UI/UX Anforderungen

- Interaktiver Slider als Haupteingabe (intuitiv)
- Grosse, lesbare Zahlen für Hauptergebnisse
- Grafische Visualisierung (Balkendiagramm) des Vergleichs
- Tooltips für Fachbegriffe (Umwandlungssatz, Grenzsteuersatz, etc.)
- Mobile-first Design
- Barrierefreiheit: WCAG 2.1 AA konform

## Berechnungslogik (Konzept)

### Einkaufspotenzial
```
Max. Einkauf = Reglementarisches Altersguthaben (bei vollem Einkauf)
             - Tatsächliches Altersguthaben
             - Bereits getätigte Einkäufe
```

### Auswirkung auf Altersrente
```
Zusätzliche Rente/Jahr = Einkaufsbetrag × (1 + Zinssatz)^(65-Alter) × Umwandlungssatz
```

### Steuerersparnis (Schätzung)
```
Steuerersparnis = Einkaufsbetrag × Grenzsteuersatz
```

### Effektive Kosten
```
Effektive Kosten = Einkaufsbetrag - Steuerersparnis
```

## Disclaimer

Die Einkauf-Simulation ist ein Planungsinstrument und ersetzt keine individuelle Beratung. Steuerliche Auswirkungen sind Schätzungen und können von der tatsächlichen Steuerbelastung abweichen. Für verbindliche Auskünfte wenden Sie sich bitte an Ihre Pensionskasse oder einen Steuerberater.

