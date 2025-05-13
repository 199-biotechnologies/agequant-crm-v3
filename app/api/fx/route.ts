import { NextResponse, type NextRequest } from 'next/server';
import { ALLOWED_CURRENCIES, type Currency } from '@/lib/constants';

// Type guard to check if a string is an allowed Currency
function isAllowedCurrency(currency: string | undefined): currency is Currency {
  if (!currency) return false;
  // Cast to string[] is safe here because `as const` creates a readonly array of string literals
  return (ALLOWED_CURRENCIES as readonly string[]).includes(currency);
}


// --- ECB API Response Types (Simplified) ---
interface ECBSeriesObservation {
  '0': [number, ...unknown[]]; // [rate, ...other_values] - Using unknown instead of any
}

interface ECBSeries {
  attributes: unknown[]; // Not strictly typed for brevity, can be expanded - Using unknown
  observations: ECBSeriesObservation;
}

interface ECBSeriesDimensionValue {
  id: string;
  name: string;
}

interface ECBStructureDimension {
  id: string;
  name: string;
  values: ECBSeriesDimensionValue[];
}

interface ECBStructure {
  dimensions: {
    series: ECBStructureDimension[];
    observation: ECBStructureDimension[];
  };
  // other fields omitted for brevity
}

interface ECBDataSet {
  action: string;
  validFrom: string;
  series: Record<string, ECBSeries>; // e.g., "0:0:0:0:0": { ... }
}

interface ECBResponse {
  header: unknown; // Using unknown
  dataSets: ECBDataSet[];
  structure: ECBStructure;
}

// --- Cache ---
interface CacheEntry {
  rates: Record<string, number>; // e.g., { USD: 1.08, GBP: 0.85 }
  date: string;
  timestamp: number;
}
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const fxCache = new Map<string, CacheEntry>(); // Key: "EUR" (base for ECB rates)

