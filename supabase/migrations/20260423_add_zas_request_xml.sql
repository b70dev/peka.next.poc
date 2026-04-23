-- =============================================================
-- PROJ-23: ZAS Lebensnachweis — persistiere generiertes Anfrage-XML
--
-- Bisher hat die POST-Route nur den Dateinamen gespeichert; das
-- eigentliche eCH-0086-XML wurde bei Bedarf neu erzeugt. Mit der
-- Implementierung des echten Generators speichern wir jetzt das
-- generierte XML, damit:
--   * der Download-Endpunkt deterministisch dieselbe Datei liefert
--   * das spätere Audit nachvollziehbar bleibt (genau dieses XML
--     wurde an ZAS geschickt)
--   * keine teure Re-Generierung pro Download nötig ist
--
-- Die Spalte ist nullable, damit bestehende Lauf-Datensätze aus
-- der Vor-Migrations-Phase nicht invalidiert werden. Die Download-
-- Route prüft auf NULL und liefert in dem Fall einen 422-Fehler
-- mit klarer Anweisung (Lauf erneut erstellen).
-- =============================================================

ALTER TABLE zas_life_verification_runs
  ADD COLUMN IF NOT EXISTS request_xml TEXT;

COMMENT ON COLUMN zas_life_verification_runs.request_xml IS
  'PROJ-23: Vollständiges generiertes eCH-0086-Anfrage-XML. Nullable für Alt-Datensätze vor Generator-Implementierung.';
