-- =============================================================
-- PROJ-22: Versicherten-Merkmale (Attribut-Verwaltung)
-- Migration: Erstellt attribute_types, attribute_values und
-- insured_person_attributes Tabellen inkl. RLS-Policies, Indexes
-- und Seed-Daten.
-- =============================================================

-- ===============================
-- 1. attribute_types (Stammdaten: Merkmals-Arten)
-- ===============================
CREATE TABLE attribute_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE attribute_types IS
  'PROJ-22: Stammdaten - Arten von Merkmalen (z.B. Invaliditätsgrad, Sonderregelung)';

-- Index für Sortierung im Dropdown
CREATE INDEX idx_attribute_types_name ON attribute_types(name);

-- ===============================
-- 2. attribute_values (Stammdaten: Ausprägungen)
-- ===============================
CREATE TABLE attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_type_id UUID NOT NULL REFERENCES attribute_types(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Innerhalb einer Merkmals-Art sind Ausprägungs-Namen eindeutig
  CONSTRAINT attribute_values_unique_name_per_type UNIQUE (attribute_type_id, name)
);

COMMENT ON TABLE attribute_values IS
  'PROJ-22: Stammdaten - Zulässige Ausprägungen pro Merkmals-Art (z.B. 25%, 50%, 100%)';

-- Index für die kaskadierende Dropdown-Abfrage
CREATE INDEX idx_attribute_values_type_id ON attribute_values(attribute_type_id, sort_order);

-- ===============================
-- 3. insured_person_attributes (Daten pro Person)
-- ===============================
CREATE TABLE insured_person_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insured_person_id UUID NOT NULL REFERENCES insured_persons(id) ON DELETE CASCADE,
  attribute_type_id UUID NOT NULL REFERENCES attribute_types(id) ON DELETE RESTRICT,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE RESTRICT,
  note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Duplikat-Schutz: jede Merkmals-Art darf nur einmal pro Person erfasst werden
  CONSTRAINT insured_person_attributes_unique_type UNIQUE (insured_person_id, attribute_type_id)
);

COMMENT ON TABLE insured_person_attributes IS
  'PROJ-22: Erfasste Merkmale pro versicherter Person (1 Merkmals-Art pro Person)';

-- Konsistenz-Check: Die gewählte Ausprägung muss zur gewählten Merkmals-Art gehören.
-- Umsetzung via Trigger (CHECK-Constraints dürfen keine Subqueries enthalten).
CREATE OR REPLACE FUNCTION enforce_attribute_value_matches_type()
RETURNS TRIGGER AS $$
DECLARE
  value_type_id UUID;
BEGIN
  SELECT attribute_type_id INTO value_type_id
  FROM attribute_values
  WHERE id = NEW.attribute_value_id;

  IF value_type_id IS NULL THEN
    RAISE EXCEPTION 'attribute_value_id % does not exist', NEW.attribute_value_id;
  END IF;

  IF value_type_id <> NEW.attribute_type_id THEN
    RAISE EXCEPTION 'attribute_value_id % does not belong to attribute_type_id %',
      NEW.attribute_value_id, NEW.attribute_type_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_insured_person_attributes_value_matches_type
  BEFORE INSERT OR UPDATE ON insured_person_attributes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_attribute_value_matches_type();

-- Indexes für Haupt-Abfragemuster (Merkmale einer Person laden)
CREATE INDEX idx_insured_person_attributes_person
  ON insured_person_attributes(insured_person_id);
CREATE INDEX idx_insured_person_attributes_type
  ON insured_person_attributes(attribute_type_id);

-- updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_insured_person_attributes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_insured_person_attributes_updated_at
  BEFORE UPDATE ON insured_person_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_insured_person_attributes_updated_at();

-- =============================================================
-- 4. Row Level Security
-- =============================================================

