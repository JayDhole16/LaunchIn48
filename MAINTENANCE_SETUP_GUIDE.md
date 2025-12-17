# 🔧 Business-Ready Maintenance System Setup Guide

## Overview
This system implements **cumulative maintenance validity** where:
- Free maintenance: 90 days from project completion 
- Paid maintenance: Adds to existing validity (90 + 30 = 120 days for monthly)
- Database-backed with admin tracking
- Real-time UI updates

## 📋 Step 1: Create Database Tables

### In Supabase Dashboard, run these SQL commands:

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

-- 3. Maintenance Payments History Table
CREATE TABLE IF NOT EXISTS maintenance_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_maintenance_id UUID REFERENCES project_maintenance(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Plan details at time of payment
  plan_id UUID REFERENCES maintenance_plans(id),
  plan_name VARCHAR(50) NOT NULL,
  plan_duration_months INTEGER NOT NULL,
  plan_duration_days INTEGER NOT NULL,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  
  -- Extension details
  validity_before_payment TIMESTAMP WITH TIME ZONE,
  validity_after_payment TIMESTAMP WITH TIME ZONE,
  days_added INTEGER NOT NULL,
  
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_project_maintenance_project_id ON project_maintenance(project_id);
CREATE INDEX IF NOT EXISTS idx_project_maintenance_user_id ON project_maintenance(user_id);
CREATE INDEX IF NOT EXISTS idx_project_maintenance_status ON project_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_payments_project_id ON maintenance_payments(project_id);

-- 5. Insert Default Maintenance Plans
INSERT INTO maintenance_plans (name, slug, description, duration_months, base_price, price_multiplier, features) VALUES
('Monthly', 'monthly', 'Monthly maintenance plan with basic support', 1, 800, 0.080, '[
  "Bug fixes and security patches",
  "Technical support via email", 
  "Monthly updates",
  "Performance monitoring"
]'),
('Quarterly', 'quarterly', 'Quarterly maintenance plan with enhanced support', 3, 2000, 0.200, '[
  "Everything in Monthly",
  "Priority technical support",
  "Feature enhancements", 
  "Weekly backups",
  "Performance optimization"
]'),
('Yearly', 'yearly', 'Yearly maintenance plan with premium support', 12, 7000, 0.700, '[
  "Everything in Quarterly",
  "Dedicated support manager",
  "Custom feature development",
  "Daily backups", 
  "Advanced analytics",
  "Priority feature requests"
]') 
ON CONFLICT (slug) DO NOTHING;
```

## 🚀 Step 2: Initialize Maintenance for Existing Projects

After creating tables, call:
```
POST http://localhost:3000/api/initialize-maintenance
```

This will:
- Find all completed projects
- Create maintenance records with 90-day free periods
- Set up tracking for each project

## 💰 Step 3: How Cumulative Validity Works

### Example Scenario:
1. **Project completed**: Dec 1, 2025
2. **Free maintenance**: Dec 1 → Mar 1 (90 days)
3. **User pays for Monthly on Feb 15**: 
   - New validity: Mar 1 + 30 days = Mar 31
   - Total validity: 120 days (90 free + 30 paid)
4. **User pays for Quarterly on Mar 20**:
   - New validity: Mar 31 + 90 days = Jun 29  
   - Total validity: 210 days (90 free + 30 monthly + 90 quarterly)

### Database Updates:
- `free_days_total`: Always 90
- `paid_days_total`: Cumulative paid days (30 + 90 = 120)
- `total_validity_end`: Latest end date (Jun 29)
- `total_amount_paid`: Total spent on maintenance

## 👨‍💼 Step 4: Admin Tracking

Admins can see:
- Current validity status for all projects
- Days remaining for each project
- Payment history with plan details
- Total maintenance revenue per project

## 🔄 Step 5: Test the System

1. Create tables in Supabase
2. Initialize maintenance records
3. Make a test maintenance payment
4. Verify validity period increases correctly
5. Check admin can see updated status

## ✅ Features Implemented

- ✅ Cumulative validity periods (never lose existing time)
- ✅ Database persistence with full audit trail
- ✅ Real-time UI updates after payment
- ✅ Admin tracking and reporting
- ✅ Multiple plan support (Monthly/Quarterly/Yearly)
- ✅ Proper payment history tracking
- ✅ Business-ready architecture

## 📊 API Endpoints

- `POST /api/create-maintenance-tables` - Insert maintenance plans
- `POST /api/initialize-maintenance` - Setup maintenance for completed projects  
- `POST /api/verify-payment` - Extends maintenance validity after payment
- `GET /dashboard/projects` - Shows real maintenance status
- `GET /admin/projects` - Admin view with maintenance tracking