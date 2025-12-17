# Payment Cleanup Setup

This document describes how to set up automated cleanup of stale pending payments.

## Overview

The system now includes an API endpoint to automatically remove pending payment records that have been sitting for more than 10 minutes without completion (no razorpay_payment_id). This prevents the database from accumulating stale records.

## API Endpoints

### Manual Cleanup
- **Endpoint**: `/api/cleanup-pending-payments`
- **Methods**: `GET`, `POST`
- **Description**: Removes pending payments older than 10 minutes with no payment ID

### Cron Job Endpoint
- **Endpoint**: `/api/cron/cleanup-payments`
- **Methods**: `GET`, `POST`
- **Description**: Scheduled endpoint for automated cleanup (requires CRON_SECRET)

## Environment Variables

Add to your `.env.local`:

```env
CRON_SECRET=your-secret-key-here
```

## Deployment Setup

### Option 1: Vercel Cron Jobs (Recommended)

1. Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-payments",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

This runs the cleanup every 10 minutes.

### Option 2: External Cron Service

Use services like:
- **Uptime Robot**: Set up HTTP monitoring
- **GitHub Actions**: Schedule workflows
- **cron-job.org**: Free cron service

Example cURL command:
```bash
curl -X GET "https://your-domain.com/api/cron/cleanup-payments" \
  -H "Authorization: Bearer your-cron-secret"
```

### Option 3: Server Cron Job

If you have server access, add to crontab:
```bash
# Run every 10 minutes
*/10 * * * * curl -X GET "https://your-domain.com/api/cron/cleanup-payments" -H "Authorization: Bearer your-cron-secret"
```

## How It Works

1. **Payment Creation**: When a user initiates payment, a record is created with status "pending"
2. **Payment Completion**: When payment is successful, `razorpay_payment_id` is added
3. **Cleanup Process**: 
   - Runs every 10 minutes
   - Finds records with status "pending" AND no `razorpay_payment_id`
   - Removes records older than 10 minutes
4. **User Experience**: Users see clean payment history without stale pending records

## Manual Testing

Test the cleanup manually:

```bash
# Test cleanup (will clean up old pending payments)
curl -X POST "http://localhost:3000/api/cleanup-pending-payments"

# Test cron endpoint (requires CRON_SECRET)
curl -X GET "http://localhost:3000/api/cron/cleanup-payments" \
  -H "Authorization: Bearer your-cron-secret"
```

## Integration

The cleanup is automatically called:
1. **On page load**: Payment dashboard calls cleanup before loading data
2. **Scheduled**: Via cron job every 10 minutes
3. **Manual**: Admin can trigger via API

## Security

- The cron endpoint requires the `CRON_SECRET` environment variable
- Only pending payments with no payment ID are removed
- Completed payments are never touched
- All operations are logged for debugging

## Monitoring

Check logs for cleanup activity:
- Successful cleanups log the number of records removed
- Errors are logged with details
- Consider setting up monitoring alerts for cleanup failures