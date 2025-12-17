"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  Calendar,
  DollarSign,
  FileText,
  Clock,
  User,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
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

const statusConfig = {
  pending: { icon: Clock, color: "bg-yellow-500", label: "Pending Review" },
  in_progress: { icon: AlertCircle, color: "bg-blue-500", label: "In Progress" },
  completed: { icon: CheckCircle, color: "bg-green-500", label: "Completed" },
  cancelled: { icon: XCircle, color: "bg-red-500", label: "Cancelled" },
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

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

  const submitFeedback = async () => {
    if (!feedback.trim()) return

    setSubmittingFeedback(true)
    try {
      // In a real app, you'd have a feedback/comments table
      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been sent to our team.",
      })
      setFeedback("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      })
    } finally {
      setSubmittingFeedback(false)
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Details</h1>
          <p className="text-gray-600 mt-1">Track your project progress and communicate with our team</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Project Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {project.services.name}
              </CardTitle>
              <CardDescription>Created on {new Date(project.created_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Requirements</Label>
                <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">{project.requirements}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Progress</Label>
                <div className="mt-2 space-y-2">
                  <Progress value={project.progress} className="w-full" />
                  <p className="text-sm text-gray-600">{project.progress}% Complete</p>
                </div>
              </div>

              {project.admin_notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Updates from Team</Label>
                  <p className="mt-1 text-gray-900 bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
                    {project.admin_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Send Feedback
              </CardTitle>
              <CardDescription>Have questions or feedback? Let us know!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Share your thoughts, questions, or feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
              <Button onClick={submitFeedback} disabled={!feedback.trim() || submittingFeedback}>
                {submittingFeedback ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Feedback"
                )}
              </Button>
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
