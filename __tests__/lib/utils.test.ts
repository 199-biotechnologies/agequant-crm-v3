import { cn, getCurrencySymbol } from '@/lib/utils'
import { Currency } from '@/lib/constants'

describe('cn function', () => {
  test('merges class names correctly', () => {
    expect(cn('a', 'b')).toBe('a b')
    expect(cn('a', { b: true, c: false })).toBe('a b')
    expect(cn('a', { b: false }, 'c')).toBe('a c')
    expect(cn('a', ['b', 'c'])).toBe('a b c')
  })

  test('handles empty and falsy inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null as any)).toBe('')
    expect(cn(undefined as any)).toBe('')
  })

  test('handles Tailwind class conflicts properly', () => {
    // Should keep the rightmost conflicting class in the argument list
    expect(cn('p-4', 'p-6')).toBe('p-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('mb-4', { 'mb-6': true })).toBe('mb-6')
  })
})

describe('getCurrencySymbol function', () => {
  test('returns correct symbols for known currencies', () => {
    expect(getCurrencySymbol('USD')).toBe('$')
    expect(getCurrencySymbol('EUR')).toBe('€')
    expect(getCurrencySymbol('GBP')).toBe('£')
    expect(getCurrencySymbol('JPY')).toBe('¥')
    expect(getCurrencySymbol('AUD')).toBe('A$')
  })

  test('returns fallback symbol for unknown currencies', () => {
    // Type assertion to test the fallback (shouldn't happen in real code)
    expect(getCurrencySymbol('XYZ' as Currency)).toBe('$')
  })
})