-- Migration: Add notification-to-booking relationship and booking details tracking
-- Date: 2026-04-13
-- Purpose: Support booking notifications with OTP details, payment method sync, and subscription persistence

-- Create notifications table if it doesn't exist (separate from app_notifications for cleaner structure)
create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'general',
  read boolean not null default false,
  created_at timestamptz not null default now(),
  related_booking_id text,
  booking_details jsonb,
  mongo_alt_1 jsonb,
  mongo_alt_2 jsonb,
  mongo_alt_3 jsonb
);

-- Create notification_actions table for storing action buttons/links
create table if not exists public.notification_actions (
  id uuid primary key default gen_random_uuid(),
  notification_id text not null references public.notifications(id) on delete cascade,
  label text not null,
  action_type text not null default 'open_url',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Add missing columns to bookings table if they don't exist
alter table if exists public.bookings
  add column if not exists payment_method text default 'upi',
  add column if not exists payment_status text default 'advance_paid',
  add column if not exists payable_total numeric default 0,
  add column if not exists advance_payable numeric default 0,
  add column if not exists due_after_service numeric default 0;

-- Add missing columns to user_subscriptions for 30-day persistence
alter table if exists public.user_subscriptions
  add column if not exists cancelled_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists pause_until timestamptz;

-- Enable RLS on notifications table
alter table if exists public.notifications enable row level security;
alter table if exists public.notification_actions enable row level security;

-- Create RLS policies for notifications table
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_owner_rw'
  ) then
    create policy notifications_owner_rw on public.notifications
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Create RLS policies for notification_actions table
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_actions' and policyname = 'notification_actions_owner_rw'
  ) then
    create policy notification_actions_owner_rw on public.notification_actions
      for all to authenticated
      using (
        exists (
          select 1 from public.notifications n
          where n.id = notification_id and n.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.notifications n
          where n.id = notification_id and n.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Create indexes for better query performance
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_related_booking_id on public.notifications(related_booking_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notification_actions_notification_id on public.notification_actions(notification_id);
create index if not exists idx_bookings_payment_method on public.bookings(payment_method);
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id, status);

