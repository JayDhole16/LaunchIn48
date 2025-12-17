import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TWILIO CONFIGURATION TEST ===")
    
    // Check environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
    
    console.log("Environment variables:")
    console.log("- TWILIO_ACCOUNT_SID:", accountSid ? `${accountSid.substring(0, 10)}...` : "MISSING")
    console.log("- TWILIO_AUTH_TOKEN:", authToken ? `${authToken.substring(0, 10)}...` : "MISSING")
    console.log("- TWILIO_PHONE_NUMBER:", phoneNumber || "MISSING")
    console.log("- TWILIO_WHATSAPP_NUMBER:", whatsappNumber || "MISSING")
    
    if (!accountSid || !authToken) {
      return NextResponse.json({
        error: "Missing Twilio credentials",
        details: {
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasPhoneNumber: !!phoneNumber,
          hasWhatsAppNumber: !!whatsappNumber
        }
      }, { status: 500 })
    }
    
    // Try to initialize Twilio client
    let twilioClient
    try {
      const twilio = await import('twilio')
      twilioClient = twilio.default(accountSid, authToken)
      console.log("✅ Twilio client initialized successfully")
    } catch (error: any) {
      console.error("❌ Failed to initialize Twilio:", error.message)
      return NextResponse.json({
        error: "Failed to initialize Twilio client",
        details: error.message
      }, { status: 500 })
    }
    
    // Test by getting account info
    try {
      const account = await twilioClient.api.accounts(accountSid).fetch()
      console.log("✅ Successfully connected to Twilio account:", account.friendlyName)
      
      // Get phone numbers
      try {
        const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 10 })
        console.log("📞 Available phone numbers:", phoneNumbers.length)
        phoneNumbers.forEach((number: any, index: number) => {
          console.log(`  ${index + 1}. ${number.phoneNumber} (${number.capabilities.sms ? 'SMS✓' : 'SMS✗'})`)
        })
        
        // Check if our configured number exists
        const configuredNumberExists = phoneNumbers.some((num: any) => num.phoneNumber === phoneNumber)
        console.log("📞 Configured number exists:", configuredNumberExists)
        
      } catch (numbersError: any) {
        console.error("❌ Failed to fetch phone numbers:", numbersError.message)
      }
      
      return NextResponse.json({
        success: true,
        accountInfo: {
          sid: account.sid,
          friendlyName: account.friendlyName,
          status: account.status
        },
        configuration: {
          phoneNumber: phoneNumber,
          whatsappNumber: whatsappNumber,
          hasValidCredentials: true
        },
        phoneNumbers: phoneNumbers?.map((num: any) => ({
          number: num.phoneNumber,
          smsCapable: num.capabilities.sms,
          voiceCapable: num.capabilities.voice
        })) || []
      })
      
    } catch (accountError: any) {
      console.error("❌ Failed to fetch account info:", accountError.message)
      return NextResponse.json({
        error: "Failed to connect to Twilio account",
        details: accountError.message,
        code: accountError.code
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error("❌ Twilio test error:", error)
    return NextResponse.json({
      error: "Twilio test failed",
      details: error.message
    }, { status: 500 })
  }
}