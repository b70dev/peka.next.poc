# PROJ-1: Authentication (Login/Logout)

## Status: 🟢 Done

## Übersicht

Ermöglicht Pensionskassen-Admins die Anmeldung an peka.next über verschiedene Identity Provider (Azure Entra ID, Google OAuth) sowie via Email/Passwort. Das System ist erweiterbar für zukünftige IDPs.

## Abhängigkeiten

- **Benötigt von:** PROJ-2 (Registration), PROJ-3 (MFA), PROJ-4 (Rollen)
- **Technisch:** Supabase Auth mit OAuth Providern

## User Stories

### US-1: Login via Azure Entra ID
Als Pensionskassen-Admin möchte ich mich mit meinem Microsoft-Firmenkonto anmelden, um Single Sign-On zu nutzen und kein separates Passwort zu benötigen.

### US-2: Login via Google OAuth
Als Pensionskassen-Admin möchte ich mich mit meinem Google-Konto anmelden, um einen schnellen Zugang ohne separate Credentials zu haben.

### US-3: Login via Email/Passwort
Als Pensionskassen-Admin möchte ich mich mit Email und Passwort anmelden können, falls ich keinen unterstützten IDP nutze.

### US-4: Logout
Als eingeloggter Admin möchte ich mich sicher ausloggen können, um meine Session zu beenden und unbefugten Zugriff zu verhindern.

### US-5: Persistente Session
Als Admin möchte ich nach dem Schliessen des Browsers eingeloggt bleiben, um nicht bei jedem Besuch erneut meine Credentials eingeben zu müssen.

### US-6: Automatisches Account Linking
Als Admin möchte ich, dass meine verschiedenen Login-Methoden (z.B. Google und Azure) automatisch mit meinem Account verknüpft werden, wenn sie dieselbe Email verwenden.

## Acceptance Criteria

### Login-Page
- [ ] Login-Page zeigt drei Login-Optionen: Azure Entra ID, Google OAuth, Email/Passwort
- [ ] Jede Option ist als klar erkennbarer Button dargestellt
- [ ] Login-Page ist responsiv (Desktop, Tablet, Mobile)
- [ ] Login-Page zeigt peka.next Branding/Logo

### Azure Entra ID Login
- [ ] Klick auf "Mit Microsoft anmelden" leitet zu Azure Entra ID weiter
- [ ] Nach erfolgreicher Authentifizierung wird User zur App zurückgeleitet
- [ ] User wird automatisch eingeloggt, wenn Account existiert
- [ ] Fehler bei Azure werden mit verständlicher Meldung angezeigt

### Google OAuth Login
- [ ] Klick auf "Mit Google anmelden" leitet zu Google OAuth weiter
- [ ] Nach erfolgreicher Authentifizierung wird User zur App zurückgeleitet
- [ ] User wird automatisch eingeloggt, wenn Account existiert
- [ ] Fehler bei Google werden mit verständlicher Meldung angezeigt

### Email/Passwort Login
- [ ] Formular mit Email- und Passwort-Feldern
- [ ] Validierung: Email-Format, Passwort nicht leer
- [ ] Fehlermeldung bei ungültigen Credentials (generisch: "Email oder Passwort falsch")
- [ ] "Passwort vergessen" Link vorhanden

### Session Management
- [ ] Nach Login: Session bleibt über Browser-Neustart erhalten
- [ ] Session-Token wird sicher in HttpOnly Cookie gespeichert
- [ ] Session ist mindestens 7 Tage gültig (konfigurierbar)
- [ ] Bei Logout wird Session serverseitig invalidiert

### Account Linking
- [ ] Wenn User sich mit neuem IDP anmeldet und Email bereits existiert: automatische Verknüpfung
- [ ] User kann mehrere IDPs mit einem Account verknüpfen
- [ ] Verknüpfte IDPs werden im Profil angezeigt (späteres Feature)

### Logout
- [ ] Logout-Button ist im Header/Navigation sichtbar
- [ ] Klick auf Logout beendet Session sofort
- [ ] User wird zur Login-Page weitergeleitet
- [ ] Alle lokalen Auth-Daten werden gelöscht

### Security
- [ ] Brute-Force-Schutz: Max. 5 fehlgeschlagene Logins pro 15 Minuten pro IP
- [ ] HTTPS only (kein HTTP)
- [ ] CSRF-Schutz implementiert
- [ ] Keine Credentials in URL-Parametern

## Edge Cases

