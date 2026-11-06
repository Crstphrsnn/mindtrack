-- MindTrack: weekly vacant time for students (Asia/Manila school schedule).
-- Run in Supabase SQL Editor before deploying the matching frontend.
-- Adds a NEW table and scoped RPCs; does not touch student profiles,
-- counselor assignments, counseling requests, or referral records.
BEGIN;

CREATE TABLE IF NOT EXISTS public.mindtrack_student_vacant_slots (
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 5),
  time_slot text NOT NULL CHECK (time_slot IN (
    '8:00 AM','9:00 AM','10:00 AM','11:00 AM',
    '1:00 PM','2:00 PM','3:00 PM','4:00 PM'
  )),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, weekday, time_slot)
);

CREATE INDEX IF NOT EXISTS mindtrack_student_vacant_slots_student_idx
  ON public.mindtrack_student_vacant_slots (student_id);

ALTER TABLE public.mindtrack_student_vacant_slots ENABLE ROW LEVEL SECURITY;
-- All reads and writes go through authorized RPCs; no direct table grants.
REVOKE ALL ON public.mindtrack_student_vacant_slots FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mindtrack_list_student_vacant_slots(p_student_id uuid)
RETURNS TABLE (weekday smallint, time_slot text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    v_caller = p_student_id
    OR EXISTS (
      SELECT 1 FROM public.counselor_assignments ca
      JOIN public.profiles p ON p.id = v_caller
      WHERE ca.student_id = p_student_id
        AND ca.counselor_id = v_caller
        AND ca.active IS TRUE
        AND p.role = 'counselor'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_caller AND p.role = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view student vacant time' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT s.weekday, s.time_slot
    FROM public.mindtrack_student_vacant_slots s
    WHERE s.student_id = p_student_id
    ORDER BY s.weekday, s.time_slot;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mindtrack_set_my_vacant_slots(p_slots jsonb)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_caller uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_caller IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_caller AND p.role = 'student'
  ) THEN
    RAISE EXCEPTION 'Only students may edit their vacant time' USING ERRCODE = '42501';
  END IF;

  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array'
     OR jsonb_array_length(p_slots) > 40 THEN
    RAISE EXCEPTION 'Expected an array of up to 40 weekly time slots';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_slots) AS x(weekday integer, time_slot text)
    WHERE x.weekday IS NULL OR x.weekday NOT BETWEEN 1 AND 5
      OR x.time_slot IS NULL OR x.time_slot NOT IN (
        '8:00 AM','9:00 AM','10:00 AM','11:00 AM',
        '1:00 PM','2:00 PM','3:00 PM','4:00 PM'
      )
  ) THEN
    RAISE EXCEPTION 'Invalid weekday or vacant time slot';
  END IF;

  -- Atomic replacement: any error rolls back the deletion as well.
  DELETE FROM public.mindtrack_student_vacant_slots s WHERE s.student_id = v_caller;
  INSERT INTO public.mindtrack_student_vacant_slots (student_id, weekday, time_slot)
  SELECT v_caller, x.weekday::smallint, x.time_slot
  FROM jsonb_to_recordset(p_slots) AS x(weekday integer, time_slot text);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.mindtrack_list_student_vacant_slots(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mindtrack_set_my_vacant_slots(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mindtrack_list_student_vacant_slots(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mindtrack_set_my_vacant_slots(jsonb) TO authenticated;
COMMIT;

-- Verify migration (should return both function names):
SELECT proname FROM pg_proc
WHERE oid IN (
  'public.mindtrack_list_student_vacant_slots(uuid)'::regprocedure,
  'public.mindtrack_set_my_vacant_slots(jsonb)'::regprocedure
);
