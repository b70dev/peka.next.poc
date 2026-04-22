-- =============================================================
-- PROJ-24: Rentner-Liste & Übersicht
-- Migration: Erweitert die accounts-Tabelle um zwei Felder, die
-- für Konten vom Typ "Rente" relevant sind:
--   - monthly_pension_amount: Monatlicher Rentenbetrag in CHF
--   - retirement_date:       Datum des Rentenbeginns
--
-- Beide Felder sind nullable und semantisch nur für Renten-
-- Konten (account_types.code startet mit 'RENT' / ist 'PENSION')
-- befüllt. Es wird bewusst KEIN CHECK-Constraint gesetzt, weil
-- die Regel auf einem joinbaren Stammdatensatz (account_types)
-- beruht und im API-Layer sowie im Frontend durchgesetzt wird.
--
-- Die bestehende Row Level Security der accounts-Tabelle gilt
-- automatisch auch für diese neuen Spalten — es ist keine
-- zusätzliche Policy notwendig.
-- =============================================================

ALTER TABLE accounts
  ADD COLUMN monthly_pension_amount NUMERIC(10, 2),
  ADD COLUMN retirement_date        DATE;

COMMENT ON COLUMN accounts.monthly_pension_amount IS
  'PROJ-24: Monatlicher Rentenbetrag (CHF) — nur relevant für Konten vom Typ "Rente" (account_types.code startet mit RENT / ist PENSION). Bei anderen Konto-Typen bleibt das Feld NULL.';

COMMENT ON COLUMN accounts.retirement_date IS
  'PROJ-24: Datum des Rentenbeginns — nur relevant für Konten vom Typ "Rente". Bei anderen Konto-Typen bleibt das Feld NULL.';

-- Hinweis: Die bestehende Row Level Security der accounts-Tabelle
-- (siehe Ausgangs-Migration) deckt die neuen Spalten automatisch ab.
-- Neue INSERT-/UPDATE-/SELECT-Policies sind daher nicht erforderlich.
