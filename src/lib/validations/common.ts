import { z } from 'zod';

/**
 * Common Validation Schemas
 * Reusable schemas for common data types
 */

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Phone number validation (India)
 */
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

/**
 * GSTIN validation (India)
 */
export const gstinSchema = z.string().regex(
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  'Invalid GSTIN format'
);

/**
 * PAN validation (India)
 */
export const panSchema = z.string().regex(
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  'Invalid PAN format'
);

/**
 * Amount validation (positive number with max 2 decimal places)
 */
export const amountSchema = z.number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount cannot have more than 2 decimal places');

/**
 * Percentage validation (0-100)
 */
export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

/**
 * Date string validation (ISO format)
 */
export const dateStringSchema = z.string().datetime('Invalid date format');

/**
 * Pagination query params
 */
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(1000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Type exports
 */
export type PaginationInput = z.infer<typeof paginationSchema>;
