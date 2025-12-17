-- =============================================
-- Maintenance System Updates
-- Fix cumulative period calculation and 90-day free maintenance
-- Also adds missing fields and handles schema issues
-- =============================================

-- Add slug field to maintenance_plans if it doesn't exist
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS slug VARCHAR(50);

-- Add is_active field to maintenance_plans if it doesn't exist
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update slug values based on name (for backward compatibility)
UPDATE maintenance_plans SET slug = LOWER(name) WHERE slug IS NULL;

-- Make sure we have the basic maintenance plans
INSERT INTO maintenance_plans (name, slug, duration_months, base_price, price_multiplier, description, is_active) 
VALUES 
('Monthly', 'monthly', 1, 800, 0.08, 'Monthly maintenance plan with basic support', true),
('Quarterly', 'quarterly', 3, 2000, 0.20, 'Quarterly maintenance plan with enhanced support', true),
('Yearly', 'yearly', 12, 7000, 0.70, 'Yearly maintenance plan with premium support and priority updates', true)
ON CONFLICT (name) DO UPDATE SET 
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;

-- Update function to calculate maintenance start date (90 days after project completion)
CREATE OR REPLACE FUNCTION calculate_maintenance_start_date(project_completed_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN project_completed_date + INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Update function to create maintenance record with 90 days
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
    
    -- Calculate dates (90 days free period)
    start_date := CURRENT_DATE + INTERVAL '90 days';
    end_date := start_date + (plan_info.duration_months || ' months')::INTERVAL;
    
    -- Calculate maintenance amount
    maintenance_amount := calculate_maintenance_amount(p_base_amount, plan_info.price_multiplier);
    
    -- Insert maintenance record
    INSERT INTO project_maintenance (
        project_id,
        maintenance_plan_id,
        start_date,
        end_date,
        next_payment_due,
        base_amount,
        maintenance_amount
    ) VALUES (
        p_project_id,
        p_maintenance_plan_id,
        start_date,
        end_date,
        start_date,
        p_base_amount,
        maintenance_amount
    ) RETURNING id INTO maintenance_id;
    
    RETURN maintenance_id;
END;
$$ LANGUAGE plpgsql;

-- Update function to extend maintenance period after payment (CUMULATIVE)
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
    new_next_payment_due DATE;
BEGIN
    -- Get current maintenance info
    SELECT * INTO maintenance_info FROM project_maintenance WHERE id = p_project_maintenance_id;
    
    -- Get payment info to determine the plan for this specific payment
    SELECT * INTO payment_info FROM maintenance_payments WHERE id = p_payment_id;
    
    -- Get plan info from maintenance_plans table by name (more reliable)
    SELECT * INTO plan_info FROM maintenance_plans WHERE name = payment_info.plan_name LIMIT 1;
    
    -- If plan not found, try with the maintenance record's plan_id as fallback
    IF plan_info IS NULL THEN
        SELECT * INTO plan_info FROM maintenance_plans WHERE id = maintenance_info.maintenance_plan_id;
    END IF;
    
    -- CUMULATIVE LOGIC: Add to current validity if still active, or start from now if expired
    IF maintenance_info.end_date >= CURRENT_DATE THEN
        -- Still active, extend from current end date
        extension_start_date := maintenance_info.end_date;
    ELSE
        -- Expired, start extension from today
        extension_start_date := CURRENT_DATE;
    END IF;
    
    -- Calculate new dates by adding plan duration to the extension start date
    new_end_date := extension_start_date + (plan_info.duration_months || ' months')::INTERVAL;
    new_next_payment_due := new_end_date; -- Next payment due at the end of this period
    
    -- Update maintenance record with cumulative extension
    UPDATE project_maintenance 
    SET 
        end_date = new_end_date,
        next_payment_due = new_next_payment_due,
        status = 'active', -- Ensure status is active after payment
        updated_at = now()
    WHERE id = p_project_maintenance_id;
    
    -- Log the extension for debugging
    RAISE NOTICE 'Maintenance extended: Project Maintenance ID: %, Previous End: %, New End: %, Extension Start: %', 
        p_project_maintenance_id, maintenance_info.end_date, new_end_date, extension_start_date;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_maintenance_start_date(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_project_maintenance(UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_maintenance_period(UUID, UUID) TO authenticated;