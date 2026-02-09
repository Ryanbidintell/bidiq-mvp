-- Migration 005: Beta Feedback Widget
-- Created: February 5, 2026
-- Purpose: Collect structured feedback from beta testers

-- Create beta_feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_company TEXT,

    -- Feedback content
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'ux', 'general')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    page_location TEXT, -- Which page/feature they were using

    -- Rating fields
    ease_of_use INTEGER CHECK (ease_of_use BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    would_recommend BOOLEAN,

    -- Context data
    user_agent TEXT,
    screen_resolution TEXT,
    project_context JSONB, -- Optional: context about what they were analyzing

    -- Status tracking
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON beta_feedback(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_beta_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beta_feedback_updated_at
    BEFORE UPDATE ON beta_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_beta_feedback_updated_at();

-- Add RLS policies
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON beta_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
    ON beta_feedback FOR SELECT
    USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE beta_feedback IS 'Stores feedback from beta testers';
COMMENT ON COLUMN beta_feedback.feedback_type IS 'Category: bug, feature request, UX issue, or general';
COMMENT ON COLUMN beta_feedback.page_location IS 'Which page/feature they were using when submitting feedback';
COMMENT ON COLUMN beta_feedback.project_context IS 'Optional context about the project they were analyzing';
