# 🔧 Fix Database Schema - Step by Step Guide

## Problem
The maintenance payment system is failing with this error:
```
Could not find the 'base_amount' column of 'project_maintenance' in the schema cache
```

This means the database schema is not properly set up.

## Solution Steps

### Step 1: Check Current Database State

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run this query to check if maintenance tables exist:

```sql
-- Copy and paste check_maintenance_tables_exist.sql content here
```

**Expected Results:**
- If tables don't exist: You need to create them from scratch
- If tables exist but missing columns: You need to add the missing columns

### Step 2A: If Tables Don't Exist (Complete Setup)

Run the complete schema script in Supabase SQL Editor:

```sql
-- Copy and paste the entire content of maintenance_system_schema.sql
```

### Step 2B: If Tables Exist But Missing Columns (Add Missing Columns)

Run this migration script in Supabase SQL Editor:

```sql
-- Copy and paste add_missing_maintenance_columns.sql content here
```

### Step 3: Verify Schema Is Correct

After running the schema scripts, verify everything is set up correctly:

```sql
-- Copy and paste verify_maintenance_schema.sql content here
```

**Expected Results:**
- ✅ All tables should exist: `maintenance_plans`, `project_maintenance`, `maintenance_payments`
- ✅ `project_maintenance` should have `base_amount` and `maintenance_amount` columns
- ✅ `maintenance_plans` should have 3 default plans (Monthly, Quarterly, Yearly)

### Step 4: Test the Payment Flow

1. Go back to your project dashboard
2. Try creating a maintenance payment
3. The error should be resolved

## Quick Fix Commands

### For Supabase SQL Editor:

**1. Check tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%maintenance%';
```

**2. Add missing columns (if tables exist):**
```sql
ALTER TABLE project_maintenance ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE project_maintenance ADD COLUMN IF NOT EXISTS maintenance_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
```

**3. Verify columns exist:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'project_maintenance' 
AND column_name IN ('base_amount', 'maintenance_amount');
```

## Troubleshooting

### Issue: Tables don't exist at all
**Solution:** Run the complete `maintenance_system_schema.sql` script

### Issue: Tables exist but columns are missing
**Solution:** Run the `add_missing_maintenance_columns.sql` script

### Issue: Permission denied
**Solution:** Make sure you're running the queries as the database owner in Supabase

### Issue: Still getting errors after adding columns
**Solution:** 
1. Check if RLS policies are properly set up
2. Verify the maintenance_plans table has data
3. Restart your Next.js development server to clear any caches

## Files to Use

1. **`check_maintenance_tables_exist.sql`** - Check current state
2. **`maintenance_system_schema.sql`** - Complete schema setup
3. **`add_missing_maintenance_columns.sql`** - Add missing columns only
4. **`verify_maintenance_schema.sql`** - Verify everything is correct

## Success Indicators

✅ **Database Schema Fixed When:**
- No more "column not found" errors in API logs
- Maintenance payments can be created successfully
- Dashboard loads maintenance data from database
- No 500 errors during payment creation

## Next Steps After Fix

1. Test the complete maintenance payment flow
2. Verify payment verification works correctly
3. Check dashboard shows real maintenance data (not fallback)
4. Remove any temporary workarounds or debug logs

---

**💡 Pro Tip:** Always run the check queries first to understand the current state before applying any migrations!