### E1: IDP nicht erreichbar
- **Szenario:** Azure/Google ist temporär nicht verfügbar
- **Verhalten:** Fehlermeldung "Anmeldedienst derzeit nicht erreichbar. Bitte versuchen Sie es später erneut oder nutzen Sie eine andere Anmeldemethode."

### E2: Account existiert nicht
- **Szenario:** User versucht Login, hat aber keinen Account
- **Verhalten:** Weiterleitung zur Registration-Page mit Hinweis "Kein Account gefunden. Bitte registrieren Sie sich zuerst."

### E3: Account deaktiviert
- **Szenario:** Admin-Account wurde deaktiviert
- **Verhalten:** Fehlermeldung "Ihr Account wurde deaktiviert. Bitte kontaktieren Sie den Administrator."

### E4: Session abgelaufen
- **Szenario:** User kehrt nach langer Zeit zurück, Session ist expired
- **Verhalten:** Automatische Weiterleitung zur Login-Page, vorherige URL wird gespeichert für Redirect nach Login

### E5: Doppelter Tab-Login
- **Szenario:** User öffnet Login in mehreren Tabs gleichzeitig
- **Verhalten:** Nach erstem erfolgreichen Login werden andere Tabs automatisch eingeloggt (Session sync)

### E6: IDP widerruft Zugriff
- **Szenario:** User widerruft App-Zugriff bei Google/Azure
- **Verhalten:** Beim nächsten Login wird erneut um Berechtigung gebeten

### E7: Email-Änderung beim IDP
- **Szenario:** User ändert Email bei Google/Azure
- **Verhalten:** Account-Linking basiert auf IDP-User-ID, nicht nur Email. Email-Änderung wird synchronisiert.

## Nicht im Scope (andere Features)

- ❌ Registrierung neuer User → PROJ-2
- ❌ Multi-Faktor-Authentifizierung → PROJ-3
- ❌ Rollen und Berechtigungen → PROJ-4
- ❌ Passwort-Reset-Flow → PROJ-2
- ❌ Profilverwaltung → späteres Feature

## Technische Anforderungen

- **Performance:** Login-Redirect < 500ms, Token-Validierung < 100ms
- **Verfügbarkeit:** Auth-Service muss 99.9% verfügbar sein
- **Compliance:** DSGVO-konform (keine unnötige Datenspeicherung)
- **Erweiterbarkeit:** Neue IDPs sollen ohne Code-Änderung konfigurierbar sein (Provider-Pattern)

## UI/UX Anforderungen

- Login-Page: Clean, professionell, Schweizer Business-Kontext
- Ladeindikator während OAuth-Redirect
- Fehlermeldungen in Deutsch (Schweizer Hochdeutsch)
- Barrierefreiheit: WCAG 2.1 AA konform

---

## Tech-Design (Solution Architect)

### Component-Struktur

```
App-Layout
├── Login-Page (/login)
│   ├── Logo & Branding-Bereich
│   ├── Login-Card
│   │   ├── OAuth-Buttons-Bereich
│   │   │   ├── "Mit Microsoft anmelden" Button (Azure)
│   │   │   └── "Mit Google anmelden" Button
│   │   ├── Trennlinie ("oder")
│   │   ├── Email/Passwort-Formular
│   │   │   ├── Email-Eingabefeld
│   │   │   ├── Passwort-Eingabefeld
│   │   │   └── "Anmelden" Button
│   │   └── "Passwort vergessen?" Link
│   └── Footer (Datenschutz-Link)
│
├── Auth-Callback-Page (/auth/callback)
│   └── Lade-Indikator (verarbeitet OAuth-Rückleitung)
│
└── Geschützter Bereich (nach Login)
    └── Header mit Logout-Button
```

### Seiten-Routing

```
/login              → Login-Page (öffentlich)
/auth/callback      → OAuth-Callback-Handler (öffentlich)
/dashboard          → Geschützter Bereich (nur eingeloggt)
```

### Daten-Model

**Benutzer-Daten (verwaltet von Supabase Auth):**
```
Jeder Benutzer hat:
- Eindeutige ID (automatisch von Supabase)
- Email-Adresse
- Verknüpfte Login-Methoden (Google, Azure, Email/Passwort)
- Letzter Login-Zeitpunkt
- Account-Status (aktiv/deaktiviert)

Gespeichert in: Supabase Auth (cloud-basiert, DSGVO-konform)
```

**Session-Daten:**
```
Session enthält:
- Access-Token (kurzlebig, für API-Aufrufe)
- Refresh-Token (langlebig, für Session-Erneuerung)
- Ablaufzeit

Gespeichert in: HttpOnly Cookies (sicher, nicht per JavaScript auslesbar)
```

