# PROJ-4: Solution Architecture - Rollen und Berechtigungen

## Status: Draft

**Erstellt:** 2026-02-10
**Überarbeitet:** 2026-02-14
**Feature Spec:** [PROJ-4-roles.md](./PROJ-4-roles.md)

---

## 1. Übersicht

Dieses Dokument beschreibt die technische Architektur für das Rollen-basierte Zugriffskontrollsystem (RBAC). Das Feature ermöglicht drei Admin-Rollen (Super-Admin, Admin, Viewer) mit hierarchischen Berechtigungen und eine dedizierte User-Verwaltungsseite für Super-Admins.

### Scope

```
Rollen & Berechtigungen (RBAC)
├── User-Verwaltung (nur Super-Admin)
│   ├── User-Liste mit Rollen-Filter
│   ├── Rollen-Änderung (mit MFA-Bestätigung)
│   └── Account aktivieren/deaktivieren
├── Middleware für Berechtigungsprüfung
├── UI-Berechtigungen (Feature-Gating)
├── Rollen-Badge im Header
└── Audit-Logging für Rollen-Änderungen
```

---

## 2. Komponenten-Struktur

### 2.1 Seitenstruktur (Neue/Geänderte Routes)

```
/settings
├── page.tsx             [ERWEITERN] Neue Card "User-Verwaltung" (nur Super-Admin sichtbar)
└── /users               [NEU] User-Verwaltungsseite (nur Super-Admin)

App-Layout               [ERWEITERN] Rollen-Badge neben User-Email im Header
```

### 2.2 UI-Komponenten-Baum

```
User-Verwaltung (/settings/users)
├── Header mit Zurück-Button und Titel
├── Suchfeld (Name/Email-Suche)
├── Filter-Bar
│   ├── Rollen-Filter (Super-Admin / Admin / Viewer / Alle)
│   └── Status-Filter (Aktiv / Deaktiviert / Alle)
├── Users-Tabelle
│   ├── Spalten: Name, Email, Rolle, Status, Letzter Login, Aktionen
│   └── Jede Zeile: Avatar, Rollen-Badge, Status-Badge, Actions-Dropdown
│       ├── Rolle ändern → Dialog mit MFA-Eingabe
│       ├── Deaktivieren → Bestätigungsdialog mit Grund-Eingabe
│       └── Aktivieren → Bestätigungsdialog
└── Leer-Zustand wenn keine User gefunden

App-Header (alle Seiten)
└── Neben User-Email: Rollen-Badge
    ├── Super-Admin = rot
    ├── Admin = blau
    └── Viewer = grau
```

### 2.3 Neue Komponenten

| Komponente | Ort | Beschreibung |
|------------|-----|--------------|
| UsersTable | `components/settings/` | Haupttabelle mit Suche, Filter, Actions |
| RoleBadge | `components/ui/` | Farbiger Badge (rot/blau/grau) mit Tooltip |
| ChangeRoleDialog | `components/settings/` | Rollen-Auswahl + MFA-Code-Eingabe |
| DeactivateUserDialog | `components/settings/` | Bestätigung + optionaler Grund |
| UserStatusBadge | `components/ui/` | Aktiv/Deaktiviert-Anzeige |

### 2.4 Bestehende Komponenten (wiederverwenden)

| Komponente | Verwendung |
|------------|------------|
| Table, TableHeader, TableRow, TableCell | User-Tabelle |
| Dialog, AlertDialog | Rollen-Änderung, Deaktivierung |
| Badge | Basis für RoleBadge und UserStatusBadge |
| Select | Rollen-Filter, Rollen-Auswahl im Dialog |
| Input | Suchfeld, MFA-Code |
| Avatar | User-Avatar in Tabelle |
| DropdownMenu | Actions pro Zeile |
| Toast (sonner) | Erfolgs-/Fehlermeldungen |

### 2.5 Bestehende Patterns (übernehmen)

