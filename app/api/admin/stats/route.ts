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

    // Users count
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })

    // Projects subsets
    const { data: allPaidProjects } = await supabase
      .from("projects")
      .select("id, status, total_amount, updated_at, created_at, title")
      .in("payment_status", ["paid", "partial"]) as any

    const totalProjects = allPaidProjects?.length || 0
    const activeProjects = (allPaidProjects || []).filter((p: any) => ["pending", "in_progress", "review"].includes(p.status)).length
    const completedProjects = (allPaidProjects || []).filter((p: any) => p.status === "completed").length

    // Project payments
    const { data: projectPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .not("payment_method", "ilike", "%maintenance%") as any

    const totalProjectRevenue = (projectPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    // Maintenance payments - use only the payments table (payment_method indicates maintenance)
    // Avoid summing `maintenance_payments` table here to prevent double-counting if payments are mirrored
    const { data: maintenanceRegularPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .ilike("payment_method", "%maintenance%")

    const totalMaintenanceRevenue = (maintenanceRegularPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    const totalRevenue = totalProjectRevenue + totalMaintenanceRevenue

    const totalProjectAmount = (allPaidProjects || []).reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0)
    // Remaining amount should only consider project totals vs project payments
    const totalRemainingAmount = Math.max(0, totalProjectAmount - totalProjectRevenue)

    // Pending payments count
    const { data: paymentsAll } = await supabase
      .from("payments")
      .select("status") as any
    const pendingPayments = (paymentsAll || []).filter((p: any) => p.status === "pending").length

    // Unread messages count
    const { count: unreadMessages } = await supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "new")

    // New users this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count: newUsersThisMonth } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString())

    // Recent activity: last 5 projects (with payments) and last 3 messages
    const { data: recentProjects } = await supabase
      .from("projects")
      .select("id, title, status, updated_at, created_at")
      .neq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(5)

    const { data: messages } = await supabase
      .from("contact_messages")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3)

    const activity: any[] = []
    ;(recentProjects || []).forEach((p: any) => {
      activity.push({
        id: p.id,
        type: "project",
        description: `Project "${p.title}" status: ${p.status}`,
        timestamp: p.updated_at || p.created_at,
        status: p.status,
      })
    })
    ;(messages || []).forEach((m: any) => {
      activity.push({
        id: m.id,
        type: "message",
        description: `New message from ${m.name}`,
        timestamp: m.created_at,
        status: m.status,
      })
    })
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalProjects,
        activeProjects,
        completedProjects,
        totalRevenue,
        totalProjectRevenue,
        totalMaintenanceRevenue,
        totalRemainingAmount,
        pendingPayments,
        unreadMessages: unreadMessages || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
      },
      recentActivity: activity.slice(0, 8),
    })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}