-- Check current project_maintenance table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if user_id column has NOT NULL constraint
SELECT 
    column_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND column_name = 'user_id'
    AND table_schema = 'public';