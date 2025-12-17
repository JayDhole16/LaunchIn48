"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FolderOpen, 
  CreditCard, 
  IndianRupee,
  Calendar,
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign
} from "lucide-react"

interface AnalyticsData {
  totalUsers: number
  totalProjects: number
  totalRevenue: number
  avgProjectValue: number
  monthlyRevenue: any[]
  projectStatusDistribution: any[]
  paymentStatusDistribution: any[]
  recentGrowth: {
    users: number
    projects: number
    revenue: number
  }
  monthlyProjects: any[]
  topClients: any[]
  maintenanceRevenue: number
  conversionRate: number
}

interface Metric {
  title: string
  value: string
  change: number
  icon: any
  color: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedPeriod])

  const fetchAnalyticsData = async () => {
    const supabase = createClient()
    
    try {
      // Get date range based on selected period
      const now = new Date()
      const startDate = new Date()
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Fetch all required data in parallel
      // Fetch data sequentially to avoid relationship cache issues
      const usersResponse = await supabase
        .from('users')
        .select('id, created_at, full_name, email, company_name')

      const projectsResponse = await supabase
        .from('projects')
        .select('id, created_at, status, total_amount, payment_status, user_id')

      const paymentsResponse = await supabase
        .from('payments')
        .select('id, created_at, amount, status, user_id, payment_method')

      // Optional maintenance data
      const maintenanceResponse = await supabase
        .from('maintenance_charges')
        .select('id, created_at, amount, status')

      // Check each response individually and log specific errors
      if (usersResponse.error) {
        console.error('Users fetch error:', usersResponse.error.message)
        setIsLoading(false)
        return
      }
      if (projectsResponse.error) {
        console.error('Projects fetch error:', projectsResponse.error.message)
        setIsLoading(false)
        return
      }
      if (paymentsResponse.error) {
        console.error('Payments fetch error:', paymentsResponse.error.message)
        setIsLoading(false)
        return
      }
      if (maintenanceResponse.error) {
        console.error('Maintenance fetch error:', maintenanceResponse.error.message)
        // Don't return, just log - maintenance data is optional
      }

      const users = usersResponse.data || []
      const projects = projectsResponse.data || []
      const payments = paymentsResponse.data || []
      // Use empty array if maintenance table doesn't exist
      const maintenanceCharges = maintenanceResponse.error ? [] : (maintenanceResponse.data || [])

      // Calculate basic metrics
      const totalUsers = users.length
      const totalProjects = projects.length
      // Calculate revenue metrics
      const completedPayments = (payments || []).filter(p => p.status === 'completed')
      
      // Split revenue between project and maintenance payments
      const projectPayments = completedPayments.filter(p => 
        p.payment_method !== 'maintenance' && !p.payment_method?.includes('maintenance')
      )
      const maintenancePayments = completedPayments.filter(p => 
        p.payment_method === 'maintenance' || p.payment_method?.includes('maintenance')
      )
      
      const totalRevenue = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const maintenanceRevenue = maintenancePayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      
      // Calculate metrics from completed projects
      const completedProjectsList = (projects || []).filter(p => p.status === 'completed')
      const avgProjectValue = completedProjectsList.length > 0 
        ? totalRevenue / completedProjectsList.length 
        : 0

      // Calculate growth rates (compare with previous period)
      const previousPeriodStart = new Date(startDate)
      previousPeriodStart.setDate(previousPeriodStart.getDate() - getDaysDifference(selectedPeriod))
      
      const previousUsers = users.filter(u => 
        new Date(u.created_at) >= previousPeriodStart && 
        new Date(u.created_at) < startDate
      ).length
      
      const previousProjects = projects.filter(p => 
        new Date(p.created_at) >= previousPeriodStart && 
        new Date(p.created_at) < startDate
      ).length
      
      const previousRevenue = payments
        .filter(p => 
          new Date(p.created_at) >= previousPeriodStart && 
          new Date(p.created_at) < startDate &&
          p.status === 'completed'
        )
        .reduce((sum, p) => sum + p.amount, 0)

      const currentUsers = users.filter(u => new Date(u.created_at) >= startDate).length
      const currentProjects = projects.filter(p => new Date(p.created_at) >= startDate).length
      const currentRevenue = payments
        .filter(p => 
          new Date(p.created_at) >= startDate &&
          p.status === 'completed'
        )
        .reduce((sum, p) => sum + p.amount, 0)

      // Calculate monthly revenue trend
      const monthlyRevenue = generateMonthlyData(payments, 'amount', 6)
      const monthlyProjects = generateMonthlyData(projects, 'count', 6)

      // Project status distribution
      const statusCounts = projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const projectStatusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value,
        percentage: Math.round((value / totalProjects) * 100)
      }))

      // Payment status distribution  
      const paymentCounts = payments.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const paymentStatusDistribution = Object.entries(paymentCounts).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
        percentage: Math.round((value / payments.length) * 100)
      }))

      // Top clients by revenue
      const clientRevenue = new Map()
      completedPayments.forEach(payment => {
        const current = clientRevenue.get(payment.user_id) || 0
        clientRevenue.set(payment.user_id, current + payment.amount)
      })

      const topClients = Array.from(clientRevenue.entries())
        .map(([userId, revenue]) => {
          const user = users.find(u => u.id === userId)
          const userProjects = projects.filter(p => p.user_id === userId)
          return {
            name: user?.full_name || user?.email || 'Unknown',
            company: user?.company_name || '',
            revenue,
            projects: userProjects.length
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Conversion rate (projects completed vs total projects)
      const completedProjectCount = (projects || []).filter(p => p.status === 'completed').length
      const conversionRate = totalProjects > 0 ? (completedProjectCount / totalProjects) * 100 : 0

      setAnalyticsData({
        totalUsers,
        totalProjects,
        totalRevenue,
        avgProjectValue,
        monthlyRevenue,
        projectStatusDistribution,
        paymentStatusDistribution,
        recentGrowth: {
          users: previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers) * 100 : 0,
          projects: previousProjects > 0 ? ((currentProjects - previousProjects) / previousProjects) * 100 : 0,
          revenue: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
        },
        monthlyProjects,
        topClients,
        maintenanceRevenue,
        conversionRate
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysDifference = (period: string) => {
    switch (period) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return 30
    }
  }

  const generateMonthlyData = (data: any[], field: string, months: number) => {
    const result = []
    const now = new Date()
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      
      const monthData = data.filter(item => {
        const itemDate = new Date(item.created_at)
        return itemDate >= date && itemDate < nextMonth
      })
      
      const value = field === 'amount' 
        ? monthData.filter(item => item.status === 'completed').reduce((sum, item) => sum + (item[field] || 0), 0)
        : monthData.length

      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        [field === 'amount' ? 'revenue' : 'projects']: value
      })
    }
    
    return result
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to load analytics</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  const metrics: Metric[] = [
    {
      title: "Total Revenue",
      value: `₹${(analyticsData.totalRevenue + analyticsData.maintenanceRevenue).toLocaleString()}`,
      change: analyticsData.recentGrowth.revenue,
      icon: IndianRupee,
      color: "text-green-600"
    },
    {
      title: "Total Users",
      value: analyticsData.totalUsers.toString(),
      change: analyticsData.recentGrowth.users,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Total Projects",
      value: analyticsData.totalProjects.toString(),
      change: analyticsData.recentGrowth.projects,
      icon: FolderOpen,
      color: "text-purple-600"
    },
    {
      title: "Avg Project Value",
      value: `₹${Math.round(analyticsData.avgProjectValue).toLocaleString()}`,
      change: analyticsData.conversionRate,
      icon: Target,
      color: "text-orange-600"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Business Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into your business performance</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon
          const isPositive = metric.change >= 0
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <IconComponent className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-1 text-xs">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={isPositive ? "text-green-500" : "text-red-500"}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs last period</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projects Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Projects Created</CardTitle>
            <CardDescription>New projects over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.monthlyProjects}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="projects" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>Current status of all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.projectStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.projectStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Status of all payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.paymentStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.paymentStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clients */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
            <CardDescription>Highest revenue generating clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{client.name}</div>
                    {client.company && (
                      <div className="text-sm text-muted-foreground">{client.company}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {client.projects} project{client.projects !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{client.revenue.toLocaleString()}</div>
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Business Health */}
        <Card>
          <CardHeader>
            <CardTitle>Business Health</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Conversion Rate</span>
              </div>
              <span className="font-semibold">{analyticsData.conversionRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Maintenance Revenue</span>
              </div>
              <span className="font-semibold">₹{analyticsData.maintenanceRevenue.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Active Projects</span>
              </div>
              <span className="font-semibold">
                {analyticsData.projectStatusDistribution.find(p => p.name === 'IN_PROGRESS')?.value || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Pending Projects</span>
              </div>
              <span className="font-semibold">
                {analyticsData.projectStatusDistribution.find(p => p.name === 'PENDING')?.value || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}