-- =============================================
-- Verify Maintenance System Database Schema
-- =============================================

-- Check if maintenance_plans table exists with correct structure
SELECT 
    'maintenance_plans' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance_plans' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if project_maintenance table exists with correct structure
SELECT 
    'project_maintenance' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if maintenance_payments table exists with correct structure  
SELECT 
    'maintenance_payments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance_payments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if maintenance_notifications table exists with correct structure
SELECT 
    'maintenance_notifications' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance_notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if maintenance plans are populated
SELECT 'Maintenance Plans Data' as section;
SELECT * FROM maintenance_plans;

-- Check for any existing maintenance records
SELECT 'Project Maintenance Records Count' as section;
SELECT COUNT(*) as total_records FROM project_maintenance;

-- Check for any existing maintenance payments
SELECT 'Maintenance Payments Count' as section;
SELECT COUNT(*) as total_payments FROM maintenance_payments;

-- Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('maintenance_plans', 'project_maintenance', 'maintenance_payments', 'maintenance_notifications');

-- Check if required functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'calculate_maintenance_start_date',
        'calculate_maintenance_amount',
        'create_project_maintenance',
        'extend_maintenance_period',
        'check_maintenance_due_notifications',
        'update_updated_at_column'
    );