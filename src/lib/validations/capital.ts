import { z } from 'zod';

/**
 * Capital Transaction Validation Schemas
 */

// Valid transaction types
export const capitalTransactionTypes = [
  'inflow',
  'deployment',
  'return',
  'withdrawal'
] as const;

// Valid transaction statuses
export const capitalTransactionStatuses = [
  'pending',
  'completed',
  'cancelled'
] as const;

/**
 * Schema for recording capital inflow
 */
export const recordCapitalInflowSchema = z.object({
  investor_id: z.string().uuid('Invalid investor ID format'),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z.string().datetime('Invalid date format').optional(),
  payment_reference: z.string().max(200, 'Payment reference cannot exceed 200 characters').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Schema for deploying capital to purchase request
 */
export const deployCapitalSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z.string().datetime('Invalid date format').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Schema for recording capital return
 */
export const recordCapitalReturnSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z.string().datetime('Invalid date format').optional(),
  payment_reference: z.string().max(200, 'Payment reference cannot exceed 200 characters').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Schema for investor withdrawal
 */
export const recordWithdrawalSchema = z.object({
  investor_id: z.string().uuid('Invalid investor ID format'),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z.string().datetime('Invalid date format').optional(),
  payment_reference: z.string().max(200, 'Payment reference cannot exceed 200 characters').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Schema for updating transaction status
 */
export const updateTransactionStatusSchema = z.object({
  transaction_id: z.string().uuid('Invalid transaction ID format'),
  status: z.enum(capitalTransactionStatuses, {
    errorMap: () => ({ message: 'Invalid status. Must be pending, completed, or cancelled' })
  }),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Schema for capital submission (investor portal)
 */
export const submitCapitalSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(10000000000, 'Amount exceeds maximum limit'),
  payment_date: z.string().datetime('Invalid payment date format'),
  payment_reference: z.string().min(1, 'Payment reference is required').max(200, 'Payment reference cannot exceed 200 characters'),
  payment_proof_url: z.string().url('Invalid payment proof URL').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Type exports for TypeScript
 */
export type RecordCapitalInflowInput = z.infer<typeof recordCapitalInflowSchema>;
export type DeployCapitalInput = z.infer<typeof deployCapitalSchema>;
export type RecordCapitalReturnInput = z.infer<typeof recordCapitalReturnSchema>;
export type RecordWithdrawalInput = z.infer<typeof recordWithdrawalSchema>;
export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusSchema>;
export type SubmitCapitalInput = z.infer<typeof submitCapitalSchema>;
