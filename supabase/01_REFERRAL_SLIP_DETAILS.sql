-- MindTrack: PSU referral slip details (run in Supabase SQL Editor before deploying the frontend).
-- Does not modify existing referral RPCs, their status workflow, or existing referral rows.
-- Transactional: a failed slip insert rolls back the original referral submission.
-- REVIEW: verify the read-only preflight before running. Backup the database first.
BEGIN;

DO $preflight$
DECLARE
  v_id_type regtype;
BEGIN
  IF to_regclass('public.referrals') IS NULL THEN
    RAISE EXCEPTION 'Missing public.referrals; stop and inspect the actual schema.';
  END IF;
  SELECT a.atttypid::regtype INTO v_id_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.referrals'::regclass AND a.attname = 'id'
    AND a.attnum > 0 AND NOT a.attisdropped;
  IF v_id_type IS DISTINCT FROM 'uuid'::regtype THEN
    RAISE EXCEPTION 'Expected public.referrals.id uuid, found %. No changes made.', v_id_type;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = 'public.referrals'::regclass
      AND a.attname = 'referrer_id' AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Expected public.referrals.referrer_id. Stop and inspect the actual schema.';
  END IF;
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Missing public.profiles; stop and inspect the actual schema.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = 'public.referrals'::regclass
      AND a.attname = 'assigned_counselor_id' AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Expected public.referrals.assigned_counselor_id for counselor slip access. Stop and inspect schema.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'mindtrack_submit_referral'
      AND p.prorettype IN ('uuid'::regtype, 'text'::regtype, 'character varying'::regtype)
      AND p.proargnames @> ARRAY[
        'p_person_name','p_person_type','p_department','p_program',
        'p_contact','p_reason','p_urgency'
      ]::text[]
  ) THEN
    RAISE EXCEPTION 'Existing mindtrack_submit_referral RPC signature/return type differs from the expected service contract. No changes made.';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.referral_slip_details (
  referral_id uuid PRIMARY KEY REFERENCES public.referrals(id) ON DELETE CASCADE,
  slip jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_slip_details_object CHECK (jsonb_typeof(slip) = 'object')
);
ALTER TABLE public.referral_slip_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.referral_slip_details FROM PUBLIC, anon, authenticated;
-- There are deliberately no direct client RLS policies. Access is via scoped RPCs.

CREATE OR REPLACE FUNCTION public.mindtrack_submit_referral_slip(
  p_person_name text,
  p_person_type text,
  p_department text,
  p_program text,
  p_contact text,
  p_reason text,
  p_urgency text,
  p_slip jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_id uuid;
  v_profile public.profiles%ROWTYPE;
  v_age integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_profile.role NOT IN ('teaching', 'non_teaching', 'faculty', 'personnel') THEN
    RAISE EXCEPTION 'Only Teaching and Non-teaching personnel can submit referrals.' USING ERRCODE = '42501';
  END IF;
  IF p_slip IS NULL OR jsonb_typeof(p_slip) <> 'object' THEN
    RAISE EXCEPTION 'Referral slip fields are required.';
  END IF;
  IF length(btrim(coalesce(p_person_name,''))) NOT BETWEEN 2 AND 150 OR
     length(btrim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 5000 THEN
    RAISE EXCEPTION 'Referred name and nature of problem are required.';
  END IF;
  IF length(coalesce(p_slip->>'position','')) NOT BETWEEN 2 AND 120 OR
     lower(regexp_replace(btrim(coalesce(p_slip->>'signatureName','')), '\s+', ' ', 'g')) <> 
     lower(regexp_replace(btrim(coalesce(v_profile.name,'')), '\s+', ' ', 'g')) THEN
    RAISE EXCEPTION 'Typed signature must match the referring account name, and position is required.';
  END IF;
  IF p_person_type = 'Student' AND
     (p_slip->>'yearLevel') NOT IN ('1st Year','2nd Year','3rd Year','4th Year','5th Year','Other') THEN
    RAISE EXCEPTION 'A valid year level is required for a student referral.';
  END IF;
  IF nullif(p_slip->>'age','') IS NOT NULL THEN
    BEGIN
      v_age := (p_slip->>'age')::integer;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Age must be a whole number.';
    END;
    IF v_age < 1 OR v_age > 120 THEN RAISE EXCEPTION 'Age must be between 1 and 120.'; END IF;
  END IF;
  IF length(coalesce(p_slip->>'address','')) > 500 OR
     length(coalesce(p_slip->>'parentGuardian','')) > 150 OR
     length(coalesce(p_slip->>'recommendation','')) > 3000 THEN
    RAISE EXCEPTION 'A referral slip field exceeds its maximum length.';
  END IF;

  -- The existing trusted RPC performs the authoritative staff-role and
  -- college-to-active-counselor validation, and creates the base referral.
  -- Calling it within this function keeps both inserts in one transaction.
  v_id := public.mindtrack_submit_referral(
    p_person_name => p_person_name,
    p_person_type => p_person_type,
    p_department => p_department,
    p_program => p_program,
    p_contact => p_contact,
    p_reason => p_reason,
    p_urgency => p_urgency
  )::uuid;

  IF NOT EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.id = v_id AND r.referrer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'New referral ownership could not be verified.' USING ERRCODE = '42501';
  END IF;

  -- Whitelist fields: clients cannot attach arbitrary private keys to the slip.
  INSERT INTO public.referral_slip_details (referral_id, slip)
  VALUES (v_id, jsonb_build_object(
    'yearLevel', CASE WHEN p_person_type = 'Student' THEN coalesce(p_slip->>'yearLevel','') ELSE '' END,
    'age', v_age,
    'address', btrim(coalesce(p_slip->>'address','')),
    'parentGuardian', CASE WHEN p_person_type = 'Student' THEN btrim(coalesce(p_slip->>'parentGuardian','')) ELSE '' END,
    'natureOfProblem', p_reason,
    'recommendation', btrim(coalesce(p_slip->>'recommendation','')),
    'signatureName', btrim(p_slip->>'signatureName'),
    'position', btrim(p_slip->>'position'),
    'referrerRole', v_profile.role,
    'submittedAt', now()
  ));
  RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mindtrack_get_referral_slip(p_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_slip jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  -- Check ownership, current assigned counselor, or authorized Super Admin.
  -- No direct access to the private counselor-notes table is granted.
  IF NOT EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.id = p_referral_id
      AND (
        r.referrer_id = auth.uid()
        OR (to_jsonb(r)->>'assigned_counselor_id') = auth.uid()::text
        OR EXISTS (SELECT 1 FROM public.profiles p
                   WHERE p.id = auth.uid() AND p.role = 'super_admin')
      )
  ) THEN
    RAISE EXCEPTION 'You do not have access to this referral slip.' USING ERRCODE = '42501';
  END IF;
  SELECT d.slip INTO v_slip FROM public.referral_slip_details d
  WHERE d.referral_id = p_referral_id;
  RETURN v_slip;
END;
$fn$;

REVOKE ALL ON FUNCTION public.mindtrack_submit_referral_slip(text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mindtrack_get_referral_slip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mindtrack_submit_referral_slip(text,text,text,text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mindtrack_get_referral_slip(uuid) TO authenticated;

COMMIT;
