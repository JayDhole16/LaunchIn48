-- =============================================
-- Diagnose Current Schema and Create Migration
-- =============================================

-- First, let's see what tables exist
SELECT 'EXISTING MAINTENANCE TABLES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%maintenance%'
ORDER BY table_name;

-- Check the current structure of project_maintenance table
SELECT 'CURRENT project_maintenance STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if maintenance_plans exists and has data
SELECT 'MAINTENANCE PLANS DATA:' as info;
SELECT COUNT(*) as plan_count FROM maintenance_plans;
SELECT * FROM maintenance_plans LIMIT 5;

-- Check what columns are missing from project_maintenance
SELECT 'MISSING COLUMNS CHECK:' as info;

-- List of required columns
WITH required_columns (column_name) AS (
    VALUES 
    ('id'),
    ('project_id'),
    ('maintenance_plan_id'),
    ('start_date'),
    ('end_date'),
    ('next_payment_due'),
    ('status'),
    ('base_amount'),
    ('maintenance_amount'),
    ('created_at'),
    ('updated_at')
)
SELECT 
    rc.column_name,
    CASE 
        WHEN ic.column_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM required_columns rc
LEFT JOIN information_schema.columns ic 
    ON ic.column_name = rc.column_name 
    AND ic.table_name = 'project_maintenance' 
    AND ic.table_schema = 'public'
ORDER BY rc.column_name;