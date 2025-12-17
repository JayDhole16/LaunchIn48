"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CreditCard, 
  DollarSign, 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Wrench,
  Search,
  Mail,
  Phone
} from "lucide-react"

interface Payment {
  id: string
  project_id: string
  amount: number
  status: string
  payment_method?: string | null
  created_at: string
  razorpay_payment_id: string
  projects?: {
    title: string
    total_amount: number
    users?: {
      full_name?: string
      email?: string
      phone?: string
    } | null
  } | null
  user_summary?: {
    full_name?: string
    email?: string
    phone?: string
  } | null
}

interface MaintenanceCharge {
  id: string
  amount: number
  status: string
  due_date: string
  created_at: string
  projects: {
    title: string
    users: {
      full_name: string
      email: string
      phone: string
    }
  }
}

interface ProjectPaymentSummary {
  project_id: string
  project_title: string
  user_name: string
  user_email: string
  user_phone: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_status: string
  last_payment_date: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [maintenanceCharges, setMaintenanceCharges] = useState<MaintenanceCharge[]>([])
  const [projectSummaries, setProjectSummaries] = useState<ProjectPaymentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProjectRevenue: 0,
    totalMaintenanceRevenue: 0,
    pendingAmount: 0,
    maintenancePending: 0,
    totalPayments: 0,
    projectPaymentsCount: 0,
    maintenancePaymentsCount: 0
  })

  useEffect(() => {
    fetchPaymentsData()
  }, [])

