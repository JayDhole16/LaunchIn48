import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.reason }, { status: auth.status })
    }

    const supabase = createServiceClient()

    const debug = new URL(_req.url).searchParams.get('debug') === '1'

    let { data: projects, error } = await supabase
      .from("projects")
      .select(`
        id,
        user_id,
        service_id,
        title,
        description,
        requirements,
        status,
        priority,
        start_date,
        due_date,
        completed_date,
        total_amount,
        paid_amount,
        remaining_amount,
        payment_status,
        created_at,
        updated_at,
        users (
          full_name,
          email,
          phone,
          company_name
        ),
        payments (
          amount,
          status,
          created_at,
          payment_method
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      // Fallback to simpler selection to avoid embed errors
      const fb = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (fb.error) {
        return NextResponse.json({ error: error.message, fallback_error: fb.error.message }, { status: 500 })
      }
      projects = fb.data as any
    }

    // Enrich with user summaries to avoid relying on embedded relations
    const userIds = Array.from(new Set((projects || []).map((p: any) => p.user_id).filter(Boolean)))
    let usersById: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email, phone, company_name')
        .in('id', userIds)
      usersById = Object.fromEntries((usersData || []).map((u: any) => [u.id, u]))
    }

    const projectsWithUser = (projects || []).map((p: any) => ({
      ...p,
      user_summary: usersById[p.user_id] || null,
    }))

    if (debug) {
      return NextResponse.json({ count: projectsWithUser.length, sample: projectsWithUser[0] || null })
    }

    return NextResponse.json({ projects: projectsWithUser })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
