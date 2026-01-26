# PROJ-5: Internationalisierung (i18n)

## Status: 🟢 Done (MVP)

## Übersicht

Ermöglicht die mehrsprachige Nutzung der gesamten peka.next Anwendung. Benutzer können zwischen Deutsch, Englisch und Französisch wählen. Die Sprachpräferenz wird serverseitig pro Benutzer gespeichert.

## Abhängigkeiten

- **Benötigt:** PROJ-1 (Authentication) - für Speicherung der Sprachpräferenz pro User
- **Benötigt von:** Alle UI-Features (PROJ-6 ff.)

## User Stories

### US-1: Sprache auswählen
Als eingeloggter Benutzer möchte ich die Sprache der Anwendung wählen können (DE/EN/FR), um die App in meiner bevorzugten Sprache zu nutzen.

### US-2: Sprachpräferenz speichern
Als Benutzer möchte ich, dass meine Sprachwahl gespeichert wird, damit ich sie beim nächsten Login nicht erneut wählen muss.

### US-3: Standard-Sprache für neue User
Als neuer Benutzer möchte ich die App initial auf Deutsch sehen, da dies die Hauptsprache im Schweizer Pensionskassen-Umfeld ist.

### US-4: Sprache ohne Login
Als nicht-eingeloggter Besucher möchte ich die Login-Seite auf Deutsch sehen, mit der Möglichkeit, die Sprache temporär zu wechseln.

### US-5: Konsistente Übersetzungen
Als Benutzer möchte ich, dass alle Texte, Labels, Buttons und Meldungen in der gewählten Sprache angezeigt werden.

### US-6: Datums- und Zahlenformate
Als Benutzer möchte ich, dass Datumsangaben und Zahlen entsprechend meiner Spracheinstellung formatiert werden (z.B. 25.01.2026 vs 01/25/2026).

## Acceptance Criteria

### Sprachauswahl UI
- [x] Sprachwähler im Header/Navigation sichtbar (Dropdown oder Flags)
- [x] Aktuelle Sprache ist klar erkennbar
- [x] Sprachwechsel erfolgt sofort ohne Page-Reload (Client-Side)
- [x] Sprachwähler zeigt: DE (Deutsch), EN (English), FR (Français)

### Speicherung - *Teilweise verschoben*
- [ ] Sprachpräferenz wird in `user_profiles.language` gespeichert - *Verschoben*
- [ ] Bei Login wird gespeicherte Sprache automatisch geladen - *Verschoben*
- [ ] Sprachwechsel aktualisiert Datenbank-Eintrag - *Verschoben*
- [x] Default-Wert für neue User: 'de' (via URL)

### Übersetzungen
- [x] Alle statischen Texte sind übersetzt (Labels, Buttons, Menüs)
- [x] Alle Fehlermeldungen sind übersetzt
- [x] Alle Erfolgsmeldungen sind übersetzt
- [x] Alle Placeholder-Texte sind übersetzt
- [x] Alle Tooltips sind übersetzt

### Formatierung (Locale-Aware) - *Teilweise verschoben*
- [x] Datumsformat: DE=dd.MM.yyyy (hardcoded de-CH)
- [ ] Zahlenformat: DE/FR=1'234.56, EN=1,234.56 - *Verschoben*
- [x] Währung: Immer CHF (Schweizer Franken)

### Login-Seite (ohne Auth)
- [x] Login-Seite standardmässig auf Deutsch
- [x] Sprachwähler auch auf Login-Seite verfügbar
- [x] Temporäre Sprachwahl wird in URL gespeichert (locale-prefix)
- [ ] Nach Login wird User-Präferenz aus DB übernommen - *Verschoben*

### Technische Anforderungen
- [x] Übersetzungsdateien strukturiert (JSON oder TypeScript)
- [x] Fehlende Übersetzungen zeigen Key (nicht abstürzen)
- [x] Übersetzungen sind typsicher (TypeScript)
- [x] Hot-Reload bei Änderung von Übersetzungen (Dev-Mode)

## Edge Cases

### E1: Fehlende Übersetzung
- **Szenario:** Ein Text hat keine Übersetzung für die gewählte Sprache
- **Verhalten:** Fallback auf Deutsch, in Dev-Mode Warnung in Console

