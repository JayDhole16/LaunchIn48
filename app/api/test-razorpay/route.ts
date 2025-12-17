import { type NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"

export async function GET(request: NextRequest) {
  try {
    // Log environment variables (without exposing secrets)
    console.log("Razorpay config check:", {
      has_key_id: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      has_key_secret: !!process.env.RAZORPAY_KEY_SECRET,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 
        `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.substring(0, 5)}...` : 
        'MISSING'
    })
    
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Razorpay environment variables",
        details: {
          has_key_id: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          has_key_secret: !!process.env.RAZORPAY_KEY_SECRET
        }
      }, { status: 500 })
    }

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    // Test Razorpay connectivity by fetching orders (this will verify credentials)
    const orders = await razorpay.orders.all({ count: 1 })
    
    return NextResponse.json({ 
      success: true, 
      message: "Razorpay integration successful",
      orders: orders.items 
    })
  } catch (error: any) {
    console.error("Error in test-razorpay API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Razorpay integration failed",
      details: error.message 
    }, { status: 500 })
  }
}