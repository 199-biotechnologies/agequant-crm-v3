# FX/Currency System Documentation

## Overview

The FX/Currency system in AgeQuant CRM v3 provides comprehensive multi-currency support throughout the application, allowing users to work with different currencies for customers, products, invoices, and quotes. The system includes automatic currency conversion, exchange rate management, and fallback mechanisms.

## Key Components

### 1. Currency Constants and Types

Located in `/lib/constants.ts`, the application defines supported currencies:

```typescript
export const ALLOWED_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CHF', 'SGD', 'HKD',
  'CNY', 'JPY', 'CAD', 'AUD', 'NZD'
] as const;

export type Currency = typeof ALLOWED_CURRENCIES[number];
```

### 2. Exchange Rate API

The FX API endpoint in `/app/api/fx/route.ts` fetches current exchange rates from external sources when needed.

### 3. Currency Helper Functions

Located in `/app/api/fx/helper.ts`, these utilities provide:

- **Exchange Rate Management**: Fetching, caching, and conversion between currencies
- **Base Currency Detection**: Determining the organization's base currency from settings
- **Caching Layer**: In-memory caching to minimize API calls

## Core Functions

### `getExchangeRate`

Fetches exchange rates with a multi-tier approach:
1. First checks an in-memory cache
2. If not in cache, tries to get rate from the database
3. If not in database, falls back to external API
4. Returns 1.0 as ultimate fallback (maintains original amount)

```typescript
export async function getExchangeRate(
  fromCurrency: Currency, 
  toCurrency: Currency
): Promise<number>
```

### `convertCurrency`

Converts an amount from one currency to another using the exchange rate:

```typescript
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number>
```

### `getBaseCurrency`

Retrieves the organization's base currency from app settings:

```typescript
export async function getBaseCurrency(): Promise<Currency>
```

## Integration Points

### 1. Product Pricing

Products can have prices in multiple currencies. When a product is selected in a line item:
- If a price exists in the target currency, it's used directly
- If no price exists, the base price is converted using current FX rates

### 2. Invoice & Quote Line Items

Line items store both:
- The unit price in the document's currency
- The FX rate used for conversion (for historical accuracy)

This ensures that even if exchange rates change, the original calculation is preserved.

### 3. Dashboard Metrics

Financial metrics in the dashboard (like revenue charts, KPIs) automatically convert all amounts to the base currency for consistent reporting.

## Error Handling

The system includes robust error handling:
- Graceful degradation when API calls fail
- Fallback to database rates when available
- Ultimate fallback to 1:1 conversion to prevent system failures
- Comprehensive logging for troubleshooting

## Currency Display

The application includes a `getCurrencySymbol` utility that maps currency codes to appropriate symbols for display purposes:

```typescript
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Partial<Record<Currency, string>> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    // Other symbols...
  }
  
  return symbols[currency] || "$"
}
```

## Testing

The FX/Currency system includes comprehensive tests:
- Unit tests for helper functions
- Mocked API responses
- Edge case handling

## Future Enhancements

Potential improvements for the future:
1. Historical exchange rate storage for point-in-time accuracy
2. User interface for manually setting/overriding exchange rates
3. Scheduled background jobs to update exchange rates automatically
4. Enhanced reporting with currency gain/loss tracking