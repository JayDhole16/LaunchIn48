/**
 * Utility function to determine redirect URL after successful payment
 */

export function getPaymentRedirectUrl(paymentId: string): string {
  // Check if we're in the browser environment
  if (typeof window === 'undefined') {
    // Server-side, fallback to payments page
    return `/dashboard/payments?success=true&payment_id=${paymentId}`
  }

  const currentPath = window.location.pathname
  
  // If user is already on payments page, just reload with success params
  if (currentPath === '/dashboard/payments') {
    return `/dashboard/payments?success=true&payment_id=${paymentId}`
  }
  
  // For all other pages (projects, services, etc.), redirect to payments page
  return `/dashboard/payments?success=true&payment_id=${paymentId}`
}

export function getMaintenancePaymentRedirectUrl(paymentId: string): string {
  // Check if we're in the browser environment
  if (typeof window === 'undefined') {
    // Server-side, fallback to payments page
    return `/dashboard/payments?success=true&payment_id=${paymentId}&type=maintenance`
  }

  const currentPath = window.location.pathname
  
  // If user is already on payments page, just reload with success params
  if (currentPath === '/dashboard/payments') {
    return `/dashboard/payments?success=true&payment_id=${paymentId}&type=maintenance`
  }
  
  // For all other pages (maintenance, etc.), redirect to payments page
  return `/dashboard/payments?success=true&payment_id=${paymentId}&type=maintenance`
}

/**
 * Handles page refresh or redirect with proper URL
 */
export function handlePaymentRedirect(paymentId: string, isMaintenance: boolean = false) {
  if (typeof window === 'undefined') return
  
  const redirectUrl = isMaintenance 
    ? getMaintenancePaymentRedirectUrl(paymentId) 
    : getPaymentRedirectUrl(paymentId)
  
  // If we're staying on the same page (payments), use window.location.href for a full reload
  if (window.location.pathname === '/dashboard/payments') {
    window.location.href = redirectUrl
  } else {
    // Otherwise use router.push (handled by the component)
    return redirectUrl
  }
}