import { createServerClient } from "@/lib/supabase/server"

export async function requireAdmin() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, status: 401 as const, reason: "Unauthorized" as const }
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    return { ok: false as const, status: 403 as const, reason: "Forbidden" as const }
  }

  if (profile.role !== "admin") {
    return { ok: false as const, status: 403 as const, reason: "Forbidden" as const }
  }

  return { ok: true as const, userId: user.id }
}
