-- ========================================
-- FIX CAREER APPLICATIONS RLS POLICIES
-- ========================================

-- Drop all old policies
drop policy if exists "career_insert_own" on public.career_applications;
drop policy if exists "career_select_own_or_admin" on public.career_applications;
drop policy if exists "career_update_own_or_admin" on public.career_applications;
drop policy if exists "career_delete_own" on public.career_applications;
drop policy if exists "Users can insert own applications" on public.career_applications;
drop policy if exists "Users can view own applications" on public.career_applications;
drop policy if exists "Admin can view all applications" on public.career_applications;
drop policy if exists "Users can update own applications" on public.career_applications;
drop policy if exists "Users can delete own applications" on public.career_applications;

-- Create NEW explicit policies that actually work
create policy "career_insert_authenticated" 
  on public.career_applications 
  for insert 
  to authenticated 
  with check (auth.uid() = user_id);

create policy "career_select_own_or_admin" 
  on public.career_applications 
  for select 
  to authenticated 
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "career_update_own_or_admin" 
  on public.career_applications 
  for update 
  to authenticated 
  using (auth.uid() = user_id or public.is_admin(auth.uid())) 
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "career_delete_own_or_admin" 
  on public.career_applications 
  for delete 
  to authenticated 
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Verify policies are in place
select schemaname, tablename, policyname, permissive, qual, with_check
from pg_policies
where tablename = 'career_applications'
order by policyname;

-- Test: Insert a sample application
-- Replace UUID with an actual auth user ID from your system
-- insert into public.career_applications (
--   user_id,
--   user_name,
--   user_email,
--   phone,
--   city,
--   why_join,
--   status
-- ) values (
--   'YOUR_USER_ID_HERE',
--   'Test Name',
--   'test@example.com',
--   '9876543210',
--   'Mumbai',
--   'I want to join',
--   'pending'
-- );
