import {
  dispatchPurchaseRequestSchema,
  raiseDisputeSchema,
  confirmDeliverySchema,
  resolveDisputeSchema,
} from '@/lib/validations/delivery';

describe('Delivery Validation Schemas', () => {
  describe('dispatchPurchaseRequestSchema', () => {
    it('should accept valid dispatch with default dispute window (48 hours)', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = dispatchPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dispute_window_hours).toBe(48);
      }
    });

    it('should accept custom dispute window within range', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_window_hours: 72,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept dispute window at minimum (24 hours)', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_window_hours: 24,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept dispute window at maximum (72 hours)', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_window_hours: 72,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject dispute window below 24 hours', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_window_hours: 23,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject dispute window above 72 hours', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_window_hours: 73,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer dispute window', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_window_hours: 48.5,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid purchase_request_id', () => {
      const invalidData = {
        purchase_request_id: 'not-a-uuid',
        dispute_window_hours: 48,
      };

      const result = dispatchPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('raiseDisputeSchema', () => {
    it('should accept valid dispute with minimum length reason (10 chars)', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_reason: 'Wrong item received',
      };

      const result = raiseDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept dispute reason at maximum length (2000 chars)', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_reason: 'a'.repeat(2000),
      };

      const result = raiseDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject dispute reason under 10 characters', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_reason: 'Too short',
      };

      const result = raiseDisputeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject dispute reason over 2000 characters', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_reason: 'a'.repeat(2001),
      };

      const result = raiseDisputeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from dispute reason', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_reason: '  Wrong item received  ',
      };

      const result = raiseDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dispute_reason).toBe('Wrong item received');
      }
    });

    it('should accept reason with whitespace that meets minimum when trimmed', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        dispute_reason: '  This is a valid reason  ',
      };

      const result = raiseDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dispute_reason).toBe('This is a valid reason');
      }
    });
  });

  describe('confirmDeliverySchema', () => {
    it('should accept valid delivery confirmation', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'confirm' as const,
      };

      const result = confirmDeliverySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should only accept literal "confirm" action', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'confirmed',
      };

      const result = confirmDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject other action values', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'reject',
      };

      const result = confirmDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid purchase_request_id', () => {
      const invalidData = {
        purchase_request_id: 'not-a-uuid',
        action: 'confirm' as const,
      };

      const result = confirmDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resolveDisputeSchema', () => {
    it('should accept "approve_delivery" resolution', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'approve_delivery' as const,
        resolution_notes: 'Dispute resolved in favor of contractor',
      };

      const result = resolveDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept "reject_delivery" resolution', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'reject_delivery' as const,
        resolution_notes: 'Valid dispute, delivery rejected',
      };

      const result = resolveDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject other resolution values', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'pending',
        resolution_notes: 'Under review',
      };

      const result = resolveDisputeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate resolution_notes min length (10 chars)', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'approve_delivery' as const,
        resolution_notes: 'Too short',
      };

      const result = resolveDisputeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate resolution_notes max length (2000 chars)', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'approve_delivery' as const,
        resolution_notes: 'a'.repeat(2001),
      };

      const result = resolveDisputeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept resolution_notes at maximum length', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'approve_delivery' as const,
        resolution_notes: 'a'.repeat(2000),
      };

      const result = resolveDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from resolution notes', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        resolution: 'approve_delivery' as const,
        resolution_notes: '  Dispute resolved successfully  ',
      };

      const result = resolveDisputeSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resolution_notes).toBe('Dispute resolved successfully');
      }
    });
  });
});
