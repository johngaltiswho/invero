import { gstinSchema, panSchema } from '@/lib/validations/common';

const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export interface ParsedGstin {
  normalized: string;
  pan: string | null;
  stateCode: string | null;
  stateName: string | null;
}

export function normalizeGstin(gstin: string): string {
  return gstin.trim().toUpperCase();
}

export function parseGstin(gstin: string): ParsedGstin | null {
  const normalized = normalizeGstin(gstin);
  const valid = gstinSchema.safeParse(normalized);
  if (!valid.success) return null;

  const derivedPan = normalized.slice(2, 12);
  const pan = panSchema.safeParse(derivedPan).success ? derivedPan : null;
  const stateCode = normalized.slice(0, 2);

  return {
    normalized,
    pan,
    stateCode,
    stateName: GST_STATE_CODES[stateCode] ?? null,
  };
}
