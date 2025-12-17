import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { extendMaintenanceValidity } from "@/lib/maintenance-business"
import { parseMaintenancePlan } from "@/lib/maintenance-extension"
import crypto from "crypto"

interface VerifyPaymentRequest {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export async function POST(request: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature }: VerifyPaymentRequest = await request.json()

    const supabase = await createClient()
    const service = createServiceClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the payment signature
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    shasum.update(razorpay_order_id + "|" + razorpay_payment_id)
    const digest = shasum.digest("hex")

    if (digest !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
    }

    // Get payment details first to check payment type
    const { data: existingPayment } = await service
      .from("payments")
      .select("project_id, amount, payment_method")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single()
    
    // Check if this is a maintenance payment by looking at the payment_method
    const isMaintenancePayment = existingPayment?.payment_method?.includes('maintenance') || false
    console.log('Payment type detected:', isMaintenancePayment ? 'maintenance' : 'project', 'payment_method:', existingPayment?.payment_method)
    
    // Update payment status
    const { data: payment, error: updateError } = await service
      .from("payments")
      .update({
        razorpay_payment_id: razorpay_payment_id,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .select("id, project_id, amount, payment_method")
      .single()

    if (updateError) {
      console.error("Error updating payment:", updateError)
      return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
    }

    // Update project payment status (only for project payments, not maintenance)
    const finalIsMaintenancePayment = payment?.payment_method?.includes('maintenance') || isMaintenancePayment
    
    if (payment && !finalIsMaintenancePayment) {
      console.log('Processing project payment update...')
      // Get current project data and all NON-MAINTENANCE payments for this project
      const { data: currentProject } = await service
        .from("projects")
        .select("total_amount")
        .eq("id", payment.project_id)
        .single()

      // Get all completed NON-MAINTENANCE payments for this project to calculate totals
      const { data: allPayments } = await service
        .from("payments")
        .select("amount, payment_method")
        .eq("project_id", payment.project_id)
        .eq("status", "completed")

      if (currentProject) {
        // Calculate total paid amount excluding maintenance payments
        const projectPayments = (allPayments || []).filter(p => !p.payment_method?.includes('maintenance'))
        const totalPaidAmount = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const remainingAmount = Math.max(0, currentProject.total_amount - totalPaidAmount)
        const isFullyPaid = remainingAmount === 0
        
        // Determine project status based on payment
        let projectStatus = "pending" // Use 'pending' - 'draft' is not allowed by check constraint
        let paymentStatus = "pending" // Use 'pending' instead of 'unpaid'
        
        if (totalPaidAmount > 0) {
          // Any payment activates the project (even partial)
          // Allowed statuses: 'pending', 'in_progress', 'review', 'completed', 'cancelled'
          projectStatus = isFullyPaid ? "in_progress" : "pending" // Use 'in_progress' for fully paid, 'pending' for partial
          paymentStatus = isFullyPaid ? "paid" : "partial"
        }
        
        // Update project with payment information
        let updateData: any = {
          status: projectStatus,
          paid_amount: totalPaidAmount,
          remaining_amount: remainingAmount,
          payment_status: paymentStatus,
        }
        
        const { error: projectUpdateError } = await service
          .from("projects")
          .update(updateData)
          .eq("id", payment.project_id)

        if (projectUpdateError) {
          console.error("Error updating project:", projectUpdateError)
        } else {
          console.log(`Project payment updated: ₹${totalPaidAmount} paid total, ₹${remainingAmount} remaining, status: ${isFullyPaid ? 'paid' : 'partial'}`)
        }
      }
    } else if (payment && finalIsMaintenancePayment && payment.payment_method) {
      console.log('💰 Maintenance payment detected - processing database extension')
      console.log('Maintenance payment details:', {
        amount: payment.amount,
        payment_method: payment.payment_method,
        project_id: payment.project_id
      })
      
      try {
        // Extract plan slug from payment method (e.g., 'maintenance_monthly' -> 'monthly')
        const planSlug = payment.payment_method.replace('maintenance_', '')
        
        // Extend maintenance validity using database business logic
        const extensionResult = await extendMaintenanceValidity(
          payment.project_id,
          user.id,
          planSlug,
          payment.amount,
          payment.id,
          razorpay_payment_id,
          razorpay_order_id
        )
        
        console.log('✅ Database maintenance extension successful:', {
          plan_name: extensionResult.extensionDetails.plan_name,
          days_added: extensionResult.extensionDetails.days_added,
          new_validity_end: extensionResult.extensionDetails.new_validity_end,
          total_days_remaining: extensionResult.extensionDetails.total_days_remaining
        })
        
      } catch (maintenanceError) {
        console.error('❌ Error extending maintenance period:', maintenanceError)
        // Don't fail the payment verification if maintenance extension fails
      }
    }

    if (payment) {
      const { data: userData } = await service.from("users").select("full_name, email, phone").eq("id", user.id).single()

      const { data: projectData } = await service
        .from("projects")
        .select("title, description, total_amount")
        .eq("id", payment.project_id)
        .single()

      console.log('📊 Payment verification data check:', {
        userData: !!userData,
        userEmail: userData?.email,
        projectData: !!projectData,
        projectTitle: projectData?.title
      })
      
      if (userData && projectData) {
        // Calculate payment totals for email
        const { data: allProjectPayments } = await service
          .from("payments")
          .select("amount")
          .eq("project_id", payment.project_id)
          .eq("status", "completed")
        
        const totalPaidAmount = (allProjectPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
        const remainingAmount = Math.max(0, projectData.total_amount - totalPaidAmount)
        const isFullyPaid = remainingAmount === 0
        
        console.log('💰 Payment calculation completed:', {
          totalPaidAmount,
          remainingAmount,
          isFullyPaid
        })
        
        // Send customer confirmation email (always try to send)
        if (!userData.email) {
          console.error('❌ Cannot send customer email: No email address found for user')
        } else {
          console.log(`Attempting to send customer email to: ${userData.email}`)
        }
        
        // Get plan name for maintenance payments (define at parent scope for both customer and admin emails)
        let planName = ''
        let maintenancePlanDetails = null
        
        if (finalIsMaintenancePayment && payment.payment_method) {
          try {
            maintenancePlanDetails = parseMaintenancePlan(payment.payment_method)
            planName = maintenancePlanDetails.name
            console.log('📋 Maintenance plan details extracted:', { planName, duration: maintenancePlanDetails.duration })
          } catch (error) {
            console.error('❌ Error parsing maintenance plan:', error)
            // Fallback to basic parsing
            const planId = payment.payment_method.replace('maintenance_', '')
            const planNameMap = {
              'monthly': 'Monthly',
              'quarterly': 'Quarterly', 
              'yearly': 'Yearly'
            }
            planName = planNameMap[planId as keyof typeof planNameMap] || planId
          }
        }
        
        if (userData.email) {
        try {
          
          const isMaintenanceEmail = finalIsMaintenancePayment
          const emailSubject = isMaintenanceEmail 
            ? `Maintenance Payment Confirmation - LaunchIn 48`
            : `Payment Confirmation - LaunchIn 48 ${isFullyPaid ? '(Complete)' : '(Partial)'}`
            
          const emailBody = isMaintenanceEmail 
            ? `<html><body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 25px; color: #333;">
  <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.08); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0078D7, #00B4D8); padding: 20px 30px; text-align: center;">
      <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px; margin-bottom: 10px;">
      <h2 style="color: #fff; margin: 0;">Maintenance Payment Confirmation</h2>
      <p style="color: #e0f7ff; margin-top: 6px;">Thank you for keeping your project powered and protected!</p>
    </div>

    <!-- Body -->
    <div style="padding: 30px;">
      <h3 style="color: #0078D7; margin-top: 0;">👋 Dear ${userData.full_name || 'Customer'},</h3>
      <p>Your payment has been <strong>successfully confirmed</strong> and your maintenance plan is now <strong>active</strong>.</p>

      <div style="background: #f9fafc; border-left: 4px solid #0078D7; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin: 0 0 10px;">🔧 Maintenance Details</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><strong>Project:</strong> ${projectData.title}</li>
          <li><strong>Plan:</strong> ${planName} Maintenance Plan</li>
          <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
        </ul>
      </div>

      <div style="background: #e9f8ee; border-left: 4px solid #28a745; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin: 0 0 10px;">💰 Payment Summary</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><strong>Amount:</strong> ₹${payment.amount.toLocaleString()}</li>
          <li><strong>Duration:</strong> ${maintenancePlanDetails ? `${maintenancePlanDetails.duration} month(s)` : (planName === 'Monthly' ? '1 month' : planName === 'Quarterly' ? '3 months' : '12 months')}</li>
          <li><strong>Coverage:</strong> Bug fixes, updates, and technical support</li>
        </ul>
      </div>

      <div style="margin-top: 25px;">
        <p style="background: #fef9e7; border-left: 4px solid #ffb300; padding: 15px; border-radius: 8px;">
          🎉 <strong>Your maintenance plan is now active!</strong><br>
          Here's what you get during your plan period:
        </p>
        <ul style="margin-left: 20px;">
          <li>✅ Regular bug fixes and security patches</li>
          <li>✅ Technical support via email</li>
          <li>✅ Performance monitoring and optimization</li>
          <li>✅ Continuous updates and improvements</li>
        </ul>
      </div>

      <p style="margin-top: 25px;">We’ll ensure your project runs <strong>smoothly and securely</strong> throughout your maintenance period.</p>

      <div style="margin-top: 25px; text-align: center; background: #f1f9ff; border-radius: 8px; padding: 15px;">
        <p style="margin: 0;"><strong>📞 Need assistance?</strong></p>
        <p style="margin: 5px 0;">Email: <a href="mailto:support@launchin48.com" style="color: #0078D7; text-decoration: none;">support@launchin48.com</a></p>
        <p style="margin: 0;">Phone: <a href="tel:9699568708" style="color: #0078D7; text-decoration: none;">9699568708</a></p>
      </div>

      <p style="text-align: center; color: #888; font-size: 13px; margin-top: 30px;">
        🚀 <strong>LaunchIn 48 Team</strong><br>
        Building fast. Launching faster.
      </p>
    </div>
  </div>
</body>
</html>`
            : `<html><body style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 0; color: #333;">
  <div style="max-width: 650px; margin: 40px auto; background: #ffffff; border-radius: 10px; box-shadow: 0 3px 12px rgba(0,0,0,0.08); overflow: hidden;">

    <!-- Header -->
    <div style="background-color: #0a0a23; padding: 25px 20px; text-align: center;">
      <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px;" />
      <h2 style="color: #ffffff; margin: 10px 0 0;">Payment Confirmation</h2>
    </div>

    <!-- Body -->
    <div style="padding: 30px 25px; line-height: 1.7; font-size: 16px;">
      <h2 style="color: #0a0a23; margin-top: 0;">Dear ${userData.full_name || 'Customer'},</h2>

      <p>Thank you for your payment! 🎉 Your payment has been confirmed successfully.</p>

      <!-- Project Details -->
      <div style="background-color: #f9fafc; border: 1px solid #e0e6f1; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #0a0a23;">🏷️ Project Details</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><strong>Service:</strong> ${projectData.title}</li>
          <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
        </ul>
      </div>

      <!-- Payment Summary -->
      <div style="background-color: #eaf4ff; border: 1px solid #cde0ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #004aad;">💰 Payment Summary</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><strong>Current Payment:</strong> ₹${payment.amount.toLocaleString()}</li>
          <li><strong>Total Paid:</strong> ₹${totalPaidAmount.toLocaleString()}</li>
          <li><strong>Project Total:</strong> ₹${projectData.total_amount.toLocaleString()}</li>
          ${remainingAmount > 0 
            ? `<li><strong>Remaining:</strong> ₹${remainingAmount.toLocaleString()}</li>` 
            : '<li><strong>Status:</strong> ✅ FULLY PAID</li>'}
        </ul>
      </div>

      <!-- Status Message -->
      <p style="font-size: 16px; background-color: #fef9e7; border-left: 4px solid #f1c40f; padding: 15px; border-radius: 6px;">
        <strong>
          ${isFullyPaid 
            ? '🎉 CONGRATULATIONS! Your project is fully paid and ready to begin!' 
            : `📋 NEXT STEPS: You have made a partial payment. You can pay the remaining ₹${remainingAmount.toLocaleString()} anytime from your dashboard.`}
        </strong>
      </p>

      <!-- Info -->
      <p>We will contact you within <strong>30 minutes</strong> to discuss your project requirements and timeline.</p>

      <p style="margin-top: 25px;">
        <strong>📞 Need help?</strong><br>
        Reply to <a href="mailto:support@launchin48.com" style="color: #004aad; text-decoration: none;">support@launchin48.com</a> 
        or call us at <a href="tel:+919699568708" style="color: #004aad; text-decoration: none;">9699568708</a>.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <!-- Footer -->
      <p style="color: #777; font-size: 14px; text-align: center;">
        With 💙 from the <strong>LaunchIn 48 Team</strong><br>
        <a href="https://launchin48.app" style="color: #004aad; text-decoration: none;">https://launchin48.app</a>
      </p>
    </div>
  </div>
</body></html>`
          
          const customerEmailResponse = await fetch(`${request.nextUrl.origin}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientEmail: userData.email,
              subject: emailSubject,
              body: emailBody,
              type: "payment_confirmation",
              metadata: {
                payment_id: razorpay_payment_id,
                project_id: payment.project_id,
                amount: payment.amount,
                total_paid: totalPaidAmount,
                remaining: remainingAmount,
                is_fully_paid: isFullyPaid
              },
            }),
          })
          
          const customerEmailResult = await customerEmailResponse.json()
          if (customerEmailResponse.ok) {
            console.log(`✅ Customer email sent successfully to ${userData.email}:`, customerEmailResult)
          } else {
            console.error(`❌ Customer email failed for ${userData.email}:`, customerEmailResult)
          }
        } catch (emailError) {
          console.error("Error sending customer confirmation email:", emailError)
        }
        } // End email validation block

        // Send admin notification email
        console.log('Attempting to send admin notification email...')
        try {
          const adminEmailSubject = finalIsMaintenancePayment 
            ? `🔧 Maintenance Payment Received - LaunchIn 48`
            : `🚨 ${isFullyPaid ? 'FULL' : 'PARTIAL'} Payment Received - LaunchIn 48`
            
          const adminEmailBody = finalIsMaintenancePayment 
            ? `<html><body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 0; color: #333;">
  <div style="max-width: 700px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 3px 12px rgba(0,0,0,0.08); overflow: hidden;">

    <!-- HEADER -->
    <div style="background-color: #0a0a23; padding: 25px 20px; text-align: center;">
      <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px;" />
      <h2 style="color: #fff; margin: 10px 0 0;">🔧 Maintenance Payment Alert!</h2>
    </div>

    <!-- BODY -->
    <div style="padding: 30px 25px; font-size: 15px; line-height: 1.7;">

      <!-- CUSTOMER DETAILS -->
      <div style="background-color: #f9fafc; border: 1px solid #e0e6f1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; color: #004aad;">👥 Customer Details</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><strong>Name:</strong> ${userData.full_name || 'Not provided'}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Phone:</strong> ${userData.phone || 'Not provided'}</li>
          <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
        </ul>
      </div>

      <!-- MAINTENANCE DETAILS -->
      <div style="background-color: #eaf4ff; border: 1px solid #cde0ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; color: #004aad;">🔧 Maintenance Details</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><strong>Project:</strong> ${projectData.title}</li>
          <li><strong>Plan:</strong> ${planName} Maintenance Plan</li>
          <li><strong>Payment Amount:</strong> ₹${payment.amount.toLocaleString()}</li>
          <li><strong>Duration:</strong> 
            ${maintenancePlanDetails 
              ? `${maintenancePlanDetails.duration} month(s)` 
              : (planName === 'Monthly' ? '1 month' : planName === 'Quarterly' ? '3 months' : '12 months')}
          </li>
        </ul>
      </div>

      <!-- ACTION REQUIRED -->
      <div style="background-color: #fef9e7; border: 1px solid #f6e58d; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; color: #9a7d0a;">💼 Action Required</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li>✅ Activate maintenance plan in system</li>
          <li>✅ Update maintenance records</li>
          <li>✅ Send welcome message to customer</li>
        </ul>
      </div>

      <!-- CONTACT -->
      <div style="border-top: 1px solid #eee; padding-top: 20px;">
        <p><strong>📞 Customer Contact:</strong><br>
        Email: <a href="mailto:${userData.email}" style="color: #004aad; text-decoration: none;">${userData.email}</a><br>
        Phone: <a href="tel:${userData.phone}" style="color: #004aad; text-decoration: none;">${userData.phone || 'Not available'}</a></p>
      </div>

      <!-- FOOTER -->
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="text-align: center; color: #777; font-size: 13px;">
        🚀 <strong>LaunchIn 48 Admin Notification</strong><br>
        <a href="https://launchin48.app" style="color: #004aad; text-decoration: none;">https://launchin48.app</a>
      </p>
    </div>
  </div>
</body></html>`
            : `<html><body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fc; padding: 25px; color: #222; line-height: 1.7;">
  <div style="max-width: 650px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 30px;">
    
    <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px;" />
    <h2 style="text-align:center; color:#0078D7; border-bottom: 3px solid #0078D7; padding-bottom:10px; margin-top:0;">
      💵 NEW PAYMENT ALERT!
    </h2>

    <h3 style="color:#333; margin-top:30px;">👥 CUSTOMER DETAILS</h3>
    <ul style="list-style:none; padding-left:0; background:#f3f6fa; border-radius:8px; padding:15px;">
      <li><strong>Name:</strong> ${userData.full_name || 'Not provided'}</li>
      <li><strong>Email:</strong> ${userData.email}</li>
      <li><strong>Phone:</strong> ${userData.phone || 'Not provided'}</li>
      <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
    </ul>

    <h3 style="color:#333;">💰 PAYMENT SUMMARY</h3>
    <ul style="list-style:none; padding-left:0; background:#f9f9f9; border-left:4px solid #28a745; border-radius:8px; padding:15px;">
      <li><strong>Current Payment:</strong> ₹${payment.amount.toLocaleString()}</li>
      <li><strong>Total Paid:</strong> ₹${totalPaidAmount.toLocaleString()}</li>
      <li><strong>Project Total:</strong> ₹${projectData.total_amount.toLocaleString()}</li>
      ${remainingAmount > 0 
        ? `<li><strong>Remaining:</strong> <span style="color:#ff9800;">₹${remainingAmount.toLocaleString()} (🟡 PARTIAL PAYMENT)</span></li>` 
        : '<li><strong>Status:</strong> <span style="color:#28a745;">✅ FULLY PAID</span></li>'}
    </ul>

    <h3 style="color:#333;">🏷️ PROJECT DETAILS</h3>
    <ul style="list-style:none; padding-left:0; background:#f3f6fa; border-radius:8px; padding:15px;">
      <li><strong>Service:</strong> ${projectData.title}</li>
      <li><strong>Description:</strong> ${projectData.description || 'No description'}</li>
    </ul>

    <h3 style="color:#333;">⏰ ACTION REQUIRED</h3>
    <div style="background:#fff3cd; padding:15px; border-radius:8px; border-left:4px solid #ffc107; margin-bottom:20px;">
      <p><strong>📞 Contact the customer within 30 minutes!</strong></p>
      <p>${remainingAmount > 0 
        ? '📋 Note: This is a partial payment. Customer can pay remaining amount anytime.' 
        : '🎉 Full payment received — ready to start project!'}</p>
    </div>

    <p style="font-size:15px;">
      <strong>Quick Actions:</strong><br>
      Email: <a href="mailto:${userData.email}" style="color:#0078D7;">${userData.email}</a><br>
      Phone: ${userData.phone || 'Not available'}<br>
      Admin Dashboard: <a href="${request.nextUrl.origin}/admin" style="color:#0078D7; text-decoration:none; font-weight:bold;">Login to view project details</a>
    </p>

    <hr style="border:none; border-top:1px solid #ddd; margin:25px 0;">
    <p style="text-align:center; font-size:13px; color:#666;">⚙️ Launchin48 Admin System — Payment Notification</p>
  </div>
</body></html>`
          
          const adminEmailResponse = await fetch(`${request.nextUrl.origin}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientEmail: "jaydhole.739@gmail.com",
              subject: adminEmailSubject,
              body: adminEmailBody,
              type: "admin_notification",
              metadata: {
                customer_id: user.id,
                payment_id: razorpay_payment_id,
                project_id: payment.project_id,
                amount: payment.amount,
                total_paid: totalPaidAmount,
                remaining: remainingAmount,
                is_fully_paid: isFullyPaid,
                customer_email: userData.email
              },
            }),
          })
          
          const adminEmailResult = await adminEmailResponse.json()
          if (adminEmailResponse.ok) {
            console.log('✅ Admin email sent successfully:', adminEmailResult)
          } else {
            console.error('❌ Admin email failed:', adminEmailResult)
          }
        } catch (emailError) {
          console.error("Error sending admin notification email:", emailError)
        }
        
        // Send SMS and WhatsApp confirmation
        if (userData.phone) {
          console.log(`📱 Attempting to send SMS/WhatsApp to: ${userData.phone}`)
          try {
            const smsResponse = await fetch(`${request.nextUrl.origin}/api/send-sms-whatsapp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phoneNumber: userData.phone,
                customerName: userData.full_name,
                serviceName: projectData.title,
                paymentId: razorpay_payment_id,
                currentPayment: payment.amount.toLocaleString(),
                totalPaid: totalPaidAmount.toLocaleString(),
                projectTotal: projectData.total_amount.toLocaleString(),
                remainingAmount: remainingAmount.toLocaleString(),
                isFullyPaid: isFullyPaid,
                sendSMS: true,
                sendWhatsApp: true,
                type: "payment_confirmation",
                metadata: {
                  payment_id: razorpay_payment_id,
                  project_id: payment.project_id,
                  customer_id: user.id
                }
              })
            })
            
            const smsResult = await smsResponse.json()
            if (smsResponse.ok) {
              console.log('✅ SMS/WhatsApp API call successful:', smsResult.message)
              if (smsResult.results) {
                smsResult.results.forEach((result: any) => {
                  if (result.success) {
                    console.log(`✅ ${result.type} sent successfully! ID: ${result.messageId}`)
                  } else {
                    console.error(`❌ ${result.type} failed: ${result.error}`)
                  }
                })
              }
            } else {
              console.error('❌ SMS/WhatsApp API failed:', smsResult)
            }
          } catch (smsError) {
            console.error('❌ Error calling SMS/WhatsApp API:', smsError)
          }
        } else {
          console.log('⚠️ No phone number available for SMS/WhatsApp')
        }
      }
    }

    return NextResponse.json({ success: true, message: "Payment verified successfully" })
  } catch (error: any) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}