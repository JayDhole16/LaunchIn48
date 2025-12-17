import { NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createClient } from "@/lib/supabase/server"

// Initialize Razorpay instance only when needed
function getRazorpayInstance() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { 
      projectMaintenanceId, 
      amount, 
      planName,
      paymentPeriodStart,
      paymentPeriodEnd
    } = await req.json()

    if (!projectMaintenanceId || !amount || !planName || !paymentPeriodStart || !paymentPeriodEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify the maintenance record exists and belongs to user
    const { data: maintenanceData, error: maintenanceError } = await supabase
      .from('project_maintenance')
      .select(`
        *,
        projects!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('id', projectMaintenanceId)
      .eq('projects.user_id', user.id)
      .single()

    if (maintenanceError || !maintenanceData) {
      return NextResponse.json(
        { error: "Maintenance record not found" },
        { status: 404 }
      )
    }

    // Create maintenance payment record
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('maintenance_payments')
      .insert({
        project_maintenance_id: projectMaintenanceId,
        user_id: user.id,
        amount: amount,
        plan_name: planName,
        payment_period_start: paymentPeriodStart,
        payment_period_end: paymentPeriodEnd,
        status: 'pending'
      })
      .select()
      .single()

    if (paymentError || !paymentRecord) {
      return NextResponse.json(
        { error: "Failed to create payment record" },
        { status: 500 }
      )
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `maintenance_${paymentRecord.id}`,
      notes: {
        project_maintenance_id: projectMaintenanceId,
        payment_id: paymentRecord.id,
        plan_name: planName,
        project_title: maintenanceData.projects.title
      }
    }

    const razorpay = getRazorpayInstance()
    const order = await razorpay.orders.create(options)

    // Update payment record with Razorpay order ID
    await supabase
      .from('maintenance_payments')
      .update({
        razorpay_order_id: order.id
      })
      .eq('id', paymentRecord.id)

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: paymentRecord.id
    })

  } catch (error: any) {
    console.error("Error creating maintenance order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}