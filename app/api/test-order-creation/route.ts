import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTING ORDER CREATION LOGIC ===")
    
    const body = await request.json()
    console.log("Request body:", body)
    
    const { serviceName, projectName } = body
    
    if (!serviceName || !projectName) {
      return NextResponse.json({
        success: false,
        error: "Missing serviceName or projectName"
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("Auth check:", { 
      userId: user?.id, 
      email: user?.email,
      error: authError?.message 
    })
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not authenticated",
        step: "authentication"
      }, { status: 401 })
    }
    
    // Test 2: Find service
    console.log(`Looking for service: "${serviceName}"`)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .ilike('name', serviceName)
    
    console.log("Services query:", {
      error: servicesError?.message,
      count: services?.length,
      services: services?.map(s => ({ id: s.id, name: s.name, price: s.price }))
    })
    
    if (servicesError) {
      return NextResponse.json({
        success: false,
        error: servicesError.message,
        step: "service_lookup",
        details: servicesError
      }, { status: 500 })
    }
    
    if (!services || services.length === 0) {
      // Also try exact match and partial match
      const { data: allServices } = await supabase
        .from('services')
        .select('*')
      
      console.log("All available services:", allServices?.map(s => s.name))
      
      return NextResponse.json({
        success: false,
        error: `Service "${serviceName}" not found`,
        step: "service_lookup",
        availableServices: allServices?.map(s => s.name) || []
      }, { status: 404 })
    }
    
    const service = services[0]
    
    // Test 3: Check environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
    
    console.log("Environment variables:", {
      hasRazorpayKeyId: !!razorpayKeyId,
      hasRazorpayKeySecret: !!razorpayKeySecret,
      keyIdLength: razorpayKeyId?.length,
      keySecretLength: razorpayKeySecret?.length
    })
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({
        success: false,
        error: "Razorpay credentials not configured",
        step: "razorpay_config"
      }, { status: 500 })
    }
    
    // Test 4: Try to import and initialize Razorpay
    let Razorpay
    try {
      Razorpay = (await import('razorpay')).default
      console.log("Razorpay imported successfully")
    } catch (importError: any) {
      console.error("Razorpay import error:", importError)
      return NextResponse.json({
        success: false,
        error: "Failed to import Razorpay",
        step: "razorpay_import",
        details: importError.message
      }, { status: 500 })
    }
    
    let razorpay
    try {
      razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      })
      console.log("Razorpay instance created successfully")
    } catch (initError: any) {
      console.error("Razorpay initialization error:", initError)
      return NextResponse.json({
        success: false,
        error: "Failed to initialize Razorpay",
        step: "razorpay_init",
        details: initError.message
      }, { status: 500 })
    }
    
    // Test 5: Create order options
    const amount = Math.round(service.price * 100) // Convert to paise
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        service_name: serviceName,
        project_name: projectName,
        user_id: user.id
      }
    }
    
    console.log("Order options:", options)
    
    // Test 6: Create Razorpay order (the critical step)
    let razorpayOrder
    try {
      razorpayOrder = await razorpay.orders.create(options)
      console.log("Razorpay order created:", {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      })
    } catch (orderError: any) {
      console.error("Razorpay order creation error:", orderError)
      return NextResponse.json({
        success: false,
        error: "Failed to create Razorpay order",
        step: "razorpay_order_creation",
        details: {
          message: orderError.message,
          statusCode: orderError.statusCode,
          error: orderError.error
        }
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: "Order creation test successful",
      details: {
        service: { id: service.id, name: service.name, price: service.price },
        user: { id: user.id, email: user.email },
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        }
      }
    })
    
  } catch (error: any) {
    console.error("Order creation test error:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed with exception",
      step: "general_error",
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint with { serviceName, projectName } to test order creation"
  })
}