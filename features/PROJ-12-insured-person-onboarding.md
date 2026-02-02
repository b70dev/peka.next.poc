# PROJ-12: Versicherten-Onboarding (Self-Service Portal-Zugang)

## Status: 🔵 Planned

## Übersicht

Ermöglicht versicherten Personen den sicheren Erstzugang zum Versichertenportal. Die Identitätsverifikation erfolgt über einen per Post versendeten Aktivierungscode in Kombination mit AHV-Nummer und Geburtsdatum. Nach erfolgreicher Verifikation erstellt der Versicherte seinen Account mit Email, Passwort und obligatorischem MFA (TOTP).

## Abhängigkeiten

- **Benötigt:** PROJ-6 (Insured Persons List) - Versichertendaten müssen existieren
- **Benötigt von:** PROJ-13 (Stammdaten), PROJ-14 (Versicherungsausweis), PROJ-15 (Dokumente), PROJ-16 (Einkauf-Simulation)

## User Stories

### US-1: Aktivierungscode generieren (Admin)
Als Pensionskassen-Admin möchte ich einen Aktivierungscode für einen Versicherten generieren können, um ihm den Portal-Zugang zu ermöglichen.

### US-2: Batch-Versand von Aktivierungscodes (Admin)
Als Pensionskassen-Admin möchte ich Aktivierungscodes für mehrere Versicherte gleichzeitig generieren können (CSV-Upload), um den Onboarding-Prozess effizient zu gestalten.

### US-3: Aktivierungscode anfordern (Versicherter)
Als versicherte Person möchte ich online einen Aktivierungscode anfordern können, der mir per Post zugeschickt wird, um selbstständig Zugang zum Portal zu erhalten.

### US-4: Identität verifizieren (Versicherter)
Als versicherte Person möchte ich mich mit meinem Aktivierungscode, meiner AHV-Nummer und meinem Geburtsdatum verifizieren können, um zu beweisen, dass ich die Person bin, für die der Code ausgestellt wurde.

### US-5: Account erstellen (Versicherter)
Als verifizierte Person möchte ich einen Account mit Email und Passwort erstellen können, um mich zukünftig im Portal anmelden zu können.

### US-6: MFA einrichten (Versicherter)
Als verifizierte Person möchte ich obligatorisch eine Authenticator-App für MFA einrichten, um meinen Account optimal zu schützen.

### US-7: Code-Status einsehen (Admin)
Als Pensionskassen-Admin möchte ich den Status aller generierten Aktivierungscodes einsehen können (ausstehend, verwendet, abgelaufen), um den Onboarding-Fortschritt zu überwachen.

## Acceptance Criteria

### Admin: Code-Generierung (Einzeln)
- [ ] Button "Aktivierungscode generieren" in Versicherten-Detailansicht
- [ ] Code ist 8 Zeichen alphanumerisch (z.B. "A3X7-K9M2")
- [ ] Code wird sofort in Datenbank gespeichert mit Status "pending"
- [ ] Erstellungsdatum und Ablaufdatum (30 Tage) werden gespeichert
- [ ] Admin sieht generierten Code zur manuellen Weiterverarbeitung (Brief drucken)
- [ ] Option: Brief-Vorlage als PDF generieren mit Code, Anleitung, QR-Code zur Portal-URL

### Admin: Batch-Versand
- [ ] Upload-Bereich für CSV mit Versicherten-IDs oder AHV-Nummern
- [ ] Validierung: Nur existierende Versicherte ohne aktiven Portal-Account
- [ ] Vorschau vor Generierung: Anzahl Codes, betroffene Personen
- [ ] Generierung aller Codes in einem Batch
- [ ] Export als CSV: Versicherter, Code, Ablaufdatum (für Serienbrief)
- [ ] Optional: Integration mit Post-API für direkten Briefversand (spätere Phase)

### Admin: Code anfordern (On-Demand durch Versicherten)
- [ ] Versicherter kann auf Portal-Startseite "Code anfordern" klicken
- [ ] Eingabe: AHV-Nummer + Geburtsdatum zur Identifikation
- [ ] System prüft ob Versicherter existiert und noch keinen Account hat
- [ ] Bei Match: Code wird generiert, Status "pending_mail"
- [ ] Admin sieht Anforderung in Dashboard und kann Brief versenden
- [ ] Alternativ: Automatischer Versand (falls Post-API konfiguriert)

### Versicherter: Onboarding-Flow

