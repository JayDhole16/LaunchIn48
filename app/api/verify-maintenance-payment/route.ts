import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { extendMaintenanceValidity } from "@/lib/maintenance-business"

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment details" },
        { status: 400 }
      )
    }

    // Verify signature
    const key_secret = process.env.RAZORPAY_KEY_SECRET!
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body.toString())
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      )
    }

  const supabase = await createClient()
  const service = createServiceClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Find the maintenance payment record
    console.log('🔍 Looking for payment record with:', {
      razorpay_order_id,
      user_id: user.id
    })
    
    // Try to find the pending maintenance payment first (normal case)
    let { data: paymentRecord, error: paymentError } = await service
      .from('maintenance_payments')
      .select('*, project_maintenance_id, plan_name')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    // If not found, attempt a fallback lookup by order id (helps with timing/race issues)
    if (paymentError || !paymentRecord) {
      console.warn('⚠️ Pending payment record not found, attempting fallback lookup by order id...')
      const { data: fallbackRecord, error: fallbackError } = await service
        .from('maintenance_payments')
        .select('*, project_maintenance_id, plan_name')
        .eq('razorpay_order_id', razorpay_order_id)
        .single()

      if (fallbackError || !fallbackRecord) {
        console.error('❌ Payment record not found (fallback failed):', {
          error: paymentError || fallbackError,
          searched_order_id: razorpay_order_id,
          user_id: user.id
        })
        return NextResponse.json(
          { error: "Payment record not found" },
          { status: 404 }
        )
      }

      // Use the fallback record (record exists but not pending)
      console.log('⚠️ Found maintenance payment via fallback lookup:', { id: fallbackRecord.id, status: fallbackRecord.status })
      paymentRecord = fallbackRecord
    }

    // Update payment record as completed
    const { error: updateError } = await service
      .from('maintenance_payments')
      .update({
        status: 'completed',
        razorpay_payment_id: razorpay_payment_id,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentRecord.id)

    if (updateError) {
      console.error('❌ Failed to update maintenance_payments row:', updateError)
      return NextResponse.json(
        { error: `Failed to update payment status: ${updateError.message || JSON.stringify(updateError)}` },
        { status: 500 }
      )
    }

    console.log('✅ Updated maintenance_payments table')

    // Get project information for the main payments table entry
    const { data: maintenanceData, error: maintenanceError } = await service
      .from('project_maintenance')
      .select(`
        project_id,
        projects!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('id', paymentRecord.project_maintenance_id)
      .single()

    if (maintenanceError || !maintenanceData) {
      console.error('❌ Failed to get project data for main payment entry:', maintenanceError)
      return NextResponse.json(
        { error: "Failed to get project data" },
        { status: 500 }
      )
    }

    // Create proper payment_method for main payments table
    const paymentMethodMap: Record<string, string> = {
      'Monthly': 'maintenance_monthly',
      'Quarterly': 'maintenance_quarterly', 
      'Yearly': 'maintenance_yearly',
      'Basic': 'maintenance_basic'
    }
    
    const paymentMethod = paymentMethodMap[paymentRecord.plan_name] || 'maintenance'
    
    console.log('💳 Creating main payment entry with method:', paymentMethod)

    // Create entry in main payments table for dashboard calculations
    const { data: mainPaymentRecord, error: mainPaymentError } = await service
      .from('payments')
      .insert({
        project_id: maintenanceData.project_id,
        user_id: user.id,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        amount: paymentRecord.amount,
        currency: 'INR',
        status: 'completed',
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (mainPaymentError) {
      console.error('❌ Failed to create main payment record:', mainPaymentError)
      // Log the error details but continue
      console.log('⚠️ Maintenance payment verified but main payment record not created')
    } else {
      console.log('✅ Created main payment record for dashboard calculations', mainPaymentRecord)
    }

    // Extend maintenance period using proper business logic
    try {
      // Use the new business logic for cumulative extension
      console.log('🔧 Extending maintenance validity for project:', maintenanceData.project_id)
      
      const extensionResult = await extendMaintenanceValidity(
        maintenanceData.project_id,
        user.id,
        paymentRecord.plan_name, // Use plan name directly
        paymentRecord.amount,
        paymentRecord.id,
        razorpay_payment_id,
        razorpay_order_id
      )
      
      if (extensionResult.success) {
        console.log('✅ Maintenance extended successfully:', extensionResult.extensionDetails)
      } else {
        console.error('❌ Failed to extend maintenance via business logic')
        // Fall back to SQL function
        const { error: extendError } = await supabase
          .rpc('extend_maintenance_period', {
            p_project_maintenance_id: paymentRecord.project_maintenance_id,
            p_payment_id: paymentRecord.id
          })
        if (extendError) {
          console.error('Error extending maintenance period (SQL fallback):', extendError)
        }
      }
    } catch (extensionError) {
      console.error('Error in maintenance extension business logic:', extensionError)
      // Fall back to SQL function
      const { error: extendError } = await supabase
        .rpc('extend_maintenance_period', {
          p_project_maintenance_id: paymentRecord.project_maintenance_id,
          p_payment_id: paymentRecord.id
        })
      if (extendError) {
        console.error('Error extending maintenance period (SQL fallback):', extendError)
      }
    }

    // Get user and project data for email
    const { data: userData } = await supabase
      .from("users")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single()

    // Send confirmation email to user if user data exists
    if (userData) {
      try {
        await fetch(`${req.nextUrl.origin}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipientEmail: userData.email,
            subject: 'Maintenance Payment Confirmation - LaunchIn 48',
            body: `<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0066cc;">Maintenance Payment Confirmation</h2>
  
  <p>Dear ${userData.full_name || 'Customer'},</p>
  
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 3px 12px rgba(0,0,0,0.08); overflow: hidden;">

    <!-- Header -->
    <div style="background-color: #0a0a23; padding: 25px 20px; text-align: center;">
      <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px;" />
      <h2 style="color: #ffffff; margin: 10px 0 0;">Payment Confirmation</h2>
    </div>

    <!-- Body -->
    <div style="padding: 30px 25px;">
      <p style="font-size: 16px;">Hi there,</p>
      <p style="font-size: 16px; line-height: 1.6;">
        Thank you for your maintenance payment! 🎉<br>
        Your payment has been successfully processed and confirmed.
      </p>

      <!-- Payment Details -->
      <div style="background-color: #f9fafc; border: 1px solid #e0e6f1; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #0a0a23;">💰 Payment Details</h3>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8;">
          <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
          <li><strong>Amount:</strong> ₹${paymentRecord.amount.toLocaleString()}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
        </ul>
      </div>

      <!-- Maintenance Status -->
      <div style="background-color: #eaf4ff; border: 1px solid #cde0ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #004aad;">🔧 Maintenance Status</h3>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8;">
          <li>✅ Your maintenance period has been extended</li>
          <li>✅ All services continue without interruption</li>
          <li>✅ Regular updates and support included</li>
          <li>⏰ You’ll be notified before the next payment is due</li>
        </ul>
      </div>

      <!-- Support -->
      <p style="font-size: 15px; line-height: 1.6;">
        <strong>📞 Need assistance?</strong><br>
        Reply to <a href="mailto:support@launchin48.com" style="color: #004aad; text-decoration: none;">support@launchin48.com</a> 
        or call us at <a href="tel:+919699568708" style="color: #004aad; text-decoration: none;">9699568708</a>.<br>
        We’re always here to help!
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <!-- Footer -->
      <p style="color: #777; font-size: 14px; text-align: center; margin-bottom: 0;">
        With 💙 from the <strong>LaunchIn 48 Team</strong><br>
        <a href="https://launchin48.app" style="color: #004aad; text-decoration: none;">https://launchin48.app</a>
      </p>
    </div>
  </div>
</body>
</html>`,
            type: 'maintenance_payment_confirmation',
            metadata: {
              payment_id: razorpay_payment_id,
              maintenance_payment_id: paymentRecord.id,
              amount: paymentRecord.amount
            }
          })
        })
      } catch (emailError) {
        console.error('Error sending customer maintenance payment email:', emailError)
      }

      // Send admin notification
      try {
        await fetch(`${req.nextUrl.origin}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipientEmail: 'jaydhole.739@gmail.com',
            subject: '🔧 Maintenance Payment Received - LaunchIn 48',
            body: `<html> <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 25px; color: #333;">
  <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.08); overflow: hidden;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0078D7, #00B4D8); padding: 25px 30px; text-align: center;">
      <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px; margin-bottom: 10px;">
      <h2 style="color: #fff; margin: 0;">🔧 Maintenance Payment Alert</h2>
      <p style="color: #e0f7ff; margin: 8px 0 0;">A new maintenance payment has been received.</p>
    </div>

    <!-- Body -->
    <div style="padding: 30px;">

      <!-- Customer Details -->
      <h3 style="color: #0078D7; margin-top: 0;">👥 Customer Details</h3>
      <div style="background: #f9fafc; border-left: 4px solid #0078D7; padding: 15px; border-radius: 8px;">
        <p style="margin: 6px 0;"><strong>Name:</strong> ${userData.full_name || 'Not provided'}</p>
        <p style="margin: 6px 0;"><strong>Email:</strong> ${userData.email}</p>
        <p style="margin: 6px 0;"><strong>Phone:</strong> ${userData.phone || 'Not provided'}</p>
        <p style="margin: 6px 0;"><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
      </div>

      <!-- Payment Summary -->
      <h3 style="color: #0078D7; margin-top: 25px;">💰 Payment Summary</h3>
      <div style="background: #e9f8ee; border-left: 4px solid #28a745; padding: 15px; border-radius: 8px;">
        <p style="margin: 6px 0;"><strong>Amount:</strong> ₹${paymentRecord.amount.toLocaleString()}</p>
        <p style="margin: 6px 0;"><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p style="margin: 6px 0;"><strong>Type:</strong> Maintenance Payment</p>
      </div>

      <!-- Maintenance Details -->
      <h3 style="color: #0078D7; margin-top: 25px;">🔧 Maintenance Details</h3>
      <div style="background: #fffbe6; border-left: 4px solid #ffb300; padding: 15px; border-radius: 8px;">
        <ul style="margin: 0; padding-left: 18px;">
          <li>✅ Maintenance period extended successfully</li>
          <li>✅ Customer services continue uninterrupted</li>
        </ul>
      </div>

      <!-- Contact Info -->
      <div style="margin-top: 25px; background: #f1f9ff; border-radius: 8px; padding: 15px;">
        <p style="margin: 0;"><strong>Customer Contact:</strong></p>
        <p style="margin: 5px 0;">📧 Email: <a href="mailto:${userData.email}" style="color: #0078D7; text-decoration: none;">${userData.email}</a></p>
        <p style="margin: 0;">📞 Phone: ${userData.phone || 'Not available'}</p>
      </div>

      <!-- Footer -->
      <p style="text-align: center; color: #888; font-size: 13px; margin-top: 35px;">
        🚀 <strong>LaunchIn 48 Admin Notification</strong><br>
        Keeping your clients online & updated.
      </p>
    </div>
  </div>
</body>
</html>`,
            type: 'admin_maintenance_notification',
            metadata: {
              customer_id: user.id,
              payment_id: razorpay_payment_id,
              maintenance_payment_id: paymentRecord.id,
              amount: paymentRecord.amount,
              customer_email: userData.email
            }
          })
        })
      } catch (emailError) {
        console.error('Error sending admin maintenance payment email:', emailError)
      }
      
      // Send SMS and WhatsApp confirmation for maintenance payment
      if (userData.phone) {
        console.log(`📱 Sending maintenance SMS/WhatsApp to: ${userData.phone}`)
        try {
          await fetch(`${req.nextUrl.origin}/api/send-sms-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumber: userData.phone,
              customerName: userData.full_name,
              serviceName: "Maintenance Service",
              paymentId: razorpay_payment_id,
              currentPayment: paymentRecord.amount.toLocaleString(),
              totalPaid: paymentRecord.amount.toLocaleString(),
              projectTotal: paymentRecord.amount.toLocaleString(),
              remainingAmount: "0",
              isFullyPaid: true,
              sendSMS: true,
              sendWhatsApp: true,
              type: "maintenance_payment_confirmation",
              metadata: {
                payment_id: razorpay_payment_id,
                maintenance_payment_id: paymentRecord.id,
                customer_id: user.id
              }
            })
          })
          console.log('✅ Maintenance SMS/WhatsApp request sent successfully')
        } catch (smsError) {
          console.error('❌ Error sending maintenance SMS/WhatsApp:', smsError)
        }
      } else {
        console.log('⚠️ No phone number available for maintenance SMS/WhatsApp')
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentRecord.id,
      message: "Maintenance payment verified successfully",
      clearClientState: true // Signal to clear localStorage maintenance state
    })

  } catch (error: any) {
    console.error("Error verifying maintenance payment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}