import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { customerEmail } = await request.json()
    
    // Use admin email (working) vs customer email (not working) to compare
    const testEmails = [
      {
        email: "jaydhole.739@gmail.com",
        label: "Admin Email (Known Working)"
      },
      {
        email: customerEmail || "delivered@resend.dev",
        label: "Customer Email (Testing)"
      }
    ]

    const results = []

    for (const testCase of testEmails) {
      console.log(`🧪 Testing email to: ${testCase.email} (${testCase.label})`)
      
      try {
        const emailResponse = await fetch(`${request.nextUrl.origin}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: testCase.email,
            subject: `🧪 Test Customer Email - ${testCase.label}`,
            body: `🧪 EMAIL TEST - ${testCase.label}

This is a test to debug why customer emails are not being received.

📧 Recipient: ${testCase.email}
⏰ Time: ${new Date().toISOString()}
🔍 Test Type: ${testCase.label}

If you receive this email, then email delivery to this address works correctly.

Best regards,
🚀 LaunchIn 48 Team`,
            type: "email_test",
            metadata: {
              test_type: testCase.label,
              recipient: testCase.email,
              timestamp: new Date().toISOString()
            }
          })
        })

        const emailResult = await emailResponse.json()
        
        const result = {
          email: testCase.email,
          label: testCase.label,
          success: emailResponse.ok,
          status: emailResponse.status,
          result: emailResult
        }

        console.log(`📋 Result for ${testCase.email}:`, result)
        results.push(result)
        
      } catch (error) {
        console.error(`❌ Error testing ${testCase.email}:`, error)
        results.push({
          email: testCase.email,
          label: testCase.label,
          success: false,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email tests completed",
      results: results,
      summary: {
        admin_email_works: results.find(r => r.email === "jaydhole.739@gmail.com")?.success || false,
        customer_email_works: results.find(r => r.email !== "jaydhole.739@gmail.com")?.success || false
      }
    })

  } catch (error: any) {
    console.error("❌ Email test error:", error)
    return NextResponse.json({ 
      error: error.message || "Test failed" 
    }, { status: 500 })
  }
}