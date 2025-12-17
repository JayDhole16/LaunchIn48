import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    // Accept title/description/total_amount from client; fall back to legacy fields
    const { title, description, service_id, requirements, budget, total_amount, timeline } = body

    // Create new project with draft status (will be activated after payment)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        // ensure title is not null to satisfy DB NOT NULL constraint
        title: title || "Untitled Project",
        description: description || null,
        service_id,
        requirements,
        budget,
        timeline,
  // Use a DB-valid status. 'draft' is not part of the allowed values in the
  // projects table check constraint. Use 'pending' which represents a newly
  // created project awaiting payment/activation.
  status: "pending",
        progress: 0,
  // use 'pending' which matches DB CHECK constraint values
  payment_status: "pending",
        total_amount: total_amount || budget || 0,
        paid_amount: 0,
      })
      .select()
      .single()

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = supabase.from("projects").select(`
        *,
        services (name, price),
        users (full_name, email)
      `)

    // Check if user is admin
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      // Regular users only see active/paid projects (not draft projects)
      query = query.eq("user_id", user.id).neq("status", "draft")
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: projects, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}