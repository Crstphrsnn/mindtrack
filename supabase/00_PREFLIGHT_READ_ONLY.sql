-- Read-only checks. Run FIRST in Supabase SQL Editor and inspect results.
SELECT 'referrals_columns' AS check_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'referrals'
  AND column_name IN ('id','referrer_id','assigned_counselor_id')
ORDER BY column_name;

SELECT 'submit_referral_rpc' AS check_name, p.oid::regprocedure::text AS signature,
       pg_get_function_result(p.oid) AS return_type
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'mindtrack_submit_referral';

SELECT 'profiles_columns' AS check_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('id','name','role')
ORDER BY column_name;
