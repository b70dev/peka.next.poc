# PROJ-3: Multi-Faktor-Authentifizierung (MFA)

## Status: ✅ Deployed (2026-02-09)

## Übersicht

Implementiert obligatorische Multi-Faktor-Authentifizierung für lokale peka.next Admins (Email/Passwort-Login). MFA erhöht die Sicherheit des Systems erheblich, besonders wichtig für eine Pensionskassen-Anwendung mit sensiblen Personendaten.

**Wichtig:** IDP-User (Azure Entra ID, Google OAuth) sind von der peka.next-MFA ausgenommen. Bei IDP-Logins wird MFA durch den Identity Provider selbst gesteuert – peka.next vertraut dem IDP vollständig.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - Basis-Login muss funktionieren
- **Benötigt:** PROJ-2 (Registration) - Email/Passwort-Account mit verifizierter Email muss existieren

## User Stories

### US-1: MFA-Setup nach Email-Verifizierung
Als neuer Admin (Email/Passwort) möchte ich nach der Email-Verifizierung zur MFA-Einrichtung aufgefordert werden, um meinen Account abzusichern.

### US-2: TOTP-Authenticator einrichten
Als Admin möchte ich eine Authenticator-App (Google Authenticator, Microsoft Authenticator, etc.) für MFA nutzen können.

### US-3: MFA bei jedem Email/Passwort-Login
Als Admin (Email/Passwort) möchte ich nach Eingabe meiner Credentials einen zweiten Faktor eingeben, um sicherzustellen, dass nur ich Zugriff habe.

### US-4: Backup-Codes generieren
Als Admin möchte ich Backup-Codes erhalten, um mich auch bei Verlust meines Smartphones anmelden zu können.

### US-5: MFA-Methode ändern
Als Admin möchte ich meine MFA-Methode ändern oder neu einrichten können, falls ich mein Gerät wechsle.

## Acceptance Criteria

### MFA-Setup (Ersteinrichtung – nur Email/Passwort-User)
- [ ] Nach erfolgreicher Email-Verifizierung wird User zum MFA-Setup weitergeleitet
- [ ] Email/Passwort-User kann App nicht nutzen ohne MFA-Setup abzuschliessen
- [ ] IDP-User (Entra ID, Google) überspringen MFA-Setup komplett
- [ ] QR-Code für Authenticator-App wird angezeigt
- [ ] Manueller Setup-Key wird als Alternative angezeigt
- [ ] User muss Code aus App eingeben zur Bestätigung
- [ ] 10 Backup-Codes werden generiert und angezeigt
- [ ] User muss bestätigen, dass Backup-Codes gespeichert wurden

### MFA bei Login (nur Email/Passwort-User)
- [ ] Nach erfolgreicher Passwort-Eingabe: MFA-Code-Eingabe
- [ ] IDP-Logins (Entra ID, Google) erfordern keine MFA durch peka.next
- [ ] 6-stelliger Code aus Authenticator-App
- [ ] "Code ist falsch"-Fehlermeldung bei ungültigem Code
- [ ] Option "Backup-Code verwenden" verfügbar
- [ ] Max. 5 Fehlversuche, dann Account temporär gesperrt (15 Min)

### Backup-Codes
- [ ] 10 einmalig verwendbare Codes (8 Zeichen, alphanumerisch)
- [ ] Jeder Code kann nur einmal verwendet werden
- [ ] Verwendete Codes werden als "verbraucht" markiert
- [ ] Warnung wenn nur noch 2 Codes übrig
- [ ] Möglichkeit, neue Backup-Codes zu generieren (invalidiert alte)

### MFA-Verwaltung
- [ ] MFA-Einstellungen in Account-Settings zugänglich
- [ ] "Neues Gerät einrichten" (erfordert aktuelle MFA-Bestätigung)
- [ ] "Backup-Codes neu generieren" (erfordert aktuelle MFA-Bestätigung)
- [ ] Anzeige: "MFA aktiv seit [Datum]"

### Recovery
- [ ] Wenn User MFA-Gerät und alle Backup-Codes verliert: Support-Prozess
- [ ] Admin-Kontakt wird angezeigt für manuellen Recovery-Prozess
- [ ] Recovery erfordert Identitätsnachweis (out of scope für MVP)

## Edge Cases

### E1: Authenticator-Zeit nicht synchron
- **Szenario:** Smartphone-Zeit weicht von Server-Zeit ab
- **Verhalten:** TOTP akzeptiert Codes ±1 Zeitfenster (30 Sek Toleranz)

### E2: Alle Backup-Codes verbraucht
- **Szenario:** User hat alle 10 Backup-Codes verwendet
- **Verhalten:** Warnung nach Login, Aufforderung neue zu generieren

### E3: Neues Gerät einrichten ohne altes
- **Szenario:** User hat neues Smartphone, altes nicht mehr verfügbar
- **Verhalten:** Backup-Code verwenden, dann neues Gerät einrichten

### E4: MFA-Code Brute-Force
- **Szenario:** Angreifer versucht Codes durchzuprobieren
- **Verhalten:** Nach 5 Fehlversuchen: 15 Min Sperre, nach 15 Versuchen: Account-Lock + Email an User

