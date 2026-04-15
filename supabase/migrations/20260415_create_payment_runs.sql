-- =============================================================
-- PROJ-20: Zahlungsläufe & Freigabe (Payment Runs)
-- Migration: Erstellt payment_runs, payment_run_events, app_settings
-- Tabellen sowie die payment_run_id Verknüpfung auf payment_orders
-- =============================================================

-- ===============================
-- 1. Status-Enum für Zahlungsläufe
-- ===============================
CREATE TYPE payment_run_status AS ENUM (
  'draft',
  'in_review',
  'visaed',
  'approved',
  'rejected',
  'exported'
);

-- ===============================
-- 2. Event-Typ Enum (Audit-Trail)
-- ===============================
CREATE TYPE payment_run_event_type AS ENUM (
  'created',
  'order_added',
  'order_removed',
  'submitted',
  'visaed',
  'approved',
  'rejected',
  'exported',
  'renamed'
);

-- ===============================
-- 3. payment_runs Tabelle
-- ===============================
CREATE TABLE payment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  execution_date DATE,
  status payment_run_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,

  -- Audit-Snapshot: wer/wann (für schnelle Anzeige ohne Events-Query)
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  submitted_by UUID REFERENCES user_profiles(id),
  submitted_at TIMESTAMPTZ,
  visaed_by UUID REFERENCES user_profiles(id),
  visaed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES user_profiles(id),
  rejected_at TIMESTAMPTZ,

  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_runs IS 'PROJ-20: Zahlungsläufe mit Vieraugenprinzip';

CREATE INDEX idx_payment_runs_status ON payment_runs(status);
CREATE INDEX idx_payment_runs_created_at ON payment_runs(created_at DESC);
CREATE INDEX idx_payment_runs_created_by ON payment_runs(created_by);

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_payment_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_runs_updated_at
  BEFORE UPDATE ON payment_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_runs_updated_at();

-- ===============================
-- 4. payment_run_events Tabelle (Audit-Trail)
-- ===============================
CREATE TABLE payment_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_run_id UUID NOT NULL REFERENCES payment_runs(id) ON DELETE CASCADE,
  event_type payment_run_event_type NOT NULL,
  actor_id UUID NOT NULL REFERENCES user_profiles(id),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_run_events IS 'PROJ-20: Audit-Trail für alle Statusänderungen an Zahlungsläufen';

CREATE INDEX idx_payment_run_events_run ON payment_run_events(payment_run_id, created_at DESC);
CREATE INDEX idx_payment_run_events_actor ON payment_run_events(actor_id);

-- ===============================
-- 5. payment_run_id Spalte auf payment_orders
-- ===============================
ALTER TABLE payment_orders
  ADD COLUMN payment_run_id UUID REFERENCES payment_runs(id) ON DELETE SET NULL;

CREATE INDEX idx_payment_orders_payment_run ON payment_orders(payment_run_id)
  WHERE payment_run_id IS NOT NULL;

-- Business-Regel: ein Auftrag kann nur in einem aktiven Zahlungslauf sein.
-- Diese Regel wird im API-Layer durchgesetzt (status != cancelled check), aber
-- wir können Zahlungsaufträge ohne payment_run_id im Status in_payment_run
-- verhindern:
ALTER TABLE payment_orders
  ADD CONSTRAINT payment_orders_run_status_consistency CHECK (
    (status = 'in_payment_run' AND payment_run_id IS NOT NULL) OR
    (status != 'in_payment_run')
  );

-- ===============================
-- 6. app_settings Tabelle (Key-Value für konfigurierbare Settings)
-- ===============================
CREATE TABLE app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_settings IS 'Generische Key-Value-Tabelle für anwendungsweite Konfiguration';

-- Default-Wert für die Warnschwelle (CHF 100'000 pro Einzelzahlung)
INSERT INTO app_settings (key, value, description) VALUES
  (
    'payment_run.high_amount_threshold',
    '100000'::jsonb,
    'Schwellwert (CHF) ab dem eine Einzelzahlung im Zahlungslauf als auffällig markiert wird'
  );

-- ===============================
-- 7. Row Level Security
-- ===============================

-- payment_runs: nur admin/super_admin
ALTER TABLE payment_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_runs_select"
  ON payment_runs FOR SELECT
  TO authenticated
  USING (is_payment_admin());

CREATE POLICY "payment_runs_insert"
  ON payment_runs FOR INSERT
  TO authenticated
  WITH CHECK (is_payment_admin());

CREATE POLICY "payment_runs_update"
  ON payment_runs FOR UPDATE
  TO authenticated
  USING (is_payment_admin())
  WITH CHECK (is_payment_admin());

-- Kein DELETE-Policy (physisches Löschen nur über den Service möglich)

-- payment_run_events: nur admin/super_admin, INSERT via API
ALTER TABLE payment_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_run_events_select"
  ON payment_run_events FOR SELECT
  TO authenticated
  USING (is_payment_admin());

CREATE POLICY "payment_run_events_insert"
  ON payment_run_events FOR INSERT
  TO authenticated
  WITH CHECK (is_payment_admin());

-- Keine UPDATE/DELETE-Policies — Events sind immutable

-- app_settings: SELECT für alle authentifizierten Benutzer,
-- UPDATE nur für super_admin
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "app_settings_update"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- INSERT in app_settings nur über Migrations (keine Policy)
