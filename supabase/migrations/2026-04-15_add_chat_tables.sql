-- ========================================
-- BOOKING CHATS TABLE (Service Provider & Customer)
-- ========================================
create table if not exists public.booking_chats (
  id text primary key,
  booking_id text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  message_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_chats enable row level security;
drop policy if exists "Allow all booking_chats" on public.booking_chats;
create policy "Allow all booking_chats" on public.booking_chats for all using (true) with check (true);

create index if not exists idx_booking_chats_booking_id on public.booking_chats(booking_id);
create index if not exists idx_booking_chats_sender_id on public.booking_chats(sender_id);
create index if not exists idx_booking_chats_created_at on public.booking_chats(created_at desc);

-- ========================================
-- CAREER CHATS TABLE (Admin & Applicant)
-- ========================================
create table if not exists public.career_chats (
  id text primary key,
  application_id uuid not null references public.career_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  message_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_chats enable row level security;
drop policy if exists "Allow all career_chats" on public.career_chats;
create policy "Allow all career_chats" on public.career_chats for all using (true) with check (true);

create index if not exists idx_career_chats_application_id on public.career_chats(application_id);
create index if not exists idx_career_chats_sender_id on public.career_chats(sender_id);
create index if not exists idx_career_chats_created_at on public.career_chats(created_at desc);

-- ========================================
-- VERIFY TABLES EXIST
-- ========================================
-- select table_name from information_schema.tables where table_schema = 'public' and table_name in ('booking_chats', 'career_chats');