### E2: Sprachwechsel während Formular-Eingabe
- **Szenario:** User füllt Formular aus und wechselt Sprache
- **Verhalten:** Formulardaten bleiben erhalten, nur Labels wechseln

### E3: User ohne Sprachpräferenz in DB
- **Szenario:** Bestehender User hat NULL in language-Feld
- **Verhalten:** Default 'de' verwenden, bei erstem Sprachwechsel speichern

### E4: Dynamische Inhalte (DB-Daten)
- **Szenario:** Versicherten-Namen, Arbeitgeber etc.
- **Verhalten:** Werden nicht übersetzt (sind User-Daten)

### E5: Pluralisierung
- **Szenario:** "1 Versicherter" vs "5 Versicherte"
- **Verhalten:** Korrekte Pluralformen pro Sprache

### E6: Lange Texte in anderen Sprachen
- **Szenario:** Französische Übersetzung ist länger als deutsche
- **Verhalten:** UI passt sich an (keine abgeschnittenen Texte)

### E7: Browser mit anderer Sprache
- **Szenario:** Browser ist auf Italienisch eingestellt
- **Verhalten:** App zeigt trotzdem Deutsch (nicht unterstützte Sprache)

## Datenmodell

### Erweiterung: `user_profiles` Tabelle

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| language | VARCHAR(2) | Sprachcode: 'de', 'en', 'fr' (default: 'de') |

```sql
ALTER TABLE user_profiles
ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'de'
CHECK (language IN ('de', 'en', 'fr'));
```

## Übersetzungsstruktur (Vorschlag)

```
src/
├── locales/
│   ├── de/
│   │   ├── common.json       # Allgemeine Texte (Buttons, Labels)
│   │   ├── auth.json         # Login, Logout, Session
│   │   ├── navigation.json   # Menü, Breadcrumbs
│   │   ├── insured.json      # Versicherten-spezifisch
│   │   ├── errors.json       # Fehlermeldungen
│   │   └── validation.json   # Formular-Validierung
│   ├── en/
│   │   └── ... (gleiche Struktur)
│   └── fr/
│       └── ... (gleiche Struktur)
├── lib/
│   └── i18n/
│       ├── config.ts         # i18n Konfiguration
│       ├── provider.tsx      # React Context Provider
│       └── hooks.ts          # useTranslation, useLocale
```

## Beispiel-Übersetzungen

### common.json (DE)
```json
{
  "actions": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "search": "Suchen",
    "filter": "Filtern",
    "reset": "Zurücksetzen"
  },
  "status": {
    "active": "Aktiv",
    "inactive": "Inaktiv",
    "loading": "Laden..."
  }
}
```

### common.json (EN)
```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "filter": "Filter",
    "reset": "Reset"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "loading": "Loading..."
  }
}
```

### common.json (FR)
```json
{
  "actions": {
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "search": "Rechercher",
    "filter": "Filtrer",
    "reset": "Réinitialiser"
  },
  "status": {
    "active": "Actif",
    "inactive": "Inactif",
    "loading": "Chargement..."
  }
}
```

## UI/UX Anforderungen

- Sprachwähler: Kompakt, nicht aufdringlich (z.B. "DE | EN | FR" oder Dropdown)
- Position: Header rechts, neben User-Info/Logout
- Kein Page-Reload bei Sprachwechsel
- Visuelles Feedback bei Sprachwechsel (kurzer Toast "Sprache geändert")

## Technologie-Empfehlung

- **next-intl** oder **react-i18next**: Bewährte i18n-Libraries für Next.js
- **TypeScript-Integration**: Typsichere Translation-Keys
- **Namespace-basiert**: Übersetzungen nach Funktionsbereich aufgeteilt

## Nicht im Scope

- ❌ Automatische Browser-Sprach-Erkennung (immer DE als Default)
- ❌ Weitere Sprachen (IT, etc.) → spätere Erweiterung
- ❌ Übersetzung von User-Daten (Namen, Adressen)
- ❌ RTL-Support (Arabisch, Hebräisch)
- ❌ Machine Translation / Auto-Translate
