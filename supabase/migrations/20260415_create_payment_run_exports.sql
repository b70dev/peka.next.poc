-- =============================================================
-- PROJ-21: pain.001 XML-Generierung (ISO 20022)
-- Migration:
--   1. payment_run_exports Tabelle (Export-Protokoll, immutabel)
--   2. app_settings Seed-Einträge für die Auftraggeber-Konfiguration
--   3. RLS-Policies analog zu payment_run_events
-- =============================================================

-- ===============================
-- 1. pain.001 Versionen Enum
-- ===============================
CREATE TYPE pain001_version AS ENUM (
  'pain.001.001.03.ch.02',
  'pain.001.001.09.ch.03'
);

-- ===============================
-- 2. payment_run_exports Tabelle
-- ===============================
CREATE TABLE payment_run_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_run_id UUID NOT NULL REFERENCES payment_runs(id) ON DELETE CASCADE,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_by UUID NOT NULL REFERENCES user_profiles(id),
  pain_version pain001_version NOT NULL,
  filename TEXT NOT NULL,
  message_id TEXT NOT NULL,
  xml_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_run_exports IS
  'PROJ-21: Protokoll aller generierten pain.001 XML-Exports. Unveraenderlich (keine UPDATE/DELETE Policy).';

CREATE INDEX idx_payment_run_exports_run ON payment_run_exports(payment_run_id, exported_at DESC);
CREATE INDEX idx_payment_run_exports_exporter ON payment_run_exports(exported_by);
CREATE INDEX idx_payment_run_exports_message_id ON payment_run_exports(message_id);

-- ===============================
-- 3. app_settings: Auftraggeber-Stammdaten Seeds
-- ===============================
INSERT INTO app_settings (key, value, description) VALUES
  ('debtor.name', '""'::jsonb,
   'PROJ-21: Name der Pensionskasse (Auftraggeber in pain.001)'),
  ('debtor.street', '""'::jsonb,
   'PROJ-21: Strasse und Hausnummer des Auftraggebers'),
  ('debtor.postal_code', '""'::jsonb,
   'PROJ-21: PLZ des Auftraggebers'),
  ('debtor.city', '""'::jsonb,
   'PROJ-21: Ort des Auftraggebers'),
  ('debtor.country', '"CH"'::jsonb,
   'PROJ-21: Laendercode (ISO 3166-1 alpha-2)'),
  ('debtor.iban', '""'::jsonb,
   'PROJ-21: IBAN des Auszahlungskontos (CH/LI)'),
  ('debtor.organisation_id', '""'::jsonb,
   'PROJ-21: Kurzkennung der Pensionskasse (fuer MsgId-Generierung)');

-- ===============================
-- 4. Row Level Security
-- ===============================
ALTER TABLE payment_run_exports ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/super_admin (gleiche Sichtbarkeit wie payment_runs)
CREATE POLICY "payment_run_exports_select"
  ON payment_run_exports FOR SELECT
  TO authenticated
  USING (is_payment_admin());

-- INSERT: admin/super_admin (API setzt exported_by = aktueller User)
CREATE POLICY "payment_run_exports_insert"
  ON payment_run_exports FOR INSERT
  TO authenticated
  WITH CHECK (is_payment_admin());

-- Kein UPDATE/DELETE — Exporte sind immutabel (Audit-Anforderung)
