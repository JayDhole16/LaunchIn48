-- =============================================
-- Fix maintenance_payments Table Schema
-- =============================================

-- Add all missing columns to maintenance_payments table
DO $$ 
BEGIN
    RAISE NOTICE 'Starting maintenance_payments table migration...';

    -- Add project_id column if missing (this is the issue we're seeing)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_payments' 
        AND column_name = 'project_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE maintenance_payments ADD COLUMN project_id UUID;
        RAISE NOTICE 'Added project_id column';
    ELSE
        RAISE NOTICE 'project_id column already exists';
    END IF;

    -- Add payment_period_start column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_payments' 
        AND column_name = 'payment_period_start'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE maintenance_payments ADD COLUMN payment_period_start DATE;
        RAISE NOTICE 'Added payment_period_start column';
    ELSE
        RAISE NOTICE 'payment_period_start column already exists';
    END IF;

    -- Add payment_period_end column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_payments' 
        AND column_name = 'payment_period_end'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE maintenance_payments ADD COLUMN payment_period_end DATE;
        RAISE NOTICE 'Added payment_period_end column';
    ELSE
        RAISE NOTICE 'payment_period_end column already exists';
    END IF;

    -- Add razorpay_payment_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_payments' 
        AND column_name = 'razorpay_payment_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE maintenance_payments ADD COLUMN razorpay_payment_id VARCHAR(100);
        RAISE NOTICE 'Added razorpay_payment_id column';
    ELSE
        RAISE NOTICE 'razorpay_payment_id column already exists';
    END IF;

    -- Add paid_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_payments' 
        AND column_name = 'paid_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE maintenance_payments ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added paid_at column';
    ELSE
        RAISE NOTICE 'paid_at column already exists';
    END IF;

    RAISE NOTICE 'Migration completed!';
END $$;

-- Show the final maintenance_payments structure
SELECT 'FINAL maintenance_payments STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'maintenance_payments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also show maintenance_plans structure
SELECT 'maintenance_plans STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance_plans' 
    AND table_schema = 'public'
ORDER BY ordinal_position;