-- =============================================
-- DATABASE HEALTH CHECK
-- Run this after fixing RLS to verify everything
-- =============================================

-- 1) CHECK BOOKINGS TABLE STATUS
-- =============================================
-- Count total bookings
select count(*) as total_bookings from public.bookings;

-- Show latest bookings with key fields
select 
  booking_code,
  user_id,
  service_id,
  service_title,
  provider_id,
  provider_name,
  payment_method,
  status,
  created_at
from public.bookings
order by created_at desc
limit 20;

-- Check for missing required data (should all be 0)
select
  count(*) filter (where service_id is null) as null_service_id,
  count(*) filter (where coalesce(service_title,'') = '') as missing_service_title,
  count(*) filter (where coalesce(provider_name,'') = '') as missing_provider_name
from public.bookings;


-- 2) CHECK SERVICES TABLE STATUS
-- =============================================
select
  count(*) as total_services,
  count(*) filter (where id is null) as null_service_pk,
  count(*) filter (where coalesce(slug,'') = '') as missing_slug
from public.services;


-- 3) CHECK PROVIDERS TABLE STATUS
-- =============================================
select
  count(*) as total_providers,
  count(*) filter (where id is null) as null_provider_pk,
  count(*) filter (where coalesce(email,'') = '') as missing_email
from public.providers;


-- 4) CHECK CAREER APPLICATIONS TABLE STATUS
-- =============================================
select
  count(*) as total_applications,
  count(*) filter (where user_id is null) as null_user_id,
  count(*) filter (where status = 'pending') as pending_applications,
  count(*) filter (where status = 'approved') as approved_applications
from public.career_applications;

-- Show latest applications
select
  id,
  user_name,
  user_email,
  service_title,
  status,
  created_at
from public.career_applications
order by created_at desc
limit 10;


-- 5) CHECK RLS POLICIES
-- =============================================
-- View all policies for career_applications
select
  policyname,
  cmd as operation,
  qual as "using_clause",
  with_check as "check_clause"
from pg_policies 
where tablename = 'career_applications'
order by cmd, policyname;

-- View all policies for bookings
select
  policyname,
  cmd as operation
from pg_policies 
where tablename = 'bookings'
order by cmd, policyname;

-- View all policies for profiles
select
  policyname,
  cmd as operation
from pg_policies 
where tablename = 'profiles'
order by cmd, policyname;


-- 6) CHECK NOTIFICATIONS & SUBSCRIPTIONS
-- =============================================
select count(*) as total_notifications from public.notifications;
select count(*) as total_subscriptions from public.user_subscriptions;


-- 7) SAMPLE USER DATA (optional - replace email)
-- =============================================
-- Check a specific user's profile
select
  id,
  email,
  full_name,
  role,
  created_at
from public.profiles
where lower(email) = 'your-email@example.com'
limit 1;

-- Check that user's career applications
select
  id,
  user_name,
  service_title,
  status,
  created_at
from public.career_applications
where lower(user_email) = 'your-email@example.com'
order by created_at desc;

-- Check that user's bookings
select
  booking_code,
  service_title,
  provider_name,
  status,
  created_at
from public.bookings
where user_id = (
  select id from public.profiles 
  where lower(email) = 'your-email@example.com' 
  limit 1
)
order by created_at desc;
