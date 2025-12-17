"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Phone, Building, Calendar, UserPlus, Eye, EyeOff } from "lucide-react"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  email: string
  full_name: string
  phone: string
  company_name: string
  role: string
  created_at: string
  project_count?: number
  total_spent?: number
  project_paid_amount?: number
  project_remaining_amount?: number
  maintenance_paid_amount?: number
  maintenance_due_amount?: number
  total_paid_amount?: number
  total_remaining_amount?: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form state for creating user
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    companyName: "",
  })

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Failed to fetch admin users: ${res.status}`)
        }
        const { users: usersWithStats } = await res.json()
        setUsers(usersWithStats || [])
        setFilteredUsers(usersWithStats || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError(null)
    setCreateSuccess(false)

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          phone: newUser.phone,
          companyName: newUser.companyName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user")
      }

      setCreateSuccess(true)
      // Reset form
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        companyName: "",
      })
      
      // Refresh users list
      const refreshRes = await fetch("/api/admin/users", { cache: "no-store" })
      if (refreshRes.ok) {
        const { users: usersWithStats } = await refreshRes.json()
        setUsers(usersWithStats || [])
        setFilteredUsers(usersWithStats || [])
      }

      // Auto-close dialog after 2 seconds
      setTimeout(() => {
        setIsCreateDialogOpen(false)
        setCreateSuccess(false)
      }, 2000)
    } catch (error: any) {
      setCreateError(error.message || "Failed to create user")
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [users, searchTerm])

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
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users and their information</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a user account. They will be required to change their password on first login.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  User will change this password on first login
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Company Name"
                  value={newUser.companyName}
                  onChange={(e) => setNewUser({ ...newUser, companyName: e.target.value })}
                />
              </div>

              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  ✓ User created successfully! They will need to change their password on first login.
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => {
          const initials = user.full_name
            ? user.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : user.email[0].toUpperCase()

          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-4">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-lg">{user.full_name || "User"}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
                <div className="flex justify-center">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.company_name && (
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 text-muted-foreground mr-2" />
                    <span>{user.company_name}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">{user.project_count}</div>
                      <div className="text-xs text-muted-foreground">Projects</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">₹{user.total_spent?.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Value</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-sm font-semibold text-green-600">₹{user.total_paid_amount?.toLocaleString() || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Paid</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-orange-600">₹{user.total_remaining_amount?.toLocaleString() || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Due</div>
                    </div>
                  </div>
                  
                  {(user.maintenance_paid_amount && user.maintenance_paid_amount > 0) || (user.maintenance_due_amount && user.maintenance_due_amount > 0) ? (
                    <div className="text-xs text-center text-muted-foreground border-t pt-2">
                      Maintenance: ₹{user.maintenance_paid_amount?.toLocaleString() || 0} paid, ₹{user.maintenance_due_amount?.toLocaleString() || 0} due
                    </div>
                  ) : null}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full bg-transparent">
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>User Details</DialogTitle>
                      <DialogDescription>Complete user information and statistics</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="text-center">
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-semibold">{user.full_name || "User"}</h3>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Role</div>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Member Since</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {user.phone && (
                          <div>
                            <div className="text-sm font-medium">Phone</div>
                            <div className="text-sm text-muted-foreground">{user.phone}</div>
                          </div>
                        )}
                        {user.company_name && (
                          <div>
                            <div className="text-sm font-medium">Company</div>
                            <div className="text-sm text-muted-foreground">{user.company_name}</div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{user.project_count}</div>
                          <div className="text-sm text-muted-foreground">Total Projects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">₹{user.total_spent?.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Total Value</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">₹{user.total_paid_amount?.toLocaleString() || 0}</div>
                          <div className="text-sm text-muted-foreground">Total Paid</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-600">₹{user.total_remaining_amount?.toLocaleString() || 0}</div>
                          <div className="text-sm text-muted-foreground">Total Due</div>
                        </div>
                      </div>
                      
                      {/* Projects Breakdown */}
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium mb-3">Project Payments</div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-600">₹{user.project_paid_amount?.toLocaleString() || 0}</div>
                            <div className="text-xs text-muted-foreground">Projects Paid</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-orange-600">₹{user.project_remaining_amount?.toLocaleString() || 0}</div>
                            <div className="text-xs text-muted-foreground">Projects Due</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Maintenance Breakdown */}
                      {((user.maintenance_paid_amount && user.maintenance_paid_amount > 0) || (user.maintenance_due_amount && user.maintenance_due_amount > 0)) && (
                        <div className="pt-4 border-t">
                          <div className="text-sm font-medium mb-3">Maintenance Payments</div>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-green-600">₹{user.maintenance_paid_amount?.toLocaleString() || 0}</div>
                              <div className="text-xs text-muted-foreground">Maintenance Paid</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-red-600">₹{user.maintenance_due_amount?.toLocaleString() || 0}</div>
                              <div className="text-xs text-muted-foreground">Maintenance Due</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {user.total_remaining_amount !== undefined && user.total_spent !== undefined && user.total_spent > 0 && (
                        <div className="pt-4 border-t">
                          <div className="text-sm text-muted-foreground mb-2">Payment Progress</div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full transition-all" 
                              style={{ 
                                width: `${Math.min(100, ((user.total_paid_amount || 0) / user.total_spent) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {user.total_spent > 0 ? Math.round(((user.total_paid_amount || 0) / user.total_spent) * 100) : 0}% paid
                          </div>
                          {user.maintenance_due_amount && user.maintenance_due_amount > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              ⚠️ Outstanding maintenance dues require attention
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No users found matching your search criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
