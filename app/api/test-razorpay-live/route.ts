import { NextResponse } from "next/server"
import Razorpay from "razorpay"

export async function GET() {
  try {
    // Check if environment variables are set
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json({
        success: false,
        error: "Razorpay keys not configured",
        keyId: keyId ? "SET" : "MISSING",
        keySecret: keySecret ? "SET" : "MISSING"
      })
    }

    // Check if keys are live or test
    const isLiveKey = keyId.startsWith('rzp_live_')
    const keyType = keyId.startsWith('rzp_test_') ? 'TEST' : 
                   keyId.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN'

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // Try to create a minimal test order (1 rupee) to verify keys work
    try {
      const testOrder = await razorpay.orders.create({
        amount: 100, // 1 rupee in paise
        currency: "INR",
        receipt: `test_${Date.now()}`,
      })

      return NextResponse.json({
        success: true,
        keyType: keyType,
        isLiveKey: isLiveKey,
        testOrderId: testOrder.id,
        message: isLiveKey ? 
          "✅ Live Razorpay keys are working correctly!" : 
          "⚠️ Test keys detected - your payments will be in test mode",
        keyIdPrefix: keyId.substring(0, 12) + "..."
      })
    } catch (razorpayError: any) {
      return NextResponse.json({
        success: false,
        keyType: keyType,
        isLiveKey: isLiveKey,
        error: "Razorpay API error",
        details: razorpayError.message,
        keyIdPrefix: keyId.substring(0, 12) + "..."
      })
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message
    })
  }
}