-- Bid Economics: target margin setting
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS target_margin INTEGER DEFAULT 15;
