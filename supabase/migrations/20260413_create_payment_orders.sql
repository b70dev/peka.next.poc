-- =============================================================
-- PROJ-19: Zahlungsaufträge (Payment Orders)
-- Migration: Erstellt payment_orders Tabelle mit RLS-Policies
-- =============================================================

-- Status-Enum erstellen
CREATE TYPE payment_order_status AS ENUM (
  'draft',
  'in_payment_run',
  'approved',
  'exported',
  'cancelled'
);

-- Tabelle erstellen
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name VARCHAR(140) NOT NULL,
  iban VARCHAR(34) NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CHF' CHECK (currency = 'CHF'),
  purpose VARCHAR(140) NOT NULL,
  reference_number VARCHAR(35),
  execution_date DATE,
  note TEXT,
  status payment_order_status NOT NULL DEFAULT 'draft',
  insured_person_id UUID,
  employment_id UUID,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  updated_by UUID NOT NULL REFERENCES user_profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kommentar
COMMENT ON TABLE payment_orders IS 'PROJ-19: Zahlungsaufträge für BVG-Auszahlungen';

-- Indexes für häufige Abfragen
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
CREATE INDEX idx_payment_orders_created_at ON payment_orders(created_at DESC);
CREATE INDEX idx_payment_orders_recipient_name ON payment_orders(recipient_name);
CREATE INDEX idx_payment_orders_iban ON payment_orders(iban);
CREATE INDEX idx_payment_orders_created_by ON payment_orders(created_by);

-- Duplikat-Check: Zusammengesetzter Index für IBAN + Zeitraum
CREATE INDEX idx_payment_orders_iban_created ON payment_orders(iban, created_at DESC)
  WHERE status != 'cancelled';

-- updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_payment_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_orders_updated_at();

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Hilfsfunktion: Prüft ob der Benutzer admin oder super_admin ist
-- (Viewer-Rolle wird auf DB-Ebene ausgeschlossen)
CREATE OR REPLACE FUNCTION is_payment_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT: Nur admin/super_admin darf Zahlungsaufträge sehen
CREATE POLICY "payment_orders_select"
  ON payment_orders FOR SELECT
  TO authenticated
  USING (is_payment_admin());

-- INSERT: Nur admin/super_admin darf erstellen
CREATE POLICY "payment_orders_insert"
  ON payment_orders FOR INSERT
  TO authenticated
  WITH CHECK (is_payment_admin());

-- UPDATE: Nur admin/super_admin darf bearbeiten
CREATE POLICY "payment_orders_update"
  ON payment_orders FOR UPDATE
  TO authenticated
  USING (is_payment_admin())
  WITH CHECK (is_payment_admin());

-- DELETE: Kein physisches Löschen (nur Stornierung via Status-Update)
-- Kein DELETE-Policy = DELETE ist für alle blockiert
