import { z } from 'zod';

/**
 * Delivery Tracking Validation Schemas
 */

/**
 * Schema for marking purchase request as dispatched (admin)
 */
export const dispatchPurchaseRequestSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  dispute_window_hours: z.number()
    .int('Dispute window must be a whole number')
    .min(24, 'Dispute window must be at least 24 hours')
    .max(72, 'Dispute window cannot exceed 72 hours')
    .optional()
    .default(48),
});

/**
 * Schema for raising a dispute (contractor)
 */
export const raiseDisputeSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  dispute_reason: z.string()
    .min(10, 'Dispute reason must be at least 10 characters')
    .max(2000, 'Dispute reason cannot exceed 2000 characters')
    .trim(),
});

/**
 * Schema for confirming delivery (contractor)
 */
export const confirmDeliverySchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  action: z.literal('confirm', {
    errorMap: () => ({ message: 'Action must be "confirm"' })
  }),
});

/**
 * Schema for resolving a dispute (admin)
 */
export const resolveDisputeSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  resolution: z.enum(['approve_delivery', 'reject_delivery'], {
    errorMap: () => ({ message: 'Resolution must be approve_delivery or reject_delivery' })
  }),
  resolution_notes: z.string()
    .min(10, 'Resolution notes must be at least 10 characters')
    .max(2000, 'Resolution notes cannot exceed 2000 characters')
    .trim(),
});

/**
 * Type exports for TypeScript
 */
export type DispatchPurchaseRequestInput = z.infer<typeof dispatchPurchaseRequestSchema>;
export type RaiseDisputeInput = z.infer<typeof raiseDisputeSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
