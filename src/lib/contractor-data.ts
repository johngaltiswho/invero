import type { Contractor } from '@/data/mockData';
import { getGoogleSheetsAPI } from './google-sheets';
import { transformSheetToContractors, validateContractor } from './data-transformers';

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_KEY = 'contractors_cache';

interface CacheEntry {
  data: Contractor[];
  timestamp: number;
  errors?: string[];
}

// In-memory cache
let cache: CacheEntry | null = null;

// Helper functions for cache management
function isCacheValid(cacheEntry: CacheEntry): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
}

function getCachedContractors(): Contractor[] | null {
  if (cache && isCacheValid(cache)) {
    console.log('Returning cached contractor data');
    return cache.data;
  }
  return null;
}

function setCacheEntry(data: Contractor[], errors?: string[]): void {
  cache = {
    data,
    timestamp: Date.now(),
    errors,
  };
}

// Main data fetching function
export async function fetchContractors(forceRefresh = false): Promise<{
  contractors: Contractor[];
  errors: string[];
  fromCache: boolean;
}> {
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh) {
    const cachedData = getCachedContractors();
    if (cachedData) {
      return {
        contractors: cachedData,
        errors: cache?.errors || [],
        fromCache: true,
      };
    }
  }

  console.log('Fetching fresh contractor data from Google Sheets...');

  try {
    const sheetsAPI = getGoogleSheetsAPI();
    const sheetData = await sheetsAPI.getContractorData();
    
    if (!sheetData || sheetData.length === 0) {
      throw new Error('No data found in Google Sheets');
    }

    const contractors = transformSheetToContractors(sheetData);
    const errors: string[] = [];

    // Validate each contractor and collect errors
    contractors.forEach((contractor, index) => {
      const validation = validateContractor(contractor);
      if (!validation.isValid) {
        errors.push(`Row ${index + 2}: ${validation.errors.join(', ')}`);
      }
    });

    // Cache the results
    setCacheEntry(contractors, errors);

    console.log(`Successfully fetched ${contractors.length} contractors with ${errors.length} validation errors`);

    return {
      contractors,
      errors,
      fromCache: false,
    };

  } catch (error) {
    console.error('Error fetching contractor data:', error);
    
    // Return cached data as fallback if available
    const cachedData = getCachedContractors();
    if (cachedData) {
      console.log('Returning stale cached data due to fetch error');
      return {
        contractors: cachedData,
        errors: [`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`, ...(cache?.errors || [])],
        fromCache: true,
      };
    }

    // No cache available, return empty with error
    return {
      contractors: [],
      errors: [`Failed to fetch contractor data: ${error instanceof Error ? error.message : 'Unknown error'}`],
      fromCache: false,
    };
  }
}

// Individual contractor lookup
export async function getContractorById(id: string): Promise<Contractor | null> {
  try {
    const { contractors } = await fetchContractors();
    return contractors.find(contractor => contractor.id === id) || null;
  } catch (error) {
    console.error(`Error fetching contractor ${id}:`, error);
    return null;
  }
}

// Get contractors by business category
export async function getContractorsByCategory(category: string): Promise<Contractor[]> {
  try {
    const { contractors } = await fetchContractors();
    return contractors.filter(contractor => 
      contractor.businessCategory.toLowerCase().includes(category.toLowerCase())
    );
  } catch (error) {
    console.error(`Error fetching contractors by category ${category}:`, error);
    return [];
  }
}

// Get contractors by specialization
export async function getContractorsBySpecialization(specialization: string): Promise<Contractor[]> {
  try {
    const { contractors } = await fetchContractors();
    return contractors.filter(contractor =>
      contractor.specializations.some(spec =>
        spec.toLowerCase().includes(specialization.toLowerCase())
      )
    );
  } catch (error) {
    console.error(`Error fetching contractors by specialization ${specialization}:`, error);
    return [];
  }
}

// Clear cache manually
export function clearContractorCache(): void {
  cache = null;
  console.log('Contractor cache cleared');
}

// Get cache status
export function getCacheStatus(): { hasCache: boolean; isValid: boolean; timestamp?: number; errorCount: number } {
  if (!cache) {
    return { hasCache: false, isValid: false, errorCount: 0 };
  }

  return {
    hasCache: true,
    isValid: isCacheValid(cache),
    timestamp: cache.timestamp,
    errorCount: cache.errors?.length || 0,
  };
}