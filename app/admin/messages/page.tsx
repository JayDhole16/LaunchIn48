"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Search, Mail, Phone, Building, Calendar, Filter, MessageSquare, Users, FolderOpen, AlertCircle, Trash2 } from "lucide-react"

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string
  company: string
  message: string
  status: string
  created_at: string
}

interface ProjectMessage {
  id: string
  message: string
  sender_type: string
  created_at: string
  user_id: string
  project_id: string | null
  projects?: {
    title: string
    users: {
      full_name: string
      email: string
    }
  }
  users?: {
    full_name: string
    email: string
  }
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [filteredMessages, setFilteredMessages] = useState<ContactMessage[]>([])
  const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<'contact' | 'projects'>('projects')
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
    
    // Set up real-time subscription for new messages
    const supabase = createClient()
    const subscription = supabase
      .channel('admin_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_messages'
      }, (payload) => {
        console.log('Real-time message update:', payload)
        fetchMessages() // Refresh messages when new ones arrive
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchMessages = async () => {
      const supabase = createClient()

      // Fetch contact messages
      const { data: messagesData } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })

      if (messagesData) {
        setMessages(messagesData)
        setFilteredMessages(messagesData)
      }

      // Fetch project messages from users - simplified query first
      const { data: projectMessagesData, error: projectMessagesError } = await supabase
        .from("project_messages")
        .select(`
          *
        `)
        .eq("sender_type", "user")
        .order("created_at", { ascending: false })

      console.log('Project Messages Data:', projectMessagesData)
      console.log('Project Messages Error:', projectMessagesError)

      if (projectMessagesError) {
        // Check if it's a table not found error
        if (projectMessagesError.code === 'PGRST116' || projectMessagesError.message?.includes('relation') || projectMessagesError.message?.includes('does not exist')) {
          setDbError('The project_messages table does not exist. Please set it up first.')
        } else {
          setDbError(`Database error: ${projectMessagesError.message}`)
        }
      } else if (projectMessagesData) {
        setProjectMessages(projectMessagesData)
        setDbError(null)
      }

      setIsLoading(false)
  }

  useEffect(() => {
    let filtered = messages

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (message) =>
          message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.message.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((message) => message.status === statusFilter)
    }

    setFilteredMessages(filtered)
  }, [messages, searchTerm, statusFilter])

  const updateMessageStatus = async (messageId: string, newStatus: string) => {
    const supabase = createClient()

    const { error } = await supabase.from("contact_messages").update({ status: newStatus }).eq("id", messageId)

    if (!error) {
      setMessages(messages.map((m) => (m.id === messageId ? { ...m, status: newStatus } : m)))
    }
  }

  const deleteProjectMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('project_messages')
      .delete()
      .eq('id', messageId)

    if (!error) {
      setProjectMessages(projectMessages.filter(m => m.id !== messageId))
      console.log('Message deleted successfully')
    } else {
      console.error('Error deleting message:', error)
      alert('Failed to delete message. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "read":
        return "bg-yellow-100 text-yellow-800"
      case "replied":
        return "bg-green-100 text-green-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Manage contact form submissions and project messages</p>
        </div>
        <Button asChild>
          <Link href="/admin/project-messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Messages
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'projects'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderOpen className="h-4 w-4 mr-2 inline" />
          Project Messages ({projectMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'contact'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4 mr-2 inline" />
          Contact Messages ({messages.length})
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="grid gap-6">
        {activeTab === 'contact' ? (
          // Contact Messages
          filteredMessages.map((message) => (
          <Card key={message.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-lg">{message.name}</CardTitle>
                    <Badge className={getStatusColor(message.status)} variant="secondary">
                      {message.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{message.email}</span>
                    </div>
                    {message.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{message.phone}</span>
                      </div>
                    )}
                    {message.company && (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        <span>{message.company}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{message.message}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select onValueChange={(value) => updateMessageStatus(message.id, value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Full Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Message from {message.name}</DialogTitle>
                      <DialogDescription>Received on {new Date(message.created_at).toLocaleString()}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Name</div>
                          <div className="text-sm text-muted-foreground">{message.name}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Email</div>
                          <div className="text-sm text-muted-foreground">{message.email}</div>
                        </div>
                        {message.phone && (
                          <div>
                            <div className="text-sm font-medium">Phone</div>
                            <div className="text-sm text-muted-foreground">{message.phone}</div>
                          </div>
                        )}
                        {message.company && (
                          <div>
                            <div className="text-sm font-medium">Company</div>
                            <div className="text-sm text-muted-foreground">{message.company}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Message</div>
                        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg whitespace-pre-wrap">
                          {message.message}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button asChild>
                          <a href={`mailto:${message.email}?subject=Re: Your inquiry`}>Reply via Email</a>
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          ))
        ) : (
          // Project Messages
          projectMessages.map((message) => (
            <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-lg">
                        {message.project_id 
                          ? `${message.projects?.users?.full_name || 'User'} - ${message.projects?.title}` 
                          : `${message.users?.full_name || 'User'} - Direct Message`}
                      </CardTitle>
                      <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                        {message.project_id ? 'Project Message' : 'Direct Message'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>
                          {message.project_id 
                            ? message.projects?.users?.email 
                            : message.users?.email}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{new Date(message.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{message.message}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          Message from {message.project_id 
                            ? message.projects?.users?.full_name 
                            : message.users?.full_name}
                        </DialogTitle>
                        <DialogDescription>
                          {message.project_id 
                            ? `Project: ${message.projects?.title}` 
                            : 'Direct Message'} • 
                          Received on {new Date(message.created_at).toLocaleString()}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-2">Message</div>
                          <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg whitespace-pre-wrap">
                            {message.message}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button asChild>
                            <a href={`mailto:${message.project_id 
                              ? message.projects?.users?.email 
                              : message.users?.email}?subject=Re: Your message`}>
                              Reply via Email
                            </a>
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteProjectMessage(message.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Empty States */}
      {activeTab === 'contact' && filteredMessages.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No contact messages found matching your criteria</p>
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'projects' && dbError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-800">Database Setup Required</h3>
            <p className="text-red-700 mb-4">{dbError}</p>
            <div className="space-y-2">
              <p className="text-sm text-red-600">To fix this issue:</p>
              <ol className="text-sm text-red-600 text-left max-w-md mx-auto space-y-1">
                <li>1. Visit <a href="/api/create-project-messages-table" target="_blank" className="underline font-medium">this link</a> to get the SQL</li>
                <li>2. Copy the SQL code</li>
                <li>3. Go to your Supabase dashboard → SQL Editor</li>
                <li>4. Paste and run the SQL code</li>
                <li>5. Refresh this page</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'projects' && !dbError && projectMessages.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No project messages from users yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
