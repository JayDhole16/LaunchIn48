# Debug Payment Data

## Issue Summary
User reported that maintenance payments are not showing up in:
1. Admin dashboard total revenue
2. User payment history 
3. Admin users total spent calculations

## Root Cause Found
The `verify-maintenance-payment` API was only updating the `maintenance_payments` table but NOT creating entries in the main `payments` table with proper `payment_method` values.

## Fix Applied
Updated `app/api/verify-maintenance-payment/route.ts` to:
1. Update `maintenance_payments` table (existing behavior)
2. **NEW**: Create entry in main `payments` table with proper `payment_method`
3. Map plan names to payment methods:
   - Monthly → `maintenance_monthly`
   - Quarterly → `maintenance_quarterly` 
   - Yearly → `maintenance_yearly`
   - Basic → `maintenance_basic`
   - Default → `maintenance`

## Testing Steps

### 1. Check Current Data
Go to your Supabase dashboard and run these queries:

```sql
-- Check maintenance_payments table
SELECT 
  id,
  user_id, 
  amount,
  plan_name,
  status,
  razorpay_payment_id,
  created_at
FROM maintenance_payments 
WHERE status = 'completed'
ORDER BY created_at DESC;

-- Check main payments table for maintenance payments
SELECT 
  id,
  user_id,
  project_id,
  amount,
  payment_method,
  status,
  razorpay_payment_id,
  created_at
FROM payments 
WHERE payment_method LIKE '%maintenance%' 
ORDER BY created_at DESC;

-- Total revenue check
SELECT 
  SUM(amount) as total_revenue,
  COUNT(*) as payment_count,
  payment_method
FROM payments 
WHERE status = 'completed'
GROUP BY payment_method
ORDER BY total_revenue DESC;
```

### 2. Test New Maintenance Payment
1. Go to user dashboard → projects → maintenance section
2. Make a test maintenance payment
3. Check if it appears in:
   - User payment history
   - Admin dashboard total revenue
   - Admin users section

### 3. Expected Behavior After Fix
- ✅ Maintenance payments appear in user payment history with maintenance badges
- ✅ Admin dashboard shows correct total revenue (project + maintenance)
- ✅ Admin users show correct total spent (project + maintenance)
- ✅ Payment categorization works properly

## Next Steps
1. Test with a real maintenance payment
2. Verify data appears correctly in all dashboards
3. Check that existing completed maintenance payments are working (they may need manual data cleanup)

## Manual Data Cleanup (if needed)
If existing maintenance payments are missing from main payments table, run:

```sql
-- Insert missing maintenance payments into main payments table
INSERT INTO payments (
  project_id,
  user_id,
  razorpay_order_id,
  razorpay_payment_id,
  amount,
  currency,
  status,
  payment_method,
  created_at
)
SELECT 
  pm.project_id,
  mp.user_id,
  mp.razorpay_order_id,
  mp.razorpay_payment_id,
  mp.amount,
  'INR',
  'completed',
  CASE mp.plan_name
    WHEN 'Monthly' THEN 'maintenance_monthly'
    WHEN 'Quarterly' THEN 'maintenance_quarterly'
    WHEN 'Yearly' THEN 'maintenance_yearly'
    WHEN 'Basic' THEN 'maintenance_basic'
    ELSE 'maintenance'
  END,
  mp.paid_at
FROM maintenance_payments mp
JOIN project_maintenance pm ON pm.id = mp.project_maintenance_id
WHERE mp.status = 'completed'
  AND mp.razorpay_payment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.razorpay_payment_id = mp.razorpay_payment_id
  );
```

This will backfill any missing maintenance payments in the main payments table.