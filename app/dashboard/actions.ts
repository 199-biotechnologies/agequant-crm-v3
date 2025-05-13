"use server"

import { getServerSupabaseClient } from '@/lib/supabase/server-client'
import { formatCurrency } from '@/lib/utils/financial-document-utils'
import { endOfMonth, startOfMonth, subDays, format } from 'date-fns'
import { convertCurrency, getBaseCurrency } from '@/app/api/fx/helper'
import { Currency } from '@/lib/constants'

/**
 * Get all overdue invoices (status is not Paid and due date is before today)
 */
export async function getOverdueInvoices() {
  const supabase = await getServerSupabaseClient()
  // Format date consistently in ISO format (YYYY-MM-DD)
  const today = format(new Date(), 'yyyy-MM-dd')
  
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        issue_date,
        due_date,
        total_amount,
        status,
        currency_code,
        customer:customers(company_contact_name)
      `)
      .neq('status', 'Paid')
      .lt('due_date', today)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return []
    }
    
    return data.map(invoice => ({
      id: invoice.id,
      customer: invoice.customer?.company_contact_name || 'Unknown',
      date: invoice.issue_date,
      dueDate: invoice.due_date,
      total: formatCurrency(invoice.total_amount || 0, invoice.currency_code || 'USD'),
      status: invoice.status || 'Overdue',
    }))
  } catch (error) {
    console.error('Error fetching overdue invoices:', error)
    return []
  }
}

/**
 * Get quotes expiring in the next 7 days (status is Sent and expiry date is within 7 days)
 */
export async function getExpiringQuotes() {
  const supabase = await getServerSupabaseClient()
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  // Format dates consistently in ISO format (YYYY-MM-DD)
  const todayStr = format(today, 'yyyy-MM-dd')
  const nextWeekStr = format(nextWeek, 'yyyy-MM-dd')
  
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        issue_date,
        expiry_date,
        total_amount,
        status,
        currency_code,
        customer:customers(company_contact_name)
      `)
      .eq('status', 'Sent')
      .gte('expiry_date', todayStr)
      .lte('expiry_date', nextWeekStr)
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true })
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return []
    }
    
    return data.map(quote => ({
      id: quote.id,
      customer: quote.customer?.company_contact_name || 'Unknown',
      date: quote.issue_date,
      dueDate: quote.expiry_date,
      total: formatCurrency(quote.total_amount || 0, quote.currency_code || 'USD'),
      status: quote.status || 'Sent',
    }))
  } catch (error) {
    console.error('Error fetching expiring quotes:', error)
    return []
  }
}

/**
 * Get KPI for total invoices sent in the current month
 */
export async function getTotalSentMTD() {
  const supabase = await getServerSupabaseClient()
  
  try {
    // Get properly formatted date range for current month
    const now = new Date()
    const firstDay = format(startOfMonth(now), 'yyyy-MM-dd')
    const lastDay = format(endOfMonth(now), 'yyyy-MM-dd')
    
    // Get base currency
    const baseCurrency = await getBaseCurrency()
    
    const { data, error } = await supabase
      .from('invoices')
      .select('total_amount, currency_code')
      .eq('status', 'Sent')
      .gte('issue_date', firstDay)
      .lte('issue_date', lastDay)
      .is('deleted_at', null)
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
    }
    
    // Calculate total with currency conversion
    let total = 0
    
    // Process invoices and convert currencies as needed
    for (const invoice of data) {
      if (invoice.total_amount) {
        const fromCurrency = (invoice.currency_code as Currency) || baseCurrency
        
        // Convert to base currency if needed
        const convertedAmount = await convertCurrency(
          invoice.total_amount,
          fromCurrency,
          baseCurrency
        )
        
        total += convertedAmount
      }
    }
    
    return { 
      value: formatCurrency(total, baseCurrency),
      currency: baseCurrency
    }
  } catch (error) {
    console.error('Error fetching total sent MTD:', error)
    const baseCurrency = await getBaseCurrency()
    return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
  }
}

/**
 * Get KPI for outstanding invoice amount
 */
