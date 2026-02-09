# PROJ-2: Admin Registration (Self-Registration)

## Status: 🔵 Planned

## Übersicht

Ermöglicht neuen Pensionskassen-Admins die Selbstregistrierung für peka.next via Email/Passwort mit anschliessender Email-Verifizierung. IDP-User (Azure Entra ID, Google OAuth) benötigen keine explizite Registrierung – deren Accounts werden automatisch beim ersten Login erstellt (siehe PROJ-1).

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - Login-Infrastruktur
- **Benötigt von:** PROJ-3 (MFA) - MFA-Setup nach Registration

## User Stories

### US-1: Registration via Email/Passwort
Als neuer Admin möchte ich mich mit Email und Passwort registrieren können, um einen Account ohne externen Identity Provider zu erstellen.

### US-2: Email-Verifizierung
Als neuer Admin möchte ich meine Email-Adresse verifizieren, um die Sicherheit meines Accounts zu gewährleisten.

### US-3: Passwort-Reset
Als Admin möchte ich mein Passwort zurücksetzen können, falls ich es vergessen habe.

## Acceptance Criteria

### Registration-Page
- [ ] Registration-Page zeigt Email/Passwort-Registrierungsformular
- [ ] Link "Bereits registriert? Anmelden" zur Login-Page
- [ ] Datenschutzhinweis mit Link zur Privacy Policy
- [ ] Registration-Page ist responsiv

### Email/Passwort Registration
- [ ] Formular mit: Email, Passwort, Passwort-Bestätigung, Name
- [ ] Passwort-Anforderungen: Min. 12 Zeichen, 1 Grossbuchstabe, 1 Zahl, 1 Sonderzeichen
- [ ] Passwort-Stärke-Indikator
- [ ] Email-Validierung (Format-Check)
- [ ] Checkbox "Ich akzeptiere die Nutzungsbedingungen" (Pflichtfeld)

### Email-Verifizierung
- [ ] Nach Email/Passwort-Registration: Verifizierungs-Email wird gesendet
- [ ] Email enthält Verifizierungs-Link (gültig 24h)
- [ ] User kann ohne Verifizierung nicht auf App zugreifen
- [ ] "Erneut senden"-Button für Verifizierungs-Email
- [ ] Nach Verifizierung: Weiterleitung zum Dashboard

### Passwort-Reset
- [ ] "Passwort vergessen"-Link auf Login-Page
- [ ] Email-Eingabe für Reset-Link
- [ ] Reset-Email mit Link (gültig 1h)
- [ ] Neues Passwort muss Anforderungen erfüllen
- [ ] Nach Reset: Alle Sessions werden invalidiert

### Account-Erstellung
- [ ] Neuer Account erhält Standard-Rolle "Viewer" (definiert in PROJ-4)
- [ ] Account-Erstellungsdatum wird gespeichert
- [ ] Account ist initial aktiv

## Edge Cases

### E1: Email bereits registriert
- **Szenario:** User versucht Registration mit bereits existierender Email
- **Verhalten:** "Diese Email ist bereits registriert. Bitte melden Sie sich an oder nutzen Sie 'Passwort vergessen'."

### E2: Verifizierungs-Link abgelaufen
- **Szenario:** User klickt Link nach 24h
- **Verhalten:** "Link abgelaufen. Bitte fordern Sie einen neuen Verifizierungs-Link an."

### E3: Ungültige Email-Domain (optional)
- **Szenario:** Organisation will nur bestimmte Email-Domains zulassen
- **Verhalten:** Konfigurierbare Domain-Whitelist (z.B. nur @firma.ch)

### E4: Doppelte Registration
- **Szenario:** User klickt mehrfach auf "Registrieren"
- **Verhalten:** Idempotent - zweiter Request wird ignoriert, erste Email zählt

## Nicht im Scope

- ❌ MFA-Setup → PROJ-3
- ❌ Rollen-Zuweisung durch Admin → PROJ-4
- ❌ Einladungs-basierte Registration → späteres Feature

## Technische Anforderungen

- Email-Versand über konfigurierbaren SMTP-Provider
- Verifizierungs-Tokens sind kryptografisch sicher (min. 256 bit)
- Rate-Limiting: Max. 3 Registration-Versuche pro Email pro Stunde

