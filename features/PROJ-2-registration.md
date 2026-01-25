# PROJ-2: Admin Registration (Self-Registration)

## Status: 🔵 Planned

## Übersicht

Ermöglicht neuen Pensionskassen-Admins die Selbstregistrierung für peka.next. Die Registrierung erfolgt über Identity Provider (Azure Entra ID, Google OAuth) oder via Email/Passwort mit anschliessender Email-Verifizierung.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - Login-Infrastruktur und IDP-Integration
- **Benötigt von:** PROJ-3 (MFA) - MFA-Setup nach Registration

## User Stories

### US-1: Registration via Azure Entra ID
Als neuer Admin möchte ich mich mit meinem Microsoft-Firmenkonto registrieren, um schnell einen Account zu erstellen ohne separates Passwort.

### US-2: Registration via Google OAuth
Als neuer Admin möchte ich mich mit meinem Google-Konto registrieren, um einen unkomplizierten Onboarding-Prozess zu haben.

### US-3: Registration via Email/Passwort
Als neuer Admin möchte ich mich mit Email und Passwort registrieren können, falls ich keinen unterstützten IDP nutzen möchte.

### US-4: Email-Verifizierung
Als neuer Admin möchte ich meine Email-Adresse verifizieren, um die Sicherheit meines Accounts zu gewährleisten.

### US-5: Passwort-Reset
Als Admin möchte ich mein Passwort zurücksetzen können, falls ich es vergessen habe.

## Acceptance Criteria

### Registration-Page
- [ ] Registration-Page zeigt drei Optionen: Azure, Google, Email/Passwort
- [ ] Link "Bereits registriert? Anmelden" zur Login-Page
- [ ] Datenschutzhinweis mit Link zur Privacy Policy
- [ ] Registration-Page ist responsiv

### IDP Registration (Azure/Google)
- [ ] Klick auf IDP-Button startet OAuth-Flow
- [ ] Nach erfolgreicher Authentifizierung wird Account erstellt
- [ ] Email wird automatisch vom IDP übernommen
- [ ] Name wird automatisch vom IDP übernommen (falls verfügbar)
- [ ] User wird nach Registration direkt eingeloggt

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

### E4: IDP-Email weicht ab
- **Szenario:** User hat bei Google andere Email als bei manueller Eingabe
- **Verhalten:** IDP-Email wird verwendet, User wird informiert

### E5: Doppelte Registration
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
