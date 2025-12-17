-- Add the missing plan_duration_months column
ALTER TABLE maintenance_payments 
ADD COLUMN IF NOT EXISTS plan_duration_months INTEGER DEFAULT 1;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'maintenance_payments' 
AND column_name = 'plan_duration_months';