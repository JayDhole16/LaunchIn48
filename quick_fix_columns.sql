-- =============================================
-- QUICK FIX: Add missing columns immediately
-- =============================================

-- Add all missing columns in one go
ALTER TABLE project_maintenance 
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS next_payment_due DATE,
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS maintenance_plan_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Verify columns were added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'project_maintenance' AND table_schema = 'public'
ORDER BY column_name;