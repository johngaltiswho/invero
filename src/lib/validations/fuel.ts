import { z } from 'zod';

/**
 * Fuel Tracking Validation Schemas (MVP)
 */

/**
 * Regex for Indian vehicle registration numbers
 * Format: XX00XX0000 (e.g., KA01AB1234, MH12DE5678)
 */
const vehicleNumberRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;

/**
 * Schema for registering a vehicle (contractor)
 */
export const vehicleSchema = z.object({
  vehicle_number: z.string()
    .transform(val => val.toUpperCase().replace(/\s/g, '')) // Normalize: uppercase and remove spaces FIRST
    .pipe(z.string().regex(vehicleNumberRegex, 'Invalid vehicle number format. Expected format: KA01AB1234')),
  vehicle_type: z.string()
    .min(1, 'Vehicle type is required')
    .max(50, 'Vehicle type cannot exceed 50 characters')
    .trim(),
});

/**
 * Schema for submitting a fuel expense (contractor)
 * Note: bill_image File validation handled separately in API route
 */
export const submitExpenseSchema = z.object({
  vehicle_id: z.string().uuid('Invalid vehicle ID format'),
});

/**
 * Schema for reviewing (approve/reject) a fuel expense (admin)
 */
export const reviewExpenseSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    message: 'Action must be either approve or reject'
  }),
  admin_notes: z.string()
    .max(1000, 'Admin notes cannot exceed 1000 characters')
    .trim()
    .optional(),
  rejected_reason: z.string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason cannot exceed 500 characters')
    .trim()
    .optional(),
}).refine(
  (data) => {
    // If action is 'reject', rejected_reason must be provided
    if (data.action === 'reject') {
      return data.rejected_reason !== undefined && data.rejected_reason.length >= 10;
    }
    return true;
  },
  {
    message: 'Rejection reason is required when rejecting an expense',
    path: ['rejected_reason'],
  }
);

/**
 * Schema for requesting fuel approval (contractor self-service)
 */
export const fuelRequestSchema = z.object({
  vehicle_id: z.string().uuid('Invalid vehicle ID format'),
  pump_id: z.string().uuid('Invalid pump ID format'),
  requested_liters: z.number()
    .positive('Requested liters must be positive')
    .max(500, 'Cannot request more than 500 liters at once')
    .refine(val => Number.isFinite(val), 'Invalid number'),
  requested_notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .trim()
    .optional(),
});

/**
 * Type exports for TypeScript
 */
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type SubmitExpenseInput = z.infer<typeof submitExpenseSchema>;
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;
export type FuelRequestInput = z.infer<typeof fuelRequestSchema>;
