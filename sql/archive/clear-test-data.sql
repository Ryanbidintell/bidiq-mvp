-- Clear Test Data (Keep Schema, Remove Fake Data)
-- Run this in Supabase SQL Editor
-- Safe: Only removes test data for ryan@fsikc.com

-- Delete test project
DELETE FROM projects
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
  AND extracted_data->>'project_name' = 'Medical Office Building Renovation';

-- Delete test GCs (only the ones from restore script)
DELETE FROM general_contractors
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
  AND name IN ('JE Dunn Construction', 'McCarthy Building Companies', 'Clayco', 'Turner Construction', 'Crossland Construction');

-- Delete test keywords
DELETE FROM keywords
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
  AND keyword IN ('hospital', 'medical', 'data center', 'office building', 'asbestos', 'fast-track', 'prevailing wage');

-- Verify cleanup
SELECT
    'Projects' as table_name,
    COUNT(*) as count
FROM projects
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
UNION ALL
SELECT
    'GCs',
    COUNT(*)
FROM general_contractors
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
UNION ALL
SELECT
    'Keywords',
    COUNT(*)
FROM keywords
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3';
