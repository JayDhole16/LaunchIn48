# SMS/WhatsApp Troubleshooting Guide

## Current Status
Based on the Twilio logs showing 403 errors and the build output showing successful configuration, here's what we know:

✅ **Working**: Twilio client initialization and account connection  
✅ **Working**: Phone number configuration (+15513018757)  
❌ **Issue**: Messages failing to send with 403 errors

## Common Causes and Solutions

### 1. **Phone Number Issues**
The most common cause of 403 errors is phone number formatting or validation issues.

**Test Your Configuration:**
```bash
# Visit these URLs in your browser to debug:
GET http://localhost:3000/api/debug-sms
POST http://localhost:3000/api/debug-sms
```

### 2. **Environment Variable Issues**
Check for spaces or formatting issues in your `.env` file:

```env
# ❌ BAD - has spaces
TWILIO_PHONE_NUMBER=+1 551 301 8757

# ✅ GOOD - no spaces  
TWILIO_PHONE_NUMBER=+15513018757
```

### 3. **Twilio Account Limitations**

**Trial Account Restrictions:**
- Can only send to verified phone numbers
- Limited to specific messaging templates
- Geographic restrictions may apply

**Check in Twilio Console:**
1. Go to Phone Numbers → Manage → Active numbers
2. Verify your number has SMS capabilities
3. Check if you're in trial mode with restrictions

### 4. **Phone Number Verification**

For Twilio trial accounts, you need to verify recipient phone numbers:
1. Go to Twilio Console → Phone Numbers → Manage → Verified Caller IDs
2. Add the phone numbers you want to test with

### 5. **API Debug Steps**

**Step 1: Test Twilio Configuration**
```bash
curl http://localhost:3000/api/debug-sms
```

**Step 2: Test SMS Sending**
```bash
curl -X POST http://localhost:3000/api/debug-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "message": "Test message from LaunchIn 48"
  }'
```

**Step 3: Check Payment Verification Logs**
Make a test payment and check your development server console for SMS-related logs:
- Look for "🚀 SMS/WhatsApp API called"
- Check for "📋 Request data received"
- Monitor "✅ SMS sent successfully" or "❌ SMS sending failed" messages

### 6. **Common Error Codes**

| Error Code | Description | Solution |
|------------|-------------|----------|
| 21211 | Invalid phone number | Check phone number formatting |
| 21408 | Permission denied | Check account permissions or trial limitations |
| 21601 | Phone number not verified | Add to verified caller IDs (trial accounts) |
| 21614 | Number not capable of SMS | Number doesn't support SMS |

### 7. **Enhanced Debugging**

The SMS API now includes detailed logging. Check your server console for:

```
🚀 SMS/WhatsApp API called
📋 Request data received: {...}
🔧 Twilio configuration check: {...}
✅ Twilio client initialized successfully
📤 SMS details: {...}
✅ SMS sent successfully: SM123...
```

### 8. **Testing Workflow**

1. **Test Configuration**: `GET /api/debug-sms`
2. **Test SMS Sending**: `POST /api/debug-sms` with phone number
3. **Make Test Payment**: Trigger the actual payment flow
4. **Check Console Logs**: Monitor server logs for detailed error information

### 9. **Immediate Fixes to Try**

**Fix 1: Update Environment Variables**
```env
# Remove any spaces from phone numbers
TWILIO_PHONE_NUMBER=+15513018757
TWILIO_WHATSAPP_NUMBER=+15513018757
```

**Fix 2: Verify Phone Number in Twilio**
- Log into Twilio Console
- Add recipient phone numbers to Verified Caller IDs

**Fix 3: Check Account Status**
- Verify your Twilio account is active
- Check if you have SMS credits available
- Ensure your account isn't suspended

### 10. **Contact for Support**

If issues persist:
1. Share the output from `/api/debug-sms`
2. Provide exact error messages from server logs
3. Confirm your Twilio account type (trial vs paid)
4. Share the specific phone number format you're testing with

---

## Quick Test Commands

```bash
# 1. Test Twilio config
curl http://localhost:3000/api/debug-sms

# 2. Test SMS to Indian number
curl -X POST http://localhost:3000/api/debug-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'

# 3. Test with US number
curl -X POST http://localhost:3000/api/debug-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15551234567"}'
```

The debugging APIs will provide detailed information about what's working and what's failing in your SMS setup.