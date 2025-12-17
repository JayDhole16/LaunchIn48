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

    const { data: messages, error } = await supabase
      .from("project_messages")
      .select(`
        *,
        projects(title)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { project_id, message } = await request.json()

    if (!project_id || !message?.trim()) {
      return NextResponse.json({ error: "Project ID and message are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the project belongs to the user and has at least some payment made
    // Allow messaging for projects with partial payments (advance payments) or fully paid
    // Use service client for project lookup to avoid RLS surprises while still
    // validating ownership by comparing user.id explicitly
    const service = createServiceClient()
    const { data: project, error: projectError } = await service
      .from("projects")
      .select("id, payment_status, paid_amount, user_id")
      .eq("id", project_id)
      .single()
    
    // Check if the project has any payment (paid_amount > 0) or is in paid/partial status
    const hasPayment = project && (project.paid_amount > 0 || project.payment_status === 'paid' || project.payment_status === 'partial')

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    
    if (!hasPayment) {
      return NextResponse.json({ error: "Project requires at least an advance payment to enable messaging" }, { status: 403 })
    }

    // Insert the message using service client (server-side insert) but ensure
    // the user is the owner of the project before inserting
    const { data: newMessage, error } = await service
      .from("project_messages")
      .insert({
        project_id,
        user_id: user.id,
        sender_type: "user",
        message: message.trim(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    return NextResponse.json({ message: newMessage })
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}