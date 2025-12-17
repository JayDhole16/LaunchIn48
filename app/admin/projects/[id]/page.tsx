"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  Calendar,
  DollarSign,
  FileText,
  Clock,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Save,
  ArrowLeft,
} from "lucide-react"

interface Project {
  id: string
  requirements: string
  budget: number
  timeline: string
  status: string
  progress: number
  admin_notes: string
  created_at: string
  services: {
    name: string
    price: number
    description: string
  }
  users: {
    full_name: string
    email: string
  }
}

const statusOptions = [
  { value: "pending", label: "Pending Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const statusConfig = {
  pending: { icon: Clock, color: "bg-yellow-500", label: "Pending Review" },
  in_progress: { icon: AlertCircle, color: "bg-blue-500", label: "In Progress" },
  completed: { icon: CheckCircle, color: "bg-green-500", label: "Completed" },
  cancelled: { icon: XCircle, color: "bg-red-500", label: "Cancelled" },
}

export default function AdminProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    status: "",
    progress: 0,
    admin_notes: "",
  })
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  useEffect(() => {
    if (project) {
      setFormData({
        status: project.status,
        progress: project.progress,
        admin_notes: project.admin_notes || "",
      })
    }
  }, [project])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      const result = await response.json()

      if (response.ok) {
        setProject(result.project)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setProject(result.project)
        toast({
          title: "Success",
          description: "Project updated successfully",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Project not found</h2>
        <p className="text-gray-600 mt-2">The project you're looking for doesn't exist.</p>
      </div>
    )
  }

  const StatusIcon = statusConfig[project.status as keyof typeof statusConfig]?.icon || Clock
  const statusColor = statusConfig[project.status as keyof typeof statusConfig]?.color || "bg-gray-500"
  const statusLabel = statusConfig[project.status as keyof typeof statusConfig]?.label || project.status

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Project</h1>
            <p className="text-gray-600 mt-1">Update project status and communicate with client</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {project.services.name}
              </CardTitle>
              <CardDescription>Created on {new Date(project.created_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Client Requirements</Label>
                <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">{project.requirements}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Project Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="progress">Progress (%)</Label>
                  <Input
                    id="progress"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number.parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Progress value={formData.progress} className="w-full" />
                <p className="text-sm text-gray-600 mt-1">{formData.progress}% Complete</p>
              </div>

              <div>
                <Label htmlFor="admin_notes">Updates for Client</Label>
                <Textarea
                  id="admin_notes"
                  placeholder="Add updates, milestones, or messages for the client..."
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusColor}`}>
                  <StatusIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-gray-600">{statusLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Budget</p>
                  <p className="text-sm text-gray-600">₹{project.budget.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Timeline</p>
                  <p className="text-sm text-gray-600 capitalize">{project.timeline.replace("-", " ")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Client</p>
                  <p className="text-sm text-gray-600">{project.users.full_name}</p>
                  <p className="text-xs text-gray-500">{project.users.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{project.services.name}</p>
                <p className="text-sm text-gray-600">{project.services.description}</p>
                <p className="text-lg font-semibold text-green-600">₹{project.services.price.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
