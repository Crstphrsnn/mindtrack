-- MindTrack registration Privacy Notice acknowledgment: server-timestamped audit.
-- Does not alter existing auth/profile triggers or existing user accounts.
-- Captures the signup metadata from new auth.users INSERT only.
-- Existing accounts are intentionally not backfilled or treated as having consented.
BEGIN;

CREATE TABLE IF NOT EXISTS public.registration_privacy_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'signup'
);
ALTER TABLE public.registration_privacy_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registration_privacy_consents FROM PUBLIC, anon, authenticated;
-- No direct client reads or writes. Only trusted administrative access may audit.

CREATE OR REPLACE FUNCTION public.mindtrack_capture_registration_privacy_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_version text;
BEGIN
  IF NEW.raw_user_meta_data->>'privacyConsentAccepted' = 'true' THEN
    v_version := nullif(btrim(NEW.raw_user_meta_data->>'privacyConsentVersion'), '');
    IF v_version IS NOT NULL AND length(v_version) <= 32 THEN
      INSERT INTO public.registration_privacy_consents (user_id, notice_version)
      VALUES (NEW.id, v_version)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS mindtrack_registration_privacy_consent ON auth.users;
CREATE TRIGGER mindtrack_registration_privacy_consent
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.mindtrack_capture_registration_privacy_consent();

REVOKE ALL ON FUNCTION public.mindtrack_capture_registration_privacy_consent() FROM PUBLIC, anon, authenticated;
COMMIT;