#### Schritt 1: Willkommen
- [ ] Dedizierte Onboarding-URL: `/portal/onboarding`
- [ ] Klare Erklärung des Prozesses (3 Schritte: Verifizieren, Account erstellen, MFA einrichten)
- [ ] Button "Onboarding starten"
- [ ] Link "Bereits registriert? Anmelden"

#### Schritt 2: Identität verifizieren
- [ ] Formular: Aktivierungscode (8 Zeichen, Format A3X7-K9M2)
- [ ] Formular: AHV-Nummer (Format: 756.1234.5678.90)
- [ ] Formular: Geburtsdatum (Datepicker, Format TT.MM.JJJJ)
- [ ] Validierung: Alle Felder müssen übereinstimmen
- [ ] Fehlermeldung bei ungültigen Daten: "Daten stimmen nicht überein. Bitte prüfen Sie Ihre Eingaben."
- [ ] Nach 5 Fehlversuchen: 15 Min Sperre für diese IP
- [ ] Code wird nach erfolgreicher Verifikation als "verified" markiert (noch nicht "used")

#### Schritt 3: Account erstellen
- [ ] Formular: Email-Adresse (wird Login-Name)
- [ ] Formular: Passwort (Min. 12 Zeichen, 1 Grossbuchstabe, 1 Zahl, 1 Sonderzeichen)
- [ ] Formular: Passwort bestätigen
- [ ] Passwort-Stärke-Indikator
- [ ] Checkbox: "Ich akzeptiere die Nutzungsbedingungen und Datenschutzerklärung"
- [ ] Email-Verifizierung: Link wird an Email gesendet (gültig 24h)
- [ ] Nach Email-Bestätigung: Weiterleitung zu MFA-Setup

#### Schritt 4: MFA einrichten (obligatorisch)
- [ ] QR-Code für Authenticator-App (Google/Microsoft Authenticator, Authy, etc.)
- [ ] Manueller Setup-Key als Alternative
- [ ] Eingabefeld für 6-stelligen TOTP-Code zur Bestätigung
- [ ] 10 Backup-Codes werden generiert und angezeigt
- [ ] Checkbox: "Ich habe die Backup-Codes sicher gespeichert"
- [ ] Download-Option für Backup-Codes als TXT
- [ ] Nach MFA-Setup: Aktivierungscode wird als "used" markiert
- [ ] Weiterleitung zum Portal-Dashboard

### Versicherter: Login nach Onboarding
- [ ] Login-Page: `/portal/login` (getrennt von Admin-Login)
- [ ] Email + Passwort eingeben
- [ ] Nach erfolgreicher Passwort-Prüfung: MFA-Code-Eingabe
- [ ] Option "Backup-Code verwenden"
- [ ] Nach erfolgreicher MFA: Zugang zum Portal

### Admin: Code-Verwaltung
- [ ] Übersicht aller Aktivierungscodes in Admin-Bereich
- [ ] Filter: Status (pending, verified, used, expired)
- [ ] Filter: Zeitraum (erstellt am)
- [ ] Suche nach Versichertem
- [ ] Einzelne Codes können manuell invalidiert werden
- [ ] Abgelaufene Codes werden automatisch als "expired" markiert (Cron-Job)

### Security
- [ ] Aktivierungscodes sind kryptografisch sicher generiert (CSPRNG)
- [ ] Codes werden gehasht in DB gespeichert (wie Passwörter)
- [ ] Rate-Limiting: Max. 5 Verifikationsversuche pro 15 Min pro IP
- [ ] Rate-Limiting: Max. 3 Code-Anforderungen pro AHV-Nr pro Tag
- [ ] Audit-Log: Alle Onboarding-Events werden protokolliert
- [ ] HTTPS only
- [ ] Versicherten-Session ist getrennt von Admin-Session

## Edge Cases

### E1: Code bereits verwendet
- **Szenario:** Versicherter versucht Onboarding mit bereits verwendetem Code
- **Verhalten:** "Dieser Aktivierungscode wurde bereits verwendet. Bitte melden Sie sich an oder kontaktieren Sie Ihre Pensionskasse."

### E2: Code abgelaufen
- **Szenario:** Versicherter versucht Onboarding nach 30 Tagen
- **Verhalten:** "Dieser Aktivierungscode ist abgelaufen. Bitte fordern Sie einen neuen Code an."

