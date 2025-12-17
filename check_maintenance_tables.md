# Check Maintenance Tables Status

## Run this in Supabase SQL Editor to verify table setup:

```sql
-- 1. Check if maintenance_plans table exists and has data
SELECT COUNT(*) as plan_count FROM maintenance_plans;
SELECT * FROM maintenance_plans ORDER BY duration_months;

-- 2. Check if project_maintenance table exists  
SELECT COUNT(*) as maintenance_count FROM project_maintenance;
SELECT * FROM project_maintenance ORDER BY created_at DESC LIMIT 5;

-- 3. Check if maintenance_payments table exists
SELECT COUNT(*) as payments_count FROM maintenance_payments;  
SELECT * FROM maintenance_payments ORDER BY created_at DESC LIMIT 5;

-- 4. Check table schemas
\d maintenance_plans
\d project_maintenance  
\d maintenance_payments
```

## Expected Results:

1. **maintenance_plans** should have 3 records (Monthly, Quarterly, Yearly)
2. **project_maintenance** should exist (may be empty initially)
3. **maintenance_payments** should exist (may be empty initially)

## If tables are missing, run the migration script:

Execute `simple_maintenance_fix.sql` in Supabase SQL Editor to create the missing tables and default data.