### Datenfluss

```
1. OAuth-Login (Azure/Google):
   User klickt Button → Weiterleitung zu Azure/Google →
   User authentifiziert → Rückleitung zu /auth/callback →
   Session wird erstellt → Weiterleitung zu /dashboard

2. Email/Passwort-Login:
   User gibt Credentials ein → Anfrage an Supabase Auth →
   Validierung → Session wird erstellt → Weiterleitung zu /dashboard

3. Logout:
   User klickt Logout → Session wird bei Supabase invalidiert →
   Lokale Cookies gelöscht → Weiterleitung zu /login
```

### Tech-Entscheidungen

| Entscheidung | Begründung |
|--------------|------------|
| **Supabase Auth** | Bereits im Projekt integriert, unterstützt OAuth-Provider out-of-the-box, DSGVO-konform, automatisches Session-Management |
| **@supabase/ssr** | Ermöglicht sichere Server-Side-Rendering Auth mit HttpOnly Cookies (nicht nur im Browser) |
| **Next.js Middleware** | Schützt Routen automatisch, prüft Session bei jedem Request, leitet nicht-authentifizierte User um |
| **shadcn/ui Komponenten** | Bereits vorhanden (Button, Input, Card, Form), einheitliches Design, barrierefrei |

### Provider-Konfiguration (Supabase Dashboard)

```
Identity Provider müssen im Supabase Dashboard aktiviert werden:

1. Azure Entra ID:
   - App Registration in Azure Portal erstellen
   - Client ID + Secret in Supabase eintragen
   - Redirect URL: https://[projekt].supabase.co/auth/v1/callback

2. Google OAuth:
   - Google Cloud Console: OAuth Credentials erstellen
   - Client ID + Secret in Supabase eintragen
   - Redirect URL: https://[projekt].supabase.co/auth/v1/callback

3. Email/Passwort:
   - In Supabase standardmässig aktiviert
   - Email-Templates anpassen (deutsch)
```

### Sicherheits-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Login-Page  │ → │ Auth Cookie │ → │  Dashboard  │      │
│  │ (öffentlich)│    │ (HttpOnly)  │    │ (geschützt) │      │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server                            │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Middleware    │ → │  API Routes     │                 │
│  │ (Session-Check) │    │ (Auth-Required) │                 │
│  └─────────────────┘    └─────────────────┘                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Auth                             │
│  - Session-Management    - Token-Validierung                │
│  - OAuth-Provider        - Brute-Force-Schutz               │
│  - Account-Linking       - Rate-Limiting                    │
└─────────────────────────────────────────────────────────────┘
```

### Dependencies

**Neue Packages (müssen installiert werden):**
```
- @supabase/ssr         → Server-Side Auth für Next.js (sichere Cookies)
```

**Bereits vorhanden:**
```
- @supabase/supabase-js → Supabase Client (bereits installiert)
- react-hook-form       → Formular-Handling (bereits installiert)
- zod                   → Validierung (bereits installiert)
- shadcn/ui             → UI-Komponenten (bereits installiert)
```

### Datei-Struktur (für Frontend Developer)

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx           → Login-Page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts       → OAuth-Callback-Handler
│   ├── (protected)/
│   │   └── dashboard/
│   │       └── page.tsx       → Geschützter Bereich (Beispiel)
│   └── layout.tsx             → App-Layout (anpassen)
│
├── components/
│   └── auth/
│       ├── login-form.tsx     → Email/Passwort-Formular
│       ├── oauth-buttons.tsx  → Azure + Google Buttons
│       └── logout-button.tsx  → Logout-Button für Header
│
├── lib/
│   └── supabase/
│       ├── client.ts          → Browser-Client (anpassen)
│       ├── server.ts          → Server-Client (neu)
│       └── middleware.ts      → Auth-Middleware-Helper (neu)
│
└── middleware.ts              → Next.js Middleware (neu)
```

### Umgebungsvariablen

```
Benötigte Env-Variablen (bereits vorhanden):
- NEXT_PUBLIC_SUPABASE_URL      → Supabase Projekt-URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase Public Key

Keine neuen Env-Variablen nötig
(OAuth-Secrets werden im Supabase Dashboard konfiguriert)
```

### Erweiterbarkeit für neue IDPs

