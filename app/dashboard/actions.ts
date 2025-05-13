"use server"

import { getServerSupabaseClient } from '@/lib/supabase/server-client'
import { formatCurrency } from '@/lib/utils/financial-document-utils'
import { endOfMonth, startOfMonth, subDays } from 'date-fns'

/**
 * Get all overdue invoices (status is not Paid and due date is before today)
 */
export async function getOverdueInvoices() {
  const supabase = await getServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  
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
    console.error('Error fetching overdue invoices:', error)
    return []
  }
  
  return data.map(invoice => ({
    id: invoice.id,
    customer: invoice.customer?.company_contact_name || 'Unknown',
    date: invoice.issue_date,
    dueDate: invoice.due_date,
    total: formatCurrency(invoice.total_amount, invoice.currency_code),
    status: invoice.status,
  }))
}

/**
 * Get quotes expiring in the next 7 days (status is Sent and expiry date is within 7 days)
 */
export async function getExpiringQuotes() {
  const supabase = await getServerSupabaseClient()
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
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
    .gte('expiry_date', today.toISOString().split('T')[0])
    .lte('expiry_date', nextWeek.toISOString().split('T')[0])
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching expiring quotes:', error)
    return []
  }
  
  return data.map(quote => ({
    id: quote.id,
    customer: quote.customer?.company_contact_name || 'Unknown',
    date: quote.issue_date,
    dueDate: quote.expiry_date,
    total: formatCurrency(quote.total_amount, quote.currency_code),
    status: quote.status,
  }))
}

/**
 * Get KPI for total invoices sent in the current month
 */
export async function getTotalSentMTD() {
  const supabase = await getServerSupabaseClient()
  const now = new Date()
  const firstDay = startOfMonth(now).toISOString()
  const lastDay = endOfMonth(now).toISOString()
  
  // Get app settings to get the base currency
  const { data: settings } = await supabase
    .from('app_settings')
    .select('base_currency')
    .single()
  
  const baseCurrency = settings?.base_currency || 'USD'
  
  const { data, error } = await supabase
    .from('invoices')
    .select('total_amount, currency_code')
    .eq('status', 'Sent')
    .gte('issue_date', firstDay)
    .lte('issue_date', lastDay)
    .is('deleted_at', null)
  
  if (error) {
    console.error('Error fetching total sent MTD:', error)
    return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
  }
  
  // Sum all invoices (assuming all are in the same currency for simplicity)
  // In a real implementation, you would need to handle currency conversion
  const total = data.reduce((acc, invoice) => acc + invoice.total_amount, 0)
  
  return { 
    value: formatCurrency(total, baseCurrency),
    currency: baseCurrency
  }
}

/**
 * Get KPI for outstanding invoice amount
 */
export async function getOutstandingAmount() {
  const supabase = await getServerSupabaseClient()
  
  // Get app settings to get the base currency
  const { data: settings } = await supabase
    .from('app_settings')
    .select('base_currency')
    .single()
  
  const baseCurrency = settings?.base_currency || 'USD'
  
  const { data, error } = await supabase
    .from('invoices')
    .select('total_amount, currency_code')
    .in('status', ['Sent', 'Overdue'])
    .is('deleted_at', null)
  
  if (error) {
    console.error('Error fetching outstanding amount:', error)
    return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
  }
  
  // Sum all outstanding invoices
  const total = data.reduce((acc, invoice) => acc + invoice.total_amount, 0)
  
  return { 
    value: formatCurrency(total, baseCurrency),
    currency: baseCurrency
  }
}

/**
 * Get KPI for accepted quotes in the last 30 days
 */
export async function getAcceptedQuotes30d() {
  const supabase = await getServerSupabaseClient()
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30).toISOString()
  
  // Get app settings to get the base currency
  const { data: settings } = await supabase
    .from('app_settings')
    .select('base_currency')
    .single()
  
  const baseCurrency = settings?.base_currency || 'USD'
  
  const { data, error } = await supabase
    .from('quotes')
    .select('total_amount, currency_code')
    .eq('status', 'Accepted')
    .gte('issue_date', thirtyDaysAgo)
    .is('deleted_at', null)
  
  if (error) {
    console.error('Error fetching accepted quotes 30d:', error)
    return { value: formatCurrency(0, baseCurrency), currency: baseCurrency }
  }
  
  // Sum all accepted quotes in the last 30 days
  const total = data.reduce((acc, quote) => acc + quote.total_amount, 0)
  
  return { 
    value: formatCurrency(total, baseCurrency),
    currency: baseCurrency
  }
}

/**
 * Get KPI for top selling product (by total revenue)
 */
export async function getTopProduct() {
  const supabase = await getServerSupabaseClient()
  
  // Get app settings to get the base currency
  const { data: settings } = await supabase
    .from('app_settings')
    .select('base_currency')
    .single()
  
  const baseCurrency = settings?.base_currency || 'USD'
  
  // This is a simplified query - in a real implementation, you would
  // need to join with invoice_items and sum the revenue by product
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, base_price')
    .eq('status', 'Active')
    .is('deleted_at', null)
    .order('base_price', { ascending: false })
    .limit(1)
  
  if (error || !data.length) {
    console.error('Error fetching top product:', error)
    return { name: 'No products found', value: '', sku: '' }
  }
  
  const product = data[0]
  
  return { 
    name: product.name,
    value: formatCurrency(product.base_price, baseCurrency),
    sku: product.sku
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