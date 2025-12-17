"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, CreditCard, Calendar, CheckCircle, Clock, AlertCircle, Filter, DollarSign } from "lucide-react"
import { RemainingPaymentButton } from "@/components/remaining-payment-button"
import { MaintenancePaymentButton } from "@/components/maintenance-payment-button"

interface Payment {
  id: string
  project_id: string
  razorpay_payment_id: string
  razorpay_order_id: string
  amount: number
  currency: string
  status: string
  payment_method: string
  created_at: string
  projects: {
    title: string
    description: string
  }
}

interface MaintenanceCharge {
  id: string
  project_id: string
  amount: number
  status: string
  due_date: string
  created_at: string
  projects: {
    title: string
  }
}

interface Project {
  id: string
  title: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_status: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [maintenanceCharges, setMaintenanceCharges] = useState<MaintenanceCharge[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const searchParams = useSearchParams()

  const success = searchParams.get("success")
  const paymentId = searchParams.get("payment_id")

  useEffect(() => {
    const fetchPayments = async () => {
      // First, cleanup any stale pending payments
      try {
        console.log('Starting cleanup of stale pending payments...')
        const cleanupResponse = await fetch('/api/cleanup-pending-payments', {
          method: 'POST',
        })
        const cleanupResult = await cleanupResponse.json()
        console.log('Cleanup result:', cleanupResult)
      } catch (error) {
        console.error('Error cleaning up pending payments:', error)
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

  // Fetch payments via server API (service role, bypass RLS)
  // Request all payments so the UI can filter by status client-side; totals will still
  // be computed using only completed payments.
  const paymentsRes = await fetch('/api/user/payments?status=all', { cache: 'no-store' })
      const paymentsJson = await paymentsRes.json()
      const paymentsData = paymentsRes.ok ? paymentsJson.payments : []

      if (paymentsData) {
        setPayments(paymentsData)
        setFilteredPayments(paymentsData)
      }

      // Fetch maintenance charges via service API path if available; otherwise skip silently
      let maintenanceData: any[] = []
      try {
        const resp = await fetch('/api/user/maintenance-charges', { cache: 'no-store' })
        if (resp.ok) {
          const json = await resp.json()
          maintenanceData = json?.maintenance_charges || []
        }
      } catch {}

      if (maintenanceData) {
        setMaintenanceCharges(maintenanceData)
      }

      // Fetch projects via server API (service role, bypass RLS)
      const projectsRes = await fetch('/api/user/projects', { cache: 'no-store' })
      const projectsJson = await projectsRes.json()
      const projectsData = projectsRes.ok ? projectsJson.projects : []

      if (projectsData) {
        // Use database values for paid/remaining amounts (updated by payment verification)
        const processedProjects = projectsData.map(project => {
          // Use database values if available, otherwise calculate
          // IMPORTANT: Exclude maintenance payments from project payment calculations
          const projectPayments = project.payments?.filter(
            (payment: any) => {
              const isCompleted = payment.status === 'completed'
              const isMaintenance = payment.payment_method?.includes('maintenance') || payment.payment_method === 'maintenance'
              return isCompleted && !isMaintenance
            }
          ) || []
          
          const calculatedPaidAmount = projectPayments.reduce(
            (sum: number, payment: any) => sum + (payment.amount || 0), 0
          )
          
          // Prioritize database values, fallback to calculated values
          // Always calculate based on payments to ensure accuracy
          const paidAmount = calculatedPaidAmount || project.paid_amount || 0
          const remainingAmount = Math.max(0, project.total_amount - paidAmount)
          
          console.log(`Project: ${project.title}`, {
            total_amount: project.total_amount,
            db_paid_amount: project.paid_amount,
            calculated_paid: calculatedPaidAmount,
            final_paid: paidAmount,
            final_remaining: remainingAmount,
            has_advance_payment: paidAmount > 0 && remainingAmount > 0
          })
          
          return {
            ...project,
            paid_amount: paidAmount,
            remaining_amount: remainingAmount
          }
        })
        
        setProjects(processedProjects)
      }

      setIsLoading(false)
    }

    fetchPayments()
  }, [])

  useEffect(() => {
    let filtered = payments

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.projects.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.razorpay_order_id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter)
    }

    setFilteredPayments(filtered)
  }, [payments, searchTerm, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "refunded":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "failed":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  // Calculate total paid including ALL completed payments (project + maintenance)
  const totalPaid = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)
  
  // Separate project payments and maintenance payments for better tracking
  const projectPayments = payments.filter((p) => 
    p.status === "completed" && 
    !p.payment_method?.includes('maintenance') && 
    p.payment_method !== 'maintenance'
  )
  const maintenancePayments = payments.filter((p) => 
    p.status === "completed" && 
    (p.payment_method?.includes('maintenance') || p.payment_method === 'maintenance')
  )
  
  const totalProjectPaid = projectPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalMaintenancePaid = maintenancePayments.reduce((sum, p) => sum + p.amount, 0)
  
  console.log('💰 Payment breakdown:', {
    total_paid: totalPaid,
    project_payments: totalProjectPaid,
    maintenance_payments: totalMaintenancePaid,
    maintenance_count: maintenancePayments.length
  })

  // Calculate total pending amount including:
  // 1. Project remaining amounts (only for projects with advance payments made)
  // 2. Pending maintenance charges
  // Note: Exclude pending payments and draft projects
  // Debug: Log all projects to understand the data
  console.log('All projects:', projects.map(p => ({
    title: p.title,
    total_amount: p.total_amount,
    paid_amount: p.paid_amount,
    remaining_amount: p.remaining_amount,
    payment_status: p.payment_status
  })))
  
  // Find projects with advance payments (paid amount > 0 and remaining amount > 0)
  const projectsWithAdvancePayments = projects.filter((p) => {
    const hasAdvancePayment = p.paid_amount > 0 && p.remaining_amount > 0
    const isPartiallyPaid = p.payment_status === 'partial'
    return hasAdvancePayment || isPartiallyPaid
  })
  
  console.log('Projects with advance payments:', projectsWithAdvancePayments.map(p => ({
    title: p.title,
    paid_amount: p.paid_amount,
    remaining_amount: p.remaining_amount,
    payment_status: p.payment_status,
    qualified: p.paid_amount > 0 && p.remaining_amount > 0
  })))
  
  const projectRemainingAmounts = projectsWithAdvancePayments
    .reduce((sum, p) => sum + p.remaining_amount, 0)
  
  // Calculate pending maintenance charges
  // Since maintenanceCharges comes from the maintenance_charges table which might not exist,
  // we'll calculate overdue maintenance from projects with expired free periods
  let pendingMaintenanceCharges = 0
  
  if (maintenanceCharges && maintenanceCharges.length > 0) {
    // Use actual maintenance charges if available
    pendingMaintenanceCharges = maintenanceCharges
      .filter((mc) => mc.status === "pending")
      .reduce((sum, mc) => sum + mc.amount, 0)
  } else {
    // Calculate estimated maintenance dues from expired free periods
    // This is a fallback until maintenance tables are fully implemented
    console.log('🔄 Calculating maintenance dues from project data...')
    // For now, set to 0 until maintenance tables are created
    pendingMaintenanceCharges = 0
  }
    
  const totalPendingAmount = projectRemainingAmounts + pendingMaintenanceCharges

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {success === "true" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payment successful! Your payment has been processed. Our team will get in touch with you within 30 minutes.
            {paymentId && <span className="block mt-1 text-sm">Payment ID: {paymentId}</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">Track your successful payments and completed transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div className="flex items-center justify-between">
                <span>Projects: ₹{totalProjectPaid.toLocaleString()}</span>
                <Badge variant="outline" className="text-xs">{projectPayments.length} payments</Badge>
              </div>
              {totalMaintenancePaid > 0 && (
                <div className="flex items-center justify-between">
                  <span>Maintenance: ₹{totalMaintenancePaid.toLocaleString()}</span>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">{maintenancePayments.length} payments</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">₹{totalPendingAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              {projectRemainingAmounts > 0 && (
                <div className="flex items-center justify-between">
                  <span>Project Remaining: ₹{projectRemainingAmounts.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs">Advance paid</Badge>
                </div>
              )}
              {pendingMaintenanceCharges > 0 && (
                <div className="flex items-center justify-between">
                  <span>Maintenance: ₹{pendingMaintenanceCharges.toLocaleString()}</span>
                  <Badge variant="destructive" className="text-xs">Due now</Badge>
                </div>
              )}
              {totalPendingAmount === 0 && (
                <span className="text-green-600">All payments up to date!</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{pendingMaintenanceCharges.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {maintenanceCharges.filter(mc => mc.status === "pending").length} pending
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Remaining Payments Section */}
      {projectsWithAdvancePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Projects with Remaining Balance
            </CardTitle>
            <CardDescription>
              Complete payment for projects with advance payments made
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {projectsWithAdvancePayments
                .map(project => (
                  <div key={project.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{project.title}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div>Total: ₹{project.total_amount.toLocaleString()}</div>
                        <div>Paid: ₹{project.paid_amount.toLocaleString()}</div>
                        <div className="font-medium text-orange-600">
                          Remaining: ₹{project.remaining_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto">
                      <RemainingPaymentButton
                        projectId={project.id}
                        remainingAmount={project.remaining_amount}
                        projectTitle={project.title}
                        paidAmount={project.paid_amount}
                        totalAmount={project.total_amount}
                      />
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Due Section */}
      {maintenanceCharges.filter(mc => mc.status === "pending").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Maintenance Payments Due
            </CardTitle>
            <CardDescription>
              Your maintenance charges that require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {maintenanceCharges
                .filter(mc => mc.status === "pending")
                .map(charge => (
                  <div key={charge.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 bg-orange-50">
                    <div className="flex-1">
                      <h3 className="font-semibold">{charge.projects.title}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(charge.due_date).toLocaleDateString()}</span>
                          {new Date(charge.due_date) < new Date() && (
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                          )}
                        </div>
                        <div className="font-medium text-orange-600 mt-1">
                          Amount: ₹{charge.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto">
                      <MaintenancePaymentButton
                        maintenanceId={charge.id}
                        amount={charge.amount}
                        projectTitle={charge.projects.title}
                      />
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No completed payments found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't completed any successful payments yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredPayments.map((payment) => {
            // Check if this is a maintenance payment and extract plan name
            const isMaintenancePayment = payment.payment_method?.includes('maintenance') || payment.payment_method === 'maintenance'
            let displayTitle = payment.projects.title
            
            if (isMaintenancePayment) {
              const planId = payment.payment_method.replace('maintenance_', '')
              const planNameMap = {
                'monthly': 'Monthly',
                'quarterly': 'Quarterly',
                'yearly': 'Yearly'
              }
              const planName = planNameMap[planId as keyof typeof planNameMap] || planId
              displayTitle = `${payment.projects.title} - ${planName} Maintenance`
            }
            
            return (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{displayTitle}</CardTitle>
                    <CardDescription className="mt-2">{
                      isMaintenancePayment 
                        ? `Maintenance payment for ${payment.projects.title}` 
                        : payment.projects.description
                    }</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(payment.status)} variant="secondary">
                      <span className="mr-1">{getStatusIcon(payment.status)}</span>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Amount</div>
                    <div className="text-lg font-semibold">₹{payment.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Payment Date</div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(payment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {payment.razorpay_payment_id && (
                    <div>
                      <div className="font-medium text-muted-foreground">Payment ID</div>
                      <div className="font-mono text-xs">{payment.razorpay_payment_id}</div>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-muted-foreground">Order ID</div>
                    <div className="font-mono text-xs">{payment.razorpay_order_id}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}