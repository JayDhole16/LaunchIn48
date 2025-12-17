-- =============================================
-- Add Missing Columns to project_maintenance Table
-- =============================================

-- First, let's check if the table exists and see its current structure
SELECT 'Current project_maintenance table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add the missing columns if they don't exist
DO $$ 
BEGIN
    -- Add base_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'base_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN base_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added base_amount column to project_maintenance';
    ELSE
        RAISE NOTICE 'base_amount column already exists in project_maintenance';
    END IF;

    -- Add maintenance_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_maintenance' 
        AND column_name = 'maintenance_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE project_maintenance ADD COLUMN maintenance_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added maintenance_amount column to project_maintenance';
    ELSE
        RAISE NOTICE 'maintenance_amount column already exists in project_maintenance';
    END IF;
END $$;

-- Verify the columns were added
SELECT 'Updated project_maintenance table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Update any existing records to calculate proper amounts
UPDATE project_maintenance 
SET 
    base_amount = COALESCE(
        (SELECT total_amount FROM projects WHERE projects.id = project_maintenance.project_id), 
        0
    ),
    maintenance_amount = COALESCE(
        (SELECT 
            projects.total_amount * maintenance_plans.price_multiplier 
         FROM projects, maintenance_plans 
         WHERE projects.id = project_maintenance.project_id 
         AND maintenance_plans.id = project_maintenance.maintenance_plan_id
        ), 
        0
    )
WHERE base_amount = 0 OR maintenance_amount = 0;

SELECT 'Schema migration completed successfully!' as result;