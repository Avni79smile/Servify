-- Migration: Fix payment_status enum to support "due_on_delivery" for cash on delivery bookings
-- Date: 2026-04-13
-- Issue: Cash on Delivery bookings fail with "due_on_delivery" enum error

-- Step 1: Create new enum type if it doesn't exist with all payment statuses
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status_enum') then
    create type public.payment_status_enum as enum ('advance_paid', 'fully_paid', 'due_on_delivery', 'partial_paid', 'pending', 'failed');
  end if;
end $$;

-- Step 2: For existing column, change it to accept the new values
-- First, we need to check if payment_status column exists and is enum type
do $$
declare
  col_type text;
begin
  -- Get the current column type
  select data_type into col_type
  from information_schema.columns
  where table_name = 'bookings' and column_name = 'payment_status';
  
  -- If it's a user-defined type (enum), drop constraint and recreate
  if col_type like '%payment_status%' or col_type = 'USER-DEFINED' then
    -- Drop any constraints related to this column
    alter table if exists public.bookings alter column payment_status drop not null;
    
    -- Temporarily convert to text
    alter table public.bookings 
      alter column payment_status type text using payment_status::text;
  end if;
end $$;

-- Step 3: Ensure payment_status column exists and is text type to be flexible
alter table public.bookings
  add column if not exists payment_status text default 'fully_paid';

-- Update any null values
update public.bookings 
  set payment_status = 'fully_paid' 
  where payment_status is null;

-- Step 4: Add constraint if needed (optional, for data validation)
alter table public.bookings
  add constraint payment_status_check check (
    payment_status in ('advance_paid', 'fully_paid', 'due_on_delivery', 'partial_paid', 'pending', 'failed')
  );

-- Add helpful comment
comment on column public.bookings.payment_status is 'Payment status: advance_paid (UPI), fully_paid (confirmed), due_on_delivery (cash payment), partial_paid, pending, or failed';

