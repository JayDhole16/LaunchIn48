import { type NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"

export async function POST(request: NextRequest) {
  try {
    console.log("=== DETAILED RAZORPAY TEST API ===")
    
    const { amount, currency, receipt } = await request.json()
    
    console.log("Request data:", { amount, currency, receipt })
    
    // Log environment variables
    console.log("Environment variables:")
    console.log("- NEXT_PUBLIC_RAZORPAY_KEY_ID:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.substring(0, 10)}...` : 'MISSING')
    console.log("- RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? `${process.env.RAZORPAY_KEY_SECRET.substring(0, 10)}...` : 'MISSING')
    
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay environment variables")
      return NextResponse.json({ error: "Missing Razorpay environment variables" }, { status: 500 })
    }
    
    console.log("Initializing Razorpay...")
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    
    console.log("Razorpay initialized successfully")
    
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: receipt,
    }
    
    console.log("Creating order with options:", options)
    
    try {
      const order = await razorpay.orders.create(options)
      console.log("Order created successfully:", order.id)
      
      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      })
    } catch (razorpayError: any) {
      console.error("=== RAZORPAY API ERROR ===")
      console.error("Error:", razorpayError)
      console.error("Error message:", razorpayError.message)
      if (razorpayError.response) {
        console.error("Error response:", razorpayError.response.data)
      }
      
      return NextResponse.json({ 
        error: "Razorpay API error",
        message: razorpayError.message,
        ...(razorpayError.response ? { response: razorpayError.response.data } : {})
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("=== UNEXPECTED ERROR ===")
    console.error("Error:", error)
    console.error("Error message:", error.message)
    if (error.response) {
      console.error("Error response:", error.response.data)
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message
    }, { status: 500 })
  }
}