| Pattern | Quelle | Übernehmen für |
|---------|--------|----------------|
| Settings-Seiten-Layout | Account-Types-Seite | Header, Zurück-Button, Card-Layout |
| Table mit Actions-Dropdown | Account-Types-Table | Tabellenstruktur und Actions |
| Dialog mit Formular | Create-Account-Type-Dialog | Change-Role-Dialog |

---

## 3. Daten-Modell

### 3.1 Erweiterte Tabelle: `user_profiles`

Die bestehende Tabelle wird um drei Felder erweitert:

```
user_profiles (bestehend)
├── id                    (existiert)
├── email                 (existiert)
├── name                  (existiert)
├── mfa_enabled           (existiert)
├── role                  [NEU] "super_admin" | "admin" | "viewer", Standard: "viewer"
├── is_active             [NEU] Ja/Nein, Standard: Ja
└── last_login_at         [NEU] Letzter Login-Zeitpunkt
```

### 3.2 Neue Tabelle: `user_role_audit_log`

Protokolliert jede Rollen- und Status-Änderung:

```
user_role_audit_log
├── id                    Eindeutige ID
├── actor_id              Wer hat die Änderung vorgenommen? → user_profiles
├── target_user_id        Wer wurde geändert? → user_profiles
├── action                "role_change" | "activate" | "deactivate"
├── old_role / new_role   Bei Rollen-Änderung: vorherige und neue Rolle
├── reason                Bei Deaktivierung: optionaler Grund
└── created_at            Zeitstempel
```

### 3.3 Beziehungen

```
user_profiles (1) ──── (N) user_role_audit_log (als actor)
user_profiles (1) ──── (N) user_role_audit_log (als target)
```

### 3.4 Migration

Eine einzelne Datenbank-Migration:
1. `user_profiles` um drei Spalten erweitern (role, is_active, last_login_at)
2. Erster registrierter User wird automatisch Super-Admin
3. Neue Tabelle `user_role_audit_log` erstellen
4. Indizes für Performance (role, is_active, audit-timestamps)

---

## 4. API-Design (Server Actions)

### 4.1 User-Verwaltung

| Aktion | Beschreibung | Wer darf? |
|--------|--------------|-----------|
| Alle User laden | User-Liste mit Rollen und Status | Nur Super-Admin |
| Rolle ändern | Neue Rolle setzen + MFA-Bestätigung | Nur Super-Admin |
| User deaktivieren | Account sperren (mit optionalem Grund) | Nur Super-Admin |
| User aktivieren | Gesperrten Account reaktivieren | Nur Super-Admin |
| Audit-Log laden | Änderungshistorie eines Users | Nur Super-Admin |

### 4.2 Berechtigungs-Hilfsfunktionen

| Funktion | Beschreibung | Wo eingesetzt? |
|----------|--------------|----------------|
| Aktuelle Rolle laden | Rolle des eingeloggten Users lesen | Header, Feature-Gating |
| Rolle prüfen (Server) | Server-Action abblocken wenn Rolle nicht passt → HTTP 403 | Jede schreibende Server Action |
| Berechtigung prüfen (Client) | UI-Elemente ein-/ausblenden basierend auf Rolle | Alle Seiten mit Feature-Gating |

### 4.3 Datenfluss: Rolle ändern

```
Super-Admin klickt "Rolle ändern"
  → Dialog öffnet sich (neue Rolle auswählen + MFA-Code eingeben)
  → Server prüft:
     1. Ist der aktuelle User Super-Admin?
     2. Ist der MFA-Code gültig?
     3. Versucht der User seine eigene Rolle zu ändern? → Ablehnen
     4. Ist der Ziel-User der letzte Super-Admin? → Ablehnen
  → Rolle wird geändert
  → Eintrag im Audit-Log
  → Toast "Rolle erfolgreich geändert"
  → Tabelle wird aktualisiert
```

