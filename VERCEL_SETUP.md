# Vercel Deployment Setup

## Environment Variables Setup

### 1. In Vercel Dashboard

Go to your project in Vercel Dashboard:

1. **Navigate to Settings**
   - Go to https://vercel.com/dashboard
   - Select your LaunchIn48 project
   - Click on "Settings" tab

2. **Add Environment Variables**
   - Go to "Environment Variables" section
   - Add the following variables:

   ```
   Key: CRON_SECRET
   Value: LaunchIn48_cleanup_secret_2025
   Environment: Production, Preview, Development
   ```

   **Also make sure these existing variables are set:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://edurestdtamyjrzaiwhr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RN5PaZPxOOqx5M
   RAZORPAY_KEY_SECRET=38ePdgMZJXCS7oN3RDk7e031
   RESEND_API_KEY=re_csQW1vph_GY5qsojRRxc3LNVxzJRjxzkN
   RESEND_FROM_EMAIL=support@launchin.app
   ```

3. **Redeploy**
   - After adding environment variables, redeploy your application
   - Go to "Deployments" tab
   - Click "..." on latest deployment and select "Redeploy"

## Cron Jobs Setup

### Option 1: External Cron Service (Recommended for Free Plan)

Using cron-job.org (free service):

**URL:** `https://your-domain.vercel.app/api/cron/cleanup-payments`

**HTTP Headers:**
- Name: `Authorization`
- Value: `Bearer LaunchIn48_cleanup_secret_2025`

**Schedule:** `*/10 * * * *` (every 10 minutes)

**Benefits:**
- Completely free
- Up to 60 executions per hour
- Reliable execution timing
- No plan upgrade required

## Testing the Setup

### Test Manual Cleanup
```bash
curl "https://your-domain.vercel.app/api/cleanup-pending-payments"
```

### Test Cron Endpoint (External)
```bash
curl -X GET "https://your-domain.vercel.app/api/cron/cleanup-payments" \
  -H "Authorization: Bearer LaunchIn48_cleanup_secret_2025"
```

## Monitoring

Check your Vercel Function Logs:
1. Go to Vercel Dashboard → Your Project
2. Click "Functions" tab
3. Look for `/api/cron/cleanup-payments` executions
4. Check logs for successful cleanups

## Troubleshooting

### Common Issues:

1. **401 Unauthorized**
   - Check CRON_SECRET environment variable is set
   - Verify Authorization header format
   - For Vercel cron, ensure you're on Pro plan

2. **Function Timeout**
   - Current timeout is set to 30 seconds in vercel.json
   - This should be sufficient for cleanup operations

3. **Database Connection Issues**
   - Verify Supabase credentials are correct
   - Check Supabase connection limits

4. **Cron Not Running**
   - Verify you're on Vercel Pro plan for built-in cron
   - Check external cron service is configured correctly
   - Look at Vercel function logs for errors