### E5: Browser-Session während MFA-Setup
- **Szenario:** User schliesst Browser während MFA-Setup
- **Verhalten:** Setup nicht abgeschlossen, User muss bei nächstem Login erneut einrichten

## Nicht im Scope

- ❌ MFA für IDP-User (Entra ID, Google) → wird durch den IDP selbst gesteuert
- ❌ Prüfung des IDP-MFA-Claims (amr) → peka.next vertraut dem IDP vollständig
- ❌ SMS als zweiter Faktor (Sicherheitsbedenken, Kosten)
- ❌ Hardware-Security-Keys (U2F/FIDO2) → späteres Feature
- ❌ Biometrische Authentifizierung → späteres Feature
- ❌ "Diesem Gerät vertrauen" (MFA überspringen) → bewusst nicht, da obligatorisch für Email/Passwort-User

## Technische Anforderungen

- TOTP nach RFC 6238 (30 Sekunden Zeitfenster, 6 Ziffern)
- Backup-Codes: Kryptografisch sichere Generierung
- MFA-Secrets werden verschlüsselt gespeichert
- Audit-Log für MFA-Events (Setup, Änderung, Fehlversuche)

## Tech-Design (Solution Architect)

### Hinweis zu Abhängigkeiten

PROJ-3 kann unabhängig von PROJ-2 (Registration) implementiert werden. Die MFA-Einrichtung wird beim ersten Login eines Email/Passwort-Users ohne MFA erzwungen. Wenn PROJ-2 später umgesetzt wird, wird der Flow "Registration → Email-Verifizierung → MFA-Setup" nahtlos integriert.

### Login-Flow mit MFA (Gesamtübersicht)

```
User gibt Email + Passwort ein
        │
        ▼
   Login erfolgreich? ──Nein──→ Fehlermeldung
        │
       Ja
        │
        ▼
   Ist es ein IDP-User? ──Ja──→ Direkt zum Dashboard
   (Microsoft/Google)          (MFA = Sache des IDP)
        │
      Nein (Email/Passwort)
        │
        ▼
   Hat User MFA eingerichtet? ──Nein──→ MFA-Setup-Seite
        │                               (obligatorisch)
       Ja
        │
        ▼
   MFA-Code eingeben
        │
        ▼
   Code korrekt? ──Nein──→ Fehlermeldung (max 5 Versuche)
        │
       Ja
        │
        ▼
   Dashboard
```

### Component-Struktur

```
Neue Seiten
├── MFA-Setup Seite (/mfa/setup) — Wizard für Ersteinrichtung
│   ├── Schritt 1: QR-Code Anzeige
│   │   ├── QR-Code Bild (scannbar mit Authenticator-App)
│   │   └── Manueller Setup-Code (zum Abtippen als Fallback)
│   ├── Schritt 2: Code-Bestätigung
│   │   ├── 6-stelliges Eingabefeld
│   │   └── "Bestätigen" Button
│   └── Schritt 3: Backup-Codes
│       ├── 10 Backup-Codes Anzeige (Tabelle)
│       ├── "Codes kopieren" Button
│       ├── "Als Datei herunterladen" Button
│       └── Checkbox "Ich habe die Codes sicher gespeichert" → "Weiter" Button
│
├── MFA-Verifizierung Seite (/mfa/verify) — bei jedem Login
│   ├── 6-stelliges Code-Eingabefeld
│   ├── "Bestätigen" Button
│   ├── Fehlermeldung bei falschem Code
│   ├── Verbleibende Versuche Anzeige
│   └── "Backup-Code verwenden" Link
│       ├── Backup-Code Eingabefeld (8 Zeichen)
│       └── "Mit Backup-Code anmelden" Button
│
Bestehende Seiten (Erweiterung)
├── Einstellungen (/settings) — neue MFA-Karte im Settings-Dashboard
│   └── MFA-Einstellungen Seite (/settings/mfa)
│       ├── Status-Anzeige ("MFA aktiv seit [Datum]")
│       ├── "Neues Gerät einrichten" Button
│       │   └── Bestätigungs-Dialog (aktuellen MFA-Code eingeben)
│       │       └── Danach: MFA-Setup-Wizard erneut durchlaufen
│       ├── "Backup-Codes neu generieren" Button
│       │   └── Bestätigungs-Dialog (aktuellen MFA-Code eingeben)
│       │       └── Danach: Neue Codes anzeigen + alte invalidieren
│       └── Verbleibende Backup-Codes Anzeige (z.B. "7 von 10 verfügbar")
│
└── Middleware (bestehend, wird erweitert)
    └── Prüft: Hat Email/Passwort-User MFA verifiziert?
        ├── Nein + kein MFA eingerichtet → Weiterleitung zu /mfa/setup
        ├── Nein + MFA eingerichtet → Weiterleitung zu /mfa/verify
        └── Ja (oder IDP-User) → Zugriff gewährt
```

### Daten-Model

