-- ========================================
-- COMPLETE SERVIFY DATABASE FIX + SUBSCRIPTIONS
-- ========================================

create extension if not exists citext;
create extension if not exists pgcrypto;

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

-- ========================================
-- FIX PROFILES TABLE
-- ========================================
alter table public.profiles disable row level security;
alter table public.profiles enable row level security;

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists "Users can manage own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Allow anonymous profiles" on public.profiles;
drop policy if exists "Anyone can insert profile" on public.profiles;

create policy "Anyone can insert profile" on public.profiles for insert with check (true);
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ========================================
-- FIX PROVIDERS TABLE
-- ========================================
alter table public.providers enable row level security;
drop policy if exists "Anyone can view providers" on public.providers;
drop policy if exists providers_select_all on public.providers;
drop policy if exists providers_insert_auth on public.providers;
drop policy if exists "Authenticated users can insert providers" on public.providers;

create policy "Anyone can view providers" on public.providers for select using (true);
create policy "Authenticated users can insert providers" on public.providers for insert to authenticated with check (true);

-- ========================================
-- FIX BOOKINGS TABLE
-- ========================================
alter table public.bookings enable row level security;
drop policy if exists bookings_insert_own on public.bookings;
drop policy if exists bookings_select_own on public.bookings;
drop policy if exists "Users can insert own bookings" on public.bookings;
drop policy if exists "Users can view own bookings" on public.bookings;

create policy "Users can insert own bookings" on public.bookings for insert to authenticated with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Users can view own bookings" on public.bookings for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ========================================
-- CREATE CAREER APPLICATIONS TABLE
-- ========================================
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

alter table public.career_applications enable row level security;
drop policy if exists "career_insert_own" on public.career_applications;
drop policy if exists "career_select_own_or_admin" on public.career_applications;
drop policy if exists "career_update_own_or_admin" on public.career_applications;
drop policy if exists "career_delete_own" on public.career_applications;
drop policy if exists "Users can insert own applications" on public.career_applications;
drop policy if exists "Users can view own applications" on public.career_applications;
drop policy if exists "Admin can view all applications" on public.career_applications;
drop policy if exists "Users can update own applications" on public.career_applications;
drop policy if exists "Users can delete own applications" on public.career_applications;

create policy "career_insert_own" on public.career_applications for insert to authenticated with check (auth.uid() = user_id);
create policy "career_select_own_or_admin" on public.career_applications for select to authenticated using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "career_update_own_or_admin" on public.career_applications for update to authenticated using (auth.uid() = user_id or public.is_admin(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "career_delete_own" on public.career_applications for delete to authenticated using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ========================================
-- CREATE BOOKING CHATS TABLE
-- ========================================
create table if not exists public.booking_chats (
  id text primary key default gen_random_uuid()::text,
  booking_id uuid not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  message_text text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_chats enable row level security;
create policy "Allow all" on public.booking_chats for all using (true) with check (true);

-- ========================================
-- CREATE CAREER CHATS TABLE
-- ========================================
create table if not exists public.career_chats (
  id text primary key default gen_random_uuid()::text,
  application_id uuid not null references public.career_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  message_text text not null,
  created_at timestamptz not null default now()
);

alter table public.career_chats enable row level security;
create policy "Allow all" on public.career_chats for all using (true) with check (true);

-- ========================================
-- CREATE USER SUBSCRIPTIONS TABLE (FIX FOR PLANS NOT SAVING)
-- ========================================
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null default 'free',
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'pending')),
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  paused_at timestamptz,
  pause_until timestamptz,
  household_members jsonb default '[]'::jsonb,
  credit_wallet jsonb default '{"monthlyCredits": 0, "rolloverCredits": 0, "balance": 0, "topupCredits": 0}'::jsonb,
  savings jsonb default '{"total": 0, "thisMonth": 0, "byBooking": []}'::jsonb,
  usage jsonb default '{"bookedWithCredits": 0, "priorityBookingsUsed": 0}'::jsonb,
  recommended_plan_id text default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for user_subscriptions
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(status);
create index if not exists idx_user_subscriptions_created_at on public.user_subscriptions(created_at desc);

-- Enable RLS on user_subscriptions
alter table public.user_subscriptions enable row level security;

drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_insert_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_update_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_delete_own" on public.user_subscriptions;
drop policy if exists "Users can read own subscriptions" on public.user_subscriptions;
drop policy if exists "Users can create own subscriptions" on public.user_subscriptions;
drop policy if exists "Users can update own subscriptions" on public.user_subscriptions;
drop policy if exists "Users can delete own subscriptions" on public.user_subscriptions;

create policy "Users can read own subscriptions" 
  on public.user_subscriptions for select 
  to authenticated 
  using (auth.uid() = user_id);

create policy "Users can create own subscriptions" 
  on public.user_subscriptions for insert 
  to authenticated 
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions" 
  on public.user_subscriptions for update 
  to authenticated 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions" 
  on public.user_subscriptions for delete 
  to authenticated 
  using (auth.uid() = user_id);

-- Create trigger for auto-updating timestamp
create or replace function public.update_user_subscriptions_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_user_subscriptions_timestamp on public.user_subscriptions;
create trigger update_user_subscriptions_timestamp
  before update on public.user_subscriptions
  for each row
  execute function public.update_user_subscriptions_timestamp();

-- ========================================
-- CREATE AUTH TRIGGER FOR PROFILES
-- ========================================
drop function if exists public.handle_new_user() cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.user_metadata->>'full_name', new.user_metadata->>'name', new.email),
    new.email,
    'user'
  )
  on conflict (id) do update
  set 
    full_name = coalesce(new.user_metadata->>'full_name', new.user_metadata->>'name', new.email),
    email = new.email;
  
  return new;
exception when others then
  raise warning 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Check if all tables exist
select table_name from information_schema.tables 
where table_schema = 'public' 
and table_name in ('user_subscriptions', 'career_applications', 'booking_chats', 'career_chats', 'profiles', 'bookings')
order by table_name;

-- Check user_subscriptions structure
select column_name, data_type, is_nullable 
from information_schema.columns 
where table_name = 'user_subscriptions' 
order by ordinal_position;

-- Test read subscriptions
select id, user_id, plan_id, status, created_at 
from public.user_subscriptions 
order by created_at desc 
limit 5;