### 4.4 Datenfluss: Session-Update bei Rollen-Änderung

```
User A ist eingeloggt (Rolle: Admin)
  → Super-Admin ändert Rolle von User A zu "Viewer"
  → Bei nächster Seiten-Anfrage von User A:
     Middleware lädt aktuelle Rolle aus Datenbank
     → UI passt sich automatisch an (weniger Menüpunkte, Buttons verschwinden)
     → Kein Logout nötig
```

---

## 5. Berechtigungs-Matrix

### 5.1 Feature-Gating (Was sieht wer?)

| Feature | Super-Admin | Admin | Viewer |
|---------|:-----------:|:-----:|:------:|
| User-Verwaltung | ✅ | ❌ | ❌ |
| Versicherte anlegen/bearbeiten | ✅ | ✅ | ❌ |
| Arbeitgeber anlegen/bearbeiten | ✅ | ✅ | ❌ |
| Beitragssätze bearbeiten | ✅ | ✅ | ❌ |
| Konten/Transaktionen verwalten | ✅ | ✅ | ❌ |
| Excel-Export | ✅ | ✅ | ✅ |
| Alle Daten ansehen | ✅ | ✅ | ✅ |
| Eigenes Profil bearbeiten | ✅ | ✅ | ✅ |

### 5.2 Verhalten bei fehlendem Zugriff

- **UI:** Buttons/Links für nicht erlaubte Aktionen werden **nicht angezeigt** (nicht nur disabled)
- **Server:** Direkte API-Aufrufe ohne Berechtigung geben **HTTP 403** zurück
- **Navigation:** Aufruf von `/settings/users` als Admin/Viewer → Redirect zu Dashboard

---

## 6. Middleware

### 6.1 Erweiterung der bestehenden Middleware

Die bestehende Auth-Middleware (`src/lib/supabase/middleware.ts`) wird erweitert um:

1. **User-Profil mit Rolle laden** bei jeder authentifizierten Anfrage
2. **Deaktivierte User erkennen** → automatisch ausloggen mit Fehlermeldung
3. **Route-basierter Rollen-Check** → z.B. `/settings/users` nur für Super-Admin

### 6.2 Performance-Überlegung

- Rolle wird bei jeder Anfrage aus der Datenbank geladen (nicht gecached)
- **Warum:** Rollen-Änderungen wirken sofort, kein Stale-Cache-Risiko
- **Ziel:** < 50ms zusätzliche Latenz (ein einfacher DB-Query, Index vorhanden)

---

## 7. Sicherheit

### 7.1 Row Level Security (RLS)

| Tabelle | Wer | Lesen | Schreiben |
|---------|-----|:-----:|:---------:|
| user_profiles | Eigenes Profil | ✅ | ✅ (nur Profil-Felder) |
| user_profiles | Alle User (Super-Admin) | ✅ | ✅ (Rolle + Status) |
| user_profiles | Andere User (Admin/Viewer) | ❌ | ❌ |
| user_role_audit_log | Super-Admin | ✅ | ❌ (nur System schreibt) |
| user_role_audit_log | Admin/Viewer | ❌ | ❌ |

### 7.2 MFA-Pflicht für kritische Aktionen

Folgende Aktionen erfordern eine MFA-Code-Bestätigung:
- Rolle eines Users ändern
- User-Account deaktivieren
- Neuen Super-Admin ernennen

### 7.3 Schutz-Massnahmen

- **Letzter-Super-Admin-Schutz:** Kann nicht herabgestuft oder deaktiviert werden
- **Keine Selbst-Änderung:** User kann eigene Rolle nicht ändern
- **Audit-Trail:** Jede Änderung wird mit Zeitstempel, Akteur und Ziel protokolliert

---

## 8. Internationalisierung

Neue Übersetzungsschlüssel für drei Sprachen (DE/EN/FR):

