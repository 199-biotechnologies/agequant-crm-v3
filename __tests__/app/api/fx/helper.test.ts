import { getExchangeRate, convertCurrency, getBaseCurrency } from '@/app/api/fx/helper'
import { getServerSupabaseClient } from '@/lib/supabase/server-client'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Supabase client
jest.mock('@/lib/supabase/server-client', () => ({
  getServerSupabaseClient: jest.fn()
}))

describe('FX Helper Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset the mocked fetch implementation
    ;(global.fetch as jest.Mock).mockReset()
    
    // Reset the mocked Supabase client
    ;(getServerSupabaseClient as jest.Mock).mockReset().mockResolvedValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  })

  describe('getExchangeRate', () => {
    test('returns 1 for same currency', async () => {
      const rate = await getExchangeRate('USD', 'USD')
      expect(rate).toBe(1)
    })

    test('retrieves rate from database if available', async () => {
      // Mock the database returning a rate
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { rate: 1.25 }, 
          error: null 
        })
      })

      const rate = await getExchangeRate('USD', 'EUR')
      expect(rate).toBe(1.25)
    })

    test('falls back to API if database has no rate', async () => {
      // Mock the database returning no rate
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: null 
        })
      })

      // Mock the fetch API response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ rate: 0.85 })
      })

      const rate = await getExchangeRate('USD', 'GBP')
      expect(rate).toBe(0.85)
      expect(global.fetch).toHaveBeenCalledWith('/api/fx?from=USD&to=GBP')
    })

    test('returns 1 as fallback if all methods fail', async () => {
      // Mock the database returning no rate
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: null 
        })
      })

      // Mock the fetch API failing
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const rate = await getExchangeRate('USD', 'JPY')
      expect(rate).toBe(1)
    })
  })

  describe('convertCurrency', () => {
    test('returns same amount for same currency', async () => {
      const result = await convertCurrency(100, 'USD', 'USD')
      expect(result).toBe(100)
    })

    test('converts amount using exchange rate', async () => {
      // Mock getExchangeRate to return a specific rate
      jest.spyOn(global, 'getExchangeRate').mockImplementation(
        jest.fn().mockResolvedValue(1.25)
      )

      const result = await convertCurrency(100, 'USD', 'EUR')
      expect(result).toBe(125) // 100 * 1.25
    })
  })

  describe('getBaseCurrency', () => {
    test('returns currency from database if available', async () => {
      // Mock the database returning a base currency
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { base_currency: 'EUR' }, 
          error: null 
        })
      })

      const currency = await getBaseCurrency()
      expect(currency).toBe('EUR')
    })

    test('returns USD as fallback if database fails', async () => {
      // Mock the database failing
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error'))
      })

      const currency = await getBaseCurrency()
      expect(currency).toBe('USD')
    })
  })
})