/**
 * API endpoint to fix existing project payment data
 * This recalculates paid_amount, remaining_amount, and payment_status
 * for all projects based on completed payments (excluding maintenance)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(request: NextRequest) {
  try {
    const service = createServiceClient()
    
    // Get all projects
    const { data: projects, error: projectsError } = await service
      .from("projects")
      .select("id, total_amount, paid_amount, remaining_amount, payment_status")
    
    if (projectsError) {
      return NextResponse.json({ 
        success: false, 
        error: projectsError.message 
      }, { status: 500 })
    }
    
    if (!projects || projects.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No projects to update",
        updated: 0
      })
    }
    
    let updatedCount = 0
    const errors: any[] = []
    
    // Process each project
    for (const project of projects) {
      try {
        // Get all completed payments for this project (excluding maintenance)
        const { data: payments, error: paymentsError } = await service
          .from("payments")
          .select("amount, payment_method, status")
          .eq("project_id", project.id)
          .eq("status", "completed")
        
        if (paymentsError) {
          errors.push({ project_id: project.id, error: paymentsError.message })
          continue
        }
        
        // Filter out maintenance payments
        const projectPayments = (payments || []).filter((p: any) => {
          const isMaintenance = p.payment_method?.includes('maintenance') || p.payment_method === 'maintenance'
          return !isMaintenance
        })
        
        // Calculate total paid
        const totalPaidAmount = projectPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        const totalAmount = project.total_amount || 0
        const remainingAmount = Math.max(0, totalAmount - totalPaidAmount)
        
        // Determine payment status
        let paymentStatus = 'pending'
        if (totalPaidAmount >= totalAmount && totalAmount > 0) {
          paymentStatus = 'paid'
        } else if (totalPaidAmount > 0) {
          paymentStatus = 'partial'
        }
        
        // Only update if values have changed
        if (
          project.paid_amount !== totalPaidAmount ||
          project.remaining_amount !== remainingAmount ||
          project.payment_status !== paymentStatus
        ) {
          const { error: updateError } = await service
            .from("projects")
            .update({
              paid_amount: totalPaidAmount,
              remaining_amount: remainingAmount,
              payment_status: paymentStatus,
            })
            .eq("id", project.id)
          
          if (updateError) {
            errors.push({ project_id: project.id, error: updateError.message })
          } else {
            updatedCount++
            console.log(`✅ Updated project ${project.id}:`, {
              paid_amount: totalPaidAmount,
              remaining_amount: remainingAmount,
              payment_status: paymentStatus
            })
          }
        }
      } catch (error: any) {
        errors.push({ project_id: project.id, error: error.message })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} projects`,
      updated: updatedCount,
      total: projects.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error("Error fixing project payments:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}


