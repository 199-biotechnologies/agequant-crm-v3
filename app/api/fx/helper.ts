"use server"

import { getServerSupabaseClient } from '@/lib/supabase/server-client'
import { Currency } from '@/lib/constants'

/**
 * Cache for exchange rates to avoid redundant API calls
 * Format: `${fromCurrency}-${toCurrency}` => { rate: number, timestamp: Date }
 */
const exchangeRateCache: Record<string, { rate: number, timestamp: Date }> = {}

// Cache expiry time in milliseconds (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000

/**
 * Fetches and caches exchange rate between two currencies
 * 
 * @param fromCurrency Base currency to convert from
 * @param toCurrency Target currency to convert to
 * @returns Exchange rate as a number
 */
export async function getExchangeRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
  // If same currency, rate is 1
  if (fromCurrency === toCurrency) {
    return 1
  }
  
  const cacheKey = `${fromCurrency}-${toCurrency}`
  
  // Check cache first
  const cached = exchangeRateCache[cacheKey]
  const now = new Date()
  
  if (cached && (now.getTime() - cached.timestamp.getTime() < CACHE_EXPIRY)) {
    return cached.rate
  }
  
  try {
    // Try to get from database first if available
    const supabase = await getServerSupabaseClient()
    const { data } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data?.rate) {
      // Store in cache
      exchangeRateCache[cacheKey] = { 
        rate: data.rate,
        timestamp: now
      }
      return data.rate
    }
    
    // Fall back to API
    const response = await fetch(`/api/fx?from=${fromCurrency}&to=${toCurrency}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`)
    }
    
    const { rate } = await response.json()
    
    // Store in cache
    exchangeRateCache[cacheKey] = {
      rate,
      timestamp: now
    }
    
    return rate
  } catch (error) {
    console.error(`Error fetching exchange rate from ${fromCurrency} to ${toCurrency}:`, error)
    // Fallback to 1 in case of error (maintain original amount)
    return 1
  }
}

/**
 * Converts an amount from one currency to another
 * 
 * @param amount Amount to convert
 * @param fromCurrency Currency of the amount
 * @param toCurrency Currency to convert to
 * @returns Converted amount
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  return amount * rate
}

/**
 * Gets the base currency from app settings
 * 
 * @returns Base currency code
 */
export async function getBaseCurrency(): Promise<Currency> {
  try {
    const supabase = await getServerSupabaseClient()
    const { data } = await supabase
      .from('app_settings')
      .select('base_currency')
      .single()
    
    return (data?.base_currency as Currency) || 'USD'
  } catch (error) {
    console.error('Error fetching base currency:', error)
    return 'USD' // Default fallback
  }
}