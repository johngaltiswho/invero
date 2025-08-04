import type { Contractor } from '@/data/mockData';

// Client-side functions for fetching contractor data from API

export async function fetchContractors(forceRefresh = false): Promise<{
  contractors: Contractor[];
  errors: string[];
  fromCache: boolean;
}> {
  try {
    const url = `/api/contractors${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching contractors from API:', error);
    return {
      contractors: [],
      errors: [`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      fromCache: false,
    };
  }
}

export async function getContractorById(id: string): Promise<Contractor | null> {
  try {
    const { contractors } = await fetchContractors();
    return contractors.find(contractor => contractor.id === id) || null;
  } catch (error) {
    console.error(`Error fetching contractor ${id}:`, error);
    return null;
  }
}

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

export async function clearContractorCache(): Promise<void> {
  try {
    await fetch('/api/contractors', { method: 'POST' });
    console.log('Contractor cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}