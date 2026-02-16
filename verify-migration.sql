-- Quick verification query
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name IN ('company_name', 'user_name', 'user_email', 'user_position')
ORDER BY column_name;
