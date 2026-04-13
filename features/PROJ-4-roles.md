# PROJ-4: Rollen und Berechtigungen

## Status: ✅ Done
**Created:** 2026-02-10
**Last Updated:** 2026-02-14

## Übersicht

Implementiert ein Rollen-basiertes Zugriffskontrollsystem (RBAC) für peka.next mit drei Stufen: Super-Admin, Admin und Viewer. Jede Rolle hat definierte Berechtigungen für verschiedene Aktionen im System.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - User muss eingeloggt sein
- **Optional:** PROJ-2 (Registration) - Neue Self-Service-User erhalten Standard-Rolle (Rollen funktionieren auch ohne Self-Registration)

## User Stories

### US-1: Rollen-basierter Zugriff
Als Admin möchte ich, dass nur berechtigte User Änderungen vornehmen können, um die Datenintegrität zu gewährleisten.

### US-2: Super-Admin User-Verwaltung
Als Super-Admin möchte ich andere Benutzer verwalten können (Rollen zuweisen, Accounts aktivieren/deaktivieren).

### US-3: Viewer eingeschränkter Zugriff
Als Viewer möchte ich Daten einsehen können, ohne sie versehentlich zu ändern.

### US-4: Rollen-Anzeige
Als eingeloggter User möchte ich meine aktuelle Rolle sehen können, um zu verstehen, welche Berechtigungen ich habe.

### US-5: Rollen-Änderung durch Super-Admin
Als Super-Admin möchte ich die Rolle eines anderen Users ändern können, um Berechtigungen anzupassen.

## Rollen-Definition

### Super-Admin
**Beschreibung:** Vollzugriff auf alle Funktionen, inklusive User-Verwaltung.

**Berechtigungen:**
- ✅ Alle Viewer-Berechtigungen
- ✅ Alle Admin-Berechtigungen
- ✅ User-Accounts aktivieren/deaktivieren
- ✅ Rollen anderer User ändern
- ✅ System-Einstellungen ändern
- ✅ Audit-Logs einsehen
- ✅ Neue Super-Admins ernennen

### Admin
**Beschreibung:** Kann Daten bearbeiten und verwalten, aber keine User-Verwaltung.

**Berechtigungen:**
- ✅ Alle Viewer-Berechtigungen
- ✅ Versicherte Personen anlegen/bearbeiten
- ✅ Arbeitgeber-Daten anlegen/bearbeiten
- ✅ Dokumente hochladen/bearbeiten
- ✅ Berechnungen durchführen
- ✅ Reports erstellen
- ❌ Keine User-Verwaltung
- ❌ Keine System-Einstellungen

### Viewer
**Beschreibung:** Nur Lese-Zugriff, keine Änderungen möglich.

**Berechtigungen:**
- ✅ Versicherte Personen einsehen
- ✅ Arbeitgeber-Daten einsehen
- ✅ Dokumente einsehen/herunterladen
- ✅ Reports einsehen
- ✅ Eigenes Profil bearbeiten
- ❌ Keine Datenänderungen
- ❌ Keine User-Verwaltung

## Acceptance Criteria

### Rollen-Zuweisung
- [ ] Neue User erhalten automatisch Rolle "Viewer"
- [ ] Erster registrierter User wird automatisch "Super-Admin"
- [ ] Nur Super-Admin kann Rollen ändern
- [ ] Rollen-Änderung erfordert MFA-Bestätigung
- [ ] Rollen-Änderung wird im Audit-Log protokolliert

### Zugriffskontrolle
- [ ] Jede API-Route prüft Benutzerrolle
- [ ] Unberechtigter Zugriff gibt HTTP 403 zurück
- [ ] UI zeigt nur Funktionen an, für die User berechtigt ist
- [ ] Buttons/Links für unerlaubte Aktionen sind ausgeblendet (nicht nur disabled)

### User-Verwaltung (nur Super-Admin)
- [ ] Liste aller User mit Name, Email, Rolle, Status
- [ ] Such-/Filterfunktion nach Name, Email, Rolle
- [ ] Rollen-Dropdown zum Ändern
- [ ] "Deaktivieren"-Button für Accounts
- [ ] "Aktivieren"-Button für deaktivierte Accounts
- [ ] Bestätigungsdialog vor kritischen Aktionen

### Rollen-Anzeige
- [ ] Aktuelle Rolle wird im Header/Profil-Menü angezeigt
- [ ] Rollen-Badge: Super-Admin (rot), Admin (blau), Viewer (grau)
- [ ] Tooltip mit Rollen-Beschreibung

### Self-Service-Einschränkungen
- [ ] User kann eigene Rolle nicht ändern
- [ ] Super-Admin kann sich nicht selbst herabstufen (Schutz)
- [ ] Letzter Super-Admin kann nicht entfernt werden

## Edge Cases

### E1: Letzter Super-Admin
- **Szenario:** Einziger Super-Admin versucht, sich zu degradieren
- **Verhalten:** "Sie sind der einzige Super-Admin. Ernennen Sie zuerst einen anderen Super-Admin."

### E2: Deaktivierter User während Session
- **Szenario:** Super-Admin deaktiviert User, während dieser eingeloggt ist
- **Verhalten:** Bei nächster Aktion wird User ausgeloggt mit Meldung "Account deaktiviert"

### E3: Rolle geändert während Session
- **Szenario:** Super-Admin ändert Rolle eines eingeloggten Users
- **Verhalten:** Neue Berechtigungen gelten ab nächster Seiten-Anfrage (kein Logout nötig)

### E4: Super-Admin-Konto kompromittiert
- **Szenario:** Super-Admin Account wird gehackt
- **Verhalten:** Anderer Super-Admin kann Account deaktivieren. Audit-Log zeigt alle Aktionen.

### E5: Massen-Rollen-Änderung
- **Szenario:** Admin will viele User gleichzeitig ändern
- **Verhalten:** MVP: Einzeln ändern. Bulk-Operationen → späteres Feature

## Nicht im Scope

- ❌ Feingranulare Berechtigungen (z.B. "darf nur Arbeitgeber X sehen")
- ❌ Temporäre Rollen-Erhöhung
- ❌ Benutzerdefinierte Rollen erstellen
- ❌ Berechtigungs-Gruppen

## Technische Anforderungen

- Rollen werden in User-Tabelle gespeichert (1:1 Beziehung)
- Middleware prüft Rolle bei jeder authentifizierten Anfrage
- Berechtigungsprüfung sowohl Client-seitig (UX) als auch Server-seitig (Security)
- Audit-Log für alle Rollen-Änderungen mit Timestamp, Actor, Target, Old/New Role
- Performance: Rollen-Check in Middleware < 50ms (kein zusätzlicher DB-Roundtrip pro Request)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
Siehe [PROJ-4-solution-architecture.md](./PROJ-4-solution-architecture.md)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
