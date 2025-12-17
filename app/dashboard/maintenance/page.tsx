"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MaintenancePaymentButton } from "@/components/maintenance-payment-button"
import { Calendar, Clock, DollarSign, Settings, CheckCircle2, AlertTriangle } from "lucide-react"
import { useSearchParams } from "next/navigation"

interface MaintenanceData {
  id: string
  project_id: string
  start_date: string
  end_date: string
  next_payment_due: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  base_amount: number
  maintenance_amount: number
  maintenance_plans: {
    id: string
    name: string
    duration_months: number
    description: string
  }
  projects: {
    id: string
    title: string
    total_amount: number
    status: string
    created_at: string
    updated_at: string
  }
  maintenance_payments: Array<{
    id: string
    amount: number
    plan_name: string
    payment_period_start: string
    payment_period_end: string
    status: string
    paid_at: string
    created_at: string
  }>
}

interface ProjectData {
  id: string
  title: string
  status: string
  total_amount: number
  created_at: string
  updated_at: string
}

export default function MaintenancePage() {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceData[]>([])
  const [freeMaintenanceProjects, setFreeMaintenanceProjects] = useState<ProjectData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchMaintenanceData()
    fetchFreeMaintenanceProjects()
    fetchNotifications()
    
    // Show success message if payment was completed
    if (searchParams.get('success') === 'true') {
      // You can show a toast notification here
      console.log('Payment completed successfully!')
    }
  }, [])

  const fetchMaintenanceData = async () => {
    try {
      const response = await fetch('/api/maintenance')
      const data = await response.json()
      
      if (response.ok) {
        setMaintenanceList(data.maintenanceList || [])
      } else {
        console.error('Error fetching maintenance data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFreeMaintenanceProjects = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Get completed projects that are still in free maintenance period (84 days)
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
      
      if (!error && projects) {
        const now = new Date()
        const freeProjects = projects.filter(project => {
          const completedDate = new Date(project.updated_at)
          const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24))
          return daysSinceCompletion <= 84
        })
        
        setFreeMaintenanceProjects(freeProjects)
      }
    } catch (error) {
      console.error('Error fetching free maintenance projects:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('maintenance_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const calculateDaysRemaining = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'suspended':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Settings className="h-5 w-5 text-gray-600" />
    }
  }

  const getTotalMaintenanceRevenue = () => {
    return maintenanceList.reduce((total, maintenance) => {
      const completedPayments = maintenance.maintenance_payments.filter(p => p.status === 'completed')
      return total + completedPayments.reduce((sum, payment) => sum + payment.amount, 0)
    }, 0)
  }

  const getUpcomingPayments = () => {
    return maintenanceList.filter(maintenance => 
      maintenance.status === 'active' && 
      calculateDaysRemaining(maintenance.next_payment_due) <= 30
    )
  }

  const getOverduePayments = () => {
    return maintenanceList.filter(maintenance => 
      maintenance.status === 'active' && 
      calculateDaysRemaining(maintenance.next_payment_due) < 0
    )
  }

  const calculateFreePeriodDays = (completedDate: string) => {
    const now = new Date()
    const completed = new Date(completedDate)
    const daysSinceCompletion = Math.floor((now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, 84 - daysSinceCompletion)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
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
        <h1 className="text-3xl font-bold">Maintenance Dashboard</h1>
        <p className="text-muted-foreground">Manage your project maintenance plans and payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Maintenance Projects</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceList.length}</div>
            <p className="text-xs text-muted-foreground">
              {maintenanceList.filter(m => m.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Maintenance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{freeMaintenanceProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              84-day free period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getUpcomingPayments().length}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getOverduePayments().length}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {notification.notification_type === 'overdue' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Calendar className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.sent_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Free Maintenance Projects */}
      {freeMaintenanceProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
            Free Maintenance Period
          </h2>
          <div className="grid gap-4">
            {freeMaintenanceProjects.map((project) => {
              const freeDaysLeft = calculateFreePeriodDays(project.updated_at)
              
              return (
                <Card key={project.id} className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-green-800">
                        <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
                        {project.title}
                      </CardTitle>
                      <Badge className="bg-green-100 text-green-800" variant="secondary">
                        FREE
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Project Value</div>
                        <div className="font-medium">₹{project.total_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Free Days Remaining</div>
                        <div className="font-medium text-green-600">
                          {freeDaysLeft} days
                          {freeDaysLeft <= 14 && freeDaysLeft > 0 && (
                            <span className="ml-2 text-orange-600 text-xs">
                              (Maintenance will start soon)
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Completed Date</div>
                        <div className="font-medium">{new Date(project.updated_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Maintenance Starts</div>
                        <div className="font-medium">
                          {(() => {
                            const maintenanceStart = new Date(project.updated_at)
                            maintenanceStart.setDate(maintenanceStart.getDate() + 84)
                            return maintenanceStart.toLocaleDateString()
                          })()} 
                        </div>
                      </div>
                    </div>
                    
                    {freeDaysLeft <= 14 && freeDaysLeft > 0 && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center text-orange-800 text-sm">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          <span>
                            Maintenance billing will begin in {freeDaysLeft} days. You'll receive a notification before it starts.
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Maintenance Projects */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Active Maintenance Projects</h2>
        
        {maintenanceList.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Maintenance Projects</h3>
              <p className="text-muted-foreground mb-4">
                Maintenance will be available 84 days after your projects are completed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {maintenanceList.map((maintenance) => {
              const daysRemaining = calculateDaysRemaining(maintenance.next_payment_due)
              const completedPayments = maintenance.maintenance_payments.filter(p => p.status === 'completed')
              
              return (
                <div key={maintenance.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Project Info Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                          {getStatusIcon(maintenance.status)}
                          <span className="ml-2">{maintenance.projects.title}</span>
                        </CardTitle>
                        <Badge variant="secondary" className={
                          maintenance.status === 'active' ? 'bg-green-100 text-green-800' :
                          maintenance.status === 'expired' ? 'bg-red-100 text-red-800' :
                          maintenance.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {maintenance.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Current Plan</div>
                          <div className="font-medium">{maintenance.maintenance_plans.name}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Monthly Amount</div>
                          <div className="font-medium">₹{maintenance.maintenance_amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Start Date</div>
                          <div className="font-medium">{new Date(maintenance.start_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">End Date</div>
                          <div className="font-medium">{new Date(maintenance.end_date).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Payment History */}
                      {completedPayments.length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="text-sm text-muted-foreground mb-2">Recent Payments</div>
                          <div className="space-y-2">
                            {completedPayments.slice(0, 3).map((payment) => (
                              <div key={payment.id} className="flex justify-between items-center text-sm">
                                <span>{payment.plan_name} - {new Date(payment.payment_period_start).toLocaleDateString()}</span>
                                <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Card */}
                  {maintenance.status === 'active' && (
                    <MaintenancePaymentButton
                      projectMaintenanceId={maintenance.id}
                      projectTitle={maintenance.projects.title}
                      maintenanceAmount={maintenance.maintenance_amount}
                      planName={maintenance.maintenance_plans.name}
                      nextPaymentDue={maintenance.next_payment_due}
                      status={maintenance.status}
                      daysRemaining={daysRemaining}
                    />
                  )}
                  
                  {maintenance.status !== 'active' && (
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-semibold mb-2">Maintenance {maintenance.status}</h3>
                          <p className="text-muted-foreground text-sm">
                            {maintenance.status === 'expired' && 'Maintenance period has ended'}
                            {maintenance.status === 'suspended' && 'Maintenance is temporarily suspended'}
                            {maintenance.status === 'cancelled' && 'Maintenance has been cancelled'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}