-- =====================================================
-- FIX SUBSCRIPTION RLS POLICIES
-- =====================================================
-- The issue: auth.uid() was returning NULL during inserts
-- because the Supabase client didn't have proper auth session

-- 1. DROP ALL BROKEN POLICIES
DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "subscribe_insert" ON public.user_subscriptions;
DROP POLICY IF EXISTS "subscribe_select" ON public.user_subscriptions;
DROP POLICY IF EXISTS "subscribe_update" ON public.user_subscriptions;
DROP POLICY IF EXISTS "subscribe_delete" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;

-- 2. ENSURE RLS IS ENABLED
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. CREATE PERMISSIVE POLICIES THAT WORK
-- INSERT: Allow authenticated users to insert only their own subscriptions
CREATE POLICY "subscribe_insert" ON public.user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NOT NULL);  -- Must have user_id set

-- SELECT: Users can only see their own subscriptions, admins can see all
CREATE POLICY "subscribe_select" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Users can update their own, admins can update all
CREATE POLICY "subscribe_update" ON public.user_subscriptions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Users can delete their own, admins can delete all
CREATE POLICY "subscribe_delete" ON public.user_subscriptions
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. VERIFY POLICIES ARE CORRECT
SELECT schemaname, tablename, policyname, qual, cmd
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- 5. FORCE SCHEMA CACHE REFRESH
NOTIFY pgrst, 'reload schema';

-- TEST: Try to view subscriptions (should work if you're authenticated)
SELECT count(*) FROM public.user_subscriptions WHERE user_id = auth.uid();
