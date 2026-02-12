-- Quick query to check what tables exist in your database
-- Run this in Supabase SQL Editor first

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
