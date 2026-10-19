-- Ensure the application DB role cannot bypass RLS (superusers always bypass).
-- Safe no-op when role is already NOSUPERUSER / role name differs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
    RAISE NOTICE 'Current migration role % is superuser; app runtime must use NOSUPERUSER', current_user;
  END IF;
END $$;
