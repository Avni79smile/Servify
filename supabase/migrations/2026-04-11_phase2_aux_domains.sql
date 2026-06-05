-- Phase-2: Persist remaining local domains in Supabase.
-- Includes three JSONB unstructured fields (mongo_alt_1..3) for future MongoDB/Atlas alternatives.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.app_notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  title text not null,
  message text not null,
  type text not null default 'general',
  actions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

create table if not exists public.booking_reviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  booking_code text not null,
  professional_ref text,
  service_ref text,
  rating integer not null default 0,
  tags jsonb not null default '[]'::jsonb,
  comment text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

create table if not exists public.app_metrics (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

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
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

create table if not exists public.booking_chats (
  id text primary key,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  booking_code text not null,
  message_text text not null,
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

create table if not exists public.career_chats (
  id text primary key,
  application_id uuid not null references public.career_applications(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  message_text text not null,
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

create table if not exists public.career_notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

create table if not exists public.user_reschedule_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  used_count integer not null default 0,
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

alter table public.user_subscriptions
  add column if not exists household_members jsonb not null default '[]'::jsonb,
  add column if not exists credit_wallet jsonb not null default '{}'::jsonb,
  add column if not exists savings jsonb not null default '{}'::jsonb,
  add column if not exists usage jsonb not null default '{}'::jsonb,
  add column if not exists recommended_plan_id text;

alter table public.bookings
  add column if not exists timeline jsonb not null default '[]'::jsonb,
  add column if not exists lifecycle jsonb not null default '{}'::jsonb,
  add column if not exists dispute jsonb,
  add column if not exists review_submitted boolean not null default false;

alter table public.career_applications
  add column if not exists service_slug text,
  add column if not exists service_title text;

alter table public.career_applications
  alter column service_id drop not null;

alter table if exists public.career_applications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'career_applications' and policyname = 'career_applications_owner_rw'
  ) then
    create policy career_applications_owner_rw on public.career_applications
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'career_applications' and policyname = 'career_applications_admin_read'
  ) then
    create policy career_applications_admin_read on public.career_applications
      for select to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.email, '')) = 'admin@servify.in'
        )
      );
  end if;
end $$;

alter table public.career_notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists user_email text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_read boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists mongo_alt_1 jsonb,
  add column if not exists mongo_alt_2 jsonb,
  add column if not exists mongo_alt_3 jsonb;

alter table if exists public.app_notifications enable row level security;
alter table if exists public.booking_reviews enable row level security;
alter table if exists public.app_metrics enable row level security;
alter table if exists public.booking_chats enable row level security;
alter table if exists public.career_chats enable row level security;
alter table if exists public.career_notifications enable row level security;
alter table if exists public.user_reschedule_usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_notifications' and policyname = 'app_notifications_owner_rw'
  ) then
    create policy app_notifications_owner_rw on public.app_notifications
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_reviews' and policyname = 'booking_reviews_owner_rw'
  ) then
    create policy booking_reviews_owner_rw on public.booking_reviews
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_metrics' and policyname = 'app_metrics_owner_rw'
  ) then
    create policy app_metrics_owner_rw on public.app_metrics
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_chats' and policyname = 'booking_chats_sender_rw'
  ) then
    create policy booking_chats_sender_rw on public.booking_chats
      for all using (auth.uid() = sender_user_id) with check (auth.uid() = sender_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'career_chats' and policyname = 'career_chats_sender_rw'
  ) then
    create policy career_chats_sender_rw on public.career_chats
      for all using (auth.uid() = sender_user_id) with check (auth.uid() = sender_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_reschedule_usage' and policyname = 'user_reschedule_usage_owner_rw'
  ) then
    create policy user_reschedule_usage_owner_rw on public.user_reschedule_usage
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'career_notifications' and policyname = 'career_notifications_owner_rw'
  ) then
    create policy career_notifications_owner_rw on public.career_notifications
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
