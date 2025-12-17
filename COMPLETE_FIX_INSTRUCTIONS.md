# 🚨 COMPLETE FIX INSTRUCTIONS

## Critical Issues Fixed

1. ✅ **Missing `timeline` column** - Removed from insert, added migration script
2. ✅ **Missing `progress` column** - Removed from insert
3. ✅ **Infinite recursion in users policy** - Created fix script with SECURITY DEFINER function
4. ✅ **Payment data not saving** - Fixed verify-payment to save to database

## Step 1: Fix Database Schema Issues

Run these SQL scripts in your Supabase SQL Editor in order:

### 1.1 Fix Infinite Recursion in Users Policy
```sql
-- Copy and paste the contents of scripts/fix-users-policy-recursion.sql
-- OR run this:

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    auth.uid() = id 
    OR 
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    auth.uid() = id 
    OR 
    public.is_admin(auth.uid())
  );

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;
```

### 1.2 Add Missing Columns (Optional but Recommended)
```sql
-- Add timeline column if you want to store project timelines
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS timeline TEXT;

-- Add progress column if you want to track project completion percentage
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
```

## Step 2: Fix Existing Project Payment Data

After fixing the schema, run this to update all existing projects:

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/fix-project-payments" -Method POST

# Or curl
curl -X POST http://localhost:3000/api/fix-project-payments
```

## Step 3: Set Admin Role

To fix admin redirect issue:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/set-admin-role" -Method POST
```

## What Was Fixed in Code

### 1. `/app/api/projects/route.ts`
- ✅ Removed `timeline` from insert (column doesn't exist)
- ✅ Removed `progress` from insert (column doesn't exist)
- ✅ Fixed admin check to use service client (avoids RLS recursion)
- ✅ Made insert data dynamic (only includes existing columns)

### 2. `/app/api/verify-payment/route.ts`
- ✅ Now saves `paid_amount`, `remaining_amount`, `payment_status` to database
- ✅ Excludes maintenance payments from project payment calculations

### 3. `/app/api/user/projects/route.ts`
- ✅ Excludes maintenance payments from calculations
- ✅ Properly calculates payment status
- ✅ Ensures created_at is never null

### 4. Database Policy Fix
- ✅ Created `is_admin()` function with SECURITY DEFINER to avoid recursion
- ✅ Updated admin policies to use the function

## Testing Checklist

After running the fixes:

- [ ] Run the SQL scripts to fix database schema
- [ ] Run the fix-project-payments API endpoint
- [ ] Run the set-admin-role API endpoint
- [ ] Try creating a new project (should work now)
- [ ] Check if payment status shows correctly
- [ ] Check if project creation date appears
- [ ] Test admin login redirect
- [ ] Verify admin receives payment emails

## Important Notes

1. **The timeline column is optional** - If you add it via SQL, projects will store timeline. If not, it's skipped safely.

2. **The progress column is optional** - Used for tracking completion percentage. Not essential for basic functionality.

3. **The infinite recursion fix is critical** - Without it, any query involving users table will fail.

4. **Service client bypasses RLS** - Admin checks now use service client to avoid policy recursion.

## If Issues Persist

1. Check Supabase dashboard for any policy errors
2. Verify the `is_admin()` function was created successfully
3. Check console for any remaining column errors
4. Ensure all SQL scripts ran without errors

## Files Modified

1. `app/api/projects/route.ts` - Fixed column issues and admin check
2. `app/api/verify-payment/route.ts` - Fixed to save payment data
3. `app/api/user/projects/route.ts` - Fixed payment calculations
4. `scripts/fix-users-policy-recursion.sql` - Database policy fix
5. `scripts/add-timeline-column.sql` - Optional column addition
6. `scripts/add-progress-column.sql` - Optional column addition


