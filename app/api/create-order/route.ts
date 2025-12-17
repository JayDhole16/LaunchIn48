import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import Razorpay from "razorpay"

// Create Razorpay instance outside of the function
let razorpay: Razorpay | null = null;

// Initialize Razorpay instance if not already initialized
function getRazorpayInstance() {
  if (!razorpay) {
    console.log("Creating new Razorpay instance")
    // Add extra logging for debugging
    console.log("Razorpay key_id:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)
    console.log("Razorpay key_secret:", process.env.RAZORPAY_KEY_SECRET ? "SET" : "MISSING")
    razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  }
  return razorpay
}

interface CreateOrderRequest {
  amount: number
  currency: string
  projectId: string
  paymentType?: 'project' | 'maintenance'
  planId?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE ORDER API CALLED ===")
    const requestData = await request.json()
    const { amount, currency, projectId, paymentType = 'project', planId }: CreateOrderRequest = requestData
    
    console.log("Request data:", { amount, currency, projectId, paymentType, planId })

    const supabase = await createClient()
    
    // Log ALL environment variables (filtered for security)
    console.log("Environment variables check:")
    console.log("- NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING")
    console.log("- NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING")
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

    // Get the authenticated user
    console.log("Getting user...")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    // Verify the project belongs to the user (use service role to bypass restrictive RLS)
    console.log("Verifying project...")
    const service = createServiceClient()
    const { data: project, error: projectError } = await service
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      console.error("Project error:", projectError)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    console.log("Project found:", project.id)

    // Get Razorpay instance
    console.log("Getting Razorpay instance...")
    let razorpayInstance: Razorpay;
    try {
      razorpayInstance = getRazorpayInstance()
      console.log("Razorpay instance obtained successfully")
    } catch (initError: any) {
      console.error("=== ERROR INITIALIZING RAZORPAY INSTANCE ===")
      console.error("Error:", initError)
      console.error("Error message:", initError.message)
      return NextResponse.json({ 
        error: "Failed to initialize payment service",
        details: initError.message 
      }, { status: 500 })
    }

    // Create order with Razorpay
    // Generate a short receipt ID (max 40 chars) using project ID substring and timestamp
    const shortProjectId = projectId.replace(/-/g, '').substring(0, 8)
    const timestamp = Date.now().toString().substring(-8) // Last 8 digits
    const receiptId = `rcpt_${shortProjectId}_${timestamp}`.substring(0, 40)
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: receiptId,
    }

    console.log("Receipt ID:", receiptId, "(length:", receiptId.length, ")")
    console.log("Creating Razorpay order with options:", options)

    try {
      console.log("Calling razorpay.orders.create...")
      const order = await razorpayInstance.orders.create(options)
      console.log("Razorpay order created:", order.id)
      
      // Store the order in database
      console.log("Storing payment record...")
      const paymentRecord: any = {
        project_id: projectId,
        user_id: user.id,
        razorpay_order_id: order.id,
        amount: amount,
        currency: currency,
        status: "pending",
      }
      
      // Handle maintenance payments differently
      if (paymentType === 'maintenance' && planId) {
        // For maintenance payments, create records in maintenance_payments table
        console.log('Creating maintenance payment record')
        
        // Get or create maintenance record for the project
        let { data: maintenanceRecord, error: maintenanceError } = await service
          .from('project_maintenance')
          .select('*')
          .eq('project_id', projectId)
          .single()
        
        if (maintenanceError && maintenanceError.code === 'PGRST116') {
          // No maintenance record exists, create one
          console.log('🔄 Creating new maintenance record for project:', projectId)
          const { data: project, error: projectFetchError } = await service
            .from('projects')
            .select('total_amount, completed_date')
            .eq('id', projectId)
            .single()
            
          if (projectFetchError) {
            console.error('❌ Error fetching project for maintenance:', projectFetchError)
          }
            
          if (project) {
            const completionDate = project.completed_date || new Date().toISOString()
            const completionDateObj = new Date(completionDate)
            const maintenanceEndDate = new Date(completionDateObj)
            maintenanceEndDate.setDate(maintenanceEndDate.getDate() + 90)
            
            const { data: defaultPlan, error: planError } = await service
              .from('maintenance_plans')
              .select('*')
              .eq('name', 'Monthly')
              .single()
              
            if (planError) {
              console.error('❌ Error fetching Monthly maintenance plan:', planError)
            } else {
              console.log('✅ Found Monthly plan:', defaultPlan)
            }
            
            if (defaultPlan && project) {
              const baseAmount = project.total_amount || 0
              const maintenanceAmount = Math.round(baseAmount * defaultPlan.price_multiplier)
              
              const maintenanceRecordData = {
                project_id: projectId,
                user_id: user.id,
                maintenance_plan_id: defaultPlan.id,
                start_date: completionDateObj.toISOString().split('T')[0],
                end_date: maintenanceEndDate.toISOString().split('T')[0],
                next_payment_due: maintenanceEndDate.toISOString().split('T')[0],
                base_amount: baseAmount,
                maintenance_amount: maintenanceAmount,
                status: 'active'
              }
              
              console.log('💾 Creating maintenance record:', maintenanceRecordData)
              
              const { data: newMaintenance, error: createError } = await service
                .from('project_maintenance')
                .insert(maintenanceRecordData)
                .select()
                .single()
              
              if (createError) {
                console.error('❌ Error creating maintenance record:', createError)
              } else {
                console.log('✅ Maintenance record created:', newMaintenance)
                maintenanceRecord = newMaintenance
              }
            } else {
              console.error('❌ Missing defaultPlan or project data for maintenance creation')
            }
          }
        }
        
        if (maintenanceRecord) {
          console.log('✅ Using maintenance record for payment:', maintenanceRecord.id)
        } else {
          console.error('❌ No maintenance record available - cannot create payment')
          return NextResponse.json({ error: "Failed to create or find maintenance record" }, { status: 500 })
        }
        
        if (maintenanceRecord) {
          // Create maintenance payment record
          const planNames: { [key: string]: string } = {
            'monthly': 'Monthly',
            'quarterly': 'Quarterly', 
            'yearly': 'Yearly'
          }
          
          // Calculate payment period dates based on selected plan
          const planDurationMap = {
            'monthly': 1,
            'quarterly': 3,
            'yearly': 12
          }
          const durationMonths = planDurationMap[planId as keyof typeof planDurationMap] || 1
          const durationDays = durationMonths * 30 // Approximate days
          
          const paymentStartDate = new Date(maintenanceRecord.end_date || new Date())
          const paymentEndDate = new Date(paymentStartDate)
          paymentEndDate.setMonth(paymentEndDate.getMonth() + durationMonths)
          
          const maintenancePaymentData = {
            project_maintenance_id: maintenanceRecord.id,
            project_id: projectId,
            user_id: user.id,
            amount: amount,
            plan_name: planNames[planId] || 'Monthly',
            plan_duration_months: durationMonths,
            plan_duration_days: durationDays,
            days_added: durationDays,
            payment_period_start: paymentStartDate.toISOString().split('T')[0],
            payment_period_end: paymentEndDate.toISOString().split('T')[0],
            razorpay_order_id: order.id,
            status: 'pending'
          }
          
          console.log('💾 Inserting maintenance payment record:', maintenancePaymentData)
          
          const { data: insertedPayment, error: maintenanceInsertError } = await service
            .from('maintenance_payments')
            .insert(maintenancePaymentData)
            .select()
            .single()
            
          if (maintenanceInsertError) {
            console.error("❌ Error storing maintenance payment:", maintenanceInsertError)
            return NextResponse.json({ error: "Failed to create maintenance payment record" }, { status: 500 })
          }
          
          console.log('✅ Maintenance payment record created successfully:', insertedPayment)
        }
      } else {
        // Regular project payment
        paymentRecord.payment_method = 'razorpay'
        const { error: insertError } = await service.from("payments").insert(paymentRecord)
        
        if (insertError) {
          console.error("Error storing payment:", insertError)
          return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 })
        }
      }

      console.log("Payment record created successfully")

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
    console.error("=== UNEXPECTED ERROR IN CREATE ORDER API ===")
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