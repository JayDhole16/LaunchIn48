"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CreditCard, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { calculateFreeMaintenance } from '@/lib/maintenance-utils'

interface MaintenanceSummaryProps {
  projects: Array<{
    id: string
    title: string
    status: string
    completed_date?: string
    total_amount: number
  }>
  maintenanceData: Record<string, {
    status: 'active' | 'expired' | 'suspended' | 'cancelled'
    start_date: string
    end_date: string
    next_payment_due: string
    maintenance_amount: number
    base_amount: number
    plan_name?: string
  }>
}

interface MaintenanceStats {
  freeActive: number
  freeEndingSoon: number
  freeExpired: number
  paidActive: number
  paidDueSoon: number
  paidOverdue: number
  totalRevenue: number
  averageAmount: number
}

export function MaintenanceSummary({ projects, maintenanceData }: MaintenanceSummaryProps) {
  const completedProjects = projects.filter(p => p.status === 'completed' && p.completed_date)
  
  const stats = React.useMemo((): MaintenanceStats => {
    let freeActive = 0
    let freeEndingSoon = 0
    let freeExpired = 0
    let paidActive = 0
    let paidDueSoon = 0
    let paidOverdue = 0
    let totalRevenue = 0

    completedProjects.forEach(project => {
      const freeMaintenanceInfo = calculateFreeMaintenance(project.completed_date!)
      const projectMaintenance = maintenanceData[project.id]
      const hasPaidMaintenance = projectMaintenance && projectMaintenance.status === 'active'

      if (hasPaidMaintenance) {
        const today = new Date()
        const nextPaymentDue = new Date(projectMaintenance.next_payment_due)
        const daysToDue = Math.ceil((nextPaymentDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysToDue < 0) {
          paidOverdue++
        } else if (daysToDue <= 7) {
          paidDueSoon++
        } else {
          paidActive++
        }
        
        totalRevenue += projectMaintenance.maintenance_amount
      } else {
        // Free maintenance period
        if (freeMaintenanceInfo.isActive) {
          if (freeMaintenanceInfo.isEndingSoon) {
            freeEndingSoon++
          } else {
            freeActive++
          }
        } else {
          freeExpired++
        }
      }
    })

    const totalPaidProjects = paidActive + paidDueSoon + paidOverdue
    const averageAmount = totalPaidProjects > 0 ? totalRevenue / totalPaidProjects : 0

    return {
      freeActive,
      freeEndingSoon,
      freeExpired,
      paidActive,
      paidDueSoon,
      paidOverdue,
      totalRevenue,
      averageAmount
    }
  }, [completedProjects, maintenanceData])

  const summaryCards = [
    {
      title: 'Free Maintenance',
      value: stats.freeActive,
      subtitle: `${stats.freeEndingSoon} ending soon`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Paid Maintenance',
      value: stats.paidActive,
      subtitle: `₹${stats.totalRevenue.toLocaleString()} revenue`,
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Attention Needed',
      value: stats.paidOverdue + stats.freeExpired,
      subtitle: `${stats.paidDueSoon + stats.freeEndingSoon} due soon`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    {
      title: 'Average Revenue',
      value: `₹${Math.round(stats.averageAmount).toLocaleString()}`,
      subtitle: 'per paid project',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    }
  ]

  if (completedProjects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No Completed Projects
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Maintenance tracking will appear here once projects are completed
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Maintenance Overview
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track maintenance status for {completedProjects.length} completed project{completedProjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const IconComponent = card.icon
          return (
            <Card key={index} className={`${card.bgColor} ${card.borderColor} border-l-4`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className={`text-2xl font-bold ${card.color} mt-1`}>
                      {card.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={`${card.color} opacity-80`}>
                    <IconComponent className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div className="text-center">
              <Badge className="bg-green-100 text-green-800 mb-2" variant="secondary">
                {stats.freeActive}
              </Badge>
              <p className="text-xs text-gray-600">Free Active</p>
            </div>
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-800 mb-2" variant="secondary">
                {stats.freeEndingSoon}
              </Badge>
              <p className="text-xs text-gray-600">Free Ending</p>
            </div>
            <div className="text-center">
              <Badge className="bg-red-100 text-red-800 mb-2" variant="secondary">
                {stats.freeExpired}
              </Badge>
              <p className="text-xs text-gray-600">Free Expired</p>
            </div>
            <div className="text-center">
              <Badge className="bg-blue-100 text-blue-800 mb-2" variant="secondary">
                {stats.paidActive}
              </Badge>
              <p className="text-xs text-gray-600">Paid Active</p>
            </div>
            <div className="text-center">
              <Badge className="bg-yellow-100 text-yellow-800 mb-2" variant="secondary">
                {stats.paidDueSoon}
              </Badge>
              <p className="text-xs text-gray-600">Due Soon</p>
            </div>
            <div className="text-center">
              <Badge className="bg-red-100 text-red-800 mb-2" variant="secondary">
                {stats.paidOverdue}
              </Badge>
              <p className="text-xs text-gray-600">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}