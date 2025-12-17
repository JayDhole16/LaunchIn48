"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageCircle, Clock } from "lucide-react"

interface Message {
  id: string
  project_id: string
  sender_type: "user" | "admin"
  message: string
  created_at: string
  read_at: string | null
  projects: {
    title: string
  }
}

interface Project {
  id: string
  title: string
  payment_status: string
  paid_amount: number
  total_amount: number
  remaining_amount: number
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    fetchUserData()
    
    // Set up real-time subscription for new messages
    const supabase = createClient()
    const subscription = supabase
      .channel('user_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_messages'
      }, (payload) => {
        console.log('Real-time message update:', payload)
        fetchUserData() // Refresh messages when new ones arrive
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserData = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    // Fetch user's projects via server API for consistent payment-derived filtering
    const projectsRes = await fetch('/api/user/projects', { cache: 'no-store' })
    const projectsJson = await projectsRes.json().catch(() => ({ projects: [] }))
    const projectsData = projectsRes.ok ? (projectsJson.projects || []) : []
    
    // Filter projects that have any payment made (advance or full)
    const projectsWithPayments = (projectsData || []).filter((project: any) => {
      const paid = typeof project.paid_amount === 'number' ? project.paid_amount : 0
      return paid > 0 || project.payment_status === 'paid' || project.payment_status === 'partial'
    })

    console.log('Projects with payments:', projectsWithPayments)
    
    if (projectsWithPayments) {
      setProjects(projectsWithPayments)
      if (projectsWithPayments.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsWithPayments[0].id)
      } else if (projectsWithPayments.length === 0 && !selectedProjectId) {
        // If no projects, default to direct messaging
        setSelectedProjectId("direct")
      }
    } else if (!selectedProjectId) {
      // If no projects data, default to direct messaging
      setSelectedProjectId("direct")
    }

    // Fetch messages (both project messages and direct messages)
    const { data: messagesData } = await supabase
      .from("project_messages")
      .select(`
        *,
        projects(title)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (messagesData) {
      setMessages(messagesData)
    }

    setIsLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProjectId) return

    setIsSending(true)
    
    try {
      if (selectedProjectId === "direct") {
        // Send direct message
        const response = await fetch('/api/direct-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: newMessage.trim() })
        })
        
        if (!response.ok) {
          throw new Error('Failed to send direct message')
        }
      } else {
        // Send project message
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            project_id: selectedProjectId,
            message: newMessage.trim() 
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to send project message')
        }
      }
      
      setNewMessage("")
      fetchUserData() // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error)
    }

    setIsSending(false)
  }

  const projectMessages = messages.filter(m => m.project_id === selectedProjectId)
  const directMessages = messages.filter(m => m.project_id === null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  // Always show the messaging interface - direct messaging is available even without projects

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Chat with our team about your projects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Direct Messages - Always show this option */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Admin
              </CardTitle>
              <CardDescription className="text-xs">
                Send direct messages to our team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={selectedProjectId === "direct" ? "default" : "outline"}
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => setSelectedProjectId("direct")}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">Direct Messages</span>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {directMessages.length} messages
                  </Badge>
                  {directMessages.length === 0 && (
                    <span className="text-xs text-muted-foreground mt-1">
                      Start a conversation
                    </span>
                  )}
                </div>
              </Button>
            </CardContent>
          </Card>
          
          {/* Project Messages - Only show if projects exist */}
          {projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Messages</CardTitle>
                <CardDescription className="text-xs">
                  Messages related to your projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProjectId === project.id ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                  <div className="flex flex-col items-start">
                    <span className="font-medium truncate">{project.title}</span>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {project.payment_status}
                      </Badge>
                      {project.paid_amount > 0 && project.remaining_amount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          ₹{project.paid_amount.toLocaleString()} paid
                        </Badge>
                      )}
                    </div>
                  </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {selectedProjectId === "direct" 
                    ? "Direct Messages from Admin" 
                    : projects.find(p => p.id === selectedProjectId)?.title || "Select a Conversation"}
                </span>
                <Badge variant="outline">
                  {selectedProjectId === "direct" ? directMessages.length : projectMessages.length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <ScrollArea className="h-96 mb-4">
                <div className="space-y-4">
                  {(selectedProjectId === "direct" ? directMessages : projectMessages).length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{selectedProjectId === "direct" ? "No direct messages yet." : "No messages yet. Start a conversation!"}</p>
                    </div>
                  ) : (
                    (selectedProjectId === "direct" ? directMessages : projectMessages).map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">
                              {message.sender_type === "user" ? "You" : "Admin"}
                            </p>
                            <p className="text-xs opacity-70">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  {selectedProjectId === "direct" 
                    ? "Send a direct message to admin" 
                    : "Send a message about this project"}
                </Label>
                <div className="flex space-x-2">
                  <Textarea
                    id="message"
                    placeholder={
                      selectedProjectId === "direct"
                        ? "Ask questions, share feedback, or get help with our services..."
                        : "Type your project-related message here..."
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    rows={3}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isSending || !newMessage.trim()}
                    size="sm"
                  >
                    {isSending ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {selectedProjectId === "direct" && (
                  <p className="text-xs text-muted-foreground">
                    💡 Use direct messages for general questions, feedback, or if you don't have a project yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}