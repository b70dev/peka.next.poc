# PROJ-20: Zahlungsläufe & Freigabe (Payment Runs)

## Status: In Review
**Created:** 2026-04-13
**Last Updated:** 2026-04-15

## Dependencies
- Requires: PROJ-19 (Zahlungsaufträge) - Zahlungsaufträge müssen existieren, um gebündelt zu werden
- Requires: PROJ-4 (Rollen und Berechtigungen) - Freigabe-Workflow basiert auf Admin-Rollen
- Requires: PROJ-1 (Authentication) - für eingeloggten Benutzer

## User Stories

### US-1: Zahlungslauf erstellen
Als **Admin** möchte ich mehrere Zahlungsaufträge zu einem Zahlungslauf bündeln, damit ich sie gemeinsam prüfen und freigeben kann.

### US-2: Zahlungsaufträge zum Lauf hinzufügen
Als **Admin** möchte ich bestehende Zahlungsaufträge (Status "Entwurf") aus einer Liste auswählen und einem Zahlungslauf zuordnen, damit ich flexibel zusammenstellen kann.

### US-3: Zahlungslauf prüfen
Als **Admin** möchte ich eine Zusammenfassung des Zahlungslaufs sehen (Anzahl Zahlungen, Gesamtbetrag, Empfängerliste), damit ich den Lauf vor der Visierung kontrollieren kann.

### US-4: Zahlungslauf visieren (Vieraugenprinzip - Schritt 1)
Als **Admin/Super-Admin** möchte ich einen Zahlungslauf visieren (erste Unterschrift), damit ein zweiter berechtigter Benutzer die endgültige Freigabe erteilen kann.

### US-5: Zahlungslauf freigeben (Vieraugenprinzip - Schritt 2)
Als **Admin/Super-Admin** möchte ich einen bereits visierten Zahlungslauf endgültig freigeben, damit die pain.001-Datei generiert werden kann. Dabei muss ich eine andere Person sein als der Visierende.

### US-6: Zahlungslauf ablehnen
Als **Admin** möchte ich einen Zahlungslauf ablehnen und einen Grund angeben, damit fehlerhafte Läufe korrigiert werden können.

### US-7: Zahlungsläufe auflisten
Als **Admin** möchte ich eine Übersicht aller Zahlungsläufe mit Status und Zusammenfassung sehen, damit ich den Überblick über ausstehende und erledigte Läufe habe.

### US-8: Einzelne Aufträge aus Lauf entfernen
Als **Admin** möchte ich einzelne Zahlungsaufträge aus einem noch nicht freigegebenen Zahlungslauf entfernen, damit ich den Lauf anpassen kann, ohne ihn komplett neu zu erstellen.

## Acceptance Criteria

### Zahlungslauf erstellen
- [ ] Admin kann einen neuen Zahlungslauf mit einem Namen/Bezeichnung und optionalem Ausführungsdatum erstellen
- [ ] Nur Zahlungsaufträge im Status "Entwurf" können einem Lauf hinzugefügt werden
- [ ] Ein Zahlungsauftrag kann nur einem aktiven Zahlungslauf zugeordnet sein
- [ ] Beim Hinzufügen ändert sich der Auftragsstatus auf "In Zahlungslauf"

### Freigabe-Workflow (Vieraugenprinzip)
- [ ] Zahlungslauf-Status: Entwurf → Zur Prüfung → Visiert → Freigegeben → Exportiert
- [ ] Alternativ: Entwurf → Zur Prüfung → Abgelehnt → (zurück zu Entwurf)
- [ ] **Visierung (Schritt 1):** Ein Admin/Super-Admin visiert den Lauf (erste Unterschrift)
- [ ] **Freigabe (Schritt 2):** Ein *anderer* Admin/Super-Admin gibt den Lauf frei (zweite Unterschrift)
- [ ] Der freigebende Benutzer muss eine andere Person sein als der Visierende
- [ ] System verhindert, dass derselbe Benutzer sowohl visiert als auch freigibt
- [ ] Bei Visierung wird Zeitstempel und visierender Benutzer protokolliert
- [ ] Bei Freigabe wird Zeitstempel und freigebender Benutzer protokolliert
- [ ] Bei Ablehnung (in jedem Schritt möglich) ist ein Ablehnungsgrund (Pflichtfeld) erforderlich
- [ ] Nur Admin oder Super-Admin können visieren und freigeben

