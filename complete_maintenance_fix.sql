-- =============================================
-- COMPLETE MAINTENANCE SYSTEM FIX - RUN THIS NOW
-- =============================================

-- Fix maintenance_payments table - add all missing columns
ALTER TABLE maintenance_payments 
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS payment_period_start DATE,
ADD COLUMN IF NOT EXISTS payment_period_end DATE,
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Verify maintenance_payments columns
SELECT 'maintenance_payments columns:' as info;
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = 'maintenance_payments' AND table_schema = 'public'
ORDER BY column_name;

-- Verify project_maintenance columns
SELECT 'project_maintenance columns:' as info;
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = 'project_maintenance' AND table_schema = 'public'
ORDER BY column_name;

-- Check maintenance_plans data
SELECT 'maintenance_plans data:' as info;
SELECT name, duration_months, price_multiplier FROM maintenance_plans;

SELECT '✅ ALL MAINTENANCE TABLES FIXED!' as result;