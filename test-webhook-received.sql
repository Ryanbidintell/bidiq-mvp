-- Check if webhook events are being received and processed
-- Run this after sending a test webhook or completing a test checkout

-- 1. Check recent subscription history events
SELECT
    event_type,
    new_plan,
    new_mrr,
    stripe_event_id,
    created_at
FROM subscription_history
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check user_revenue records (should show updated status/MRR if webhook processed)
SELECT
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan_name,
    mrr,
    status,
    updated_at
FROM user_revenue
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Check for any recent updates (last 5 minutes)
SELECT
    COUNT(*) as recent_webhook_events
FROM subscription_history
WHERE created_at > NOW() - INTERVAL '5 minutes';
