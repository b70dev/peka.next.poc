# PROJ-18: Versicherten-Rolle & Portal-Berechtigungen

## Status: 🔵 Planned

## Übersicht

Definiert die "Versicherte Person" als eigene User-Rolle im System mit strikten Berechtigungen für den Zugriff ausschliesslich auf eigene Daten. Versicherte Personen greifen über ein dediziertes Portal (`/portal/*`) zu und können nur ihre eigenen Anstellungen, Konti, Stammdaten und Dokumente einsehen und verwalten.

## Abhängigkeiten

- **Benötigt:** PROJ-4 (Rollen & Berechtigungen) - für grundlegendes RBAC-System
- **Benötigt:** PROJ-12 (Versicherten-Onboarding) - Portal-Account muss existieren
- **Ergänzt:** PROJ-13 (Stammdaten-Ansicht) - definiert Berechtigungen für Datenzugriff
- **Relation zu:** PROJ-14 (Versicherungsausweis), PROJ-15 (Dokumente) - definiert Zugriffsbeschränkungen

## User Stories

### US-1: Versicherten-Rolle erkennen
Als System möchte ich automatisch erkennen, ob ein eingeloggter User eine versicherte Person ist, um die korrekten Berechtigungen anzuwenden.

### US-2: Nur eigene Daten sehen
Als versicherte Person möchte ich ausschliesslich meine eigenen Daten sehen können, um meine Privatsphäre zu schützen.

### US-3: Keine anderen Versicherten sehen
Als versicherte Person soll ich keine Liste anderer Versicherter sehen können, um Datenschutz zu gewährleisten.

### US-4: Mehrere Anstellungen verwalten
Als versicherte Person mit mehreren Anstellungen möchte ich alle meine aktuellen und historischen Arbeitgeber sehen können, um einen Überblick über meine Vorsorgesituation zu haben.

### US-5: Eigene Konti verwalten
Als versicherte Person möchte ich alle meine Vorsorgekonti (aktiv und inaktiv) einsehen und verwalten können.

### US-6: Zugriff auf eigene Dokumente
Als versicherte Person möchte ich nur meine eigenen Dokumente (Versicherungsausweis, Lohnausweise, etc.) herunterladen können.

### US-7: Kein Admin-Zugriff
Als versicherte Person soll ich keine Admin-Funktionen (User-Verwaltung, Berechnungen, Reports) sehen können, da diese nicht für mich relevant sind.

### US-8: Read-Only bei Austritt
Als ausgeschiedene versicherte Person möchte ich weiterhin auf meine historischen Daten zugreifen können (nur Lesezugriff), um meine Vorsorgeinformationen zu archivieren.

## Rollen-Definition: Versicherte Person

### Beschreibung
Versicherte Personen sind externe User, die über das Versichertenportal (`/portal/*`) auf ihre persönlichen Vorsorgeinformationen zugreifen. Sie haben strikte Datenisolation und können nur ihre eigenen Daten einsehen und begrenzt bearbeiten.

### Berechtigungen

#### ✅ Erlaubt
- Eigene Stammdaten einsehen (Personalien, Versicherungsdaten)
- Eigene Adresse ändern (wie in PROJ-13 definiert)
- Liste aller eigenen Anstellungen sehen (aktiv + historisch)
- Details zu eigenen Anstellungen einsehen (Arbeitgeber, Beschäftigungsgrad, Lohn)
- Alle eigenen Vorsorgekonti einsehen
- Eigene Konti verwalten (z.B. Begünstigten-Änderungen)
- Eigene Dokumente herunterladen (Versicherungsausweis, Lohnausweise, etc.)
- BVG-Projektionen für eigene Konti berechnen (PROJ-11)
- Einkauf-Simulationen durchführen (PROJ-16)
- Eigenes Passwort ändern
- Eigene MFA-Einstellungen verwalten

#### ❌ Verboten
- Andere Versicherte sehen (keine Liste, Suche oder Detailansicht)
- Andere Anstellungen sehen (ausser eigene)
- Andere Konti sehen (ausser eigene)
- Andere Dokumente herunterladen
- Admin-Funktionen (User-Verwaltung, System-Einstellungen)
- Berechnungen für andere Versicherte durchführen
- Reports erstellen (ausser eigene Auswertungen)
- Audit-Logs einsehen
- Rollen verwalten

### Portal-Zugang

- **Login-URL:** `/portal/login` (separates Login, nicht Admin-Login)
- **Dashboard:** `/portal/dashboard`
- **Navigation:** Dediziertes Portal-Menü (ohne Admin-Bereiche)
- **Session:** Getrennt von Admin-Session (separater Cookie/Token)

## Acceptance Criteria

### Rollen-Erkennung
- [ ] User wird beim Login automatisch als "Versicherte Person" erkannt (basierend auf `portal_users` Tabelle)
- [ ] Backend-API prüft bei jeder Anfrage ob User die Rolle "Versicherte Person" hat
- [ ] Frontend zeigt nur Portal-Navigation (keine Admin-Links)

