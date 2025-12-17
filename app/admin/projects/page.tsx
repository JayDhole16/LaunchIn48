"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { StatusChangeDialog } from "@/components/ui/status-change-dialog"
import { useToast } from "@/hooks/use-toast"
import { completeProjectWithMaintenance, calculateFreeMaintenance } from "@/lib/maintenance-utils"
import { MaintenanceStatus, getMaintenancePriority } from "@/components/admin/maintenance-status"
import { MaintenanceSummary } from "@/components/admin/maintenance-summary"
import { Search, Filter, Eye, Calendar, DollarSign, User, Trash2, Clock, Wrench } from "lucide-react"

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
  completed_date?: string
  user_id: string
  maintenance_paid?: number
  total_paid_amount?: number
  maintenance_payments_count?: number
  users?: {
    full_name?: string
    email?: string
    phone?: string
    company_name?: string
  } | null
  user_summary?: {
    full_name?: string
    email?: string
    phone?: string
    company_name?: string
  } | null
  payments: Array<{
    amount: number
    status: string
    created_at: string
  }>
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Status change dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [statusChangeProject, setStatusChangeProject] = useState<Project | null>(null)
  const [pendingStatus, setPendingStatus] = useState<string>('')
  const [isStatusChanging, setIsStatusChanging] = useState(false)
  // Maintenance data state
  const [maintenanceData, setMaintenanceData] = useState<Record<string, any>>({})
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>('all')
  const [showMaintenanceSummary, setShowMaintenanceSummary] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/admin/projects', { cache: 'no-store' })
        const { projects: projectsData } = await res.json()

        if (projectsData) {
// Process projects with payment calculations including maintenance
          const processedProjects = projectsData.map((project: any) => {
            const completedPayments = project.payments?.filter(
              (payment: any) => payment.status === 'completed'
            ) || []

            // Separate project payments and maintenance payments FOR THIS SPECIFIC PROJECT
            const projectPayments = completedPayments.filter(
              (payment: any) => !payment.payment_method?.includes('maintenance')
            )
            const maintenancePayments = completedPayments.filter(
              (payment: any) => payment.payment_method?.includes('maintenance')
            )

            // Compute from embedded payments
            const computedProjectPaid = projectPayments.reduce(
              (sum: number, payment: any) => sum + (payment.amount || 0), 0
            )
            const computedMaintenancePaid = maintenancePayments.reduce(
              (sum: number, payment: any) => sum + (payment.amount || 0), 0
            )

            // Prefer DB-tracked fields when present (set by server after verification)
            const projectPaidAmount = typeof project.paid_amount === 'number' && project.paid_amount >= 0
              ? Math.max(project.paid_amount, computedProjectPaid)
              : computedProjectPaid

            const maintenancePaidAmount = typeof project.maintenance_paid === 'number' && project.maintenance_paid >= 0
              ? Math.max(project.maintenance_paid, computedMaintenancePaid)
              : computedMaintenancePaid

            const totalPaidAmount = projectPaidAmount + maintenancePaidAmount

            const remainingAmount = typeof project.remaining_amount === 'number' && project.remaining_amount >= 0
              ? Math.min(project.remaining_amount, Math.max(0, project.total_amount - projectPaidAmount))
              : Math.max(0, project.total_amount - projectPaidAmount)

            const computedPaymentStatus = remainingAmount > 0
              ? (projectPaidAmount > 0 ? 'partial' : 'pending')
              : 'paid'

            const paymentStatus = project.payment_status || computedPaymentStatus

            return {
              ...project,
              paid_amount: projectPaidAmount, // Only project payments for project status
              maintenance_paid: maintenancePaidAmount, // Track maintenance separately
              total_paid_amount: totalPaidAmount, // Total including maintenance
              remaining_amount: remainingAmount,
              payment_status: paymentStatus,
              maintenance_payments_count: maintenancePayments.length,
            }
          })

          setProjects(processedProjects)
          setFilteredProjects(processedProjects)

          // Fetch maintenance data from database similar to the user dashboard so admin and user
          // views show consistent remaining-days when paid maintenance records exist.
          const supabase = createClient()
          const completedProjectIds = processedProjects
            .filter((p: any) => p.status === 'completed')
            .map((p: any) => p.id)

          if (completedProjectIds.length > 0) {
            try {
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
                .in('project_id', completedProjectIds)

              const maintenanceMap: Record<string, any> = {}
              if (maintenanceRecords && maintenanceRecords.length > 0) {
                // Build map from DB records, but also reconcile with any maintenance payments
                // collect maintenance ids for fetching maintenance_payments
                const maintenanceIds: string[] = maintenanceRecords.map((r: any) => r.id)

                // fetch completed maintenance_payments for these maintenance records
                let maintenancePaymentsByPmId: Record<string, any[]> = {}
                try {
                  const { data: mpData } = await supabase
                    .from('maintenance_payments')
                    .select('*')
                    .in('project_maintenance_id', maintenanceIds)
                    .eq('status', 'completed')

                  if (mpData && mpData.length > 0) {
                    mpData.forEach((mp: any) => {
                      if (!maintenancePaymentsByPmId[mp.project_maintenance_id]) maintenancePaymentsByPmId[mp.project_maintenance_id] = []
                      maintenancePaymentsByPmId[mp.project_maintenance_id].push(mp)
                    })
                  }
                } catch (e) {
                  console.error('Error fetching maintenance_payments for admin page:', e)
                }

                maintenanceRecords.forEach((record: any) => {
                  const now = new Date()
                  const validityEnd = record.end_date ? new Date(record.end_date) : null
                  const dbDaysRemaining = validityEnd ? Math.ceil((validityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

                  // Start with DB values
                  maintenanceMap[record.project_id] = {
                    status: record.status,
                    start_date: record.start_date,
                    end_date: record.end_date,
                    next_payment_due: record.next_payment_due,
                    maintenance_amount: record.maintenance_amount || 0,
                    base_amount: record.base_amount || 0,
                    plan_name: record.maintenance_plans?.name || 'Unknown',
                    maintenance_id: record.id,
                    days_remaining: Math.max(0, dbDaysRemaining),
                    free_days_total: 90,
                    paid_days_total: 0,
                    total_amount_paid: 0,
                  }
                })

                // Reconcile with payments: if payments indicate more paid days than DB, extend the end_date
                processedProjects.forEach((project: any) => {
                  const rec = maintenanceMap[project.id]
                  if (!rec) return

                  // Calculate paid days from either project.payments or maintenance_payments table
                  let maintenancePayments: any[] = []
                  if (project.payments && project.payments.length > 0) {
                    maintenancePayments = project.payments.filter(
                      (p: any) => p.status === 'completed' && p.payment_method && p.payment_method.includes('maintenance')
                    )
                  }

                  // If no maintenance payments in project.payments, try maintenance_payments table using maintenance_id
                  if ((maintenancePayments.length === 0 || maintenancePayments.every(p => !p.payment_method)) && rec?.maintenance_id) {
                    maintenancePayments = maintenancePaymentsByPmId[rec.maintenance_id] || []
                  }

                  let totalPaidDays = 0
                  let totalPaidAmount = 0
                  maintenancePayments.forEach((payment: any) => {
                    // maintenance_payments use plan_name while payments use payment_method
                    const planIdFromMethod = payment.payment_method ? payment.payment_method.replace('maintenance_', '') : null
                    const planId = planIdFromMethod || (payment.plan_name ? payment.plan_name.toLowerCase() : null)
                    const planDurationMap: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 }
                    const daysAdded = planDurationMap[planId as keyof typeof planDurationMap] || 30
                    totalPaidDays += daysAdded
                    totalPaidAmount += payment.amount || 0
                  })

                  // Compute free end (90 days from completion)
                  const completionDate = project.completed_date || project.created_at
                  const freeEndDate = new Date(completionDate)
                  freeEndDate.setDate(freeEndDate.getDate() + 90)

                  // Final validity considering payments (free + paid days)
                  const finalValidityEndFromPayments = new Date(freeEndDate)
                  finalValidityEndFromPayments.setDate(finalValidityEndFromPayments.getDate() + totalPaidDays)

                  const dbEnd = rec.end_date ? new Date(rec.end_date) : null
                  // Pick the later end date between DB and computed-from-payments so admin reflects newest payments
                  const effectiveEnd = dbEnd && dbEnd > finalValidityEndFromPayments ? dbEnd : finalValidityEndFromPayments

                  const now = new Date()
                  const daysRemaining = effectiveEnd ? Math.ceil((effectiveEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

                  maintenanceMap[project.id] = {
                    ...rec,
                    end_date: effectiveEnd ? effectiveEnd.toISOString() : rec.end_date,
                    next_payment_due: effectiveEnd ? effectiveEnd.toISOString() : rec.next_payment_due,
                    days_remaining: Math.max(0, daysRemaining),
                    paid_days_total: totalPaidDays,
                    total_amount_paid: totalPaidAmount,
                  }
                })
              } else {
                // Fall back to computing maintenance from payments (free period + paid extensions)
                processedProjects.forEach((project: any) => {
                  if (project.status === 'completed') {
                    const completionDate = project.completed_date || project.created_at
                    const freeEndDate = new Date(completionDate)
                    freeEndDate.setDate(freeEndDate.getDate() + 90)

                    const maintenancePayments = project.payments?.filter(
                      (payment: any) => payment.status === 'completed' && payment.payment_method && payment.payment_method.includes('maintenance')
                    ) || []

                    let totalPaidDays = 0
                    let totalPaidAmount = 0
                    let lastPlanName: string | null = null

                    maintenancePayments.forEach((payment: any) => {
                      const planId = payment.payment_method.replace('maintenance_', '')
                      const planDurationMap: Record<string, number> = {
                        monthly: 30,
                        quarterly: 90,
                        yearly: 365,
                      }
                      const daysAdded = planDurationMap[planId] || 30
                      totalPaidDays += daysAdded
                      totalPaidAmount += payment.amount || 0

                      const planNameMap: Record<string, string> = {
                        monthly: 'Monthly',
                        quarterly: 'Quarterly',
                        yearly: 'Yearly',
                      }
                      lastPlanName = planNameMap[planId] || lastPlanName
                    })

                    const finalValidityEnd = new Date(freeEndDate)
                    finalValidityEnd.setDate(finalValidityEnd.getDate() + totalPaidDays)

                    const now = new Date()
                    const totalDaysRemaining = Math.ceil((finalValidityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                    const maintenanceStatus = totalPaidDays > 0 ? 'active' : (totalDaysRemaining > 0 ? 'free' : 'expired')

                    maintenanceMap[project.id] = {
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
                      total_amount_paid: totalPaidAmount,
                    }
                  }
                })
              }

              setMaintenanceData(maintenanceMap)
            } catch (err) {
              console.error('Error fetching maintenance data for admin projects:', err)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setIsLoading(false)
      }
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
          (project.users?.full_name || project.users?.email || project.user_summary?.full_name || project.user_summary?.email || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => project.status === statusFilter)
    }
    
    // Filter by payment status
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((project) => project.payment_status === paymentStatusFilter)
    }
    
    // Filter by maintenance status
    if (maintenanceFilter !== "all" && maintenanceFilter !== "") {
      filtered = filtered.filter((project) => {
        if (project.status !== 'completed') return false
        
        const maintenance = maintenanceData[project.id]
        const maintenanceInfo = project.completed_date ? calculateFreeMaintenance(project.completed_date) : null
        
        switch (maintenanceFilter) {
          case 'free_active':
            return !maintenance && maintenanceInfo?.isActive && !maintenanceInfo.isEndingSoon
          case 'free_ending':
            return !maintenance && maintenanceInfo?.isActive && maintenanceInfo.isEndingSoon
          case 'free_expired':
            return !maintenance && (!maintenanceInfo?.isActive || false)
          case 'paid_active':
            return maintenance && maintenance.status === 'active'
          case 'due_soon':
            return maintenance && maintenance.next_payment_due && 
              new Date(maintenance.next_payment_due) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          case 'overdue':
            return maintenance && maintenance.next_payment_due && 
              new Date(maintenance.next_payment_due) < new Date()
          default:
            return true
        }
      })
    }

    setFilteredProjects(filtered)
  }, [projects, searchTerm, statusFilter, paymentStatusFilter, maintenanceFilter, maintenanceData])

  const handleStatusChange = useCallback((project: Project, newStatus: string) => {
    console.log('Status change triggered:', project.title, 'from', project.status, 'to', newStatus)
    
    // Check if this requires a warning dialog
    const isChangingToCompleted = newStatus === 'completed'
    const isChangingFromCompleted = project.status === 'completed' && newStatus !== 'completed'
    
    console.log('Is changing to completed:', isChangingToCompleted)
    console.log('Is changing from completed:', isChangingFromCompleted)
    
    if (isChangingToCompleted || isChangingFromCompleted) {
      console.log('Showing confirmation dialog')
      setStatusChangeProject(project)
      setPendingStatus(newStatus)
      setIsStatusDialogOpen(true)
    } else {
      console.log('Updating status directly')
      updateProjectStatus(project.id, newStatus)
    }
  }, [])

  const handleStatusConfirm = useCallback(async () => {
    console.log('Status confirm triggered:', statusChangeProject?.title, 'to', pendingStatus)
    if (!statusChangeProject) return
    
    setIsStatusChanging(true)
    try {
      if (pendingStatus === 'completed') {
        console.log('Completing project with maintenance...')
        
        // First, try the simple database update
        const supabase = createClient()
        const { error } = await supabase
          .from('projects')
          .update({
            status: 'completed',
            completed_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', statusChangeProject.id)
        
        if (error) {
          console.error('Error updating project to completed:', error)
          throw new Error('Failed to update project status')
        }
        
        console.log('Project updated to completed successfully')
        
        // Try to create maintenance record (optional)
        try {
          const success = await completeProjectWithMaintenance(statusChangeProject.id, statusChangeProject.total_amount)
          console.log('Maintenance completion result:', success)
        } catch (maintenanceError) {
          console.log('Maintenance creation failed, but status was updated:', maintenanceError)
        }
        
        const updatedProject = { ...statusChangeProject, status: pendingStatus, completed_date: new Date().toISOString() }
        console.log('Updated project:', updatedProject)
        
        // Update both projects and filteredProjects
        setProjects(prevProjects => prevProjects.map(p => p.id === statusChangeProject.id ? updatedProject : p))
        setFilteredProjects(prevFiltered => prevFiltered.map(p => p.id === statusChangeProject.id ? updatedProject : p))
        
        toast({
          title: "Project completed successfully",
          description: `"${statusChangeProject.title}" has been marked as completed. Maintenance system setup may be pending.`,
          variant: "default",
        })
      } else {
        console.log('Updating status to:', pendingStatus)
        await updateProjectStatus(statusChangeProject.id, pendingStatus)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error updating status",
        description: "Failed to update project status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStatusChanging(false)
      setIsStatusDialogOpen(false)
      setStatusChangeProject(null)
      setPendingStatus('')
    }
  }, [statusChangeProject, pendingStatus, toast])

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from("projects")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)

    if (!error) {
      // Update both projects and filteredProjects
      setProjects(prevProjects => prevProjects.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)))
      setFilteredProjects(prevFiltered => prevFiltered.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)))
      
      toast({
        title: "Status updated",
        description: "Project status has been updated successfully.",
        variant: "default",
      })
    } else {
      toast({
        title: "Error updating status",
        description: "Failed to update project status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Delete related payments first (if any foreign key constraints)
      await supabase
        .from("payments")
        .delete()
        .eq("project_id", projectToDelete.id)

      // Delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectToDelete.id)

      if (error) {
        throw error
      }

      // Update local state
      setProjects(projects.filter((p) => p.id !== projectToDelete.id))
      setFilteredProjects(filteredProjects.filter((p) => p.id !== projectToDelete.id))
      
      toast({
        title: "Project deleted successfully",
        description: `"${projectToDelete.title}" has been permanently deleted.`,
        variant: "default",
      })

      setIsDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (error: any) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error deleting project",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
        <h1 className="text-3xl font-bold">Project Management</h1>
        <p className="text-muted-foreground">Manage all client projects and track progress</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects or clients..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <DollarSign className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">No Payment</SelectItem>
                <SelectItem value="partial">📊 Partial Payment</SelectItem>
                <SelectItem value="paid">✅ Fully Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Wrench className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by maintenance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Maintenance</SelectItem>
                <SelectItem value="free_active">🆓 Free Active</SelectItem>
                <SelectItem value="free_ending">⚠️ Free Ending Soon</SelectItem>
                <SelectItem value="free_expired">❌ Free Expired</SelectItem>
                <SelectItem value="paid_active">💳 Paid Active</SelectItem>
                <SelectItem value="due_soon">🔔 Due Soon</SelectItem>
                <SelectItem value="overdue">🚨 Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {filteredProjects.length} of {projects.length} projects
            </div>
            <Button
              variant={showMaintenanceSummary ? "default" : "outline"}
              onClick={() => setShowMaintenanceSummary(!showMaintenanceSummary)}
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Maintenance Summary
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Maintenance Summary Section */}
      {showMaintenanceSummary && (
        <MaintenanceSummary 
          projects={projects.filter(p => p.status === 'completed')}
          maintenanceData={maintenanceData}
        />
      )}

      {/* Projects List */}
      <div className="grid gap-6">
        {filteredProjects.map((project) => {
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription className="mt-2">{project.description}</CardDescription>
                    <div className="space-y-2 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{project.users?.full_name || project.user_summary?.full_name || project.users?.email || project.user_summary?.email || 'Unknown user'}</span>
{(project.users?.company_name || project.user_summary?.company_name) && (
                          <>
                            <span>•</span>
                            <span>{project.users?.company_name || project.user_summary?.company_name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
            <span>📧 {project.users?.email || project.user_summary?.email || 'N/A'}</span>
                        {(project.users?.phone || project.user_summary?.phone) && (
                    <span>📱 {project.users?.phone || project.user_summary?.phone}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-green-600">Project: ₹{project.paid_amount?.toLocaleString()}</span>
                        {(project.maintenance_paid ?? 0) > 0 && (
                          <span className="text-blue-600">Maintenance: ₹{project.maintenance_paid?.toLocaleString()}</span>
                        )}
                        <span className="text-emerald-600 font-medium">Total: ₹{project.total_paid_amount?.toLocaleString()}</span>
                        {project.remaining_amount > 0 && (
                          <span className="text-orange-600">Remaining: ₹{project.remaining_amount?.toLocaleString()}</span>
                        )}
                      </div>
                      {/* Maintenance Status for Completed Projects */}
                      {project.status === 'completed' && (
                        <MaintenanceStatus 
                          project={project}
                          maintenanceData={maintenanceData[project.id]}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getStatusColor(project.status)} variant="secondary">
                      {project.status.replace("_", " ")}
                    </Badge>
                    <Badge className={getPriorityColor(project.priority)} variant="secondary">
                      {project.priority}
                    </Badge>
                    <Badge 
                      className={project.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'} 
                      variant="secondary"
                    >
                      {project.payment_status === 'paid' ? '✓ Fully Paid' : `₹${project.remaining_amount?.toLocaleString()} Pending`}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>₹{project.total_amount?.toLocaleString()}</span>
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

                <div className="flex flex-wrap gap-2">
                  <Select onValueChange={(value) => handleStatusChange(project, value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{project.title}</DialogTitle>
                        <DialogDescription>Project details and information</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Client</Label>
<p className="text-sm text-muted-foreground mt-1">
                              {project.users?.full_name || project.users?.email || project.user_summary?.full_name || project.user_summary?.email || 'Unknown user'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Company</Label>
<p className="text-sm text-muted-foreground mt-1">{project.users?.company_name || project.user_summary?.company_name || "N/A"}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Amount</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              ₹{project.total_amount?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Payment Status</Label>
                            <p className="text-sm text-muted-foreground mt-1">{project.payment_status}</p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteProject(project)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No projects found matching your criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Status Change Confirmation Dialog */}
      {statusChangeProject && (
        <StatusChangeDialog
          open={isStatusDialogOpen}
          onOpenChange={setIsStatusDialogOpen}
          project={{
            id: statusChangeProject.id,
            title: statusChangeProject.title,
            status: statusChangeProject.status,
            total_amount: statusChangeProject.total_amount,
            created_at: statusChangeProject.created_at,
            completed_date: statusChangeProject.completed_date
          }}
          newStatus={pendingStatus}
          onConfirm={handleStatusConfirm}
          isLoading={isStatusChanging}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Project"
        description={`Are you sure you want to delete "${projectToDelete?.title}"? This action cannot be undone. All project data including payments and messages will be permanently removed.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        onConfirm={confirmDeleteProject}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  )
}
