// app/api/send/route.js
import { Resend } from "resend";

/**
 * Next.js App Router route handler for POST /api/send
 * Expects JSON body: { email: string, otp: string }
 */

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, otp } = body || {};

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: "Missing email or otp" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Compose HTML email (matching LaunchIn48 theme)
    const html = `
      <div style="font-family:Arial, sans-serif; max-width:600px; padding:24px; background:#071027; color:#ffffff; border-radius:10px;">
        <div style="width:110px; height:110px; border-radius:50%; overflow:hidden; margin:0 auto; background:#0a152b;">
          <img 
            src="https://launchin48.app/favicon.ico" 
            alt="LaunchIn48" 
            width="110" 
            height="110"
            style="display:block; width:110px; height:110px; border-radius:50%;"/>
        </div>

        <h2 style="color:#00eaff; text-align:center; margin:0 0 14px;">Your LaunchIn48 OTP</h2>
        <p style="opacity:0.85; margin:0 0 20px;">Use this code to verify your action. It will expire in 10 minutes.</p>
        <div style="background:#0f1a2b; padding:18px; border-radius:8px; text-align:center; font-size:28px; color:#00eaff; letter-spacing:6px; font-weight:600;">
          ${otp}
        </div>
        <p style="color:#bcd6ff; opacity:0.75; font-size:13px; margin-top:20px;">If you didn't request this, just ignore this email.</p>
        <div style="margin-top:18px; font-size:12px; color:#8eaedb;">© ${new Date().getFullYear()} LaunchIn48</div>
      </div>
    `;

    // send using Resend
    const result = await resend.emails.send({
      from: "LaunchIn48 <noreply@launchin48.app>",
      to: email,
      subject: "Your LaunchIn48 OTP Code",
      html,
    });

    return new Response(JSON.stringify({ success: true, id: result.id || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Log server-side (Vercel logs)
    console.error("API /api/send error:", err);

    // Avoid leaking internal errors to client
    return new Response(JSON.stringify({ error: "Server error: " + (err?.message || "") }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
