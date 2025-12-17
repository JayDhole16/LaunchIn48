# Payment Flow Test Scenarios

## Test Case 1: Incomplete Payment Flow
1. **Create a new project** through `/create-project`
   - Project should be created with status: "draft" 
   - Project should NOT appear in user dashboard
   - Project should NOT be included in pending amounts

2. **User starts payment but doesn't complete**
   - Order is created in payments table with status: "pending"
   - Project remains with status: "draft"
   - Project still doesn't appear in dashboard
   - No amounts added to pending totals

3. **User abandons payment**
   - Project remains as draft
   - No impact on dashboard or calculations

## Test Case 2: Successful Partial Payment
1. **User makes partial payment** (e.g., ₹1000 out of ₹5000)
   - Payment verification triggers project activation
   - Project status changes from "draft" to "active"
   - Project now appears in user dashboard
   - Remaining amount (₹4000) appears in pending amounts
   - Payment options shown for remaining balance

2. **User completes remaining payment** 
   - Project status changes from "active" to "pending" (fully paid)
   - Remaining amount becomes ₹0
   - Project removed from pending calculations
   - No more payment options shown

## Test Case 3: Full Payment
1. **User pays full amount immediately**
   - Project status changes from "draft" to "pending" (fully paid)
   - Project appears in dashboard immediately
   - No remaining amount
   - No payment options needed

## Expected Behavior Changes

### Before Implementation:
- All projects appeared in dashboard regardless of payment
- All project amounts included in pending totals
- Incomplete payments cluttered the interface

### After Implementation:
- Only projects with payments appear in dashboard
- Only actual remaining balances included in pending
- Clean interface focused on actionable items
- Clear payment options for remaining balances

## Database Schema Requirements
Projects table should have:
- `status` (draft, active, pending, completed, etc.)
- `payment_status` (unpaid, partial, paid)  
- `paid_amount` (calculated from completed payments)
- `remaining_amount` (total_amount - paid_amount)

## API Behavior
- `POST /api/projects` - Creates projects with status="draft"
- `POST /api/verify-payment` - Activates projects when payment received
- `GET /api/projects` - Excludes draft projects for regular users
- Dashboard pages - Filter out draft projects from all calculations