export const FINVERNO_BANK_DETAILS = {
  account_holder_name: 'Finverno Private Limited',
  bank_name: 'State Bank of India',
  account_number: '44890495524',
  ifsc_code: 'SBIN0030495',
  account_type: 'Current Account',
  branch_name: '',
  upi_id: 'finvernoprivatelimited@sbi',
} as const;

export type FinvernoBankDetails = typeof FINVERNO_BANK_DETAILS;
