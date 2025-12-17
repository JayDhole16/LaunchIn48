"use client"

import { AlertTriangle, CheckCircle, Clock, Info } from "lucide-react"
import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { Badge } from "./badge"
import { calculateFreeMaintenance } from "@/lib/maintenance-utils"

interface StatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    title: string
    status: string
    total_amount: number
    created_at: string
    completed_date?: string
  }
  newStatus: string
  onConfirm: () => void
  onCancel?: () => void
  isLoading?: boolean
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  project,
  newStatus,
  onConfirm,
  onCancel,
  isLoading = false,
}: StatusChangeDialogProps) {
  const isChangingToCompleted = newStatus === 'completed'
  const isChangingFromCompleted = project.status === 'completed' && newStatus !== 'completed'
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
  }

  // Calculate maintenance info if completing project
  const maintenanceInfo = isChangingToCompleted && project.completed_date 
    ? calculateFreeMaintenance(project.completed_date)
    : calculateFreeMaintenance(new Date().toISOString())

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800", 
      review: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    }
    
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"} variant="secondary">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isChangingToCompleted && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {isChangingFromCompleted && (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            {!isChangingToCompleted && !isChangingFromCompleted && (
              <Info className="h-5 w-5 text-blue-600" />
            )}
            <DialogTitle>
              {isChangingToCompleted && "Complete Project"}
              {isChangingFromCompleted && "Change Completed Project Status"}
              {!isChangingToCompleted && !isChangingFromCompleted && "Change Project Status"}
            </DialogTitle>
          </div>
          <DialogDescription className="space-y-2">
            <span className="block">
              <strong>Project:</strong> {project.title}
            </span>
            <span className="flex items-center gap-2">
              <span>Status change:</span>
              {getStatusBadge(project.status)}
              <span>→</span>
              {getStatusBadge(newStatus)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isChangingToCompleted && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">
                    🎉 Project Completion Benefits
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• <strong>84 Days Free Maintenance</strong> - Starting from completion date</p>
                    <p>• Free technical support and bug fixes</p>
                    <p>• Regular updates and security patches</p>
                    <p>• After free period: Flexible paid maintenance plans</p>
                  </div>
                  {maintenanceInfo && (
                    <div className="mt-2 p-2 bg-white rounded border border-green-300">
                      <div className="text-xs text-green-600">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Free maintenance period: <strong>84 days</strong>
                      </div>
                      <div className="text-xs text-green-600">
                        Maintenance will start billing on: {maintenanceInfo.endDate}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isChangingFromCompleted && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-800">
                    ⚠️ Important: Maintenance Impact
                  </h4>
                  <div className="text-sm text-amber-700 space-y-1">
                    <p>Changing status from "completed" will:</p>
                    <p>• <strong>Pause maintenance period</strong> if currently active</p>
                    <p>• Stop free maintenance benefits</p>
                    <p>• Require manual review of maintenance billing</p>
                    <p>• May affect client expectations</p>
                  </div>
                  <div className="mt-2 p-2 bg-white rounded border border-amber-300">
                    <div className="text-xs text-amber-600 font-medium">
                      💡 Consider: Is this status change necessary? This will impact the maintenance timeline.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isChangingToCompleted && !isChangingFromCompleted && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-800">Status Change Confirmation</h4>
                  <p className="text-sm text-blue-700">
                    Are you sure you want to change the project status? This will update the project timeline and may affect client notifications.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isChangingFromCompleted ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {isChangingToCompleted && "✅ Complete Project"}
                {isChangingFromCompleted && "⚠️ Change Status"}
                {!isChangingToCompleted && !isChangingFromCompleted && "Confirm Change"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}