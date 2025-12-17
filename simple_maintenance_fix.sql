-- =============================================
-- Simple Maintenance System Fixes
-- Avoids complex exception handling
-- =============================================

-- Add missing columns to maintenance_plans
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS slug VARCHAR(50);
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records
UPDATE maintenance_plans SET slug = LOWER(name) WHERE slug IS NULL;
UPDATE maintenance_plans SET is_active = true WHERE is_active IS NULL;

-- Ensure we have the basic maintenance plans
-- Delete any existing plans first to avoid conflicts
DELETE FROM maintenance_plans WHERE name IN ('Monthly', 'Quarterly', 'Yearly');

-- Insert the standard maintenance plans
INSERT INTO maintenance_plans (name, slug, duration_months, base_price, price_multiplier, description, is_active) VALUES
('Monthly', 'monthly', 1, 800, 0.08, 'Monthly maintenance plan with basic support', true),
('Quarterly', 'quarterly', 3, 2000, 0.20, 'Quarterly maintenance plan with enhanced support', true),
('Yearly', 'yearly', 12, 7000, 0.70, 'Yearly maintenance plan with premium support and priority updates', true);

-- Update the extend_maintenance_period function with proper cumulative logic
CREATE OR REPLACE FUNCTION extend_maintenance_period(
    p_project_maintenance_id UUID,
    p_payment_id UUID
)
RETURNS VOID AS $$
DECLARE
    maintenance_info RECORD;
    plan_info RECORD;
    payment_info RECORD;
    extension_start_date DATE;
    new_end_date DATE;
BEGIN
    -- Get current maintenance info
    SELECT * INTO maintenance_info FROM project_maintenance WHERE id = p_project_maintenance_id;
    
    -- Get payment info
    SELECT * INTO payment_info FROM maintenance_payments WHERE id = p_payment_id;
    
    -- Get plan info by name first, then by id as fallback
    SELECT * INTO plan_info FROM maintenance_plans WHERE name = payment_info.plan_name LIMIT 1;
    
    IF plan_info IS NULL THEN
        SELECT * INTO plan_info FROM maintenance_plans WHERE id = maintenance_info.maintenance_plan_id LIMIT 1;
    END IF;
    
    IF plan_info IS NULL THEN
        RAISE EXCEPTION 'Could not find maintenance plan for payment %', p_payment_id;
    END IF;
    
    -- CUMULATIVE LOGIC: Add to current validity if still active, or start from now if expired
    IF maintenance_info.end_date >= CURRENT_DATE THEN
        -- Still active, extend from current end date
        extension_start_date := maintenance_info.end_date;
    ELSE
        -- Expired, start extension from today
        extension_start_date := CURRENT_DATE;
    END IF;
    
    -- Calculate new end date
    new_end_date := extension_start_date + (plan_info.duration_months || ' months')::INTERVAL;
    
    -- Update maintenance record
    UPDATE project_maintenance 
    SET 
        end_date = new_end_date,
        next_payment_due = new_end_date,
        status = 'active',
        updated_at = now()
    WHERE id = p_project_maintenance_id;
    
END;
$$ LANGUAGE plpgsql;

-- Update the create_project_maintenance function to use 90 days
CREATE OR REPLACE FUNCTION create_project_maintenance(
    p_project_id UUID,
    p_maintenance_plan_id UUID,
    p_base_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
    maintenance_id UUID;
    plan_info RECORD;
    start_date DATE;
    end_date DATE;
    maintenance_amount DECIMAL;
BEGIN
    -- Get plan information
    SELECT * INTO plan_info FROM maintenance_plans WHERE id = p_maintenance_plan_id;
    
    IF plan_info IS NULL THEN
        RAISE EXCEPTION 'Maintenance plan not found: %', p_maintenance_plan_id;
    END IF;
    
    -- Calculate dates (90 days free period)
    start_date := CURRENT_DATE + INTERVAL '90 days';
    end_date := start_date + (plan_info.duration_months || ' months')::INTERVAL;
    
    -- Calculate maintenance amount
    maintenance_amount := ROUND(p_base_amount * plan_info.price_multiplier, 2);
    
    -- Insert maintenance record
    INSERT INTO project_maintenance (
        project_id,
        maintenance_plan_id,
        start_date,
        end_date,
        next_payment_due,
        base_amount,
        maintenance_amount,
        status
    ) VALUES (
        p_project_id,
        p_maintenance_plan_id,
        start_date,
        end_date,
        start_date,
        p_base_amount,
        maintenance_amount,
        'active'
    ) RETURNING id INTO maintenance_id;
    
    RETURN maintenance_id;
END;
$$ LANGUAGE plpgsql;

-- Show results
SELECT 'Maintenance system updated successfully!' as status;
SELECT name, slug, duration_months, base_price, price_multiplier, is_active 
FROM maintenance_plans 
ORDER BY duration_months;