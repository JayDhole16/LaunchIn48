import { NextResponse, type NextRequest } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, phone, companyName, notes } = body || {}

    if (!fullName || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email sending not configured (RESEND_API_KEY missing)" }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const to = "jaydhole.739@gmail.com"
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@launchin48.app"

    const subject = `URGENT: Manual signup request from ${fullName}`
    const html = `
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 25px; color: #222;">
  <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08); padding: 30px;">
    <img src="https://launchin48.app/favicon.ico" alt="LaunchIn48 Logo" style="width: 60px; height: 60px; border-radius: 12px;" />
    <h2 style="color: #0078D7; text-align: center; border-bottom: 3px solid #0078D7; padding-bottom: 10px; margin-top: 0;">
      ⚠️ Manual Signup Request — Contact Immediately
    </h2>

    <p style="font-size: 15px; color: #333; line-height: 1.7; margin-top: 20px;">
      The following user requested to create an account and asked to be contacted immediately.
    </p>

    <div style="background: #f9fafc; border-left: 4px solid #0078D7; border-radius: 8px; padding: 15px; margin-top: 20px;">
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #0078D7; text-decoration: none;">${email}</a></p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Company:</strong> ${companyName || "-"}</p>
    </div>

    <div style="margin-top: 25px; background: #fffbe6; border-left: 4px solid #ffb300; border-radius: 8px; padding: 15px;">
      <p style="margin: 0;"><strong>📝 Notes:</strong></p>
      <p style="white-space: pre-line; margin-top: 8px;">${(notes || "-").toString().replace(/</g, "&lt;")}</p>
    </div>

    <p style="text-align: center; margin-top: 35px; font-size: 13px; color: #777;">
      📩 Launchin48 Admin Notification System
    </p>
  </div>
</body>
    `
    const { error } = await resend.emails.send({ from: fromEmail, to: [to], subject, html })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}




