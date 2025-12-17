import { type NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Payment Diagnosis API",
    steps: [
      "POST with step: 1 - Check environment variables",
      "POST with step: 2 - Test Razorpay instance creation", 
      "POST with step: 3 - Test order creation"
    ]
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== PAYMENT DIAGNOSIS API ===")
    
    const { step } = await request.json()
    
    switch (step) {
      case 1:
        // Test environment variables
        console.log("Step 1: Checking environment variables")
        const envCheck = {
          NEXT_PUBLIC_RAZORPAY_KEY_ID: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
          keyIdPreview: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 
            `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.substring(0, 5)}...` : 
            null,
          secretPreview: process.env.RAZORPAY_KEY_SECRET ? 
            `${process.env.RAZORPAY_KEY_SECRET.substring(0, 5)}...` : 
            null
        }
        console.log("Environment check result:", envCheck)
        return NextResponse.json({ step: 1, result: envCheck })
        
      case 2:
        // Test Razorpay instance creation
        console.log("Step 2: Testing Razorpay instance creation")
        try {
          const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
          })
          console.log("Razorpay instance created successfully")
          return NextResponse.json({ step: 2, result: "success" })
        } catch (error: any) {
          console.error("Error creating Razorpay instance:", error)
          return NextResponse.json({ 
            step: 2, 
            result: "error",
            error: error.message 
          }, { status: 500 })
        }
        
      case 3:
        // Test actual order creation
        console.log("Step 3: Testing order creation")
        try {
          const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
          })
          
          const options = {
            amount: 100 * 100, // 100 INR in paise
            currency: 'INR',
            receipt: `diagnostic_receipt_${Date.now()}`,
          }
          
          console.log("Creating order with options:", options)
          const order = await razorpay.orders.create(options)
          console.log("Order created successfully:", order.id)
          return NextResponse.json({ step: 3, result: "success", orderId: order.id })
        } catch (error: any) {
          console.error("Error creating order:", error)
          console.error("Error name:", error.name)
          console.error("Error message:", error.message)
          console.error("Error stack:", error.stack)
          if (error.response) {
            console.error("Error response:", error.response.data)
          }
          if (error.statusCode) {
            console.error("Error status code:", error.statusCode)
          }
          return NextResponse.json({ 
            step: 3, 
            result: "error",
            error: error.message,
            ...(error.response ? { response: error.response.data } : {}),
            ...(error.statusCode ? { statusCode: error.statusCode } : {})
          }, { status: 500 })
        }
        
      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("=== UNEXPECTED ERROR IN DIAGNOSIS API ===")
    console.error("Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}