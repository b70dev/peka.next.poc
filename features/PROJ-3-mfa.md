# PROJ-3: Multi-Faktor-Authentifizierung (MFA)

## Status: 🔵 Planned

## Übersicht

Implementiert obligatorische Multi-Faktor-Authentifizierung für alle peka.next Admins. MFA erhöht die Sicherheit des Systems erheblich, besonders wichtig für eine Pensionskassen-Anwendung mit sensiblen Personendaten.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - Basis-Login muss funktionieren
- **Benötigt:** PROJ-2 (Registration) - Account muss existieren für MFA-Setup

## User Stories

### US-1: MFA-Setup nach Registration
Als neuer Admin möchte ich nach der Registrierung zur MFA-Einrichtung aufgefordert werden, um meinen Account abzusichern.

### US-2: TOTP-Authenticator einrichten
Als Admin möchte ich eine Authenticator-App (Google Authenticator, Microsoft Authenticator, etc.) für MFA nutzen können.

### US-3: MFA bei jedem Login
Als Admin möchte ich nach Eingabe meiner Credentials einen zweiten Faktor eingeben, um sicherzustellen, dass nur ich Zugriff habe.

### US-4: Backup-Codes generieren
Als Admin möchte ich Backup-Codes erhalten, um mich auch bei Verlust meines Smartphones anmelden zu können.

### US-5: MFA-Methode ändern
Als Admin möchte ich meine MFA-Methode ändern oder neu einrichten können, falls ich mein Gerät wechsle.

## Acceptance Criteria

### MFA-Setup (Ersteinrichtung)
- [ ] Nach Registration wird User zum MFA-Setup weitergeleitet
- [ ] User kann App nicht nutzen ohne MFA-Setup abzuschliessen
- [ ] QR-Code für Authenticator-App wird angezeigt
- [ ] Manueller Setup-Key wird als Alternative angezeigt
- [ ] User muss Code aus App eingeben zur Bestätigung
- [ ] 10 Backup-Codes werden generiert und angezeigt
- [ ] User muss bestätigen, dass Backup-Codes gespeichert wurden

### MFA bei Login
- [ ] Nach erfolgreicher Passwort-Eingabe: MFA-Code-Eingabe
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

- ❌ SMS als zweiter Faktor (Sicherheitsbedenken, Kosten)
- ❌ Hardware-Security-Keys (U2F/FIDO2) → späteres Feature
- ❌ Biometrische Authentifizierung → späteres Feature
- ❌ "Diesem Gerät vertrauen" (MFA überspringen) → bewusst nicht, da obligatorisch

## Technische Anforderungen

- TOTP nach RFC 6238 (30 Sekunden Zeitfenster, 6 Ziffern)
- Backup-Codes: Kryptografisch sichere Generierung
- MFA-Secrets werden verschlüsselt gespeichert
- Audit-Log für MFA-Events (Setup, Änderung, Fehlversuche)