-- Hilfsfunktion: aktiv + Rolle >= viewer (alle authentifizierten, aktiven Nutzer)
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('viewer', 'admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hilfsfunktion: aktiv + Rolle >= admin (Schreibzugriff)
CREATE OR REPLACE FUNCTION is_active_admin()
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

-- ---------------------------------
-- attribute_types: Stammdaten
-- ---------------------------------
ALTER TABLE attribute_types ENABLE ROW LEVEL SECURITY;

-- SELECT: alle aktiven authentifizierten Nutzer (auch viewer)
CREATE POLICY "attribute_types_select"
  ON attribute_types FOR SELECT
  TO authenticated
  USING (is_active_user());

-- INSERT/UPDATE/DELETE: nur super_admin (Stammdaten-Pflege)
CREATE POLICY "attribute_types_insert"
  ON attribute_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = 'super_admin'
    )
  );

CREATE POLICY "attribute_types_update"
  ON attribute_types FOR UPDATE
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

CREATE POLICY "attribute_types_delete"
  ON attribute_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- ---------------------------------
-- attribute_values: Stammdaten
-- ---------------------------------
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attribute_values_select"
  ON attribute_values FOR SELECT
  TO authenticated
  USING (is_active_user());

CREATE POLICY "attribute_values_insert"
  ON attribute_values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = 'super_admin'
    )
  );

CREATE POLICY "attribute_values_update"
  ON attribute_values FOR UPDATE
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

CREATE POLICY "attribute_values_delete"
  ON attribute_values FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- ---------------------------------
-- insured_person_attributes: Bewegungsdaten
-- ---------------------------------
ALTER TABLE insured_person_attributes ENABLE ROW LEVEL SECURITY;

-- SELECT: alle aktiven authentifizierten Nutzer (auch viewer, read-only)
CREATE POLICY "insured_person_attributes_select"
  ON insured_person_attributes FOR SELECT
  TO authenticated
  USING (is_active_user());

-- INSERT/UPDATE/DELETE: nur admin/super_admin
CREATE POLICY "insured_person_attributes_insert"
  ON insured_person_attributes FOR INSERT
  TO authenticated
  WITH CHECK (is_active_admin());

CREATE POLICY "insured_person_attributes_update"
  ON insured_person_attributes FOR UPDATE
  TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

CREATE POLICY "insured_person_attributes_delete"
  ON insured_person_attributes FOR DELETE
  TO authenticated
  USING (is_active_admin());

-- =============================================================
-- 5. Seed-Daten: Beispiel-Merkmalsarten und -Ausprägungen
-- =============================================================

-- Merkmals-Art: Invaliditätsgrad
WITH ins_type AS (
  INSERT INTO attribute_types (name)
  VALUES ('Invaliditätsgrad')
  RETURNING id
)
INSERT INTO attribute_values (attribute_type_id, name, sort_order)
SELECT id, val, ord FROM ins_type,
  (VALUES
    ('25%', 1),
    ('50%', 2),
    ('75%', 3),
    ('100%', 4)
  ) AS v(val, ord);

-- Merkmals-Art: Sonderregelung
WITH special_type AS (
  INSERT INTO attribute_types (name)
  VALUES ('Sonderregelung')
  RETURNING id
)
INSERT INTO attribute_values (attribute_type_id, name, sort_order)
SELECT id, val, ord FROM special_type,
  (VALUES
    ('Besitzstand', 1),
    ('Nachversicherung', 2),
    ('Teilinvalidität', 3)
  ) AS v(val, ord);

-- Merkmals-Art: Kontaktpräferenz
WITH contact_type AS (
  INSERT INTO attribute_types (name)
  VALUES ('Kontaktpräferenz')
  RETURNING id
)
INSERT INTO attribute_values (attribute_type_id, name, sort_order)
SELECT id, val, ord FROM contact_type,
  (VALUES
    ('E-Mail', 1),
    ('Post', 2),
    ('Telefon', 3)
  ) AS v(val, ord);