export async function getOutstandingAmount() {
  const supabase = await getServerSupabaseClient()
  
  try {
    // Get base currency
    const baseCurrency = await getBaseCurrency()
    
    const { data, error } = await supabase
      .from('invoices')
      .select('total_amount, currency_code')
      .in('status', ['Sent', 'Overdue'])
      .is('deleted_at', null)
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
    }
    
    // Calculate total with currency conversion
    let total = 0
    
    // Process invoices and convert currencies as needed
    for (const invoice of data) {
      if (invoice.total_amount) {
        const fromCurrency = (invoice.currency_code as Currency) || baseCurrency
        
        // Convert to base currency if needed
        const convertedAmount = await convertCurrency(
          invoice.total_amount,
          fromCurrency,
          baseCurrency
        )
        
        total += convertedAmount
      }
    }
    
    return { 
      value: formatCurrency(total, baseCurrency),
      currency: baseCurrency
    }
  } catch (error) {
    console.error('Error fetching outstanding amount:', error)
    const baseCurrency = await getBaseCurrency()
    return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
  }
}

/**
 * Get KPI for accepted quotes in the last 30 days
 */
export async function getAcceptedQuotes30d() {
  const supabase = await getServerSupabaseClient()
  
  try {
    // Format dates consistently
    const today = new Date()
    const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd')
    
    // Get base currency
    const baseCurrency = await getBaseCurrency()
    
    const { data, error } = await supabase
      .from('quotes')
      .select('total_amount, currency_code')
      .eq('status', 'Accepted')
      .gte('issue_date', thirtyDaysAgo)
      .is('deleted_at', null)
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
    }
    
    // Calculate total with currency conversion
    let total = 0
    
    // Process quotes and convert currencies as needed
    for (const quote of data) {
      if (quote.total_amount) {
        const fromCurrency = (quote.currency_code as Currency) || baseCurrency
        
        // Convert to base currency if needed
        const convertedAmount = await convertCurrency(
          quote.total_amount,
          fromCurrency,
          baseCurrency
        )
        
        total += convertedAmount
      }
    }
    
    return { 
      value: formatCurrency(total, baseCurrency),
      currency: baseCurrency
    }
  } catch (error) {
    console.error('Error fetching accepted quotes 30d:', error)
    const baseCurrency = await getBaseCurrency()
    return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
  }
}

/**
 * Get KPI for top selling product (by actual sales)
 */
