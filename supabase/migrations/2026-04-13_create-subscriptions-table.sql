-- ========================================
-- CREATE USER SUBSCRIPTIONS TABLE
-- ========================================

-- User subscriptions table (for 30-day persistence)
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

-- Create index for faster queries
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(status);
create index if not exists idx_user_subscriptions_created_at on public.user_subscriptions(created_at desc);

-- Enable RLS
alter table public.user_subscriptions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_insert_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_update_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_delete_own" on public.user_subscriptions;
drop policy if exists "Users can read own subscriptions" on public.user_subscriptions;
drop policy if exists "Users can create own subscriptions" on public.user_subscriptions;
drop policy if exists "Users can update own subscriptions" on public.user_subscriptions;
drop policy if exists "Users can delete own subscriptions" on public.user_subscriptions;

-- Create new policies
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

-- Create trigger to update updated_at
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

-- Test query
select id, user_id, plan_id, status, created_at from public.user_subscriptions order by created_at desc limit 5;
