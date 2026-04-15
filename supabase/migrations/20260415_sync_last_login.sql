-- =============================================================
-- Fix: user_profiles.last_login_at wird nie aktualisiert
--
-- Supabase protokolliert den letzten Login in auth.users.last_sign_in_at,
-- aber user_profiles.last_login_at wurde nie synchronisiert.
--
-- Diese Migration:
--   1. Legt einen Trigger auf auth.users an, der last_sign_in_at nach
--      user_profiles.last_login_at spiegelt.
--   2. Fuehrt einen einmaligen Backfill aus, damit bereits erfolgte
--      Logins in der Verwaltung sichtbar sind.
-- =============================================================

-- ===============================
-- 1. Backfill fuer bestehende Logins
-- ===============================
UPDATE user_profiles up
SET last_login_at = au.last_sign_in_at
FROM auth.users au
WHERE up.id = au.id
  AND au.last_sign_in_at IS NOT NULL
  AND (up.last_login_at IS NULL OR up.last_login_at <> au.last_sign_in_at);

-- ===============================
-- 2. Trigger-Funktion
-- ===============================
CREATE OR REPLACE FUNCTION public.sync_user_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nur schreiben, wenn sich last_sign_in_at geaendert hat
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at
     AND NEW.last_sign_in_at IS NOT NULL THEN
    UPDATE public.user_profiles
    SET last_login_at = NEW.last_sign_in_at,
        updated_at    = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_user_last_login() IS
  'Spiegelt auth.users.last_sign_in_at nach user_profiles.last_login_at.';

-- ===============================
-- 3. Trigger auf auth.users
-- ===============================
DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_last_login();