export async function getTopProduct() {
  const supabase = await getServerSupabaseClient()
  
  try {
    // Get base currency
    const baseCurrency = await getBaseCurrency()
    
    // Get the actual top-selling product by revenue from invoice items
    // This joins invoice_items with products and invoices to get the real data
    const { data, error } = await supabase.rpc('get_top_selling_product')
    
    if (error) {
      // If the RPC function doesn't exist, fall back to a different approach
      console.warn('RPC function not available, falling back to alternative query:', error)
      
      // Get most recent invoices
      const { data: invoiceItems, error: invoiceItemsError } = await supabase
        .from('invoice_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          invoice:invoices(currency_code)
        `)
        .not('product_id', 'is', null)
        .limit(100)
        .order('created_at', { ascending: false })
      
      if (invoiceItemsError || !invoiceItems || invoiceItems.length === 0) {
        throw new Error('Could not fetch invoice items')
      }
      
      // Get all product data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, base_price')
        .eq('status', 'Active')
        .is('deleted_at', null)
      
      if (productsError || !products || products.length === 0) {
        throw new Error('Could not fetch products')
      }
      
      // Calculate revenue for each product
      const productRevenue: Record<string, number> = {}
      
      for (const item of invoiceItems) {
        if (item.product_id && item.quantity && item.unit_price) {
          const itemRevenue = item.quantity * item.unit_price
          
          // Convert to base currency if needed
          const itemCurrency = item.invoice?.currency_code as Currency || baseCurrency
          const convertedRevenue = await convertCurrency(
            itemRevenue,
            itemCurrency,
            baseCurrency
          )
          
          if (!productRevenue[item.product_id]) {
            productRevenue[item.product_id] = 0
          }
          
          productRevenue[item.product_id] += convertedRevenue
        }
      }
      
      // Find the product with the highest revenue
      let topProductId = ''
      let maxRevenue = 0
      
      for (const [productId, revenue] of Object.entries(productRevenue)) {
        if (revenue > maxRevenue) {
          maxRevenue = revenue
          topProductId = productId
        }
      }
      
      // Get full product info
      const topProduct = products.find(p => p.id === topProductId)
      
      if (!topProduct) {
        throw new Error('Could not find top product')
      }
      
      return {
        name: topProduct.name,
        value: formatCurrency(maxRevenue, baseCurrency),
        sku: topProduct.sku
      }
    }
    
    // If RPC function exists, use its result
    if (data && data.length > 0) {
      const topProduct = data[0]
      
      return {
        name: topProduct.product_name,
        value: formatCurrency(topProduct.total_revenue, baseCurrency),
        sku: topProduct.product_sku
      }
    }
    
    throw new Error('No product data found')
    
  } catch (error) {
    console.error('Error fetching top product:', error)
    
    // Fallback to a simple product if all else fails
    try {
      const baseCurrency = await getBaseCurrency()
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, base_price')
        .eq('status', 'Active')
        .is('deleted_at', null)
        .order('base_price', { ascending: false })
        .limit(1)
      
      if (error || !data || data.length === 0) {
        return { name: 'No products found', value: formatCurrency(0, baseCurrency), sku: '' }
      }
      
      const product = data[0]
      
      return { 
        name: product.name,
        value: formatCurrency(product.base_price, baseCurrency),
        sku: product.sku
      }
    } catch {
      return { name: 'No products found', value: formatCurrency(0, 'USD'), sku: '' }
    }
  }
}

/**
 * Get recently updated items across all entity types
 */
export async function getRecentlyUpdated() {
  const supabase = await getServerSupabaseClient()
  const limit = 10
  
  // Get recent invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select(`
      id, 
      invoice_number,
      updated_at,
      status,
      customer:customers(company_contact_name)
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (invoicesError) {
    console.error('Error fetching recent invoices:', invoicesError)
  }
  
  // Get recent quotes
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select(`
      id, 
      quote_number,
      updated_at,
      status,
      customer:customers(company_contact_name)
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (quotesError) {
    console.error('Error fetching recent quotes:', quotesError)
  }
  
  // Get recent customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select(`
      id, 
      public_customer_id,
      company_contact_name,
      updated_at
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (customersError) {
    console.error('Error fetching recent customers:', customersError)
  }
  
  // Get recent products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, 
      sku,
      name,
      updated_at,
      status
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (productsError) {
    console.error('Error fetching recent products:', productsError)
  }
  
  // Combine all types and sort by updated_at
  const allItems = [
    ...(invoices || []).map(invoice => ({
      id: invoice.id,
      type: 'invoice',
      title: `Invoice ${invoice.invoice_number || `#${invoice.id.substring(0, 6)}...`} for ${invoice.customer?.company_contact_name || 'Unknown'}`,
      action: getActionFromStatus('invoice', invoice.status),
      timestamp: invoice.updated_at,
      // In a real implementation, you would get the actual user who made the change
      user: 'System',
      userInitials: 'SY'
    })),
    ...(quotes || []).map(quote => ({
      id: quote.id,
      type: 'quote',
      title: `Quote ${quote.quote_number || `#${quote.id.substring(0, 6)}...`} for ${quote.customer?.company_contact_name || 'Unknown'}`,
      action: getActionFromStatus('quote', quote.status),
      timestamp: quote.updated_at,
      user: 'System',
      userInitials: 'SY'
    })),
    ...(customers || []).map(customer => ({
      id: customer.public_customer_id,
      type: 'customer',
      title: customer.company_contact_name,
      action: 'updated',
      timestamp: customer.updated_at,
      user: 'System',
      userInitials: 'SY'
    })),
    ...(products || []).map(product => ({
      id: product.sku,
      type: 'product',
      title: product.name,
      action: product.status === 'Active' ? 'activated' : 'deactivated',
      timestamp: product.updated_at,
      user: 'System',
      userInitials: 'SY'
    }))
  ]
  
  // Sort by timestamp (descending) and take the top 10
  return allItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

// Helper function to determine action from status
function getActionFromStatus(type: string, status: string | null) {
  if (!status) return 'updated'
  
  switch (status) {
    case 'Draft':
      return 'drafted'
    case 'Sent':
      return 'sent'
    case 'Paid':
      return 'marked as paid'
    case 'Overdue':
      return 'marked as overdue'
    case 'Cancelled':
      return 'cancelled'
    case 'Accepted':
      return 'accepted'
    case 'Rejected':
      return 'rejected'
    case 'Expired':
      return 'expired'
    default:
      return 'updated'
  }
}