// --- Helper to fetch and parse ECB rates ---
async function getECBRatesAgainstEUR(
  requestedCurrencies: string[] // Renamed for clarity
): Promise<{ rates: Record<string, number>; date: string } | null> {
  const cacheKey = 'EUR'; // All ECB rates are EUR based
  const cached = fxCache.get(cacheKey);
  let ratesToFetchFromAPI: string[] = [];
  const finalRatesResult: Record<string, number> = {};
  let observationDate = new Date().toISOString().split('T')[0]; // Default to today

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    observationDate = cached.date; // Use cached date
    requestedCurrencies.forEach(curr => {
      if (Object.prototype.hasOwnProperty.call(cached.rates, curr)) {
        finalRatesResult[curr] = cached.rates[curr];
      } else if (curr !== 'EUR') { // EUR is always 1.0, no need to fetch
        ratesToFetchFromAPI.push(curr);
      }
    });
    if (ratesToFetchFromAPI.length === 0) { // All requested currencies were in cache
      console.log('FX Rates: Serving all requested from cache for EUR base');
      // Ensure EUR is included if requested
      if (requestedCurrencies.includes('EUR')) finalRatesResult['EUR'] = 1.0;
      return { rates: finalRatesResult, date: cached.date };
    }
    console.log(`FX Rates: Some from cache, fetching missing: ${ratesToFetchFromAPI.join(', ')}`);
  } else {
    // Cache is invalid or not present, fetch all requested non-EUR currencies
    ratesToFetchFromAPI = requestedCurrencies.filter(c => c !== 'EUR');
  }

  if (requestedCurrencies.includes('EUR') && !Object.prototype.hasOwnProperty.call(finalRatesResult, 'EUR')) {
    finalRatesResult['EUR'] = 1.0; // Add EUR if it was part of the original request and not yet added
  }
  
  if (ratesToFetchFromAPI.length === 0) {
    // This can happen if only EUR was requested, or all (non-EUR) were already in finalRatesResult from a partially valid cache
    // (though the previous check `ratesToFetchFromAPI.length === 0` after cache check should handle fully cached scenarios)
    // Or if ratesToFetchFromAPI was initially empty (e.g. only EUR requested)
    if (Object.keys(finalRatesResult).length > 0) {
       return { rates: finalRatesResult, date: observationDate };
    }
    // If finalRatesResult is empty and nothing to fetch (e.g. requestedCurrencies was empty or only EUR and it's handled)
    // This case should ideally be filtered before calling getECBRatesAgainstEUR if only EUR is needed.
    // For safety, if only EUR was in requestedCurrencies, it's already in finalRatesResult.
     if (requestedCurrencies.includes('EUR')) return { rates: { EUR: 1.0 }, date: observationDate };
     return { rates: {}, date: observationDate }; // Should not happen if called with non-empty non-EUR currencies
  }

  const currenciesToFetchStr = ratesToFetchFromAPI.join('+');
  const ecbApiUrl = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currenciesToFetchStr}.EUR.SP00.A?format=jsondata&lastNObservations=1`;

  try {
    console.log(`FX Rates: Fetching from ECB: ${ecbApiUrl}`);
    const response = await fetch(ecbApiUrl, { next: { revalidate: CACHE_TTL / 1000 } }); // Revalidate based on TTL
    if (!response.ok) {
      console.error(`ECB API Error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`ECB API Error Body: ${errorBody}`);
      return null;
    }

    const data = (await response.json()) as ECBResponse;
    const fetchedObservationDate = data.structure.dimensions.observation[0].values[0].id;
    observationDate = fetchedObservationDate; // Update with date from fresh data

    const newlyFetchedRates: Record<string, number> = {};
    // The ECB API returns data for all currencies in currenciesToFetchStr.
    // We need to map them back correctly.
    const currencyDimensionValues = data.structure.dimensions.series.find(dim => dim.id === 'CURRENCY')?.values;
    if (!currencyDimensionValues) {
        console.error('ECB API: CURRENCY dimension values not found in structure');
        return null;
    }

    currencyDimensionValues.forEach((currencyValue, index) => {
        const seriesKey = `0:${index}:0:0:0`;
        const seriesData = data.dataSets[0].series[seriesKey];
        if (seriesData && ratesToFetchFromAPI.includes(currencyValue.id)) { // Ensure it's one we asked for
            const rate = seriesData.observations['0'][0];
            newlyFetchedRates[currencyValue.id] = rate;
            finalRatesResult[currencyValue.id] = rate; // Add to our results
        }
    });

    // Update cache
    const existingCachedRates = fxCache.get(cacheKey)?.rates || { EUR: 1.0 };
    const allKnownRates = { ...existingCachedRates, ...newlyFetchedRates, EUR: 1.0 };
    
    fxCache.set(cacheKey, {
      rates: allKnownRates,
      date: fetchedObservationDate,
      timestamp: Date.now(),
    });
    console.log('FX Rates: Updated cache for EUR base with new data');
    
    // Ensure all originally requested currencies are in finalRatesResult
    // This loop is mostly for safety or if EUR was the only thing requested initially.
    requestedCurrencies.forEach(curr => {
        if (curr === 'EUR' && !finalRatesResult[curr]) {
            finalRatesResult.EUR = 1.0;
        }
        // Other currencies should have been populated from cache or fetch
    });

    return { rates: finalRatesResult, date: fetchedObservationDate };

  } catch (error) {
    console.error('Error fetching or parsing ECB data:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseCurrency = searchParams.get('base')?.toUpperCase();
  const targetCurrency = searchParams.get('target')?.toUpperCase();

  if (!baseCurrency || !targetCurrency) {
    return NextResponse.json({ error: 'Missing base or target currency parameter' }, { status: 400 });
  }

  if (!isAllowedCurrency(baseCurrency) || !isAllowedCurrency(targetCurrency)) {
    return NextResponse.json({ error: 'Invalid or unsupported currency code' }, { status: 400 });
  }

  if (baseCurrency === targetCurrency) {
    return NextResponse.json({ rate: 1.0, date: new Date().toISOString().split('T')[0] });
  }

  try {
    let rate: number;
    let date: string;

    if (baseCurrency === 'EUR') {
      const ecbData = await getECBRatesAgainstEUR([targetCurrency]);
      if (!ecbData || !ecbData.rates[targetCurrency]) {
        return NextResponse.json({ error: `Failed to get rate for ${targetCurrency}/EUR` }, { status: 500 });
      }
      rate = ecbData.rates[targetCurrency];
      date = ecbData.date;
    } else if (targetCurrency === 'EUR') {
      const ecbData = await getECBRatesAgainstEUR([baseCurrency]);
      if (!ecbData || !ecbData.rates[baseCurrency]) {
        return NextResponse.json({ error: `Failed to get rate for ${baseCurrency}/EUR` }, { status: 500 });
      }
      rate = 1 / ecbData.rates[baseCurrency];
      date = ecbData.date;
    } else {
      // Cross-currency: fetch both against EUR
      const ecbData = await getECBRatesAgainstEUR([baseCurrency, targetCurrency]);
      if (!ecbData || !ecbData.rates[baseCurrency] || !ecbData.rates[targetCurrency]) {
        return NextResponse.json({ error: 'Failed to get rates for cross-currency calculation' }, { status: 500 });
      }
      const rateBasePerEUR = ecbData.rates[baseCurrency];
      const rateTargetPerEUR = ecbData.rates[targetCurrency];
      rate = rateTargetPerEUR / rateBasePerEUR;
      date = ecbData.date;
    }

    return NextResponse.json({ rate: parseFloat(rate.toFixed(6)), date }); // Standardize precision

  } catch (error) {
    console.error('FX API Error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching exchange rates' }, { status: 500 });
  }
}
