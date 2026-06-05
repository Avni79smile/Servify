-- Check actual columns in user_subscriptions table
\d public.user_subscriptions

-- List all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;
