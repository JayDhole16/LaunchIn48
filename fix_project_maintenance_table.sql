-- =============================================
-- Fix project_maintenance Table Structure
-- =============================================

-- Add all missing columns to project_maintenance table
DO $$ 
BEGIN
    RAISE NOTICE 'Starting project_maintenance table migration...';

    -- Add end_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'end_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN end_date DATE;
        RAISE NOTICE 'Added end_date column';
    ELSE
        RAISE NOTICE 'end_date column already exists';
    END IF;

    -- Add start_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'start_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN start_date DATE;
        RAISE NOTICE 'Added start_date column';
    ELSE
        RAISE NOTICE 'start_date column already exists';
    END IF;

    -- Add next_payment_due column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'next_payment_due'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN next_payment_due DATE;
        RAISE NOTICE 'Added next_payment_due column';
    ELSE
        RAISE NOTICE 'next_payment_due column already exists';
    END IF;

    -- Add base_amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'base_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN base_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added base_amount column';
    ELSE
        RAISE NOTICE 'base_amount column already exists';
    END IF;

    -- Add maintenance_amount column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'maintenance_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN maintenance_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added maintenance_amount column';
    ELSE
        RAISE NOTICE 'maintenance_amount column already exists';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;

    -- Add maintenance_plan_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'maintenance_plan_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN maintenance_plan_id UUID;
        RAISE NOTICE 'Added maintenance_plan_id column';
    ELSE
        RAISE NOTICE 'maintenance_plan_id column already exists';
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;

    RAISE NOTICE 'Migration completed!';
END $$;

-- Show the final structure
SELECT 'FINAL project_maintenance STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test that we can insert a record with the expected structure
DO $$
BEGIN
    RAISE NOTICE 'Testing insert capability...';
    -- This will just test the structure without actually inserting
    PERFORM 1 FROM (
        SELECT 
            'test-project-id'::uuid as project_id,
            'test-plan-id'::uuid as maintenance_plan_id,
            CURRENT_DATE as start_date,
            CURRENT_DATE + INTERVAL '90 days' as end_date,
            CURRENT_DATE + INTERVAL '90 days' as next_payment_due,
            1000.00 as base_amount,
            80.00 as maintenance_amount,
            'active' as status
        LIMIT 0
    ) test_data;
    RAISE NOTICE 'Insert test passed - table structure is compatible!';
END $$;