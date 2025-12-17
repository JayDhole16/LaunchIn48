-- =============================================
-- Maintenance System Database Schema
-- =============================================

-- Create maintenance plans table
CREATE TABLE IF NOT EXISTS maintenance_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    duration_months INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- Used to calculate actual price based on project cost
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default maintenance plans
INSERT INTO maintenance_plans (name, duration_months, base_price, price_multiplier, description) VALUES
('Monthly', 1, 800, 0.08, 'Monthly maintenance plan with basic support'),
('Quarterly', 3, 2000, 0.20, 'Quarterly maintenance plan with enhanced support'),
('Yearly', 12, 7000, 0.70, 'Yearly maintenance plan with premium support and priority updates');

-- Create project maintenance table
CREATE TABLE IF NOT EXISTS project_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    maintenance_plan_id UUID NOT NULL REFERENCES maintenance_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    next_payment_due DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),
    base_amount DECIMAL(10,2) NOT NULL, -- Base project amount used for calculation
    maintenance_amount DECIMAL(10,2) NOT NULL, -- Calculated maintenance amount
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create maintenance payments table
CREATE TABLE IF NOT EXISTS maintenance_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_maintenance_id UUID NOT NULL REFERENCES project_maintenance(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    plan_name VARCHAR(50) NOT NULL, -- Store plan name for historical record
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create maintenance notifications table
CREATE TABLE IF NOT EXISTS maintenance_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_maintenance_id UUID NOT NULL REFERENCES project_maintenance(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('reminder', 'overdue', 'suspended')),
    message TEXT NOT NULL,
    days_remaining INTEGER,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_maintenance_project_id ON project_maintenance(project_id);
CREATE INDEX IF NOT EXISTS idx_project_maintenance_status ON project_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_project_maintenance_next_payment_due ON project_maintenance(next_payment_due);
CREATE INDEX IF NOT EXISTS idx_maintenance_payments_project_maintenance_id ON maintenance_payments(project_maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_payments_user_id ON maintenance_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_payments_status ON maintenance_payments(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_notifications_user_id ON maintenance_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_notifications_sent_at ON maintenance_notifications(sent_at);

-- Add RLS policies for maintenance tables
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_notifications ENABLE ROW LEVEL SECURITY;

-- Maintenance plans - readable by all authenticated users, writable by admins only
CREATE POLICY "maintenance_plans_select" ON maintenance_plans FOR SELECT USING (true);
CREATE POLICY "maintenance_plans_admin" ON maintenance_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

-- Project maintenance - users can only see their own records
CREATE POLICY "project_maintenance_select" ON project_maintenance FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_maintenance.project_id AND projects.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

CREATE POLICY "project_maintenance_insert" ON project_maintenance FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_maintenance.project_id AND projects.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

CREATE POLICY "project_maintenance_update" ON project_maintenance FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_maintenance.project_id AND projects.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

-- Maintenance payments - users can see their own payments, admins can see all
CREATE POLICY "maintenance_payments_select" ON maintenance_payments FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

CREATE POLICY "maintenance_payments_insert" ON maintenance_payments FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

CREATE POLICY "maintenance_payments_update" ON maintenance_payments FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

-- Maintenance notifications - users can see their own notifications, admins can see all
CREATE POLICY "maintenance_notifications_select" ON maintenance_notifications FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

CREATE POLICY "maintenance_notifications_insert" ON maintenance_notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "maintenance_notifications_update" ON maintenance_notifications FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.email = 'jaydhole.739@gmail.com')
);

-- Create functions for maintenance management

-- Function to calculate maintenance start date (90 days after project completion)
CREATE OR REPLACE FUNCTION calculate_maintenance_start_date(project_completed_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN project_completed_date + INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate maintenance amount based on project cost and plan
CREATE OR REPLACE FUNCTION calculate_maintenance_amount(base_amount DECIMAL, plan_multiplier DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(base_amount * plan_multiplier, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to create maintenance record after project completion
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
    
    -- Calculate dates
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

-- Function to extend maintenance period after payment (CUMULATIVE)
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
END;
$$ LANGUAGE plpgsql;

-- Function to check and create notifications for due maintenance payments
CREATE OR REPLACE FUNCTION check_maintenance_due_notifications()
RETURNS INTEGER AS $$
DECLARE
    maintenance_record RECORD;
    notification_count INTEGER := 0;
    days_remaining INTEGER;
    message_text TEXT;
BEGIN
    FOR maintenance_record IN
        SELECT pm.*, p.title, p.user_id, u.full_name, u.email
        FROM project_maintenance pm
        JOIN projects p ON pm.project_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE pm.status = 'active'
        AND pm.next_payment_due <= CURRENT_DATE + INTERVAL '5 days'
        AND NOT EXISTS (
            SELECT 1 FROM maintenance_notifications mn 
            WHERE mn.project_maintenance_id = pm.id 
            AND mn.notification_type = 'reminder'
            AND mn.sent_at::DATE = CURRENT_DATE
        )
    LOOP
        days_remaining := maintenance_record.next_payment_due - CURRENT_DATE;
        
        IF days_remaining <= 0 THEN
            message_text := format('Your maintenance payment for project "%s" is overdue. Please pay ₹%s immediately to continue service.',
                maintenance_record.title, maintenance_record.maintenance_amount);
        ELSE
            message_text := format('Your maintenance payment for project "%s" is due in %s days. Amount: ₹%s',
                maintenance_record.title, days_remaining, maintenance_record.maintenance_amount);
        END IF;
        
        INSERT INTO maintenance_notifications (
            project_maintenance_id,
            user_id,
            notification_type,
            message,
            days_remaining
        ) VALUES (
            maintenance_record.id,
            maintenance_record.user_id,
            CASE WHEN days_remaining <= 0 THEN 'overdue' ELSE 'reminder' END,
            message_text,
            days_remaining
        );
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maintenance_plans_updated_at BEFORE UPDATE ON maintenance_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_maintenance_updated_at BEFORE UPDATE ON project_maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;