# 🔧 Manual Setup Steps for Maintenance System

## Step 1: Create Database Tables

1. **Go to your Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project
   - Go to SQL Editor

2. **Run this SQL script** (copy and paste):

```sql
-- 1. Maintenance Plans Table
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  price_multiplier DECIMAL(4,3) NOT NULL,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Project Maintenance Records Table  
CREATE TABLE IF NOT EXISTS project_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'active', 'expired', 'suspended')),
  
  -- Free maintenance period
  free_start_date TIMESTAMP WITH TIME ZONE,
  free_end_date TIMESTAMP WITH TIME ZONE,
  free_days_total INTEGER DEFAULT 90,
  
  -- Paid maintenance period  
  paid_start_date TIMESTAMP WITH TIME ZONE,
  paid_end_date TIMESTAMP WITH TIME ZONE,
  paid_days_total INTEGER DEFAULT 0,
  
  -- Combined validity (free + paid)
  total_validity_end TIMESTAMP WITH TIME ZONE,
  total_days_remaining INTEGER DEFAULT 0,
  
  -- Current active plan
  current_plan_id UUID REFERENCES maintenance_plans(id),
  current_plan_name VARCHAR(50),
  
  -- Tracking
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_payment_due TIMESTAMP WITH TIME ZONE,
  total_amount_paid DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Maintenance Payments History
CREATE TABLE IF NOT EXISTS maintenance_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_maintenance_id UUID REFERENCES project_maintenance(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  plan_id UUID REFERENCES maintenance_plans(id),
  plan_name VARCHAR(50) NOT NULL,
  plan_duration_months INTEGER NOT NULL,
  plan_duration_days INTEGER NOT NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  
  validity_before_payment TIMESTAMP WITH TIME ZONE,
  validity_after_payment TIMESTAMP WITH TIME ZONE,
  days_added INTEGER NOT NULL,
  
  status VARCHAR(20) DEFAULT 'completed',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert Default Plans
INSERT INTO maintenance_plans (name, slug, description, duration_months, base_price, price_multiplier, features) VALUES
('Monthly', 'monthly', 'Monthly maintenance plan', 1, 800, 0.080, '["Bug fixes", "Email support", "Updates", "Monitoring"]'),
('Quarterly', 'quarterly', 'Quarterly maintenance plan', 3, 2000, 0.200, '["Everything in Monthly", "Priority support", "Enhancements", "Backups"]'),
('Yearly', 'yearly', 'Yearly maintenance plan', 12, 7000, 0.700, '["Everything in Quarterly", "Dedicated manager", "Custom development", "Analytics"]')
ON CONFLICT (slug) DO NOTHING;
```

## Step 2: Test Current System

1. **Check the Projects Page**
   - You should now see maintenance dropdown for completed projects
   - It should show "31 days left" (since the fallback shows 31 days)

2. **Test Maintenance Payment**
   - Click on a maintenance plan in the dropdown
   - Make a test payment
   - The system should extend validity (31 + 30 = 61 days for monthly)

## Step 3: What's Fixed

✅ **Dropdown Always Visible**: Maintenance plans dropdown is now always visible for completed projects
✅ **Cumulative Validity**: Payment extends existing validity (doesn't replace it)  
✅ **Database Ready**: When tables are created, system will use real data
✅ **Fallback Data**: Works without database tables for testing

## Step 4: How Cumulative Logic Works

### Current Status: 31 days left
### User pays Monthly (30 days):
- Previous validity: 31 days from now
- New validity: 31 + 30 = 61 days from now
- System adds to existing validity

### User pays Quarterly (90 days) later:
- Previous validity: 61 days from now  
- New validity: 61 + 90 = 151 days from now
- Always cumulative, never removes existing time

## Step 5: After Creating Tables

Once you create the database tables:

1. **Visit Projects Page**: System will detect real maintenance records
2. **Automatic Setup**: Completed projects will get 90-day free maintenance
3. **Real Payments**: Payments will update database with cumulative validity
4. **Admin Tracking**: Admin can see all maintenance status and payments

## Current Implementation Status

✅ Maintenance dropdown always visible
✅ Cumulative validity calculation logic  
✅ Database schema ready
✅ Payment integration working
✅ Admin tracking prepared
⏳ Awaiting database table creation