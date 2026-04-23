-- =============================================================
-- PROJ-24: Seed account_type für Rentenkonto
--
-- Bisher existierte kein account_type, dessen Code von der
-- Rentner-Liste (/rentner) erfasst wird. Diese Migration fügt
-- den Typ "rente" hinzu, damit neu erfasste Rentenkonten
-- korrekt klassifiziert werden können und auf der Rentner-
-- Liste erscheinen.
--
-- Der Rentner-Filter im Frontend und in den API-Routen prüft
-- case-insensitive auf Codes die mit 'RENT' beginnen bzw. auf
-- 'PENSION' / 'PENS' — 'rente' erfüllt die RENT-Regel.
-- =============================================================

INSERT INTO account_types (code, name_de, name_en, name_fr, description, sort_order, is_system)
VALUES (
  'rente',
  'Rentenkonto',
  'Pension Account',
  'Compte de rente',
  'Aktives Rentenbezugskonto — monatliche Rente an pensionierte Versicherte.',
  100,
  true
)
ON CONFLICT (code) DO NOTHING;
