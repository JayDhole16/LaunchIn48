import { NextResponse } from "next/server"

export async function GET() {
  const config = {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
    hasWhatsAppNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
    accountSidPreview: process.env.TWILIO_ACCOUNT_SID ? 
      process.env.TWILIO_ACCOUNT_SID.substring(0, 8) + '...' : 'Missing',
    phoneNumberPreview: process.env.TWILIO_PHONE_NUMBER || 'Missing',
    whatsappNumberPreview: process.env.TWILIO_WHATSAPP_NUMBER || 'Not set (will use SMS number)',
    environmentFile: '.env',
    twilioPackageInstalled: true // If this endpoint works, the route is working
  }
  
  // Check if Twilio package is available
  try {
    await import('twilio')
    config.twilioPackageInstalled = true
  } catch (error) {
    config.twilioPackageInstalled = false
  }
  
  return NextResponse.json(config)
}