-- =============================================================
-- PROJ-23: ZAS Lebensnachweis (Sedex / eCH-0086)
-- Migration: Erstellt die beiden Audit-Tabellen
--   - zas_life_verification_runs    (Lauf-Metadaten)
--   - zas_life_verification_deaths  (Gemeldete Todesfälle je Lauf)
-- inkl. RLS-Policies, Indexes und Audit-Kommentaren.
--
-- Hinweise:
--  * Beide Tabellen sind nur für admin/super_admin beschreibbar
--    (INSERT/UPDATE). Viewer dürfen SELECT. DELETE ist verboten
--    (keine Policy) — die Daten sind auditrelevant.
--  * Die eigentliche eCH-0086-XML-Verarbeitung (Generierung und
--    Parsing) ist zum Zeitpunkt dieser Migration noch nicht
--    implementiert (externe Deliverables ausstehend, siehe
--    features/PROJ-23-zas-lebensnachweis.md). Die Tabellen
--    bilden bereits das vollständige Zielmodell ab.
-- =============================================================

-- ===============================
-- 1. Status-Enums
-- ===============================

-- Lauf-Status: beschreibt den Prozessfortschritt eines Laufs.
--   request_created             : Anfragedatei wurde erstellt
--   response_imported           : ZAS-Rückmeldung wurde eingelesen
--   completed                   : Alle Todesfälle bearbeitet
--   completed_without_response  : Manuell abgeschlossen ohne Rückmeldung
CREATE TYPE zas_run_status AS ENUM (
  'request_created',
  'response_imported',
  'completed',
  'completed_without_response'
);

-- Todesfall-Status: Bearbeitungsstand eines gemeldeten Todesfalls.
--   open           : Von ZAS gemeldet, noch nicht bearbeitet
--   processed      : Admin hat Sterbedatum in den Stammdaten nachgetragen
--   already_known  : Person war im System bereits als verstorben markiert
CREATE TYPE zas_death_status AS ENUM (
  'open',
  'processed',
  'already_known'
);

-- ===============================
-- 2. zas_life_verification_runs
-- ===============================
CREATE TABLE zas_life_verification_runs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status                  zas_run_status NOT NULL DEFAULT 'request_created',
  pensioner_count         INTEGER NOT NULL DEFAULT 0 CHECK (pensioner_count >= 0),

  -- Anfragedatei-Metadaten
  request_filename        TEXT,
  request_generated_at    TIMESTAMPTZ,

  -- Import der ZAS-Rückmeldung
  response_imported_at    TIMESTAMPTZ,
  response_imported_by    UUID REFERENCES auth.users(id),

  -- Abschluss
  completed_at            TIMESTAMPTZ,
  completed_by            UUID REFERENCES auth.users(id),

  -- Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID NOT NULL REFERENCES auth.users(id)
);

COMMENT ON TABLE zas_life_verification_runs IS
  'PROJ-23: Jeder periodische Abgleich mit ZAS (eCH-0086 / UPI) ist ein Lauf.';

COMMENT ON COLUMN zas_life_verification_runs.status IS
  'Prozess-Status: request_created → response_imported → completed; alternativ completed_without_response';
COMMENT ON COLUMN zas_life_verification_runs.pensioner_count IS
  'Anzahl der in die Anfrage einbezogenen aktiven Rentner';
COMMENT ON COLUMN zas_life_verification_runs.request_filename IS
  'Dateiname der generierten eCH-0086-Anfragedatei (Sedex-Konvention)';

-- Index für die Lauf-Übersichtsliste (neueste zuerst)
CREATE INDEX idx_zas_runs_created_at ON zas_life_verification_runs(created_at DESC);
CREATE INDEX idx_zas_runs_status ON zas_life_verification_runs(status);
CREATE INDEX idx_zas_runs_created_by ON zas_life_verification_runs(created_by);

-- ===============================
-- 3. zas_life_verification_deaths
-- ===============================
CREATE TABLE zas_life_verification_deaths (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             UUID NOT NULL REFERENCES zas_life_verification_runs(id) ON DELETE CASCADE,

  -- Verknüpfung zum Versicherten — nullable, weil die AHV-Nr.
  -- aus der ZAS-Antwort nicht zwingend im System existiert.
  insured_person_id  UUID REFERENCES insured_persons(id),

  -- Daten aus der ZAS-Antwort (Ground Truth)
  ahv_number         TEXT NOT NULL,
  last_name          TEXT,
  first_name         TEXT,
  date_of_death      DATE,

  -- Bearbeitungsstand
  status             zas_death_status NOT NULL DEFAULT 'open',
  processed_at       TIMESTAMPTZ,
  processed_by       UUID REFERENCES auth.users(id),
  notes              TEXT
);

COMMENT ON TABLE zas_life_verification_deaths IS
  'PROJ-23: Von ZAS gemeldete Todesfälle je Lauf. 1 Zeile pro AHV-Nr. in der Antwort.';
COMMENT ON COLUMN zas_life_verification_deaths.insured_person_id IS
  'Nullable: AHV-Nr. aus ZAS-Antwort, die nicht im System gefunden wurde, bleibt trotzdem erhalten.';
COMMENT ON COLUMN zas_life_verification_deaths.status IS
  'open=Neu / processed=Stammdaten angepasst / already_known=bereits markiert als verstorben';

-- Indexes für die Detail-Abfrage pro Lauf und für Joins
CREATE INDEX idx_zas_deaths_run_id ON zas_life_verification_deaths(run_id);
CREATE INDEX idx_zas_deaths_insured_person_id
  ON zas_life_verification_deaths(insured_person_id)
  WHERE insured_person_id IS NOT NULL;
CREATE INDEX idx_zas_deaths_ahv_number ON zas_life_verification_deaths(ahv_number);

-- ===============================
-- 4. Row Level Security
-- ===============================

-- Wir setzen auf die bestehenden SECURITY-DEFINER-Funktionen
-- aus PROJ-22 (is_active_user / is_active_admin). Fällt die
-- Einführungs-Migration PROJ-22 weg, müssten diese hier neu
-- definiert werden — zum Zeitpunkt PROJ-23 sind sie bereits
-- in der DB vorhanden.

-- -- zas_life_verification_runs --------------------------------
ALTER TABLE zas_life_verification_runs ENABLE ROW LEVEL SECURITY;

-- SELECT: alle aktiven authentifizierten Nutzer (inkl. viewer)
CREATE POLICY "zas_runs_select"
  ON zas_life_verification_runs FOR SELECT
  TO authenticated
  USING (is_active_user());

-- INSERT: nur admin / super_admin
CREATE POLICY "zas_runs_insert"
  ON zas_life_verification_runs FOR INSERT
  TO authenticated
  WITH CHECK (is_active_admin());

-- UPDATE: nur admin / super_admin
CREATE POLICY "zas_runs_update"
  ON zas_life_verification_runs FOR UPDATE
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- Kein DELETE-Policy => physisches Löschen ist blockiert (Audit)

-- -- zas_life_verification_deaths ------------------------------
ALTER TABLE zas_life_verification_deaths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zas_deaths_select"
  ON zas_life_verification_deaths FOR SELECT
  TO authenticated
  USING (is_active_user());

CREATE POLICY "zas_deaths_insert"
  ON zas_life_verification_deaths FOR INSERT
  TO authenticated
  WITH CHECK (is_active_admin());

CREATE POLICY "zas_deaths_update"
  ON zas_life_verification_deaths FOR UPDATE
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- Kein DELETE-Policy (Audit)
