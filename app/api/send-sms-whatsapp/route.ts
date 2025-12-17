import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// We'll dynamically import Twilio to avoid build issues if package isn't installed
let twilioClient: any = null

const initTwilio = async () => {
  if (!twilioClient) {
    try {
      const twilio = await import('twilio')
      twilioClient = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
    } catch (error) {
      console.error('Twilio package not installed. Run: npm install twilio')
      throw new Error('Twilio not configured')
    }
  }
  return twilioClient
}

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // If it's a 10-digit Indian number, add country code
  if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
    return `+91${cleaned}`
  }
  
  // If it already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`
  }
  
  return `+91${cleaned}` // Default to Indian format
}

const createPaymentMessage = (data: any) => {
  const { 
    customerName, 
    serviceName, 
    paymentId, 
    currentPayment, 
    totalPaid, 
    projectTotal, 
    remainingAmount, 
    isFullyPaid 
  } = data
  
  // SMS version (shorter due to character limits)
  const smsMessage = `🎉 Payment Confirmed - LaunchIn 48

Dear ${customerName || 'Customer'},

✅ Payment received: ₹${currentPayment}
📋 Service: ${serviceName}
💳 Payment ID: ${paymentId}

📊 Summary:
• Total Paid: ₹${totalPaid}
• Project Cost: ₹${projectTotal}${remainingAmount > 0 ? `\n• Remaining: ₹${remainingAmount}` : '\n• Status: FULLY PAID ✅'}

${isFullyPaid 
  ? '🎉 Your project is fully paid and ready to begin!' 
  : '📋 You can pay remaining amount anytime from dashboard.'
}

📞 Our team will contact you within 30 minutes!

Need help? Reply or call us.

Best regards,
LaunchIn 48 Team`

  // WhatsApp version (can be longer and more formatted)
  const whatsappMessage = `🎉 *Payment Confirmation - LaunchIn 48*

Dear ${customerName || 'Customer'},

Thank you for your payment! Your payment has been confirmed.

🏷️ *PROJECT DETAILS:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Service: *${serviceName}*
• Payment ID: \`${paymentId}\`

💰 *PAYMENT SUMMARY:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Current Payment: *₹${currentPayment}*
• Total Paid: *₹${totalPaid}*
• Project Total: *₹${projectTotal}*${remainingAmount > 0 ? `\n• Remaining: *₹${remainingAmount}*` : '\n• Status: *✅ FULLY PAID*'}

${isFullyPaid 
  ? '🎉 *CONGRATULATIONS!* Your project is fully paid and ready to begin!' 
  : `📋 *NEXT STEPS:* You have made a partial payment. You can pay the remaining ₹${remainingAmount} anytime from your dashboard.`
}

*We will contact you within 30 minutes* to discuss your project requirements and timeline.

📞 Need help? Reply to this message or contact us.

Best regards,
🚀 *LaunchIn 48 Team*`

  return { smsMessage, whatsappMessage }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 SMS/WhatsApp API called")
    
    const { 
      phoneNumber, 
      customerName,
      serviceName,
      paymentId,
      currentPayment,
      totalPaid,
      projectTotal,
      remainingAmount,
      isFullyPaid,
      sendSMS = true,
      sendWhatsApp = true,
      type = "payment_confirmation",
      metadata = {}
    } = await request.json()
    
    console.log("📋 Request data received:", {
      phoneNumber,
      customerName,
      serviceName,
      paymentId,
      currentPayment,
      sendSMS,
      sendWhatsApp,
      type
    })

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json({ 
        error: "Phone number is required" 
      }, { status: 400 })
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    console.log(`📱 Sending messages to: ${formattedPhone}`)

    // Check Twilio configuration with detailed logging
    const envConfig = {
      hasSID: !!process.env.TWILIO_ACCOUNT_SID,
      hasToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      hasWhatsAppNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
      sidPreview: process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...' : 'MISSING',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'MISSING',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'MISSING'
    }
    
    console.log("🔧 Twilio configuration check:", envConfig)
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Twilio not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env')
      return NextResponse.json({ 
        error: "SMS/WhatsApp service not configured",
        details: "Twilio credentials missing",
        envConfig
      }, { status: 500 })
    }

    const results = []
    
    // Initialize Twilio with error handling
    let twilio
    try {
      twilio = await initTwilio()
      console.log('✅ Twilio client initialized successfully')
    } catch (twilioInitError: any) {
      console.error('❌ Twilio initialization failed:', twilioInitError.message)
      return NextResponse.json({ 
        error: "Failed to initialize Twilio client",
        details: twilioInitError.message,
        envConfig
      }, { status: 500 })
    }
    
    // Generate message content
    const { smsMessage, whatsappMessage } = createPaymentMessage({
      customerName,
      serviceName,
      paymentId,
      currentPayment,
      totalPaid,
      projectTotal,
      remainingAmount,
      isFullyPaid
    })

    // Send SMS
    if (sendSMS) {
      try {
        console.log('📤 Sending SMS...')
        console.log('From number:', process.env.TWILIO_PHONE_NUMBER)
        console.log('To number:', formattedPhone)
        
        // Validate phone number configuration
        if (!process.env.TWILIO_PHONE_NUMBER) {
          throw new Error('TWILIO_PHONE_NUMBER not configured in environment variables')
        }
        
        // Clean phone number environment variable
        const fromNumber = process.env.TWILIO_PHONE_NUMBER.trim().replace(/\s+/g, '')
        
        console.log('📤 SMS details:', {
          from: fromNumber,
          to: formattedPhone,
          messageLength: smsMessage.length
        })
        
        const smsResult = await twilio.messages.create({
          body: smsMessage,
          from: fromNumber,
          to: formattedPhone
        })
        
        console.log('✅ SMS sent successfully:', smsResult.sid)
        results.push({
          type: 'SMS',
          success: true,
          messageId: smsResult.sid,
          to: formattedPhone,
          from: process.env.TWILIO_PHONE_NUMBER?.trim().replace(/\s+/g, '') || 'MISSING'
        })
      } catch (smsError: any) {
        console.error('❌ SMS sending failed:', {
          error: smsError.message,
          code: smsError.code,
          moreInfo: smsError.moreInfo,
          from: process.env.TWILIO_PHONE_NUMBER?.trim().replace(/\s+/g, '') || 'MISSING',
          to: formattedPhone
        })
        results.push({
          type: 'SMS',
          success: false,
          error: smsError.message,
          code: smsError.code,
          to: formattedPhone,
          from: process.env.TWILIO_PHONE_NUMBER?.trim().replace(/\s+/g, '') || 'MISSING'
        })
      }
    }

    // Send WhatsApp
    if (sendWhatsApp) {
      try {
        const whatsappFromNumber = (process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER)?.trim().replace(/\s+/g, '')
        console.log('📤 Sending WhatsApp message...')
        console.log('From WhatsApp number:', `whatsapp:${whatsappFromNumber}`)
        console.log('To WhatsApp number:', `whatsapp:${formattedPhone}`)
        
        // Validate WhatsApp number configuration
        if (!whatsappFromNumber) {
          throw new Error('Neither TWILIO_WHATSAPP_NUMBER nor TWILIO_PHONE_NUMBER configured')
        }
        
        const whatsappResult = await twilio.messages.create({
          body: whatsappMessage,
          from: `whatsapp:${whatsappFromNumber}`,
          to: `whatsapp:${formattedPhone}`
        })
        
        console.log('✅ WhatsApp sent successfully:', whatsappResult.sid)
        results.push({
          type: 'WhatsApp',
          success: true,
          messageId: whatsappResult.sid,
          to: formattedPhone,
          from: `whatsapp:${whatsappFromNumber}`
        })
      } catch (whatsappError: any) {
        const whatsappFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER
        console.error('❌ WhatsApp sending failed:', {
          error: whatsappError.message,
          code: whatsappError.code,
          moreInfo: whatsappError.moreInfo,
          from: `whatsapp:${whatsappFromNumber}`,
          to: `whatsapp:${formattedPhone}`
        })
        results.push({
          type: 'WhatsApp',
          success: false,
          error: whatsappError.message,
          code: whatsappError.code,
          to: formattedPhone,
          from: `whatsapp:${whatsappFromNumber}`
        })
      }
    }

    // Store message log in database (optional)
    try {
      const supabase = await createServerClient()
      await supabase.from("sms_notifications").insert({
        phone_number: formattedPhone,
        message_type: type,
        sms_sent: sendSMS,
        whatsapp_sent: sendWhatsApp,
        results: results,
        metadata: metadata,
        created_at: new Date().toISOString()
      })
    } catch (dbError) {
      console.log('📝 Note: SMS notifications table not available for logging')
    }

    const successCount = results.filter(r => r.success).length
    const totalAttempts = results.length

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount}/${totalAttempts} messages sent successfully`,
      results: results,
      phoneNumber: formattedPhone
    })

  } catch (error: any) {
    console.error("❌ SMS/WhatsApp service error:", error)
    return NextResponse.json({ 
      error: "Failed to send messages",
      details: error.message 
    }, { status: 500 })
  }
}