### Datenisolation (Application-Level)

#### API-Routes
- [ ] Alle `/api/portal/*` Routes prüfen `insured_person_id` aus Session
- [ ] Queries filtern automatisch nach `insured_person_id = session.user.insured_person_id`
- [ ] Beispiel: `GET /api/portal/employments` gibt nur Anstellungen des eingeloggten Versicherten zurück

#### Anstellungen (Employments)
- [ ] `GET /api/portal/employments` - nur eigene Anstellungen
- [ ] `GET /api/portal/employments/:id` - nur wenn Anstellung zu eigenem `insured_person_id` gehört
- [ ] Versuch, fremde Anstellung abzurufen → HTTP 404 (nicht 403!)

#### Konti (Accounts)
- [ ] `GET /api/portal/accounts` - nur eigene Konti
- [ ] `GET /api/portal/accounts/:id` - nur wenn Konto zu eigenem `insured_person_id` gehört
- [ ] `PATCH /api/portal/accounts/:id` - nur eigene Konti bearbeitbar

#### Stammdaten
- [ ] `GET /api/portal/profile` - nur eigene Stammdaten
- [ ] `PATCH /api/portal/profile/address` - nur eigene Adresse änderbar (wie PROJ-13)

#### Dokumente
- [ ] `GET /api/portal/documents` - nur eigene Dokumente
- [ ] `GET /api/portal/documents/:id/download` - nur wenn Dokument zu eigenem `insured_person_id` gehört

### Frontend-Beschränkungen

#### Navigation
- [ ] Portal-Header zeigt: "Meine Daten", "Anstellungen", "Konti", "Dokumente", "Profil"
- [ ] Keine Links zu Admin-Bereichen (User-Verwaltung, Arbeitgeber-Liste, etc.)
- [ ] Kein "Alle Versicherten"-Link

#### Listen-Ansichten
- [ ] "Meine Anstellungen"-Seite zeigt nur eigene Anstellungen (mit Filter: aktiv/inaktiv)
- [ ] "Meine Konti"-Seite zeigt nur eigene Konti
- [ ] Keine Suchfunktion für andere Versicherte

#### Detail-Ansichten
- [ ] Anstellungs-Detail: URL `/portal/employments/:id` - nur eigene IDs gültig
- [ ] Konto-Detail: URL `/portal/accounts/:id` - nur eigene IDs gültig
- [ ] Bei fremder ID: Redirect zu 404-Seite (nicht 403!)

### Mehrere Anstellungen

- [ ] Versicherter kann mehrere parallele Anstellungen haben
- [ ] Liste zeigt alle Anstellungen mit Status (aktiv/inaktiv)
- [ ] Filter: "Nur aktive", "Nur inaktive", "Alle"
- [ ] Jede Anstellung zeigt: Arbeitgeber, Beschäftigungsgrad, Eintrittsdatum, Status

### Security & Edge Cases

#### E1: URL-Manipulation (Zugriff auf fremde ID)
- **Szenario:** Versicherter ändert URL von `/portal/accounts/123` zu `/portal/accounts/456`
- **Verhalten:** HTTP 404 Not Found (Security by Obscurity)
- **Keine Fehlermeldung:** "Konto nicht gefunden" (nicht "Keine Berechtigung")

#### E2: Direkter API-Zugriff
- **Szenario:** Versicherter versucht `GET /api/admin/insured-persons`
- **Verhalten:** HTTP 403 Forbidden ("Keine Berechtigung für Admin-Bereich")

#### E3: Ausgeschiedener Versicherter (Read-Only Modus)
- **Szenario:** Versicherter ist ausgetreten (Status: "inaktiv")
- **Verhalten:**
  - Login funktioniert weiterhin
  - Alle Daten sind sichtbar (read-only)
  - "Adresse ändern"-Button ist deaktiviert mit Hinweis: "Kontaktieren Sie Ihre Pensionskasse für Änderungen"
  - Konto-Verwaltung ist deaktiviert
- [ ] Backend prüft Status bei write-Operationen (PATCH, POST)
- [ ] Inaktive Versicherte bekommen HTTP 403 bei Änderungsversuchen

#### E4: Mehrere gleichnamige Anstellungen
- **Szenario:** Versicherter hat 2 Anstellungen beim gleichen Arbeitgeber
- **Verhalten:** Liste zeigt beide Anstellungen mit Zeitraum zur Unterscheidung

#### E5: Session-Hijacking
- **Szenario:** Angreifer stiehlt Session-Token
- **Verhalten:**
  - Session-Timeout nach 15 Min Inaktivität (wie in PROJ-13)
  - MFA-Pflicht verhindert Account-Übernahme
  - Alle Zugriffe werden im Audit-Log protokolliert

