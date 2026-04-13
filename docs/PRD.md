# Product Requirements Document

## Vision

peka.next ist eine moderne, webbasierte Pensionskassen-Verwaltungsanwendung. Sie ersetzt bestehende Legacy-Systeme durch eine benutzerfreundliche, mehrsprachige Plattform mit zwei Zugangsbereichen: einem Admin-Portal für Pensionskassen-Sachbearbeiter und einem Self-Service-Portal für versicherte Personen.

Ziel ist eine schlanke, barrierefreie Anwendung (WCAG 2.1 AA), die BVG-Verwaltungsprozesse digitalisiert und sowohl Administratoren als auch Versicherten einen effizienten Zugang zu relevanten Daten bietet.

## Target Users

### 1. Pensionskassen-Administratoren (Admin-Portal)
- **Rollen:** Super-Admin, Admin, Viewer
- **Bedürfnisse:** Schneller Zugriff auf Versichertendaten, Kontenverwaltung, Beitragssätze-Konfiguration, Excel-Export für Reporting
- **Pain Points:** Langsame Legacy-Systeme, fehlende Volltextsuche, manuelle Prozesse, keine Mehrsprachigkeit

### 2. Versicherte Personen (Self-Service-Portal)
- **Zugang:** Aktivierungscode per Post + AHV-Nr. + Geburtsdatum
- **Bedürfnisse:** Eigene Stammdaten einsehen, Versicherungsausweis herunterladen, Dokumente abrufen, Einkauf-Simulationen durchführen
- **Pain Points:** Kein digitaler Zugang zu Pensionskassendaten, Abhängigkeit von postalischer Korrespondenz

## Core Features (Roadmap)

### P0 - MVP (Admin-Portal Basis) - Done

| Priority | Feature | ID | Status |
|----------|---------|-----|--------|
| P0 (MVP) | Authentication (Login/Logout) | [PROJ-1](../features/PROJ-1-authentication.md) | Done |
| P0 (MVP) | Multi-Faktor-Authentifizierung (MFA) | [PROJ-3](../features/PROJ-3-mfa.md) | Deployed |
| P0 (MVP) | Internationalisierung (i18n) | [PROJ-5](../features/PROJ-5-internationalization.md) | Done (MVP) |
| P0 (MVP) | Versicherte Personen - Liste & Suche | [PROJ-6](../features/PROJ-6-insured-persons-list.md) | Done (MVP) |
| P0 (MVP) | Versicherten-Detail & Stammdaten | [PROJ-7](../features/PROJ-7-insured-person-detail.md) | Done (MVP) |
| P0 (MVP) | Excel-Export für Personenliste | [PROJ-8](../features/PROJ-8-excel-export.md) | Deployed |
| P0 (MVP) | Barrierefreiheit (Accessibility) | [PROJ-9](../features/PROJ-9-accessibility.md) | Deployed |

### P1 - Admin-Portal Erweiterungen - Teilweise fertig

| Priority | Feature | ID | Status |
|----------|---------|-----|--------|
| P1 | Admin Registration (Self-Registration) | [PROJ-2](../features/PROJ-2-registration.md) | Planned |
| P1 | Rollen und Berechtigungen (RBAC) | [PROJ-4](../features/PROJ-4-roles.md) | Done |
| P1 | Kontenverwaltung pro Anstellung | [PROJ-10](../features/PROJ-10-account-management.md) | Deployed |
| P1 | BVG-Hochrechnungen (Projections) | [PROJ-11](../features/PROJ-11-bvg-projections.md) | Planned |
| P1 | Sparbeitragssätze-Verwaltung | [PROJ-17](../features/PROJ-17-savings-contribution-rates.md) | Complete |

### P2 - Versicherten-Portal - Planned

| Priority | Feature | ID | Status |
|----------|---------|-----|--------|
| P2 | Versicherten-Onboarding (Self-Service) | [PROJ-12](../features/PROJ-12-insured-person-onboarding.md) | Planned |
| P2 | Versicherten-Stammdaten (Ansicht & Adressänderung) | [PROJ-13](../features/PROJ-13-insured-person-data-view.md) | Planned |
| P2 | Versicherungsausweis (Anzeige & Download) | [PROJ-14](../features/PROJ-14-insurance-certificate.md) | Planned |
| P2 | Versicherten-Dokumente (Archiv & Anforderung) | [PROJ-15](../features/PROJ-15-insured-person-documents.md) | Planned |
| P2 | Einkauf-Simulation (Freiwillige Einkäufe) | [PROJ-16](../features/PROJ-16-purchase-simulation.md) | Planned |
| P2 | Versicherten-Rolle & Portal-Berechtigungen | [PROJ-18](../features/PROJ-18-insured-person-role.md) | Planned |

## Success Metrics

- **Admin-Effizienz:** Versichertendaten-Suche < 2 Sekunden (Volltextsuche)
- **Barrierefreiheit:** WCAG 2.1 Level AA Konformität
- **Mehrsprachigkeit:** Vollständige Abdeckung DE/EN/FR
- **Sicherheit:** MFA-Aktivierungsrate 100% für lokale Admins
- **Self-Service-Adoption:** Anteil der Versicherten mit aktiviertem Portal-Zugang (Zielwert nach Launch P2)

## Constraints

- **Tech Stack:** Next.js 16, Supabase (PostgreSQL + Auth), Tailwind CSS + shadcn/ui, Vercel
- **Regulatorisch:** BVG-konforme Datenverarbeitung, Datenschutz (Schweizer Recht)
- **Sprachen:** Deutsch, Englisch, Französisch (next-intl)
- **Accessibility:** WCAG 2.1 Level AA
- **Auth:** Supabase Auth mit OAuth (Azure Entra ID, Google) + Email/Passwort + TOTP-MFA

## Non-Goals

- **Keine Lohnbuchhaltung** - peka.next verwaltet keine Lohnabrechnungen, nur BVG-relevante Daten
- **Kein Dokumenten-Generierung** - Dokumente werden extern erstellt und in peka.next angezeigt/heruntergeladen
- **Keine Mobile-App** - Responsive Web-Anwendung, kein natives iOS/Android
- **Keine Arbeitgeber-Selbstverwaltung** - Arbeitgeber werden durch PK-Admins verwaltet, kein eigenes Portal
- **Kein Zahlungsverkehr** - Keine direkte Anbindung an Bankensysteme oder Zahlungstransaktionen

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
