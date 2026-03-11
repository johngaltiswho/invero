import { z } from 'zod';

/**
 * Purchase Request Validation Schemas
 */

// Valid purchase request statuses
export const purchaseRequestStatuses = [
  'draft',
  'submitted',
  'approved',
  'funded',
  'po_generated',
  'completed',
  'rejected'
] as const;

// Valid delivery statuses
export const deliveryStatuses = [
  'not_dispatched',
  'dispatched',
  'disputed',
  'delivered'
] as const;

// Valid actions for purchase request updates
export const purchaseRequestActions = [
  'approve_for_purchase',
  'approve_for_funding',
  'reject',
  'assign_vendor'
] as const;

/**
 * Schema for updating a purchase request (admin)
 */
export const updatePurchaseRequestSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  action: z.enum(purchaseRequestActions, {
    errorMap: () => ({ message: 'Invalid action. Must be approve_for_purchase, approve_for_funding, reject, or assign_vendor' })
  }),
  admin_notes: z.string().max(1000, 'Admin notes cannot exceed 1000 characters').optional(),
  vendor_id: z.number().int().positive('Vendor ID must be a positive integer').optional(),
});

/**
 * Schema for purchase request item
 */
export const purchaseRequestItemSchema = z.object({
  project_material_id: z.string().uuid('Invalid project material ID'),
  hsn_code: z.string().max(20, 'HSN code cannot exceed 20 characters').optional().nullable(),
  item_description: z.string().max(500, 'Item description cannot exceed 500 characters').optional().nullable(),
  site_unit: z.string().max(50, 'Site unit cannot exceed 50 characters').optional().nullable(),
  purchase_unit: z.string().max(50, 'Purchase unit cannot exceed 50 characters').optional().nullable(),
  conversion_factor: z.number().positive('Conversion factor must be positive').optional().nullable(),
  requested_qty: z.number().positive('Requested quantity must be positive'),
  purchase_qty: z.number().positive('Purchase quantity must be positive').optional().nullable(),
  normalized_qty: z.number().positive('Normalized quantity must be positive').optional().nullable(),
  unit_rate: z.number().min(0, 'Unit rate cannot be negative').optional().nullable(),
  tax_percent: z.number().min(0, 'Tax percent cannot be negative').max(100, 'Tax percent cannot exceed 100').optional().nullable(),
});

/**
 * Schema for creating a purchase request
 */
export const createPurchaseRequestSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  contractor_id: z.string().uuid('Invalid contractor ID format'),
  remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').optional().nullable(),
  items: z.array(purchaseRequestItemSchema).min(1, 'At least one item is required'),
});

/**
 * Schema for vendor assignment
 */
export const assignVendorSchema = z.object({
  purchase_request_id: z.string().uuid('Invalid purchase request ID format'),
  vendor_id: z.number().int().positive('Vendor ID must be a positive integer'),
});

/**
 * Type exports for TypeScript
 */
export type UpdatePurchaseRequestInput = z.infer<typeof updatePurchaseRequestSchema>;
export type PurchaseRequestItemInput = z.infer<typeof purchaseRequestItemSchema>;
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type AssignVendorInput = z.infer<typeof assignVendorSchema>;
