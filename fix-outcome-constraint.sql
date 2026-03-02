-- Fix outcome_data constraint to match actual JS field names
-- The JS saves: howHigh, daysSince, amount, margin
-- The old constraint checked for: how_high, days_since_submission, final_amount, margin_percent

CREATE OR REPLACE FUNCTION validate_outcome_data(data JSONB, outcome_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Won outcome requires: amount (or final_amount) + margin (or margin_percent)
    IF outcome_type = 'won' THEN
        RETURN (data ? 'amount' OR data ? 'final_amount')
           AND (data ? 'margin' OR data ? 'margin_percent');
    END IF;

    -- Lost outcome requires: howHigh (or how_high)
    IF outcome_type = 'lost' THEN
        RETURN data ? 'howHigh' OR data ? 'how_high';
    END IF;

    -- Ghosted outcome requires: daysSince (or days_since_submission)
    IF outcome_type = 'ghost' THEN
        RETURN data ? 'daysSince' OR data ? 'days_since_submission';
    END IF;

    -- Declined doesn't require outcome_data
    IF outcome_type = 'declined' THEN
        RETURN TRUE;
    END IF;

    -- Pending doesn't require validation
    IF outcome_type = 'pending' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
