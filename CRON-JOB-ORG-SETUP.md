# cron-job.org Setup Guide

## Quick Setup for Payment Cleanup

### Step 1: Create Account
1. Go to https://cron-job.org
2. Sign up for a free account
3. Verify your email

### Step 2: Create New Cron Job
1. Click "Create cronjob"
2. Fill in the following details:

**Basic Settings:**
- **Title:** `LaunchIn48 Payment Cleanup`
- **URL:** `https://your-vercel-domain.vercel.app/api/cron/cleanup-payments`
  - Replace `your-vercel-domain` with your actual Vercel domain
- **Enable job:** ✅ Checked

**Schedule:**
- Select "Advanced" tab
- Enter: `*/10 * * * *` (every 10 minutes)
- Or use preset: "Every 10 minutes"

**HTTP Request:**
- **Method:** GET
- **Headers:** 
  - Click "Add header"
  - **Name:** `Authorization`
  - **Value:** `Bearer LaunchIn48_cleanup_secret_2025`

**Notifications (Optional):**
- ✅ Enable failure notifications
- Add your email to get notified if cleanup fails

### Step 3: Test the Job
1. Click "Test run" to verify it works
2. Check that you get a successful response
3. Save the cron job

## What This Does

- **Runs every 10 minutes** to clean up stale payment records
- **Removes pending payments** older than 10 minutes with no payment ID
- **Keeps your database clean** and payment dashboard accurate
- **Completely free** with cron-job.org

## Verification

After setup, you can verify it's working by:

1. **Check cron-job.org dashboard** for execution history
2. **Look at your payment dashboard** - should show clean data
3. **Check browser console** when loading payments page for cleanup logs

## Troubleshooting

### Common Issues:

**401 Unauthorized:**
- Check the Authorization header is exactly: `Bearer LaunchIn48_cleanup_secret_2025`
- Ensure CRON_SECRET is set in Vercel environment variables

**Job fails to execute:**
- Verify your Vercel domain URL is correct
- Check that your site is deployed and accessible
- Test the URL manually in browser (should show unauthorized without header)

**No cleanup happening:**
- The cleanup only removes payments older than 10 minutes with no payment ID
- If no stale payments exist, it will show "cleaned 0 records" (this is normal)

## Support

- **cron-job.org help:** https://cron-job.org/faq
- **Test URL manually:** `https://your-domain.vercel.app/api/cleanup-pending-payments`