### Zahlungslauf-Zusammenfassung
- [ ] Anzeige: Anzahl Zahlungen, Gesamtbetrag (CHF), Liste aller Empfänger mit Betrag
- [ ] Warnung bei auffälligen Beträgen (z.B. Einzelzahlung > CHF 100'000)
- [ ] Anzeige des Erstellungsdatums und des geplanten Ausführungsdatums

### Übersicht
- [ ] Tabellarische Ansicht aller Zahlungsläufe mit Status-Filter
- [ ] Schnellansicht der wichtigsten Kennzahlen (Anzahl, Gesamtbetrag)
- [ ] Sortierung nach Erstellungsdatum, Ausführungsdatum, Status

### Aufträge entfernen
- [ ] Einzelne Aufträge können aus einem Lauf im Status "Entwurf" entfernt werden
- [ ] Entfernte Aufträge kehren zum Status "Entwurf" zurück
- [ ] Ein Zahlungslauf ohne Aufträge kann nicht zur Prüfung eingereicht werden

## Edge Cases

### E-1: Leerer Zahlungslauf
Was passiert, wenn alle Aufträge aus einem Lauf entfernt werden?
→ Lauf bleibt im Status "Entwurf", kann nicht zur Prüfung eingereicht werden. Admin kann ihn löschen oder neue Aufträge hinzufügen.

### E-2: Zahlungsauftrag wird storniert während er in einem Lauf ist
Was passiert, wenn ein im Lauf enthaltener Auftrag anderweitig storniert wird?
→ Auftrag wird automatisch aus dem Lauf entfernt. Admin erhält eine Benachrichtigung/Hinweis beim nächsten Öffnen des Laufs.

### E-3: Sehr grosser Zahlungslauf
Was passiert bei einem Lauf mit > 1'000 Zahlungen?
→ Zusammenfassung zeigt aggregierte Werte. Detail-Liste ist paginiert. Performance-Ziel: Laden < 3 Sekunden.

### E-4: Gleichzeitige Visierung/Freigabe
Was passiert, wenn zwei Admins gleichzeitig denselben Lauf visieren oder freigeben?
→ Optimistic Locking: Nur die erste Aktion wird akzeptiert. Zweiter Admin erhält Hinweis, dass der Status sich geändert hat.

### E-5: Freigabe rückgängig machen
Kann eine Freigabe rückgängig gemacht werden?
→ Nein, nach Freigabe ist der Lauf gesperrt. Bei Fehlern muss ein neuer Korrektur-Lauf erstellt werden (mit negativen Beträgen oder Storno-Aufträgen).

### E-6: Nur ein Admin im System
Was passiert, wenn nur ein einziger Admin/Super-Admin existiert?
→ Das Vieraugenprinzip kann nicht erfüllt werden. Der Lauf bleibt im Status "Visiert" und kann nicht freigegeben werden. System zeigt Hinweis: "Für die Freigabe ist ein zweiter berechtigter Benutzer erforderlich."

### E-7: Visierender Benutzer wird deaktiviert
Was passiert, wenn der visierende Benutzer nach der Visierung deaktiviert wird?
→ Die Visierung bleibt gültig. Ein anderer Admin kann den Lauf weiterhin freigeben. Die Visierung ist an die Person zum Zeitpunkt der Aktion gebunden.

## Technical Requirements (optional)
- Performance: Zahlungslauf-Zusammenfassung < 2 Sekunden (bis 1'000 Aufträge pro Lauf)
- Security: RLS-Policies, Freigabe-Audit-Trail (wer hat wann freigegeben)
- Accessibility: WCAG 2.1 AA
- Audit: Alle Statusänderungen werden mit Zeitstempel und Benutzer protokolliert

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
