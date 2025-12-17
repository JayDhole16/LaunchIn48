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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Send, MessageCircle, Clock, User, Plus, Users, FolderOpen, Trash2 } from "lucide-react"

interface Message {
  id: string
  project_id: string
  user_id: string
  sender_type: "user" | "admin"
  message: string
  created_at: string
  read_at: string | null
  projects: {
    title: string
    users: {
      full_name: string
      email: string
    }
  }
}

interface Project {
  id: string
  title: string
  user_id: string
  users: {
    full_name: string
    email: string
  }
}

interface User {
  id: string
  full_name: string
  email: string
  phone: string
  company_name: string
}

export default function AdminProjectMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isDirectMessage, setIsDirectMessage] = useState(false)
  const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false)

  useEffect(() => {
    fetchAdminData()
    
    // Set up real-time subscription for new messages
    const supabase = createClient()
    const subscription = supabase
      .channel('project_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_messages'
      }, () => {
        fetchAdminData() // Refresh data when messages change
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchAdminData = async () => {
    const supabase = createClient()

    // Fetch all paid projects with messages
    const { data: projectsData } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        user_id,
        users(full_name, email)
      `)
      .in("payment_status", ["paid", "partial"])
      .order("created_at", { ascending: false })
    
    // Fetch all users for direct messaging
    const { data: usersData } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        phone,
        company_name
      `)
      .order("full_name", { ascending: true })

    if (projectsData) {
      setProjects(projectsData)
      if (projectsData.length > 0 && !selectedProjectId && !isDirectMessage) {
        setSelectedProjectId(projectsData[0].id)
      }
    }
    
    if (usersData) {
      setUsers(usersData)
    }

    // Fetch all messages
    const { data: messagesData } = await supabase
      .from("project_messages")
      .select(`
        *,
        projects(
          title,
          users(full_name, email)
        )
      `)
      .order("created_at", { ascending: false })

    if (messagesData) {
      setMessages(messagesData)
    }

    setIsLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || (!selectedProjectId && !isDirectMessage)) return

    setIsSending(true)
    const supabase = createClient()
    
    if (isDirectMessage) {
      // Send direct message to user
      if (!selectedUserId) return
      
      // Create a direct message entry (we'll use project_messages table with project_id as null)
      const { error } = await supabase.from("project_messages").insert({
        project_id: null, // null indicates direct message
        user_id: selectedUserId,
        sender_type: "admin",
        message: newMessage.trim(),
      })

      if (!error) {
        setNewMessage("")
        fetchAdminData() // Refresh messages
      }
    } else {
      // Send project message
      const project = projects.find(p => p.id === selectedProjectId)
      if (!project) return

      const { error } = await supabase.from("project_messages").insert({
        project_id: selectedProjectId,
        user_id: project.user_id,
        sender_type: "admin",
        message: newMessage.trim(),
      })

      if (!error) {
        setNewMessage("")
        fetchAdminData() // Refresh messages
      }
    }

    setIsSending(false)
  }
  
  const startDirectMessage = (userId: string) => {
    setSelectedUserId(userId)
    setSelectedProjectId("")
    setIsDirectMessage(true)
    setIsNewMessageDialogOpen(false)
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('project_messages')
      .delete()
      .eq('id', messageId)

    if (!error) {
      setMessages(messages.filter(m => m.id !== messageId))
      console.log('Message deleted successfully')
    } else {
      console.error('Error deleting message:', error)
      alert('Failed to delete message. Please try again.')
    }
  }

  const projectMessages = isDirectMessage 
    ? messages.filter(m => m.user_id === selectedUserId && m.project_id === null)
    : messages.filter(m => m.project_id === selectedProjectId)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const selectedUser = users.find(u => u.id === selectedUserId)

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

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Project Messages</h1>
          <p className="text-muted-foreground">Manage customer communications</p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Paid Projects</h3>
            <p className="text-muted-foreground">
              There are no paid projects with messaging capabilities yet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Manage customer communications</p>
        </div>
        <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Message to User</DialogTitle>
              <DialogDescription>
                Select a user to send a direct message
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => startDirectMessage(user.id)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{user.full_name || user.email}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      {user.company_name && (
                        <span className="text-xs text-muted-foreground">{user.company_name}</span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
        {/* Enhanced Sidebar */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <div className="flex bg-muted rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={!isDirectMessage ? "default" : "ghost"}
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setIsDirectMessage(false)
                      setSelectedUserId("")
                      if (projects.length > 0) setSelectedProjectId(projects[0].id)
                    }}
                  >
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Projects
                  </Button>
                  <Button
                    size="sm"
                    variant={isDirectMessage ? "default" : "ghost"}
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setIsDirectMessage(true)
                      setSelectedProjectId("")
                    }}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Direct
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {isDirectMessage ? (
                    // Show users for direct messaging
                    users.filter(user => messages.some(m => m.user_id === user.id && m.project_id === null)).length > 0 ? (
                      users.filter(user => messages.some(m => m.user_id === user.id && m.project_id === null)).map((user) => {
                        const directMessageCount = messages.filter(m => m.user_id === user.id && m.project_id === null).length
                        const unreadCount = messages.filter(m => 
                          m.user_id === user.id && 
                          m.project_id === null &&
                          m.sender_type === "user" && 
                          !m.read_at
                        ).length
                        const lastMessage = messages.filter(m => m.user_id === user.id && m.project_id === null).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                  
                        return (
                          <div
                            key={user.id}
                            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                              selectedUserId === user.id 
                                ? "bg-primary/10 border border-primary/20 shadow-sm" 
                                : "border border-transparent hover:bg-muted/30 hover:border-border"
                            }`}
                            onClick={() => {
                              setSelectedUserId(user.id)
                              setSelectedProjectId("")
                              setIsDirectMessage(true)
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                  selectedUserId === user.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                }`}>
                                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-sm truncate">{user.full_name || user.email}</span>
                                    {unreadCount > 0 && (
                                      <Badge variant="destructive" className="text-xs h-5 px-1.5">
                                        {unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mb-1">
                                    {user.email}
                                  </p>
                                  {lastMessage && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {lastMessage.sender_type === 'admin' ? 'You: ' : ''}
                                      {lastMessage.message.substring(0, 30)}...
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {lastMessage && new Date(lastMessage.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No direct messages yet</p>
                      </div>
                    )
                  ) : (
                    // Show projects
                    projects.map((project) => {
                      const projectMessageCount = messages.filter(m => m.project_id === project.id).length
                      const unreadCount = messages.filter(m => 
                        m.project_id === project.id && 
                        m.sender_type === "user" && 
                        !m.read_at
                      ).length
                      const lastMessage = messages.filter(m => m.project_id === project.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                  
                      return (
                        <div
                          key={project.id}
                          className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedProjectId === project.id && !isDirectMessage 
                              ? "bg-primary/10 border border-primary/20 shadow-sm" 
                              : "border border-transparent hover:bg-muted/30 hover:border-border"
                          }`}
                          onClick={() => {
                            setSelectedProjectId(project.id)
                            setSelectedUserId("")
                            setIsDirectMessage(false)
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                selectedProjectId === project.id && !isDirectMessage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}>
                                <FolderOpen className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-sm truncate">{project.title}</span>
                                  {unreadCount > 0 && (
                                    <Badge variant="destructive" className="text-xs h-5 px-1.5">
                                      {unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate mb-1">
                                  {project.users.full_name || project.users.email}
                                </p>
                                {lastMessage && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {lastMessage.sender_type === 'admin' ? 'You: ' : ''}
                                    {lastMessage.message.substring(0, 30)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {lastMessage && new Date(lastMessage.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isDirectMessage ? (
                    selectedUser ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedUser.full_name || selectedUser.email}</CardTitle>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Direct Message</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Select a User</CardTitle>
                          <p className="text-sm text-muted-foreground">Choose a user to start messaging</p>
                        </div>
                      </>
                    )
                  ) : (
                    selectedProject ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedProject.title}</CardTitle>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-3 w-3 mr-1" />
                            <span>{selectedProject.users.full_name || selectedProject.users.email}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Select a Project</CardTitle>
                          <p className="text-sm text-muted-foreground">Choose a project to view messages</p>
                        </div>
                      </>
                    )
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {projectMessages.length} messages
                  </Badge>
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {projectMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                        <p className="text-sm">
                          {isDirectMessage 
                            ? "Start the conversation by sending a message" 
                            : "Customer can start a conversation or you can send a message"}
                        </p>
                      </div>
                    ) : (
                      [...projectMessages].reverse().map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_type === "admin" ? "justify-end" : "justify-start"} mb-6`}
                        >
                          <div className={`flex items-start space-x-3 max-w-sm lg:max-w-lg ${
                            message.sender_type === "admin" ? "flex-row-reverse space-x-reverse" : ""
                          }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1 ${
                              message.sender_type === "admin" 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {message.sender_type === "admin" 
                                ? "A" 
                                : (isDirectMessage 
                                  ? (selectedUser?.full_name || selectedUser?.email || "U").charAt(0).toUpperCase()
                                  : (selectedProject?.users.full_name || selectedProject?.users.email || "U").charAt(0).toUpperCase())
                              }
                            </div>
                            <div className={`rounded-xl px-4 py-3 relative group shadow-sm border ${
                              message.sender_type === "admin"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-white border-border"
                            }`}>
                              <p className="text-sm whitespace-pre-wrap pr-10 leading-relaxed">{message.message}</p>
                              <div className="flex items-center justify-between mt-3 pt-2 text-xs opacity-70">
                                <span className="font-medium">
                                  {message.sender_type === "admin" 
                                    ? "You" 
                                    : isDirectMessage 
                                      ? selectedUser?.full_name || "User" 
                                      : selectedProject?.users.full_name || "Customer"
                                  }
                                </span>
                                <span className="font-mono text-xs">
                                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {/* Delete button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`absolute top-3 right-3 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 ${
                                  message.sender_type === "admin" 
                                    ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20" 
                                    : "text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
                                }`}
                                onClick={() => deleteMessage(message.id)}
                                title="Delete message"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Enhanced Message Input */}
              <div className="border-t bg-muted/20 p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                    A
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-lg border border-border shadow-sm">
                      <Textarea
                        id="admin-message"
                        placeholder={`Message ${isDirectMessage 
                          ? (selectedUser?.full_name || 'user')
                          : (selectedProject?.users.full_name || 'customer')
                        }...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-4 text-sm"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (!isSending && newMessage.trim()) {
                              sendMessage()
                            }
                          }
                        }}
                      />
                      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                        <div className="text-xs text-muted-foreground">
                          Press Enter to send, Shift + Enter for new line
                        </div>
                        <Button
                          onClick={sendMessage}
                          disabled={isSending || !newMessage.trim()}
                          size="sm"
                          className="h-8"
                        >
                          {isSending ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}