#### E6: Versicherter hat keine Anstellungen
- **Szenario:** Versicherter ist noch nicht angestellt (Edge Case)
- **Verhalten:** Leere-Liste-Ansicht mit Info: "Keine Anstellungen vorhanden"

### Admin-Impersonation (Nicht im Scope)
- ❌ MVP: Kein "Als Versicherter anzeigen"-Feature für Admins
- ✅ Späteres Feature: Admin kann Portal aus Versicherten-Perspektive sehen (mit Audit-Log)

## Nicht im Scope

- ❌ Feingranulare Berechtigungen (z.B. "darf nur Konto A ändern, nicht Konto B")
- ❌ Temporäre Berechtigungen (z.B. "Admin-Zugriff für 1 Stunde")
- ❌ Delegation (z.B. "Ehepartner darf meine Daten sehen")
- ❌ Admin-Impersonation (separates Feature)
- ❌ RLS Policies (Datenisolation erfolgt auf Application-Level)

## Technische Anforderungen

### Datenmodell

#### User-Erkennung
```typescript
// Session enthält:
{
  user_id: UUID,           // aus auth.users
  insured_person_id: UUID, // aus portal_users.insured_person_id
  role: "insured_person",  // abgeleitet aus portal_users
  status: "active" | "inactive" // aus insured_persons.status
}
```

#### API-Middleware (Pseudo-Code)
```typescript
// Jede /api/portal/* Route prüft:
async function requireInsuredPerson(req, res, next) {
  if (!req.session.insured_person_id) {
    return res.status(403).json({ error: "Not authorized" });
  }
  req.insured_person_id = req.session.insured_person_id;
  next();
}

// Bei Daten-Zugriff:
const employments = await db.employments
  .select()
  .where('insured_person_id', req.insured_person_id); // Automatischer Filter
```

### Performance
- Queries mit `insured_person_id` Filter müssen Index nutzen
- Caching von Session-Daten (Redis) für schnelle Berechtigungsprüfung
- Listen-Ansichten: < 500ms Ladezeit

### Audit & Compliance
- Alle Zugriffe auf Versicherten-Daten werden geloggt
- Log-Format: `{ timestamp, user_id, insured_person_id, action, resource_type, resource_id }`
- DSGVO-konform: Versicherte können Auskunft über alle Zugriffe verlangen

## UI/UX Anforderungen

### Portal-Branding
- Visuelle Unterscheidung Portal vs. Admin-Bereich (anderes Color-Scheme)
- Portal-Logo/Header: "Mein Vorsorgeportal" (klar ersichtlich für Versicherte)
- Mobile-first Design (Versicherte nutzen oft Smartphone)

### Fehlermeldungen
- Bei 404 (fremde ID): "Diese Seite wurde nicht gefunden"
- Bei 403 (Admin-Bereich): "Sie haben keine Berechtigung für diesen Bereich"
- Keine technischen Details (insured_person_id, etc.) in Fehlern zeigen

### Barrierefreiheit
- WCAG 2.1 AA konform
- Screen-Reader-freundlich
- Keyboard-Navigation

## Integration mit bestehenden Features

### PROJ-13 (Stammdaten)
- [ ] Stammdaten-Ansicht prüft Versicherten-Rolle
- [ ] Adressänderung nur wenn `status = "active"`

### PROJ-14 (Versicherungsausweis)
- [ ] Versicherungsausweis-Download nur für eigenen Ausweis
- [ ] URL: `/portal/certificate` (ohne ID, da immer eigener)

### PROJ-15 (Dokumente)
- [ ] Dokumenten-Liste filtert automatisch nach `insured_person_id`
- [ ] Download-Link prüft Besitz vor Auslieferung

### PROJ-16 (Einkauf-Simulation)
- [ ] Simulation nur für eigene Konti durchführbar
- [ ] Auswahl-Dropdown zeigt nur eigene Konti

## Checklist vor Abschluss

- [x] Fragen gestellt: User hat alle wichtigen Fragen beantwortet
- [x] User Stories komplett: 8 User Stories definiert
- [x] Acceptance Criteria konkret: Detaillierte API- und Frontend-Anforderungen
- [x] Edge Cases identifiziert: 6 Edge Cases dokumentiert
- [x] Feature-ID vergeben: PROJ-18
- [x] Abhängigkeiten dokumentiert: PROJ-4, PROJ-12, PROJ-13, PROJ-14, PROJ-15
- [x] Status gesetzt: 🔵 Planned
- [ ] User Review: Wartet auf User-Freigabe

## Nächste Schritte nach Approval

1. **Solution Architect:** High-Level Design für Berechtigungssystem
2. **Backend Developer:** API-Middleware und Datenisolation implementieren
3. **Frontend Developer:** Portal-Navigation und Datenzugriffs-Beschränkungen
4. **QA Engineer:** Security-Tests (URL-Manipulation, Session-Hijacking, etc.)
