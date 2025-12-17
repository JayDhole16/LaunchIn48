"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard-header"
import { AdminSidebar } from "@/components/admin-sidebar"

interface User {
  id: string
  email: string
  full_name?: string
  phone?: string
  company_name?: string
  role: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        // Prefer direct Supabase check to avoid API 500s
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.replace('/auth/login')
          return
        }

        // Try fetching profile; if fails, deny access unless role explicitly admin
        const { data: profile } = await supabase
          .from('users')
          .select('id, email, full_name, phone, company_name, role')
          .eq('id', authUser.id)
          .maybeSingle()

        const role = profile?.role
        if (role !== 'admin') {
          router.replace('/dashboard')
          return
        }

        setUser(profile ?? { id: authUser.id, email: authUser.email || '', role: 'admin' } as any)
      } catch (e) {
        console.error('Failed to verify admin session:', e)
        router.replace('/auth/login')
        return
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen} />
      <div className="flex">
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
