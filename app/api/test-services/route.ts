import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING SERVICES TABLE ===")
    
    const supabase = await createClient()
    
    // Test database connection
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("Auth check:", { user: !!user, error: !!authError })
    
    // Fetch all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true })
    
    console.log("Services query result:")
    console.log("- Error:", servicesError)
    console.log("- Data count:", services?.length || 0)
    console.log("- Services:", services?.map(s => ({ id: s.id, name: s.name, price: s.price })))
    
    if (servicesError) {
      return NextResponse.json({
        success: false,
        error: servicesError.message,
        details: servicesError
      }, { status: 500 })
    }
    
    // Also test the services that the UI is looking for
    const uiServices = [
      "Chatbot Development",
      "Basic Website", 
      "Website + Chatbot",
      "Premium Growth Bundle"
    ]
    
    const matches = uiServices.map(uiService => {
      const match = services?.find(dbService => 
        dbService.name.toLowerCase() === uiService.toLowerCase() ||
        dbService.name.toLowerCase().includes(uiService.toLowerCase()) ||
        uiService.toLowerCase().includes(dbService.name.toLowerCase())
      )
      return {
        uiService,
        match: match ? { id: match.id, name: match.name } : null
      }
    })
    
    console.log("UI Service matching:")
    matches.forEach(m => {
      console.log(`- "${m.uiService}" -> ${m.match ? `"${m.match.name}" (${m.match.id})` : 'NO MATCH'}`)
    })
    
    return NextResponse.json({
      success: true,
      services: services || [],
      serviceCount: services?.length || 0,
      uiServiceMatches: matches,
      recommendations: services?.length === 0 ? [
        "Run the database initialization script",
        "Seed the services table with initial data",
        "Check database permissions"
      ] : []
    })
    
  } catch (error: any) {
    console.error("Services test error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test services",
      details: error.message
    }, { status: 500 })
  }
}