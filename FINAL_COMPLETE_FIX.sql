-- =============================================
-- FINAL COMPLETE FIX - ALL MISSING COLUMNS
-- =============================================

-- Add ALL possible missing columns to maintenance_payments table
ALTER TABLE maintenance_payments 
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS payment_period_start DATE,
ADD COLUMN IF NOT EXISTS payment_period_end DATE,
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_duration_months INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS plan_duration_days INTEGER DEFAULT 30;

-- Show ALL columns to verify everything exists
SELECT 'COMPLETE maintenance_payments TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'maintenance_payments' 
    AND table_schema = 'public'
ORDER BY column_name;

-- Count total columns
SELECT 'TOTAL COLUMNS:' as info, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'maintenance_payments' 
    AND table_schema = 'public';

SELECT '🎉 FINAL COMPLETE FIX APPLIED!' as result;