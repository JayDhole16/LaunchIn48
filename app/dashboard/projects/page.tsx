"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentButton } from "@/components/payment-button"
import { RemainingPaymentButton } from "@/components/remaining-payment-button"
import Link from "next/link"
import { Search, Plus, Calendar, DollarSign, Filter, Wrench } from "lucide-react"
import { UserMaintenanceStatus } from "@/components/user/maintenance-status"
import { calculateFreeMaintenance } from "@/lib/maintenance-utils"
import { getMaintenancePaymentSummary, ProjectMaintenanceSummary } from "@/lib/maintenance-summary"
import { ProjectMaintenanceDropdown } from "@/components/project-maintenance-summary"

interface Project {
  id: string
  title: string
  description: string
  status: string
  priority: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_status: string
  created_at: string
  due_date: string
  start_date: string
  completed_date?: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [maintenanceData, setMaintenanceData] = useState<Record<string, any>>({})
  const [maintenancePlans, setMaintenancePlans] = useState<any[]>([])
  const [maintenancePaymentSummary, setMaintenancePaymentSummary] = useState<ProjectMaintenanceSummary>({})

  useEffect(() => {
    const fetchProjects = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Fetch projects via server API (service role) for consistent visibility
      const res = await fetch('/api/user/projects', { cache: 'no-store' })
      const parsed = await res.json().catch(() => ({ projects: [] }))
      const projectsData = res.ok ? (parsed.projects || []) : []

      if (projectsData) {
  // Process projects and compute paid/remaining amounts
  const processedProjects: any[] = (projectsData || []).map((project: any) => {
          const completedPayments = project.payments?.filter(
            (payment: any) => payment.status === 'completed'
          ) || []

          const calculatedPaid = completedPayments.reduce(
            (sum: number, payment: any) => sum + (payment.amount || 0), 0
          )

          const paidAmount = typeof project.paid_amount === 'number' ? project.paid_amount : calculatedPaid
          const remainingAmount = Math.max(0, (project.total_amount || 0) - (paidAmount || 0))
          const paymentStatus = project.payment_status || (paidAmount > 0 ? (remainingAmount > 0 ? 'partial' : 'paid') : 'pending')

          return {
            ...project,
            paid_amount: paidAmount,
            remaining_amount: remainingAmount,
            payment_status: paymentStatus
          }
  })
        
  // Show all projects (not only those with payment activity)
  setProjects(processedProjects)
  setFilteredProjects(processedProjects)
        
        // Fetch maintenance data from database
        const projectIds = processedProjects.map(p => p.id)
        const { data: maintenanceRecords } = await supabase
          .from('project_maintenance')
          .select(`
            *,
            maintenance_plans (
              id,
              name,
              duration_months,
              base_price,
              price_multiplier
            )
          `)
          .in('project_id', projectIds)
        
        // Create maintenance data map
        const maintenanceMap: Record<string, any> = {}
        if (maintenanceRecords && maintenanceRecords.length > 0) {
          maintenanceRecords.forEach(record => {
            const now = new Date()
            const validityEnd = record.end_date ? new Date(record.end_date) : null
            const daysRemaining = validityEnd ? Math.ceil((validityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
            
            maintenanceMap[record.project_id] = {
              status: record.status,
              start_date: record.start_date,
              end_date: record.end_date,
              next_payment_due: record.next_payment_due,
              maintenance_amount: record.maintenance_amount || 0,
              base_amount: record.base_amount || 0,
              plan_name: record.maintenance_plans?.name || 'Unknown',
              days_remaining: Math.max(0, daysRemaining),
              free_days_total: 90,
              paid_days_total: 0,
              total_amount_paid: 0
            }
          })
        } else {
          // Fallback: Create maintenance data for completed projects and calculate from payments
          processedProjects.forEach(project => {
            if (project.status === 'completed') {
              const completionDate = project.completed_date || project.created_at
              const freeEndDate = new Date(completionDate)
              freeEndDate.setDate(freeEndDate.getDate() + 90)
              
              // Get maintenance payments for this project
              const maintenancePayments = project.payments?.filter(
                (payment: any) => payment.status === 'completed' && 
                payment.payment_method && 
                payment.payment_method.includes('maintenance')
              ) || []
              
              
              let totalPaidDays = 0
              let totalPaidAmount = 0
              let lastPlanName = null
              
              // Calculate total paid maintenance days from payments
              maintenancePayments.forEach((payment: any) => {
                const planId = payment.payment_method.replace('maintenance_', '')
                const planDurationMap = {
                  'monthly': 30,
                  'quarterly': 90, 
                  'yearly': 365
                }
                const daysAdded = planDurationMap[planId as keyof typeof planDurationMap] || 30
                totalPaidDays += daysAdded
                totalPaidAmount += payment.amount
                
                const planNameMap = {
                  'monthly': 'Monthly',
                  'quarterly': 'Quarterly',
                  'yearly': 'Yearly'
                }
                lastPlanName = planNameMap[planId as keyof typeof planNameMap] || 'Monthly'
              })
              
              // Calculate final validity end date (free period + paid extensions)
              const finalValidityEnd = new Date(freeEndDate)
              finalValidityEnd.setDate(finalValidityEnd.getDate() + totalPaidDays)
              
              const now = new Date()
              const totalDaysRemaining = Math.ceil((finalValidityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              
              const maintenanceStatus = totalPaidDays > 0 ? 'active' : 
                (totalDaysRemaining > 0 ? 'free' : 'expired')
              
              const maintenanceRecord = {
                status: maintenanceStatus,
                start_date: completionDate,
                end_date: finalValidityEnd.toISOString(),
                next_payment_due: finalValidityEnd.toISOString(),
                maintenance_amount: totalPaidDays > 0 ? Math.round(project.total_amount * 0.08) : 0,
                base_amount: totalPaidAmount,
                plan_name: lastPlanName || (totalPaidDays > 0 ? 'Paid Plan' : null),
                days_remaining: Math.max(0, totalDaysRemaining),
                free_days_total: 90,
                paid_days_total: totalPaidDays,
                total_amount_paid: totalPaidAmount
              }
              
              maintenanceMap[project.id] = maintenanceRecord
              
            }
          })
        }
        
        setMaintenanceData(maintenanceMap)
        
        // Fetch maintenance payment summary
        const paymentSummary = await getMaintenancePaymentSummary(user.id)
        setMaintenancePaymentSummary(paymentSummary)
      }
      
      // Fetch maintenance plans from database
      const { data: plansData } = await supabase
        .from('maintenance_plans')
        .select('*')
        .eq('is_active', true)
        .order('duration_months', { ascending: true })
      
      if (plansData && plansData.length > 0) {
        setMaintenancePlans(plansData.map(plan => ({
          id: plan.slug,
          name: plan.name,
          description: plan.description,
          price_multiplier: plan.price_multiplier,
          base_price: plan.base_price,
          duration_months: plan.duration_months,
          features: plan.features || []
        })))
      } else {
        // Fallback to default plans if database fetch fails
        setMaintenancePlans([
        {
          id: 'monthly',
          name: 'Monthly',
          description: 'Monthly maintenance plan with basic support',
          price_multiplier: 0.08,
          base_price: 800,
          duration_months: 1,
          features: [
            'Bug fixes and security patches',
            'Technical support via email',
            'Monthly updates',
            'Performance monitoring'
          ]
        },
        {
          id: 'quarterly',
          name: 'Quarterly', 
          description: 'Quarterly maintenance plan with enhanced support',
          price_multiplier: 0.20,
          base_price: 2000,
          duration_months: 3,
          features: [
            'Everything in Monthly',
            'Priority technical support',
            'Feature enhancements',
            'Weekly backups',
            'Performance optimization'
          ]
        },
        {
          id: 'yearly',
          name: 'Yearly',
          description: 'Yearly maintenance plan with premium support and priority updates',
          price_multiplier: 0.70,
          base_price: 7000,
          duration_months: 12,
          features: [
            'Everything in Quarterly',
            'Dedicated support manager',
            'Custom feature development',
            'Daily backups',
            'Advanced analytics',
            'Priority feature requests'
          ]
        }
      ])
      }

      setIsLoading(false)
    }

    fetchProjects()
  }, [])

  useEffect(() => {
    let filtered = projects

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => project.status === statusFilter)
    }

    setFilteredProjects(filtered)
  }, [projects, searchTerm, statusFilter])

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
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
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
          <div className="space-y-4">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">Manage and track your project progress</p>
        </div>
        <Link href="/contact">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Start your first project with us"}
            </p>
            <Link href="/contact">
              <Button>Start New Project</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription className="mt-2">{project.description}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getStatusColor(project.status)} variant="secondary">
                      {project.status.replace("_", " ")}
                    </Badge>
                    {/* <Badge className={getPriorityColor(project.priority)} variant="secondary">
                      {project.priority}
                    </Badge> */}
                    <Badge className={getPaymentStatusColor(project.payment_status)} variant="secondary">
                      {project.payment_status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-6">
                  <div className="flex flex-col">
                    <div className="flex items-center mb-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Total: ₹{project.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-green-600 text-xs mb-1">
                      <span>Paid: ₹{project.paid_amount?.toLocaleString()}</span>
                    </div>
                    {project.remaining_amount > 0 && (
                      <div className="flex items-center text-orange-600 text-xs">
                        <span>Remaining: ₹{project.remaining_amount?.toLocaleString()}</span>
                      </div>
                    )}
                    {project.remaining_amount === 0 && (
                      <div className="flex items-center text-green-600 text-xs">
                        <span>✓ Fully Paid</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  {project.due_date && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Due: {new Date(project.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {project.remaining_amount > 0 && (
                  <div className="max-w-sm">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
                      <h4 className="font-medium text-orange-800 mb-2">
                        {project.paid_amount > 0 ? 'Complete Payment' : 'Payment Required'}
                      </h4>
                      <div className="text-sm text-orange-700 mb-3">
                        {project.paid_amount > 0 ? (
                          <p>
                            You've paid ₹{project.paid_amount.toLocaleString()} out of ₹{project.total_amount.toLocaleString()}.
                            <br />Pay the remaining ₹{project.remaining_amount.toLocaleString()} to complete your project.
                          </p>
                        ) : (
                          <p>
                            Total project amount: ₹{project.total_amount.toLocaleString()}
                            <br />You can pay the full amount or make an advance payment (minimum 20%).
                          </p>
                        )}
                      </div>
                      {project.paid_amount > 0 ? (
                        <RemainingPaymentButton 
                          projectId={project.id}
                          remainingAmount={project.remaining_amount}
                          projectTitle={project.title}
                          paidAmount={project.paid_amount}
                          totalAmount={project.total_amount}
                        />
                      ) : (
                        <PaymentButton 
                          projectId={project.id} 
                          amount={project.total_amount} 
                          projectTitle={project.title}
                          allowAdvancePayment={true}
                        />
                      )}
                    </div>
                  </div>
                )}
                
                
                {/* Maintenance Status for Completed Projects */}
                {(project.status === 'completed' || (project.status === 'review' && project.payment_status === 'paid')) && (
                  <div className="mt-6">
                    <UserMaintenanceStatus 
                      project={project}
                      maintenanceData={maintenanceData[project.id]}
                      maintenancePlans={maintenancePlans}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
