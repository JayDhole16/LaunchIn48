import { type NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"

export async function POST(request: NextRequest) {
  try {
    console.log("=== EXACT RAZORPAY TEST API ===")
    
    const { amount, currency, projectId } = await request.json()
    
    console.log("Request data:", { amount, currency, projectId })
    
    // Log environment variables exactly as in create-order API
    console.log("Environment variables check:")
    console.log("- NEXT_PUBLIC_RAZORPAY_KEY_ID:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.substring(0, 10)}...` : 'MISSING')
    console.log("- RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? `${process.env.RAZORPAY_KEY_SECRET.substring(0, 10)}...` : 'MISSING')
    
    // Check if environment variables are accessible
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      console.error("NEXT_PUBLIC_RAZORPAY_KEY_ID is missing")
      return NextResponse.json({ error: "Razorpay key ID not configured" }, { status: 500 })
    }
    
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET is missing")
      return NextResponse.json({ error: "Razorpay secret not configured" }, { status: 500 })
    }

    // Initialize Razorpay instance exactly as in create-order API
    console.log("Initializing Razorpay...")
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    console.log("Razorpay initialized successfully")

    // Create order with Razorpay exactly as in create-order API
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: `receipt_${projectId}_${Date.now()}`,
    }

    console.log("Creating Razorpay order with options:", options)

    try {
      console.log("Calling razorpay.orders.create...")
      const order = await razorpay.orders.create(options)
      console.log("Razorpay order created:", order.id)
      
      // Return the order details to the client
      return NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      })
    } catch (razorpayError: any) {
      console.error("=== RAZORPAY API ERROR ===")
      console.error("Error:", razorpayError)
      console.error("Error name:", razorpayError.name)
      console.error("Error message:", razorpayError.message)
      console.error("Error stack:", razorpayError.stack)
      if (razorpayError.response) {
        console.error("Error response:", razorpayError.response.data)
      }
      if (razorpayError.statusCode) {
        console.error("Error status code:", razorpayError.statusCode)
      }
      
      return NextResponse.json({ 
        error: "Payment service error", 
        details: razorpayError.message,
        ...(razorpayError.response ? { response: razorpayError.response.data } : {}),
        ...(razorpayError.statusCode ? { statusCode: razorpayError.statusCode } : {})
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("=== UNEXPECTED ERROR IN EXACT RAZORPAY TEST API ===")
    console.error("Error:", error)
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    // Log more detailed error information
    if (error.response) {
      console.error("Error response:", error.response.data)
    }
    if (error.statusCode) {
      console.error("Error status code:", error.statusCode)
    }
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}