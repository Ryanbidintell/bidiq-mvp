-- Verify test checkout was processed successfully
-- Run this immediately after completing test checkout

-- 1. Check your user_revenue record (should show active subscription)
SELECT
    plan_name,
    mrr,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    updated_at
FROM user_revenue
WHERE user_id = auth.uid();

-- 2. Check subscription_history (should show new subscription event)
SELECT
    event_type,
    old_plan,
    new_plan,
    new_mrr,
    stripe_event_id,
    created_at
FROM subscription_history
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verify feature gating would allow access
-- (status should be 'active' or 'trialing')
SELECT
    CASE
        WHEN status IN ('active', 'trialing') THEN '✅ Access Granted'
        ELSE '❌ Access Denied'
    END as feature_gate_status,
    status,
    plan_name,
    mrr
FROM user_revenue
WHERE user_id = auth.uid();