```
Neue Identity Provider hinzufügen:

1. Im Supabase Dashboard → Authentication → Providers
2. Provider aktivieren (z.B. SwissID, LinkedIn)
3. Client ID + Secret eintragen
4. Im Code: Neuen Button in oauth-buttons.tsx hinzufügen

→ Keine Backend-Änderungen nötig!
→ Supabase übernimmt den kompletten OAuth-Flow
```

---

## Implementation (Frontend Developer)

**Implementiert am:** 2026-01-25

### Erstellte Dateien

#### Supabase Client-Struktur
- `src/lib/supabase/client.ts` - Browser-Client mit SSR-Support
- `src/lib/supabase/server.ts` - Server-Client für Server Components
- `src/lib/supabase/middleware.ts` - Auth-Helper für Middleware

#### Auth-Komponenten
- `src/components/auth/oauth-buttons.tsx` - Microsoft & Google OAuth Buttons
- `src/components/auth/login-form.tsx` - Email/Passwort-Formular mit Zod-Validierung
- `src/components/auth/logout-button.tsx` - Logout-Button für Header

#### Seiten
- `src/app/login/page.tsx` - Login-Page mit allen Optionen
- `src/app/auth/callback/route.ts` - OAuth-Callback-Handler
- `src/app/(protected)/dashboard/page.tsx` - Geschützter Bereich

#### Middleware
- `src/middleware.ts` - Schützt Routes, leitet nicht-authentifizierte User um

### Installierte Dependencies
- `@supabase/ssr` - Server-Side Auth für Next.js

---

## Implementation (Backend Developer)

**Implementiert am:** 2026-01-25

### Database Schema

#### Table: `user_profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key, FK zu auth.users |
| email | TEXT | Email-Adresse |
| full_name | TEXT | Vollständiger Name |
| avatar_url | TEXT | Profilbild-URL |
| role | TEXT | `super_admin`, `admin`, `viewer` |
| is_active | BOOLEAN | Account aktiv/deaktiviert |
| created_at | TIMESTAMPTZ | Erstellungsdatum |
| updated_at | TIMESTAMPTZ | Letzte Aktualisierung |

### Row Level Security Policies
- Users können eigenes Profil lesen
- Users können eigenes Profil aktualisieren
- Super-Admins können alle Profile lesen/aktualisieren
- Automatische Profil-Erstellung bei User-Registrierung

### Automatische Features
- **Trigger `on_auth_user_created`**: Bei neuem User wird automatisch ein Profil erstellt
- **Erster User**: Wird automatisch `super_admin`
- **Folgende User**: Erhalten Rolle `viewer`
- **Trigger `update_user_profiles_updated_at`**: updated_at wird automatisch aktualisiert

### Erstellte Dateien
- `src/lib/database.types.ts` - TypeScript Types für Supabase

### Migrations
1. `create_user_profiles` - Erstellt user_profiles Table mit RLS
2. `fix_function_search_path` - Behebt Security-Warnungen

---

## Abgeschlossene Konfiguration

### Azure Entra ID (✅ Konfiguriert am 2026-01-25)

**Konfigurationsschritte:**
1. App Registration "peka.next" im Azure Portal erstellt
2. Client ID + Secret in Supabase Dashboard eingetragen
3. Redirect URL: `https://yobxyotvvhxwvkgxsxhx.supabase.co/auth/v1/callback`
4. **Wichtig - Tenant URL:** `https://login.microsoftonline.com/[TENANT-ID]` (für Single-Tenant Apps)
5. **Wichtig - Token Claims:** Unter "Token configuration" → Optional claims → ID Token:
   - `email` Claim aktiviert
   - `preferred_username` Claim aktiviert (Fallback)
6. **API Permissions:** Microsoft Graph (Delegated): `email`, `openid`, `profile`, `User.Read`

**Erster User registriert:**
- Email: daniel.stucki@buero70.ch
- Rolle: super_admin (automatisch als erster User)

### Google OAuth (⏳ Optional - nicht konfiguriert)

Falls gewünscht:
1. Aktiviere "Google" im Supabase Dashboard
2. Erstelle OAuth Credentials in Google Cloud Console
3. Trage Client ID + Secret in Supabase ein
4. Redirect URL: `https://yobxyotvvhxwvkgxsxhx.supabase.co/auth/v1/callback`

---

## Test-Anleitung

1. Starte die App: `npm run dev`
2. Öffne: http://localhost:3000/login
3. Teste Email/Passwort Login (wenn User existiert)
4. Teste OAuth Login (nach Provider-Konfiguration)
5. Prüfe Dashboard nach Login
6. Teste Logout-Funktion
