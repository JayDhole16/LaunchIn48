"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { FolderOpen, CreditCard, Clock, CheckCircle, AlertCircle, Plus, ArrowRight } from "lucide-react"

interface Project {
  id: string
  title: string
  status: string
  total_amount: number
  payment_status: string
  paid_amount?: number
  remaining_amount?: number
  created_at: string
  due_date: string
}

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalSpent: number
  projectSpent: number
  maintenanceSpent: number
  totalRemainingAmount: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    projectSpent: 0,
    maintenanceSpent: 0,
    totalRemainingAmount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use server APIs (service role) to ensure consistent data with Payments page
      const projectsRes = await fetch('/api/user/projects', { cache: 'no-store' })
      const projectsJson = await projectsRes.json().catch(() => ({ projects: [] }))
      const projectsData = projectsRes.ok ? (projectsJson.projects || []) : []

      const paymentsRes = await fetch('/api/user/payments', { cache: 'no-store' })
      const paymentsJson = await paymentsRes.json().catch(() => ({ payments: [] }))
      const userPayments = paymentsRes.ok ? (paymentsJson.payments || []) : []

      // Prepare projects list for recent section (limit 5)
      const processedProjects = (projectsData || []).map((project: any) => {
        const completedPayments = project.payments?.filter((p: any) => p.status === 'completed') || []
        const calculatedPaid = completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        const paid_amount = typeof project.paid_amount === 'number' ? project.paid_amount : calculatedPaid
        const remaining_amount = typeof project.remaining_amount === 'number'
          ? project.remaining_amount
          : Math.max(0, (project.total_amount || 0) - (paid_amount || 0))
        const payment_status = project.payment_status || (remaining_amount > 0 ? 'partial' : 'paid')
        return { ...project, paid_amount, remaining_amount, payment_status }
      })

      // Show all processed projects (do not restrict to projects with payments only)
      const eligibleProjects = processedProjects

      setProjects(eligibleProjects.slice(0, 5))

      // Compute stats using all eligible projects
      const totalProjects = eligibleProjects.length
      const activeProjects = eligibleProjects.filter((p: any) => ["pending", "in_progress", "review"].includes(p.status)).length
      const completedProjects = eligibleProjects.filter((p: any) => p.status === 'completed').length

  // Only consider completed payments for totals; exclude maintenance from project totals
  const projectPayments = (userPayments || []).filter((p: any) => p.status === 'completed' && !p.payment_method?.includes('maintenance') && p.payment_method !== 'maintenance')
  const maintenancePayments = (userPayments || []).filter((p: any) => p.status === 'completed' && (p.payment_method?.includes('maintenance') || p.payment_method === 'maintenance'))
      const projectSpent = projectPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      const maintenanceSpent = maintenancePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      const totalSpent = projectSpent + maintenanceSpent

      const totalRemainingAmount = eligibleProjects.reduce((sum: number, p: any) => sum + (p.remaining_amount || 0), 0)

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        totalSpent,
        projectSpent,
        maintenanceSpent,
        totalRemainingAmount,
      })

      setIsLoading(false)
    }

    fetchDashboardData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "review":
        return "bg-yellow-100 text-yellow-800"
      case "pending":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
      case "pending":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your projects.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalSpent.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Projects: ₹{stats.projectSpent?.toLocaleString() || '0'}</div>
              {stats.maintenanceSpent > 0 && (
                <div>Maintenance: ₹{stats.maintenanceSpent?.toLocaleString()}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Pending Payments Row - only show if there are pending amounts */}
      {stats.totalRemainingAmount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Pending Payments</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">₹{stats.totalRemainingAmount.toLocaleString()}</div>
              <p className="text-xs text-orange-600 mt-1">
                Total remaining amount from {projects.filter(p => (p.remaining_amount || 0) > 0).length} project(s)
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Payment Progress</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {Math.round((stats.totalSpent / (stats.totalSpent + stats.totalRemainingAmount)) * 100)}%
              </div>
              <p className="text-xs text-blue-600 mt-1">
                ₹{stats.totalSpent.toLocaleString()} of ₹{(stats.totalSpent + stats.totalRemainingAmount).toLocaleString()} paid
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Quick Payment</CardTitle>
              <Plus className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/projects">
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                  Pay Pending Amounts
                </Button>
              </Link>
              <p className="text-xs text-green-600 mt-2">
                Complete your project payments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>Your latest project updates</CardDescription>
              </div>
              <Link href="/dashboard/projects">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Link href="/services">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Start New Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{project.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(project.status)} variant="secondary">
                          {project.status.replace("_", " ")}
                        </Badge>
                        <Badge className={getPaymentStatusColor(project.payment_status)} variant="secondary">
                          {project.payment_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{project.total_amount?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/services">
              <Button className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Start New Project
              </Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <FolderOpen className="mr-2 h-4 w-4" />
                View All Projects
              </Button>
            </Link>
            <Link href="/dashboard/payments">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <CreditCard className="mr-2 h-4 w-4" />
                Payment History
              </Button>
            </Link>
            <Link href="/services">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <AlertCircle className="mr-2 h-4 w-4" />
                View Services
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
