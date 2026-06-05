-- =============================================
-- PROFILES TABLE - QUICK FIX FOR 403 ERRORS
-- Run this if you still see 403 on profile inserts
-- =============================================

-- 1) DISABLE RLS TEMPORARILY (quick fix)
-- This allows everything until we get RLS working properly
alter table public.profiles disable row level security;

-- 2) RE-ENABLE WITH PERMISSIVE POLICIES
alter table public.profiles enable row level security;

-- 3) DROP ALL OLD POLICIES (clean slate)
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists "Users can manage own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Allow anonymous profiles" on public.profiles;

-- 4) CREATE SUPER PERMISSIVE POLICIES (fixes signup/login)
-- Allow ANYONE to create a profile (for signup flow)
create policy "Anyone can insert profile"
on public.profiles
for insert
with check (true);

-- Allow authenticated users to see their own profile
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Allow authenticated users to update their own profile
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 5) VERIFY IT WORKED
select
  count(*) as profiles_count,
  policyname,
  cmd as operation
from pg_policies 
where tablename = 'profiles'
group by policyname, cmd
order by cmd, policyname;
