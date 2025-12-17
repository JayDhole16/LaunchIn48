-- =============================================
-- Quick Check: Do Maintenance Tables Exist?
-- =============================================

-- Check if maintenance_plans table exists
SELECT 
    'maintenance_plans' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'maintenance_plans' AND table_schema = 'public'
        ) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- Check if project_maintenance table exists
SELECT 
    'project_maintenance' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'project_maintenance' AND table_schema = 'public'
        ) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- Check if maintenance_payments table exists
SELECT 
    'maintenance_payments' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'maintenance_payments' AND table_schema = 'public'
        ) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- If project_maintenance exists, show its columns
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'project_maintenance' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'project_maintenance table structure:';
        -- The actual column info will be shown in the next query
    ELSE
        RAISE NOTICE 'project_maintenance table does not exist - you need to create it first!';
    END IF;
END $$;

-- Show project_maintenance columns if table exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;