const fetchPaymentsData = async () => {
    try {
      let paymentsData: Payment[] = []

      // Fetch all payments via admin API (server-side service role)
      const paymentsRes = await fetch('/api/admin/payments', { cache: 'no-store' })
      if (paymentsRes.ok) {
        const parsed = await paymentsRes.json()
        paymentsData = (parsed?.payments || []) as Payment[]
        setPayments(paymentsData)
      }

      // Fetch maintenance charges from project_maintenance table
      const maintenanceResponse = await fetch('/api/maintenance-charges?isAdmin=true', { cache: 'no-store' })
      if (maintenanceResponse.ok) {
        const { maintenanceCharges } = await maintenanceResponse.json()
        setMaintenanceCharges(maintenanceCharges || [])
      }

      // Create project payment summaries
      if (paymentsData && paymentsData.length > 0) {
        const projectGroups = paymentsData.reduce((acc: any, payment: any) => {
          const projectId = payment.project_id
          if (!projectId) return acc
          if (!acc[projectId]) {
            acc[projectId] = {
              project: payment.projects || null,
              payments: [] as any[]
            }
          }
          if (payment.status === 'completed') {
            acc[projectId].payments.push(payment)
          }
          return acc
        }, {} as Record<string, any>)

const summaries: ProjectPaymentSummary[] = Object.entries(projectGroups).map(([projectId, data]: [string, any]) => {
          const { project, payments: projectPayments } = data
          
          // IMPORTANT: Filter out maintenance payments - only count project payments
          const nonMaintenancePayments = (projectPayments as any[]).filter((p: any) => {
            const isMaintenance = p.payment_method?.includes('maintenance') || p.payment_method === 'maintenance'
            return !isMaintenance
          })
          
          const paidAmount = nonMaintenancePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
          
          // Use project's total_amount from database, fallback to calculated if missing
          const totalAmount = project?.total_amount || 0
          const remainingAmount = Math.max(0, totalAmount - paidAmount)
          
          // Correct payment_status calculation
          let paymentStatus = 'pending'
          if (paidAmount >= totalAmount && totalAmount > 0) {
            paymentStatus = 'paid'
          } else if (paidAmount > 0) {
            paymentStatus = 'partial'
          }
          
          const lastPayment = (projectPayments as Payment[]).sort((a: Payment, b: Payment) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]

          // Derive user details from either embedded project.users or from any payment.user_summary in this group
          const fallbackUser = (projectPayments as Payment[]).find(p => p.user_summary)?.user_summary || null
          const userName = project?.users?.full_name || fallbackUser?.full_name || 'N/A'
          const userEmail = project?.users?.email || fallbackUser?.email || 'N/A'
          const userPhone = project?.users?.phone || fallbackUser?.phone || 'N/A'

          return {
            project_id: projectId,
            project_title: (project?.title || 'Unknown project'),
            user_name: userName,
            user_email: userEmail,
            user_phone: userPhone,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            remaining_amount: remainingAmount,
            payment_status: paymentStatus,
            last_payment_date: lastPayment?.created_at || ''
          }
        }).filter((summary: ProjectPaymentSummary) => summary.paid_amount > 0) // Only show projects with payments

        setProjectSummaries(summaries)

        // Calculate stats - separate project and maintenance payments
        const completedPayments = paymentsData.filter((p: Payment) => p.status === 'completed')
        // More robust maintenance payment detection
        const projectPayments = completedPayments.filter((p: Payment) => 
          !p.payment_method?.includes('maintenance') && 
          p.payment_method !== 'maintenance'
        )
        const maintenancePaymentsData = completedPayments.filter((p: Payment) => 
          p.payment_method?.includes('maintenance') || 
          p.payment_method === 'maintenance'
        )
        
        const totalProjectRevenue = projectPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0)
        const totalMaintenanceRevenue = maintenancePaymentsData.reduce((sum: number, p: Payment) => sum + p.amount, 0)
        const totalRevenue = totalProjectRevenue + totalMaintenanceRevenue
        
        // Calculate pending amount only from partial payments (not fully paid)
        const pendingAmount = summaries
          .filter((s: ProjectPaymentSummary) => s.payment_status === 'partial')
          .reduce((sum: number, s: ProjectPaymentSummary) => sum + s.remaining_amount, 0)
        const maintenancePending = (maintenanceCharges || []).filter((m: any) => m.status === 'pending')
          .reduce((sum: number, m: any) => sum + (m.amount || 0), 0) || 0

        setStats({
          totalRevenue,
          totalProjectRevenue,
          totalMaintenanceRevenue, 
          pendingAmount,
          maintenancePending,
          totalPayments: completedPayments.length,
          projectPaymentsCount: projectPayments.length,
          maintenancePaymentsCount: maintenancePaymentsData.length
        })
      }
    } catch (error) {
      console.error('Error fetching payments data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment =>
    ((payment.projects?.users?.full_name || payment.user_summary?.full_name || payment.projects?.users?.email || payment.user_summary?.email || payment.projects?.title || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())) ||
    (payment.razorpay_payment_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSummaries = projectSummaries.filter(summary =>
    summary.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.project_title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMaintenance = maintenanceCharges.filter(charge =>
    charge.projects?.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charge.projects?.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charge.projects?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Comprehensive view of all payments and maintenance charges</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div className="flex items-center justify-between">
                <span>Projects: ₹{stats.totalProjectRevenue?.toLocaleString() || '0'}</span>
                <Badge variant="outline" className="text-xs">{stats.projectPaymentsCount || 0} payments</Badge>
              </div>
              {stats.totalMaintenanceRevenue > 0 && (
                <div className="flex items-center justify-between">
                  <span>Maintenance: ₹{stats.totalMaintenanceRevenue?.toLocaleString() || '0'}</span>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">{stats.maintenancePaymentsCount || 0} payments</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{stats.pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From project balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Pending</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{stats.maintenancePending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{maintenanceCharges.filter(m => m.status === 'pending').length} charges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹{(stats.pendingAmount + stats.maintenancePending).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All pending amounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email, project, or payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summaries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summaries">Project Summaries</TabsTrigger>
          <TabsTrigger value="payments">All Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Charges</TabsTrigger>
        </TabsList>

        <TabsContent value="summaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Payment Summaries</CardTitle>
              <CardDescription>Overview of payment status for each project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSummaries.map((summary) => (
                  <div key={summary.project_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{summary.project_title}</h4>
                        <Badge 
                          className={summary.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                          variant="secondary"
                        >
                          {summary.payment_status === 'paid' ? '✓ Fully Paid' : `₹${summary.remaining_amount.toLocaleString()} Pending`}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {summary.user_name}
                        </span>
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {summary.user_email}
                        </span>
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {summary.user_phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-green-600">Paid: ₹{summary.paid_amount.toLocaleString()}</span>
                        <span className="text-gray-600">Total: ₹{summary.total_amount.toLocaleString()}</span>
                        {summary.last_payment_date && (
                          <span className="text-muted-foreground">
                            Last payment: {new Date(summary.last_payment_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ₹{summary.paid_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of ₹{summary.total_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Payment Transactions</CardTitle>
              <CardDescription>Complete history of all payments received</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
            <h4 className="font-medium">{payment.projects?.title || 'Project'}</h4>
                        <Badge 
                          className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                          variant="secondary"
                        >
                          {payment.status}
                        </Badge>
                        {(payment.payment_method?.includes('maintenance') || payment.payment_method === 'maintenance') ? (
                          <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                            <Wrench className="h-3 w-3 mr-1" />
                            Maintenance
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800" variant="secondary">
                            Project
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {payment.projects?.users?.full_name || payment.user_summary?.full_name || payment.projects?.users?.email || payment.user_summary?.email || 'N/A'}
                        </span>
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {payment.projects?.users?.email || payment.user_summary?.email || 'N/A'}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Payment ID: {payment.razorpay_payment_id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        ₹{payment.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.projects?.total_amount !== undefined && (
                          <>
                            Project: ₹{payment.projects.total_amount.toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Charges</CardTitle>
              <CardDescription>Maintenance fees for completed projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMaintenance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No maintenance charges found</p>
                  </div>
                ) : (
                  filteredMaintenance.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{charge.projects?.title || 'Project'}</h4>
                          <Badge 
                            className={charge.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                            variant="secondary"
                          >
                            {charge.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {charge.projects?.users?.full_name || charge.projects?.users?.email || 'N/A'}
                          </span>
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {charge.projects?.users?.email}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Due: {new Date(charge.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">
                          ₹{charge.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(charge.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}