```
Supabase Auth (bereits eingebaut, keine eigene Tabelle nötig):
  Jeder MFA-Faktor hat:
  - Faktor-ID (automatisch generiert)
  - Typ: TOTP
  - TOTP-Secret (verschlüsselt gespeichert durch Supabase)
  - Status (verifiziert / nicht verifiziert)
  - Erstellt am

  Jede Login-Session hat:
  - Authentifizierungs-Level (AAL):
    · aal1 = nur Passwort eingegeben
    · aal2 = Passwort + MFA-Code verifiziert
  - Supabase verwaltet dies automatisch

Neue Tabelle — Backup-Codes (in Supabase-Datenbank):
  Jeder Backup-Code hat:
  - Benutzer-ID (Verknüpfung zum User)
  - Code-Hash (sicher gehasht, Original wird nur einmal angezeigt)
  - Verwendet am (leer wenn noch nicht benutzt)
  - Erstellt am

Neue Tabelle — MFA-Fehlversuche (für Brute-Force-Schutz):
  Jeder Eintrag hat:
  - Benutzer-ID
  - Anzahl Fehlversuche
  - Gesperrt bis (Zeitstempel, null wenn nicht gesperrt)
  - Letzter Fehlversuch am

Neue Tabelle — MFA-Audit-Log:
  Jeder Eintrag hat:
  - Benutzer-ID
  - Ereignis-Typ (Setup abgeschlossen, Code verifiziert, Fehlversuch,
    Gerätewechsel, Backup-Code verwendet, Codes neu generiert, Account gesperrt)
  - Zeitstempel
  - Details (z.B. IP-Adresse, verwendeter Backup-Code-Index)
```

### Tech-Entscheidungen

```
Warum Supabase Auth MFA (eingebaut)?
→ Supabase unterstützt TOTP-MFA nativ (enroll, challenge, verify)
→ Kein eigener TOTP-Server oder Library nötig
→ MFA-Secrets werden sicher durch Supabase verschlüsselt gespeichert
→ TOTP-Zeittoleranz (±30 Sek) ist eingebaut (Edge Case E1 abgedeckt)

Warum custom Backup-Codes in der Datenbank?
→ Supabase bietet keine nativen Backup-Codes
→ Eigene Tabelle + Edge Function gibt volle Kontrolle
→ Codes werden gehasht gespeichert (wie Passwörter)
→ Server-seitige Verifizierung über Supabase Edge Function

Warum Middleware-Erweiterung statt Client-seitig?
→ Server-seitige Prüfung ist sicherer (nicht umgehbar)
→ Verhindert Zugriff auf geschützte Seiten ohne MFA
→ Bestehende Middleware (proxy.ts) wird einfach erweitert

Warum Brute-Force-Schutz in eigener Tabelle?
→ Supabase hat Rate-Limiting (15 Req/Min), aber nicht die geforderten
  5-Versuche-dann-15-Min-Sperre
→ Eigene Tabelle ermöglicht feinere Kontrolle gemäss Spec
→ Edge Case E4 (Brute-Force) sauber abgedeckt
```

### Dependencies

```
Keine neuen Packages nötig!
- @supabase/ssr (bereits installiert) → unterstützt MFA-APIs
- shadcn/ui Komponenten (bereits installiert) → Input, Button, Card, Dialog
- next-intl (bereits installiert) → dreisprachige MFA-Texte
- zod + react-hook-form (bereits installiert) → Formular-Validierung
- lucide-react (bereits installiert) → Icons (Shield, Smartphone, Key, etc.)

Backend:
- 1 Supabase Edge Function für Backup-Code-Verwaltung
- 3 neue Datenbank-Tabellen (Backup-Codes, Fehlversuche, Audit-Log)
- RLS-Policies für Sicherheit (User sieht nur eigene Daten)
```

### Neue i18n-Übersetzungen

```
Benötigt in allen 3 Sprachen (de/en/fr):
- mfa.setup.* — Texte für den MFA-Setup-Wizard
- mfa.verify.* — Texte für die Login-Verifizierung
- mfa.backup.* — Texte für Backup-Codes
- mfa.settings.* — Texte für MFA-Einstellungen
- mfa.errors.* — Fehlermeldungen (falscher Code, gesperrt, etc.)
```

### Betroffene bestehende Dateien

```
Anpassungen an bestehenden Dateien:
- proxy.ts (Middleware) → AAL-Level-Check + MFA-Redirects hinzufügen
- login-form.tsx → Nach Login auf MFA-Status prüfen
- settings/page.tsx → Neue MFA-Karte im Settings-Dashboard
- messages/de.json, en.json, fr.json → MFA-Übersetzungen ergänzen

Neue Dateien:
- src/app/[locale]/mfa/setup/page.tsx
- src/app/[locale]/mfa/verify/page.tsx
- src/app/[locale]/(protected)/settings/mfa/page.tsx
- src/components/mfa/enroll-mfa.tsx (Setup-Wizard)
- src/components/mfa/verify-mfa.tsx (Code-Eingabe)
- src/components/mfa/backup-codes-display.tsx
- src/components/mfa/mfa-settings.tsx
- supabase/functions/mfa-backup-codes/ (Edge Function)
```
