-- Backfill Missing Maintenance Payments
-- This script will add any completed maintenance payments that are missing from the main payments table

-- First, let's see what we have
SELECT 
  'maintenance_payments' as table_name,
  COUNT(*) as completed_count,
  SUM(amount) as total_amount
FROM maintenance_payments 
WHERE status = 'completed' AND razorpay_payment_id IS NOT NULL

UNION ALL

SELECT 
  'payments (maintenance)',
  COUNT(*) as completed_count,
  SUM(amount) as total_amount
FROM payments 
WHERE payment_method LIKE '%maintenance%' AND status = 'completed';

-- Show missing maintenance payments
SELECT 
  mp.id as maintenance_payment_id,
  mp.user_id,
  mp.amount,
  mp.plan_name,
  mp.razorpay_payment_id,
  mp.paid_at,
  pm.project_id
FROM maintenance_payments mp
JOIN project_maintenance pm ON pm.id = mp.project_maintenance_id
WHERE mp.status = 'completed'
  AND mp.razorpay_payment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.razorpay_payment_id = mp.razorpay_payment_id
  )
ORDER BY mp.paid_at DESC;

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
  COALESCE(mp.paid_at, mp.created_at)
FROM maintenance_payments mp
JOIN project_maintenance pm ON pm.id = mp.project_maintenance_id
WHERE mp.status = 'completed'
  AND mp.razorpay_payment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.razorpay_payment_id = mp.razorpay_payment_id
  );

-- Verify the results
SELECT 
  'After backfill - maintenance_payments' as table_name,
  COUNT(*) as completed_count,
  SUM(amount) as total_amount
FROM maintenance_payments 
WHERE status = 'completed' AND razorpay_payment_id IS NOT NULL

UNION ALL

SELECT 
  'After backfill - payments (maintenance)',
  COUNT(*) as completed_count,
  SUM(amount) as total_amount
FROM payments 
WHERE payment_method LIKE '%maintenance%' AND status = 'completed'

UNION ALL

SELECT 
  'After backfill - payments (all)',
  COUNT(*) as completed_count,
  SUM(amount) as total_amount
FROM payments 
WHERE status = 'completed';

-- Show breakdown by payment method
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payments 
WHERE status = 'completed'
GROUP BY payment_method
ORDER BY total_amount DESC;