### E3: Versicherter hat bereits Account
- **Szenario:** Versicherter versucht Onboarding, hat aber bereits Account
- **Verhalten:** "Für diese AHV-Nummer existiert bereits ein Portal-Zugang. Bitte melden Sie sich an."

### E4: Email bereits in Verwendung
- **Szenario:** Versicherter gibt Email an, die bereits von anderem Account verwendet wird
- **Verhalten:** "Diese Email-Adresse ist bereits vergeben. Bitte verwenden Sie eine andere Email."

### E5: Versicherter nicht mehr aktiv
- **Szenario:** Versicherter ist ausgetreten, versucht aber Onboarding
- **Verhalten:** Admin kann entscheiden ob inaktive Versicherte Codes erhalten dürfen (Konfiguration)

### E6: AHV-Nummer Tippfehler
- **Szenario:** Versicherter vertippt sich bei AHV-Nummer
- **Verhalten:** Format-Validierung (756.XXXX.XXXX.XX), hilfreiche Fehlermeldung

### E7: Mehrfach-Onboarding-Versuch
- **Szenario:** Versicherter bricht Onboarding ab und startet neu
- **Verhalten:** Code bleibt "pending" bis komplett abgeschlossen, kann erneut verwendet werden

### E8: Browser geschlossen während MFA-Setup
- **Szenario:** Versicherter schliesst Browser vor MFA-Abschluss
- **Verhalten:** Account existiert, aber MFA nicht aktiv. Bei nächstem Login: Redirect zu MFA-Setup.

### E9: Verifizierungs-Email nicht angekommen
- **Szenario:** Email landet in Spam oder kommt nicht an
- **Verhalten:** "Erneut senden"-Button (max. 3x pro Stunde), Hinweis auf Spam-Ordner

### E10: Falsches Geburtsdatum in Stammdaten
- **Szenario:** Geburtsdatum in PK-System ist falsch erfasst
- **Verhalten:** Versicherter muss PK kontaktieren für Korrektur, danach neuen Code anfordern

## Nicht im Scope

- ❌ Passwort-Reset-Flow → separates Feature (kann PROJ-2 ähnlich sein)
- ❌ Account löschen/deaktivieren → separates Feature
- ❌ Mehrere Pensionskassen pro Versichertem → spätere Phase
- ❌ Hardware-Security-Keys (FIDO2/WebAuthn) → spätere Phase
- ❌ Biometrische Authentifizierung → spätere Phase

## Technische Anforderungen

- **Performance:** Onboarding-Flow < 500ms pro Schritt
- **Verfügbarkeit:** Portal muss 99.5% verfügbar sein
- **Compliance:** DSGVO/DSG-konform, minimale Datenspeicherung
- **Audit:** Vollständiges Logging aller Onboarding-Events
- **Codes:** 8 Zeichen alphanumerisch, 30 Tage gültig, CSPRNG generiert

## UI/UX Anforderungen

- Mobile-first Design (viele Versicherte nutzen Smartphone)
- Klare Fortschrittsanzeige (Schritt 1 von 4)
- Verständliche Sprache (kein Fachjargon)
- Barrierefreiheit: WCAG 2.1 AA konform
- Sprache: Deutsch (Schweizer Hochdeutsch), später mehrsprachig (DE/FR/IT/EN)

## Datenmodell (Konzept)

### Tabelle: `portal_activation_codes`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| insured_person_id | UUID | FK zu insured_persons |
| code_hash | TEXT | Gehashter Aktivierungscode |
| status | ENUM | pending, verified, used, expired, invalidated |
| created_by | UUID | FK zu user_profiles (Admin) oder NULL (self-service) |
| created_at | TIMESTAMPTZ | Erstellungszeitpunkt |
| expires_at | TIMESTAMPTZ | Ablaufzeitpunkt (created_at + 30 Tage) |
| verified_at | TIMESTAMPTZ | Zeitpunkt der erfolgreichen Verifikation |
| used_at | TIMESTAMPTZ | Zeitpunkt des Account-Abschlusses |

### Tabelle: `portal_users`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key, FK zu auth.users |
| insured_person_id | UUID | FK zu insured_persons (1:1) |
| email | TEXT | Login-Email |
| mfa_enabled | BOOLEAN | MFA aktiv |
| mfa_secret_encrypted | TEXT | Verschlüsseltes TOTP-Secret |
| backup_codes_hash | TEXT[] | Gehashte Backup-Codes |
| created_at | TIMESTAMPTZ | Account-Erstellung |
| last_login_at | TIMESTAMPTZ | Letzter Login |

