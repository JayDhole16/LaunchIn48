"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  getMaintenanceState, 
  getProjectMaintenanceState, 
  extendProjectMaintenance,
  clearMaintenanceState
} from '@/lib/maintenance-state'

export default function TestMaintenancePage() {
  const [maintenanceState, setMaintenanceState] = useState<any>({})
  const [isClient, setIsClient] = useState(false)
  const [testProjectId, setTestProjectId] = useState('03c8aeaa-2abd-424e-b811-384e3248e318')

  useEffect(() => {
    setIsClient(true)
    loadMaintenanceState()
    
    // Listen for maintenance updates
    const handleUpdate = (event: CustomEvent) => {
      console.log('🔄 Maintenance update event:', event.detail)
      loadMaintenanceState()
    }
    
    window.addEventListener('maintenance-updated', handleUpdate as EventListener)
    return () => window.removeEventListener('maintenance-updated', handleUpdate as EventListener)
  }, [])

  const loadMaintenanceState = () => {
    if (typeof window !== 'undefined') {
      const state = getMaintenanceState()
      setMaintenanceState(state)
      console.log('📋 Current maintenance state:', state)
    }
  }

  const testExtendMaintenance = () => {
    if (!isClient) return
    
    console.log('🧪 Testing maintenance extension...')
    const result = extendProjectMaintenance(
      testProjectId,
      'Monthly',
      'monthly',
      1,
      560
    )
    console.log('✅ Extension result:', result)
    loadMaintenanceState()
  }

  const testQuarterlyExtension = () => {
    if (!isClient) return
    
    console.log('🧪 Testing quarterly maintenance extension...')
    const result = extendProjectMaintenance(
      testProjectId,
      'Quarterly',
      'quarterly',
      3,
      1600
    )
    console.log('✅ Extension result:', result)
    loadMaintenanceState()
  }

  const clearState = () => {
    if (!isClient) return
    
    clearMaintenanceState()
    loadMaintenanceState()
  }

  if (!isClient) {
    return <div>Loading...</div>
  }

  const projectState = getProjectMaintenanceState(testProjectId)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance State Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Test Project ID:</h3>
            <input 
              type="text" 
              value={testProjectId} 
              onChange={(e) => setTestProjectId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter project ID"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={testExtendMaintenance}>
              Extend Monthly Maintenance
            </Button>
            <Button onClick={testQuarterlyExtension}>
              Extend Quarterly Maintenance
            </Button>
            <Button onClick={loadMaintenanceState} variant="outline">
              Reload State
            </Button>
            <Button onClick={clearState} variant="destructive">
              Clear All State
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Current Project Maintenance State:</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {projectState ? JSON.stringify(projectState, null, 2) : 'No maintenance state found'}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">All Maintenance States:</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(maintenanceState, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}