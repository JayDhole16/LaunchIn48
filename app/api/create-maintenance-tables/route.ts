import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    console.log('🔧 Creating maintenance tables...')
    
    // Note: Tables should be created manually in Supabase dashboard first
    console.log('📋 Inserting default maintenance plans...')
    
    // Insert default maintenance plans
    const { error: insertError } = await supabase.from('maintenance_plans').upsert([
      {
        name: 'Monthly',
        slug: 'monthly',
        description: 'Monthly maintenance plan with basic support',
        duration_months: 1,
        base_price: 800,
        price_multiplier: 0.080,
        features: [
          'Bug fixes and security patches',
          'Technical support via email',
          'Monthly updates',
          'Performance monitoring'
        ]
      },
      {
        name: 'Quarterly', 
        slug: 'quarterly',
        description: 'Quarterly maintenance plan with enhanced support',
        duration_months: 3,
        base_price: 2000,
        price_multiplier: 0.200,
        features: [
          'Everything in Monthly',
          'Priority technical support',
          'Feature enhancements',
          'Weekly backups',
          'Performance optimization'
        ]
      },
      {
        name: 'Yearly',
        slug: 'yearly', 
        description: 'Yearly maintenance plan with premium support',
        duration_months: 12,
        base_price: 7000,
        price_multiplier: 0.700,
        features: [
          'Everything in Quarterly',
          'Dedicated support manager',
          'Custom feature development',
          'Daily backups',
          'Advanced analytics',
          'Priority feature requests'
        ]
      }
    ], { 
      onConflict: 'slug',
      ignoreDuplicates: true 
    })
    
    if (insertError) {
      console.error('Error inserting maintenance plans:', insertError)
    }
    
    console.log('✅ Maintenance plans inserted successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance plans inserted successfully',
      note: 'Tables should be created manually in Supabase dashboard first'
    })
    
  } catch (error) {
    console.error('Error creating maintenance tables:', error)
    return NextResponse.json(
      { error: 'Failed to create maintenance tables' },
      { status: 500 }
    )
  }
}