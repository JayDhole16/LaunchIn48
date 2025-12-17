import { type NextRequest, NextResponse } from "next/server"

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

export async function GET() {
  try {
    console.log("=== SMS/WHATSAPP DEBUG STARTED ===")
    
    // Step 1: Check environment variables
    const envCheck = {
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: !!process.env.TWILIO_PHONE_NUMBER,
      TWILIO_WHATSAPP_NUMBER: !!process.env.TWILIO_WHATSAPP_NUMBER,
      accountSidPreview: process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...' : 'MISSING',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'MISSING',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'MISSING'
    }
    
    console.log("Environment Variables:", envCheck)
    
    if (!envCheck.TWILIO_ACCOUNT_SID || !envCheck.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials missing",
        envCheck
      })
    }
    
    // Step 2: Test Twilio initialization
    let twilio
    try {
      twilio = await initTwilio()
      console.log("✅ Twilio client initialized successfully")
    } catch (error: any) {
      console.error("❌ Twilio initialization failed:", error.message)
      return NextResponse.json({
        success: false,
        error: "Twilio initialization failed",
        details: error.message,
        envCheck
      })
    }
    
    // Step 3: Test account information
    let accountInfo
    try {
      accountInfo = await twilio.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
      console.log("✅ Successfully connected to Twilio account:", accountInfo.friendlyName)
    } catch (error: any) {
      console.error("❌ Failed to fetch account info:", error.message)
      return NextResponse.json({
        success: false,
        error: "Failed to connect to Twilio account",
        details: error.message,
        envCheck
      })
    }
    
    // Step 4: Check phone numbers
    let phoneNumbers = []
    try {
      const phoneNumberList = await twilio.incomingPhoneNumbers.list()
      phoneNumbers = phoneNumberList.map((number: any) => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        capabilities: number.capabilities
      }))
      console.log(`📞 Available phone numbers: ${phoneNumbers.length}`)
      phoneNumbers.forEach((num, index) => {
        const capabilities = []
        if (num.capabilities.sms) capabilities.push('SMS✓')
        if (num.capabilities.voice) capabilities.push('Voice✓')
        if (num.capabilities.mms) capabilities.push('MMS✓')
        console.log(`  ${index + 1}. ${num.phoneNumber} (${capabilities.join(', ')})`)
      })
    } catch (error: any) {
      console.error("❌ Failed to fetch phone numbers:", error.message)
    }
    
    // Step 5: Validate configured numbers
    const configuredPhone = process.env.TWILIO_PHONE_NUMBER
    const configuredWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER
    
    const phoneExists = phoneNumbers.find(p => p.phoneNumber === configuredPhone)
    const whatsappExists = phoneNumbers.find(p => p.phoneNumber === configuredWhatsApp)
    
    console.log("📞 Configured number exists:", !!phoneExists)
    console.log("📱 WhatsApp number exists:", !!whatsappExists)
    
    // Step 6: Test phone number formatting
    const testNumbers = [
      "9876543210",
      "+919876543210", 
      "919876543210",
      "9876-543-210"
    ]
    
    const formattedNumbers = testNumbers.map(num => ({
      original: num,
      formatted: formatPhoneNumber(num)
    }))
    
    console.log("📱 Phone number formatting test:")
    formattedNumbers.forEach(num => {
      console.log(`  ${num.original} → ${num.formatted}`)
    })
    
    return NextResponse.json({
      success: true,
      message: "SMS/WhatsApp debug completed successfully",
      data: {
        envCheck,
        accountInfo: {
          sid: accountInfo.sid,
          friendlyName: accountInfo.friendlyName,
          status: accountInfo.status
        },
        phoneNumbers,
        numberValidation: {
          configuredPhone,
          configuredWhatsApp,
          phoneExists: !!phoneExists,
          whatsappExists: !!whatsappExists
        },
        formattingTest: formattedNumbers
      },
      recommendations: [
        !envCheck.TWILIO_ACCOUNT_SID && "Add TWILIO_ACCOUNT_SID to .env file",
        !envCheck.TWILIO_AUTH_TOKEN && "Add TWILIO_AUTH_TOKEN to .env file", 
        !envCheck.TWILIO_PHONE_NUMBER && "Add TWILIO_PHONE_NUMBER to .env file",
        !phoneExists && configuredPhone && "The configured TWILIO_PHONE_NUMBER doesn't match any numbers in your account",
        phoneNumbers.length === 0 && "No phone numbers found in your Twilio account. Purchase a number first.",
        "Test sending a message using the /api/test-send-sms endpoint"
      ].filter(Boolean)
    })
    
  } catch (error: any) {
    console.error("❌ SMS debug error:", error)
    return NextResponse.json({
      success: false,
      error: "Debug failed",
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== TEST SMS SEND STARTED ===")
    
    const { phoneNumber, message } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Phone number required for test"
      }, { status: 400 })
    }
    
    const formattedPhone = formatPhoneNumber(phoneNumber)
    console.log(`📱 Testing SMS to: ${formattedPhone}`)
    
    const testMessage = message || `Test message from LaunchIn 48

This is a test SMS to verify Twilio configuration.

Time: ${new Date().toLocaleString()}
Phone: ${formattedPhone}

If you receive this, SMS is working correctly!`
    
    // Initialize Twilio
    const twilio = await initTwilio()
    
    const results = []
    
    // Test SMS
    try {
      console.log('📤 Sending test SMS...')
      const smsResult = await twilio.messages.create({
        body: testMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      })
      
      console.log('✅ SMS sent successfully:', smsResult.sid)
      results.push({
        type: 'SMS',
        success: true,
        messageId: smsResult.sid,
        to: formattedPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        status: smsResult.status
      })
    } catch (smsError: any) {
      console.error('❌ SMS sending failed:', {
        error: smsError.message,
        code: smsError.code,
        moreInfo: smsError.moreInfo
      })
      results.push({
        type: 'SMS',
        success: false,
        error: smsError.message,
        code: smsError.code,
        moreInfo: smsError.moreInfo,
        to: formattedPhone,
        from: process.env.TWILIO_PHONE_NUMBER
      })
    }
    
    // Test WhatsApp if configured
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER
    if (whatsappNumber) {
      try {
        console.log('📤 Sending test WhatsApp message...')
        const whatsappResult = await twilio.messages.create({
          body: testMessage.replace('SMS', 'WhatsApp'),
          from: `whatsapp:${whatsappNumber}`,
          to: `whatsapp:${formattedPhone}`
        })
        
        console.log('✅ WhatsApp sent successfully:', whatsappResult.sid)
        results.push({
          type: 'WhatsApp',
          success: true,
          messageId: whatsappResult.sid,
          to: formattedPhone,
          from: `whatsapp:${whatsappNumber}`,
          status: whatsappResult.status
        })
      } catch (whatsappError: any) {
        console.error('❌ WhatsApp sending failed:', {
          error: whatsappError.message,
          code: whatsappError.code,
          moreInfo: whatsappError.moreInfo
        })
        results.push({
          type: 'WhatsApp',
          success: false,
          error: whatsappError.message,
          code: whatsappError.code,
          moreInfo: whatsappError.moreInfo,
          to: formattedPhone,
          from: `whatsapp:${whatsappNumber}`
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const totalAttempts = results.length
    
    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount}/${totalAttempts} test messages sent successfully`,
      results,
      phoneNumber: formattedPhone
    })
    
  } catch (error: any) {
    console.error("❌ Test SMS error:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error.message
    }, { status: 500 })
  }
}