"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar, 
  DollarSign, 
  Settings, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Search,
  Filter
} from "lucide-react"

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
    user_id: string
    total_amount: number
    status: string
    users: {
      id: string
      full_name: string
      email: string
      phone: string
    }
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

export default function AdminMaintenancePage() {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceData[]>([])
  const [filteredList, setFilteredList] = useState<MaintenanceData[]>([])
  const [freeMaintenanceProjects, setFreeMaintenanceProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    fetchMaintenanceData()
    fetchFreeMaintenanceProjects()
    fetchNotifications()
  }, [])

  useEffect(() => {
    filterData()
  }, [maintenanceList, searchTerm, statusFilter])

  const fetchMaintenanceData = async () => {
    try {
      const supabase = createClient()
      
      // Admin query to get all maintenance data
      const { data, error } = await supabase
        .from('project_maintenance')
        .select(`
          *,
          maintenance_plans(*),
          projects!inner(
            id,
            title,
            user_id,
            total_amount,
            status,
            users!inner(
              id,
              full_name,
              email,
              phone
            )
          ),
          maintenance_payments(*)
        `)
        .order('next_payment_due', { ascending: true })

      if (error) throw error
      setMaintenanceList(data || [])
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFreeMaintenanceProjects = async () => {
    try {
      const supabase = createClient()
      
      // Get completed projects that are still in free maintenance period (84 days)
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          *,
          users!inner(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('status', 'completed')
      
      if (!error && projects) {
        const now = new Date()
        const freeProjects = projects.filter(project => {
          const completedDate = new Date(project.updated_at)
          const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24))
          return daysSinceCompletion <= 84
        }).map(project => ({
          ...project,
          freeDaysLeft: Math.max(0, 84 - Math.floor((now.getTime() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24)))
        }))
        
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
        .select(`
          *,
          users!inner(full_name, email),
          project_maintenance!inner(
            id,
            maintenance_amount,
            projects!inner(title)
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const filterData = () => {
    let filtered = maintenanceList

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.projects.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.projects.users.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.projects.users.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    setFilteredList(filtered)
  }

  const calculateDaysRemaining = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalRevenue = () => {
    return maintenanceList.reduce((total, maintenance) => {
      const completedPayments = maintenance.maintenance_payments.filter(p => p.status === 'completed')
      return total + completedPayments.reduce((sum, payment) => sum + payment.amount, 0)
    }, 0)
  }

  const getMonthlyRevenue = () => {
    const thisMonth = new Date()
    thisMonth.setDate(1)
    
    return maintenanceList.reduce((total, maintenance) => {
      const thisMonthPayments = maintenance.maintenance_payments.filter(p => 
        p.status === 'completed' && 
        new Date(p.paid_at) >= thisMonth
      )
      return total + thisMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)
    }, 0)
  }

  const getOverdueCount = () => {
    return filteredList.filter(maintenance => 
      maintenance.status === 'active' && 
      calculateDaysRemaining(maintenance.next_payment_due) < 0
    ).length
  }

  const getUpcomingCount = () => {
    return filteredList.filter(maintenance => 
      maintenance.status === 'active' && 
      calculateDaysRemaining(maintenance.next_payment_due) >= 0 &&
      calculateDaysRemaining(maintenance.next_payment_due) <= 7
    ).length
  }

  const handleStatusUpdate = async (maintenanceId: string, newStatus: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('project_maintenance')
        .update({ status: newStatus })
        .eq('id', maintenanceId)

      if (error) throw error
      
      // Refresh data
      fetchMaintenanceData()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const triggerNotifications = async () => {
    try {
      const response = await fetch('/api/maintenance-notifications', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`Created ${data.notificationCount} notifications`)
        fetchNotifications()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error triggering notifications:', error)
      alert('Failed to trigger notifications')
    }
  }

  const contactUser = async (userId: string, projectTitle: string, message: string) => {
    try {
      const response = await fetch('/api/send-sms-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          message: `Hi! Regarding your project "${projectTitle}": ${message}`,
          type: 'maintenance_contact'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Message sent successfully!')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Management</h1>
          <p className="text-muted-foreground">Monitor and manage all project maintenance</p>
        </div>
        <Button onClick={triggerNotifications}>
          <Calendar className="mr-2 h-4 w-4" />
          Check Notifications
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
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
            <CardTitle className="text-sm font-medium">Free Period</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{freeMaintenanceProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              84-day free maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{getTotalRevenue().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ₹{getMonthlyRevenue().toLocaleString()} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getOverdueCount()}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getUpcomingCount()}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="maintenance">Active Maintenance</TabsTrigger>
          <TabsTrigger value="free">Free Period</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by project, user, or email..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance List */}
          <div className="space-y-4">
            {filteredList.map((maintenance) => {
              const daysRemaining = calculateDaysRemaining(maintenance.next_payment_due)
              const completedPayments = maintenance.maintenance_payments.filter(p => p.status === 'completed')
              const totalPaid = completedPayments.reduce((sum, payment) => sum + payment.amount, 0)
              
              return (
                <Card key={maintenance.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{maintenance.projects.title}</CardTitle>
                        <CardDescription>
                          {maintenance.projects.users.full_name} • {maintenance.projects.users.email}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(maintenance.status)} variant="secondary">
                          {maintenance.status}
                        </Badge>
                        {daysRemaining < 0 && maintenance.status === 'active' && (
                          <Badge variant="destructive">
                            {Math.abs(daysRemaining)} days overdue
                          </Badge>
                        )}
                        {daysRemaining >= 0 && daysRemaining <= 7 && maintenance.status === 'active' && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Due in {daysRemaining} days
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Plan</div>
                        <div className="font-medium">{maintenance.maintenance_plans.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Amount</div>
                        <div className="font-medium">₹{maintenance.maintenance_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Next Payment</div>
                        <div className="font-medium">{new Date(maintenance.next_payment_due).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Paid</div>
                        <div className="font-medium text-green-600">₹{totalPaid.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Start: {new Date(maintenance.start_date).toLocaleDateString()} • 
                        End: {new Date(maintenance.end_date).toLocaleDateString()}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const message = prompt('Enter message to send to user:')
                            if (message) {
                              contactUser(maintenance.projects.user_id, maintenance.projects.title, message)
                            }
                          }}
                        >
                          Contact User
                        </Button>
                        <Select
                          value={maintenance.status}
                          onValueChange={(value) => handleStatusUpdate(maintenance.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="free" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projects in Free Maintenance Period</CardTitle>
              <CardDescription>
                Projects completed within the last 84 days receive free maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {freeMaintenanceProjects.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No projects in free maintenance period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {freeMaintenanceProjects.map((project) => (
                    <Card key={project.id} className="border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-lg">{project.title}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-green-100 text-green-800" variant="secondary">
                                  FREE - {project.freeDaysLeft} days left
                                </Badge>
                                {project.freeDaysLeft <= 14 && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                    Ending Soon
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Customer</div>
                                <div className="font-medium">{project.users.full_name}</div>
                                <div className="text-xs text-muted-foreground">{project.users.email}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Project Value</div>
                                <div className="font-medium">₹{project.total_amount.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Completed Date</div>
                                <div className="font-medium">{new Date(project.updated_at).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Maintenance Starts</div>
                                <div className="font-medium">
                                  {(() => {
                                    const maintenanceStart = new Date(project.updated_at)
                                    maintenanceStart.setDate(maintenanceStart.getDate() + 84)
                                    return maintenanceStart.toLocaleDateString()
                                  })()} 
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                Free maintenance period: {84 - project.freeDaysLeft} days used, {project.freeDaysLeft} days remaining
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const message = project.freeDaysLeft <= 14 
                                      ? `Your free maintenance period for "${project.title}" will end in ${project.freeDaysLeft} days. Maintenance billing will start automatically after that. Contact us if you have any questions.`
                                      : `Your project "${project.title}" is currently in the free maintenance period. You have ${project.freeDaysLeft} days of free maintenance remaining.`
                                    
                                    const customMessage = prompt('Edit message to send to user:', message)
                                    if (customMessage) {
                                      contactUser(project.user_id, project.title, customMessage)
                                    }
                                  }}
                                >
                                  {project.freeDaysLeft <= 14 ? 'Notify Ending Soon' : 'Contact User'}
                                </Button>
                                
                                {project.freeDaysLeft <= 14 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-orange-600 border-orange-600"
                                    onClick={() => {
                                      const message = `IMPORTANT: Your free maintenance period for "${project.title}" ends in ${project.freeDaysLeft} days. After that, maintenance billing will automatically begin. Please contact us if you need to discuss maintenance plans.`
                                      contactUser(project.user_id, project.title, message)
                                    }}
                                  >
                                    Send Final Notice
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {project.freeDaysLeft <= 14 && (
                              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center text-orange-800 text-sm">
                                  <AlertTriangle className="mr-2 h-4 w-4" />
                                  <span>
                                    This project's free maintenance period is ending soon. Consider reaching out to the customer about upcoming maintenance billing.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                Maintenance payment reminders and overdue notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.notification_type === 'overdue' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Calendar className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">
                          {notification.project_maintenance.projects.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.sent_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.users.full_name} • {notification.users.email}
                      </p>
                      <p className="text-sm">{notification.message}</p>
                      {notification.days_remaining !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.days_remaining < 0 
                            ? `${Math.abs(notification.days_remaining)} days overdue`
                            : `${notification.days_remaining} days remaining`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Revenue</span>
                    <span className="font-semibold">₹{getTotalRevenue().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month</span>
                    <span className="font-semibold text-green-600">₹{getMonthlyRevenue().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average per Project</span>
                    <span className="font-semibold">
                      ₹{maintenanceList.length > 0 ? Math.round(getTotalRevenue() / maintenanceList.length).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['active', 'expired', 'suspended', 'cancelled'].map((status) => {
                    const count = maintenanceList.filter(m => m.status === status).length
                    const percentage = maintenanceList.length > 0 ? Math.round((count / maintenanceList.length) * 100) : 0
                    
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(status)} variant="secondary">
                            {status}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          {count} ({percentage}%)
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}