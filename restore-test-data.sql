-- Restore Test Data for ryan@fsikc.com
-- Run this in Supabase SQL Editor

-- First, let's get your actual user_id from auth
-- You'll need to replace USER_ID_HERE with your actual user_id

-- For user: ryan@fsikc.com
-- User ID: d1989508-1d5e-4494-b3f8-d2899665d8b3

-- 1. Create user settings (if not exists)
INSERT INTO user_settings (
    user_id,
    company_type,
    city,
    state,
    search_radius,
    location_matters,
    trades,
    client_types,
    risk_tolerance,
    capacity,
    ai_advisor_name,
    ai_advisor_tone,
    weights,
    decision_time,
    default_stars,
    onboarding_completed
) VALUES (
    'd1989508-1d5e-4494-b3f8-d2899665d8b3',
    'subcontractor',
    'Kansas City',
    'MO',
    100,
    true,
    ARRAY['23', '26', '27', '28'],
    ARRAY['gcs'],
    'medium',
    'steady',
    'Sam',
    'supportive',
    '{"location": 25, "keywords": 30, "gc": 25, "trade": 20}'::jsonb,
    'normal',
    3,
    true
) ON CONFLICT (user_id) DO UPDATE SET
    company_type = EXCLUDED.company_type,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    onboarding_completed = EXCLUDED.onboarding_completed;

-- 2. Add sample GCs
INSERT INTO general_contractors (user_id, name, rating, bids, wins, client_type) VALUES
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'JE Dunn Construction', 5, 15, 12, 'gc'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'McCarthy Building Companies', 4, 10, 7, 'gc'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'Clayco', 5, 8, 7, 'gc'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'Turner Construction', 4, 12, 9, 'gc'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'Crossland Construction', 3, 6, 3, 'gc')
ON CONFLICT (user_id, name) DO NOTHING;

-- 3. Add sample keywords
INSERT INTO keywords (user_id, keyword, type) VALUES
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'hospital', 'good'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'medical', 'good'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'data center', 'good'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'office building', 'good'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'asbestos', 'risk'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'fast-track', 'risk'),
    ('d1989508-1d5e-4494-b3f8-d2899665d8b3', 'prevailing wage', 'risk')
ON CONFLICT DO NOTHING;

-- 4. Add a sample project (minimal fields only)
INSERT INTO projects (
    user_id,
    extracted_data,
    scores,
    outcome
) VALUES (
    'd1989508-1d5e-4494-b3f8-d2899665d8b3',
    '{
        "project_name": "Medical Office Building Renovation",
        "location": "Kansas City, MO",
        "city": "Kansas City",
        "state": "MO",
        "bid_date": "2026-03-15",
        "project_value": "$2.5M",
        "scope_summary": "Complete electrical renovation of 3-story medical office building including new panels, lighting, and data infrastructure.",
        "general_contractor": "JE Dunn Construction",
        "gcs": ["JE Dunn Construction"],
        "files": ["Sample Medical Office Building.pdf"]
    }'::jsonb,
    '{
        "final": 85,
        "recommendation": "GO",
        "components": {
            "location": {"score": 95, "reason": "Very close - minimal travel costs"},
            "keywords": {"score": 85, "reason": "Good match - medical keyword found"},
            "gc": {"score": 90, "reason": "Strong relationship - 5★ rating, 80% win rate"},
            "trade": {"score": 90, "reason": "Matches your trades"}
        }
    }'::jsonb,
    'won'
)
ON CONFLICT DO NOTHING;

-- Verify data was inserted
SELECT 'User Settings:' as table_name, COUNT(*) as count FROM user_settings WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
UNION ALL
SELECT 'GCs:', COUNT(*) FROM general_contractors WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
UNION ALL
SELECT 'Keywords:', COUNT(*) FROM keywords WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'
UNION ALL
SELECT 'Projects:', COUNT(*) FROM projects WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3';
