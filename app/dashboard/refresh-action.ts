"use server"

import { revalidatePath } from "next/cache"

/**
 * Server action to refresh dashboard data by clearing the cache
 */
export async function refreshDashboard() {
  // Revalidate the dashboard page to clear the cache
  revalidatePath("/")
  
  return {
    success: true,
    timestamp: new Date().toISOString()
  }
}