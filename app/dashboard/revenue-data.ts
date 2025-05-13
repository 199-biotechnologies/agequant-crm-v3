"use server"

import { getServerSupabaseClient } from '@/lib/supabase/server-client'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { convertCurrency, getBaseCurrency } from '@/app/api/fx/helper'
import { Currency } from '@/lib/constants'

/**
 * Safely handles filters for soft-deleted records.
 * This function attempts to filter by deleted_at, but if the column doesn't exist,
 * it catches the error and returns a builder without the filter.
 */
async function safeDeletedAtFilter<T>(query: T): Promise<T> {
  try {
    // Try to add the filter, using type assertion to avoid TypeScript errors
    return (query as any).is('deleted_at', null) as T
  } catch (error) {
    // If error occurs (likely because column doesn't exist), just return the query
    console.warn('deleted_at column may not exist yet, skipping filter:', error)
    return query
  }
}

interface MonthlyRevenue {
  month: string
  revenue: number
  monthFull: string
}

/**
 * Get monthly revenue data for the last 6 months
 * Correctly converts all amounts to the base currency
 */
export async function getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const supabase = await getServerSupabaseClient()
  
  try {
    // Get base currency
    const baseCurrency = await getBaseCurrency()
    
    // Calculate date range for the last 6 months
    const today = new Date()
    const months: MonthlyRevenue[] = []
    
    // Process last 6 months
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(today, i)
      const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd')
      const monthShort = format(targetMonth, 'MMM')
      const monthFull = format(targetMonth, 'MMMM yyyy')
      
      // Fetch paid invoices for this month
      const queryBuilder = supabase
        .from('invoices')
        .select('total_amount, currency_code')
        .eq('status', 'Paid')
        .gte('issue_date', monthStart)
        .lte('issue_date', monthEnd)
      
      // Apply the safe filter
      const filteredQuery = await safeDeletedAtFilter(queryBuilder)
      
      // Execute the query
      const { data, error } = await filteredQuery
      
      if (error) {
        console.error(`Error fetching revenue for ${monthFull}:`, error)
        // Add zero revenue for this month
        months.push({
          month: monthShort,
          monthFull,
          revenue: 0
        })
        continue
      }
      
      if (!data || data.length === 0) {
        // No revenue for this month
        months.push({
          month: monthShort,
          monthFull,
          revenue: 0
        })
        continue
      }
      
      // Calculate total revenue with currency conversion
      let monthlyRevenue = 0
      
      for (const invoice of data) {
        if (invoice.total_amount) {
          const fromCurrency = (invoice.currency_code as Currency) || baseCurrency
          
          // Convert to base currency if needed
          const convertedAmount = await convertCurrency(
            invoice.total_amount,
            fromCurrency,
            baseCurrency
          )
          
          monthlyRevenue += convertedAmount
        }
      }
      
      // Add month to result
      months.push({
        month: monthShort,
        monthFull,
        revenue: Math.round(monthlyRevenue) // Round to nearest whole number
      })
    }
    
    return months
    
  } catch (error) {
    console.error('Error fetching monthly revenue:', error)
    
    // Return mock data as fallback
    return [
      { month: "Jan", revenue: 0, monthFull: "January" },
      { month: "Feb", revenue: 0, monthFull: "February" },
      { month: "Mar", revenue: 0, monthFull: "March" },
      { month: "Apr", revenue: 0, monthFull: "April" },
      { month: "May", revenue: 0, monthFull: "May" },
      { month: "Jun", revenue: 0, monthFull: "June" },
    ]
  }
}