---

## Tech-Design (Solution Architect)

### Was wird wiederverwendet?

Folgende Bausteine existieren bereits aus PROJ-1 und werden wiederverwendet:

- **Supabase Auth** – übernimmt Registration, Email-Versand, Verifizierung und Passwort-Reset
- **Login-Formular-Pattern** – gleicher Aufbau (react-hook-form + Zod + shadcn/ui) wird für Registration und Reset übernommen
- **Auth Callback** (`/auth/callback`) – verarbeitet bereits OAuth-Codes, wird erweitert für Email-Verifizierung und Passwort-Reset-Links
- **User-Profil-Trigger** – `on_auth_user_created` erstellt automatisch ein Profil mit Rolle "Viewer" für jeden neuen User
- **Übersetzungen** – bestehende `auth.*` Translations werden ergänzt (de, en, fr)

### Component-Struktur

```
Neue Seiten und Komponenten
├── Registration-Page (/auth/register)
│   ├── Logo & Branding (wie Login-Page)
│   ├── Registration-Card
│   │   ├── Registration-Formular
│   │   │   ├── Name-Eingabefeld
│   │   │   ├── Email-Eingabefeld
│   │   │   ├── Passwort-Eingabefeld
│   │   │   ├── Passwort-Bestätigung-Eingabefeld
│   │   │   ├── Passwort-Stärke-Indikator (visuell: schwach/mittel/stark)
│   │   │   ├── Nutzungsbedingungen-Checkbox
│   │   │   └── "Registrieren" Button
│   │   └── Link "Bereits registriert? Anmelden"
│   └── Datenschutz/Impressum Footer
│
├── Email-Verifizierung-Page (/auth/verify-email)
│   ├── "Prüfen Sie Ihr Postfach" Nachricht
│   ├── "Erneut senden" Button
│   └── Link zurück zur Login-Page
│
├── Passwort-Vergessen-Page (/auth/forgot-password)
│   ├── Email-Eingabefeld
│   ├── "Reset-Link senden" Button
│   └── Erfolgs-Nachricht nach Versand
│
└── Passwort-Zurücksetzen-Page (/auth/reset-password)
    ├── Neues Passwort-Eingabefeld
    ├── Passwort-Bestätigung-Eingabefeld
    ├── Passwort-Stärke-Indikator
    └── "Passwort speichern" Button
```

### Erweiterung bestehender Seiten

```
Bestehende Seiten (Anpassungen)
├── Login-Page (/login)
│   └── Link "Noch kein Account? Registrieren" → existiert bereits, zeigt auf /auth/register
│
└── Auth Callback (/auth/callback)
    └── Erweitert: Verarbeitet neu auch Email-Verifizierungs-Links und Passwort-Reset-Links
        (Supabase sendet User mit type-Parameter hierher)
```

### Seiten-Routing

```
Neue Routen:
/auth/register        → Registration-Page (öffentlich)
/auth/verify-email    → Email-Verifizierung-Hinweis (öffentlich)
/auth/forgot-password → Passwort-vergessen-Formular (öffentlich)
/auth/reset-password  → Neues Passwort setzen (öffentlich, via Reset-Link)

Bestehende Routen (unverändert):
/login                → Login-Page
/auth/callback        → OAuth + Email-Verifizierung + Reset Callback
/dashboard            → Geschützter Bereich
```

### Daten-Model

```
Keine neuen Tabellen nötig!

Bestehende Infrastruktur deckt alles ab:
- Supabase Auth (auth.users)    → speichert Email, Passwort-Hash, Verifizierungs-Status
- User Profiles (user_profiles)  → wird automatisch per Trigger erstellt (Rolle: "Viewer")
- Email-Versand                  → übernimmt Supabase (Verifizierung + Reset-Emails)
- Rate-Limiting                  → übernimmt Supabase Auth (konfigurierbar)
```

### Datenfluss

