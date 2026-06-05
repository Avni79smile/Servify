-- =============================================
-- CAREER APPLICATIONS - FINAL FIX
-- Run this after 01-fix-rls-policies.sql
-- =============================================

-- 1) CREATE TABLE WITH CORRECT STRUCTURE
-- =============================================
create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  phone text not null,
  city text not null,
  gender text,
  service_id uuid references public.services(id) on delete set null,
  service_slug text,
  service_title text,
  experience_years integer not null default 0,
  profile_photo_url text,
  why_join text not null default '',
  status text not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2) ADD MISSING COLUMNS SAFELY
-- =============================================
alter table public.career_applications
  add column if not exists service_slug text,
  add column if not exists service_title text;

-- Make service_id optional
alter table public.career_applications
  alter column service_id drop not null;


-- 3) ENABLE ROW LEVEL SECURITY
-- =============================================
alter table public.career_applications enable row level security;


-- 4) DROP ALL OLD CONFLICTING POLICIES
-- =============================================
drop policy if exists career_applications_owner_rw on public.career_applications;
drop policy if exists career_applications_admin_read on public.career_applications;
drop policy if exists career_applications_select_own on public.career_applications;
drop policy if exists "Users can view own applications" on public.career_applications;
drop policy if exists "Admin can view all applications" on public.career_applications;
drop policy if exists "Users can insert own applications" on public.career_applications;
drop policy if exists "Users can update own applications" on public.career_applications;
drop policy if exists "Users can delete own applications" on public.career_applications;
drop policy if exists career_applications_insert_own on public.career_applications;
drop policy if exists career_applications_delete_own_or_admin on public.career_applications;
drop policy if exists career_applications_select_own_or_admin on public.career_applications;
drop policy if exists career_applications_update_admin on public.career_applications;


-- 5) CREATE CLEAN, SIMPLE POLICIES
-- =============================================

-- INSERT: Users can only insert their own applications
create policy "career_insert_own"
on public.career_applications
for insert
to authenticated
with check (auth.uid() = user_id);

-- SELECT: Users see own + Admin sees all
create policy "career_select_own_or_admin"
on public.career_applications
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);

-- UPDATE: Users update own, Admin updates any
create policy "career_update_own_or_admin"
on public.career_applications
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);

-- DELETE: Users delete own, Admin deletes any
create policy "career_delete_own_or_admin"
on public.career_applications
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);
