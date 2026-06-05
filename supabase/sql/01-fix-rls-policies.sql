-- =============================================
-- SUPABASE RLS & TABLE FIXES
-- Run these in Supabase SQL Editor in order
-- =============================================

-- 1) CREATE ADMIN HELPER FUNCTION
-- =============================================
create extension if not exists citext;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and coalesce(lower(p.role::text), 'user') = 'admin'
  );
$$;


-- 2) FIX PROFILES TABLE RLS
-- =============================================
alter table public.profiles enable row level security;

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

-- Allow users to insert/update their own profile
create policy "Users can manage own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Allow service to insert anonymous profiles
create policy "Allow anonymous profiles"
on public.profiles
for insert
with check (true);


-- 3) FIX PROVIDERS TABLE RLS
-- =============================================
alter table public.providers enable row level security;

drop policy if exists providers_select_all on public.providers;
drop policy if exists providers_insert_auth on public.providers;

create policy "Anyone can view providers"
on public.providers
for select
using (true);

create policy "Authenticated users can insert providers"
on public.providers
for insert
to authenticated
with check (true);


-- 4) FIX BOOKINGS TABLE RLS
-- =============================================
alter table public.bookings enable row level security;

drop policy if exists bookings_insert_own on public.bookings;
drop policy if exists bookings_select_own on public.bookings;
drop policy if exists bookings_update_own on public.bookings;

-- Make provider_id nullable
alter table public.bookings
alter column provider_id drop not null;

-- Users can insert their own bookings
create policy "Users can insert own bookings"
on public.bookings
for insert
to authenticated
with check (user_id = auth.uid());

-- Users can view their own bookings + Admin views all
create policy "Users can view own bookings"
on public.bookings
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- Users can update own bookings
create policy "Users can update own bookings"
on public.bookings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- 5) ADD MISSING COLUMNS TO BOOKINGS
-- =============================================
alter table public.bookings
add column if not exists service_title text,
add column if not exists provider_name text,
add column if not exists provider_email text;