```
1. Registration:
   User füllt Formular aus → Anfrage an Supabase Auth (signUp) →
   Account wird erstellt (noch nicht verifiziert) →
   Verifizierungs-Email wird gesendet →
   Weiterleitung zu /auth/verify-email ("Prüfen Sie Ihr Postfach")

2. Email-Verifizierung:
   User klickt Link in Email → Supabase leitet zu /auth/callback (type=signup) →
   Account wird verifiziert → Profil wird per Trigger erstellt →
   Weiterleitung zum Dashboard

3. Passwort-Reset:
   User klickt "Passwort vergessen" → Gibt Email ein →
   Supabase sendet Reset-Email → User klickt Link →
   Weiterleitung zu /auth/reset-password → User setzt neues Passwort →
   Alle Sessions werden invalidiert → Weiterleitung zu /login
```

### Tech-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Supabase Auth signUp** | Eingebaute Registration mit Email-Verifizierung, kein eigener Email-Service nötig |
| **Supabase resetPasswordForEmail** | Eingebauter Passwort-Reset, Tokens werden automatisch generiert und validiert |
| **Auth Callback erweitern** | Bestehende Callback-Route kann alle Token-Typen verarbeiten (OAuth, Verifizierung, Reset) |
| **Passwort-Stärke-Indikator** | Einfache Berechnung basierend auf Länge + Zeichenarten, kein extra Package nötig |
| **Gleiche UI-Patterns wie Login** | Card + Form Layout wiederverwendet, konsistentes Look & Feel |

### Dependencies

```
Keine neuen Packages nötig!

Bereits vorhanden:
- @supabase/ssr          → Auth-Funktionen (signUp, resetPasswordForEmail)
- react-hook-form        → Formular-Handling
- zod                    → Passwort-Validierung (12 Zeichen, Grossbuchstabe, Zahl, Sonderzeichen)
- shadcn/ui              → UI-Komponenten (Card, Input, Button, Label, Checkbox)
- next-intl              → Übersetzungen (de, en, fr)
- lucide-react           → Icons (Loader, Check, X für Passwort-Stärke)
```

### Übersetzungen (neue Keys)

```
Neue auth.* Translations für alle 3 Sprachen (de, en, fr):
- Registrierung: Titel, Beschreibung, Formular-Labels, Button-Text
- Passwort-Stärke: schwach, mittel, stark
- Email-Verifizierung: Hinweis-Texte, Erneut-senden
- Passwort-Reset: Formular-Labels, Erfolgs-Nachrichten
- Fehlermeldungen: Email existiert bereits, Link abgelaufen, etc.
```

### Datei-Struktur (für Frontend Developer)

```
src/
├── app/[locale]/
│   └── auth/
│       ├── register/
│       │   └── page.tsx              → Registration-Page (NEU)
│       ├── verify-email/
│       │   └── page.tsx              → Email-Verifizierung-Hinweis (NEU)
│       ├── forgot-password/
│       │   └── page.tsx              → Passwort-vergessen-Formular (NEU)
│       ├── reset-password/
│       │   └── page.tsx              → Neues Passwort setzen (NEU)
│       └── callback/
│           └── route.ts              → Erweitert für Verifizierung + Reset
│
├── components/auth/
│   ├── registration-form.tsx         → Registration-Formular (NEU)
│   ├── password-strength.tsx         → Passwort-Stärke-Indikator (NEU)
│   ├── forgot-password-form.tsx      → Email-Eingabe für Reset (NEU)
│   ├── reset-password-form.tsx       → Neues Passwort Formular (NEU)
│   ├── login-form.tsx                → Bestehend (unverändert)
│   ├── oauth-buttons.tsx             → Bestehend (unverändert)
│   └── logout-button.tsx             → Bestehend (unverändert)
│
└── messages/
    ├── de.json                       → Neue auth.* Translations
    ├── en.json                       → Neue auth.* Translations
    └── fr.json                       → Neue auth.* Translations
```

### Supabase-Konfiguration (Dashboard)

```
Im Supabase Dashboard zu konfigurieren:
1. Email Templates → Registration-Bestätigung anpassen (deutsch)
2. Email Templates → Passwort-Reset anpassen (deutsch)
3. Auth Settings → Site URL prüfen (für korrekte Redirect-URLs)
4. Auth Settings → Redirect URLs → /auth/callback hinzufügen (falls nicht vorhanden)
5. Auth Settings → Email-Verifizierung aktiviert (Standard)
```
