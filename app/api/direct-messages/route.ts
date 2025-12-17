import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch direct messages (where project_id is null)
    const { data: messages, error } = await supabase
      .from("project_messages")
      .select(`
        id,
        sender_type,
        message,
        created_at,
        read_at
      `)
      .eq("user_id", user.id)
      .is("project_id", null)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch direct messages" }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error("Error fetching direct messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Insert direct message (project_id = null)
    const { data: newMessage, error } = await supabase
      .from("project_messages")
      .insert({
        project_id: null, // Direct message to admin
        user_id: user.id,
        sender_type: "user",
        message: message.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting direct message:", error)
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    // Get user details for admin notification (use service role client to bypass RLS)
    const service = createServiceClient()
    const { data: userData } = await service
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .single()

    // Send admin notification email for direct message
    if (userData) {
      try {
        await fetch(`${request.nextUrl.origin}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: "jaydhole.739@gmail.com",
            subject: "💬 New Direct Message - LaunchIn 48",
            body: `📨 NEW DIRECT MESSAGE RECEIVED

👤 FROM USER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Name: ${userData.full_name || 'Not provided'}
• Email: ${userData.email}
• User ID: ${user.id}

💬 MESSAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${message.trim()}

⏰ ACTION REQUIRED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a direct message from a user. Please respond via the admin dashboard.

📧 Quick Reply: ${userData.email}
🔗 Admin Dashboard: [Login to respond]

Note: User may not have any projects yet - this could be a pre-sales inquiry.`,
            type: "direct_message_notification",
            metadata: {
              user_id: user.id,
              user_email: userData.email,
              message_type: "direct_message"
            },
          }),
        })
      } catch (emailError) {
        console.error("Error sending admin notification email:", emailError)
        // Don't fail the message send if email fails
      }
    }

    return NextResponse.json({ message: newMessage })
  } catch (error: any) {
    console.error("Error sending direct message:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}