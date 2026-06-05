-- DIAGNOSTIC: Check if RLS policies were applied

-- 1. Check if policies exist
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- Expected result: 4 rows
-- - subscribe_delete
-- - subscribe_insert
-- - subscribe_select  
-- - subscribe_update

-- If you see ZERO rows or old policy names, the SQL fix did NOT apply.
-- If you see 4 rows with "subscribe_" names, the fix WAS applied.

-- 2. Check table structure
\d public.user_subscriptions

-- 3. Try a test insert
INSERT INTO public.user_subscriptions (user_id, plan_id, status)
VALUES (auth.uid(), 'family-basic', 'active')
RETURNING id, user_id, plan_id, status;
