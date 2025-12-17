import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  try {
    const { recipientEmail, subject, body, type, metadata } = await request.json()

    // Initialize Supabase client
    const supabase = await createServerClient()

    // Try to store email notification in database first (optional)
    let emailRecord = null
    
    try {
      const { data, error } = await supabase
        .from("email_notifications")
        .insert({
          recipient_email: recipientEmail,
          subject,
          body,
          type,
          metadata,
          status: "pending",
        })
        .select()
        .single()
      
      if (error) {
        console.log("Database logging failed (continuing without DB storage):", error.message)
      } else {
        emailRecord = data
        console.log("Email notification stored in database with ID:", data?.id)
      }
    } catch (error) {
      console.log("Email notifications table not available, continuing without database storage")
    }

    // Initialize Resend with API key from environment variables
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send email using Resend
    // Use onboarding@resend.dev as sender since launchin48.com domain is not verified
    const fromEmail ="payment@launchin48.app"
    
    console.log(`📧 Sending email:`, {
      from: fromEmail,
      to: recipientEmail,
      subject: subject,
      type: type,
      hasApiKey: !!process.env.RESEND_API_KEY
    })
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject: subject,
      html: body,
    })

    if (error) {
      console.error("Error sending email:", error)
      // Update database record as failed (if it exists)
      if (emailRecord) {
        try {
          await supabase
            .from("email_notifications")
            .update({
              status: "failed",
              error: error.message,
            })
            .eq("id", emailRecord.id)
        } catch (updateError) {
          console.error("Error updating email record as failed:", updateError)
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        error: "Failed to send email",
        details: error.message 
      }, { status: 500 })
    }

    // Update database record as sent (if it exists)
    if (emailRecord) {
      try {
        await supabase
          .from("email_notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", emailRecord.id)
      } catch (updateError) {
        console.error("Error updating email record as sent:", updateError)
      }
    }

    // Log successful email
    console.log("✅ Email notification sent successfully:", {
      id: data?.id,
      recipient: recipientEmail,
      subject,
      type,
      status: "sent",
      from: fromEmail
    })

    return NextResponse.json({
      success: true,
      message: "Email notification sent successfully",
      emailId: data?.id,
    })
  } catch (error: any) {
    console.error("Error in send-email API:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}