| Bereich | Beispiele |
|---------|-----------|
| Seitentitel | "Benutzerverwaltung" |
| Tabelle | Spaltenüberschriften (Name, Email, Rolle, Status, ...) |
| Rollen-Namen | "Super-Admin", "Admin", "Viewer" |
| Aktionen | "Rolle ändern", "Deaktivieren", "Aktivieren" |
| Dialoge | Titel, Beschreibungen, Bestätigungen |
| Fehler | "Letzter Super-Admin kann nicht herabgestuft werden" |
| Erfolg | "Rolle erfolgreich geändert" |

---

## 9. Abhängigkeiten

### Bestehende Dependencies (bereits installiert)

Alle Features können mit bestehenden Packages implementiert werden:
- `next-intl` (Übersetzungen)
- `@supabase/supabase-js` (Datenbank)
- `sonner` (Toast-Meldungen)
- `lucide-react` (Icons)

**Keine neuen Dependencies erforderlich.**

---

## 10. Implementierungs-Reihenfolge

| Phase | Beschreibung | Skill |
|-------|-------------|-------|
| 1. Datenbank | Migration: user_profiles erweitern + audit_log erstellen + RLS Policies | `/backend` |
| 2. Auth-Layer | requireRole()-Helper, getCurrentUserRole(), Middleware erweitern | `/backend` |
| 3. UI Grundstruktur | RoleBadge, Header-Integration, Settings-Card "User-Verwaltung" | `/frontend` |
| 4. User-Tabelle | UsersTable mit Suche, Filter, Status-Badge, Actions-Dropdown | `/frontend` |
| 5. Dialoge | ChangeRoleDialog (mit MFA), DeactivateUserDialog, ActivateUserDialog | `/frontend` |
| 6. Feature-Gating | usePermissions()-Hook, Buttons/Links basierend auf Rolle ausblenden | `/frontend` |
| 7. Testing | Rollen-Checks, User-Verwaltung, Edge Cases (letzter Super-Admin, etc.) | `/qa` |

---

## 11. Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|:-------------------:|------------|
| Letzter Super-Admin wird herabgestuft | Mittel | Validierung: Anzahl Super-Admins prüfen vor jeder Änderung |
| Session-Inkonsistenz nach Rollen-Änderung | Mittel | Middleware lädt Rolle bei jeder Anfrage neu aus DB |
| MFA-Bypass bei Rollen-Änderung | Niedrig | Server-seitige MFA-Validierung (nicht nur Client) |
| Zwei Super-Admins ändern gleichzeitig | Niedrig | Audit-Log zeigt alle Änderungen, Tabelle wird nach Action neu geladen |

---

## 12. Abgrenzung zu PROJ-18 (Versicherten-Rolle)

PROJ-4 behandelt nur **Admin-seitige Rollen** (Super-Admin, Admin, Viewer).
PROJ-18 behandelt die **Versicherten-Rolle** mit separatem Portal (`/portal/*`).

Die Rollen-Systeme sind **vollständig getrennt:**
- Admin-Rollen → Spalte `user_profiles.role`
- Versicherten-Zugang → Separate Tabelle und separater Auth-Flow

Kein Konflikt, keine gegenseitige Abhängigkeit.

---

## 13. Checkliste für Review

- [ ] Datenbank-Schema bestätigt (user_profiles erweitern + audit_log)
- [ ] RLS Policies bestätigt
- [ ] API-Design bestätigt (Server Actions)
- [ ] UI-Komponenten bestätigt (UsersTable, RoleBadge, Dialoge)
- [ ] Middleware-Konzept bestätigt
- [ ] Berechtigungsmatrix bestätigt
- [ ] Sicherheitskonzept bestätigt (MFA, letzter Super-Admin)
- [ ] Implementierungs-Reihenfolge akzeptiert

---

**Nächster Schritt:** Review, dann `/frontend` für Phase 3 (UI Grundstruktur) und `/backend` für Phase 1 (Datenbank-Migration).
