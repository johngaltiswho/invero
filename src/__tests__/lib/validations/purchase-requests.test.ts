import {
  updatePurchaseRequestSchema,
  purchaseRequestItemSchema,
  purchaseRequestAdditionalChargeSchema,
  createPurchaseRequestSchema,
  assignVendorSchema,
  purchaseRequestActions,
} from '@/lib/validations/purchase-requests';

describe('Purchase Request Validation Schemas', () => {
  describe('updatePurchaseRequestSchema', () => {
    it('should accept valid update with all fields', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'approve_for_purchase' as const,
        admin_notes: 'Approved for purchase',
        vendor_id: 123,
      };

      const result = updatePurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept update without optional admin_notes', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'approve_for_purchase' as const,
      };

      const result = updatePurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept update without optional vendor_id', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'reject' as const,
        admin_notes: 'Insufficient documentation',
      };

      const result = updatePurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept all valid action types', () => {
      const actions = purchaseRequestActions;

      actions.forEach(action => {
        const result = updatePurchaseRequestSchema.safeParse({
          purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
          action,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid purchase_request_id format', () => {
      const invalidData = {
        purchase_request_id: 'invalid-uuid',
        action: 'approve_for_purchase' as const,
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-UUID purchase_request_id', () => {
      const invalidData = {
        purchase_request_id: 'not-a-uuid-at-all',
        action: 'approve_for_purchase' as const,
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid action type', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'invalid_action',
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty action', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: '',
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject admin_notes exceeding 1000 characters', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'approve_for_purchase' as const,
        admin_notes: 'a'.repeat(1001),
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept admin_notes at exactly 1000 characters', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'approve_for_purchase' as const,
        admin_notes: 'a'.repeat(1000),
      };

      const result = updatePurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative vendor_id', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'assign_vendor' as const,
        vendor_id: -1,
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero vendor_id', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'assign_vendor' as const,
        vendor_id: 0,
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject decimal vendor_id', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'assign_vendor' as const,
        vendor_id: 123.45,
      };

      const result = updatePurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('purchaseRequestItemSchema', () => {
    it('should accept valid item with all required fields', () => {
      const validData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
      };

      const result = purchaseRequestItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept item with all optional fields', () => {
      const validData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        hsn_code: '2523',
        item_description: 'Portland cement',
        site_unit: 'bags',
        purchase_unit: 'bags',
        conversion_factor: 1.0,
        requested_qty: 100,
        purchase_qty: 100,
        normalized_qty: 100,
        unit_rate: 350,
        tax_percent: 18,
      };

      const result = purchaseRequestItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid project_material_id format', () => {
      const invalidData = {
        project_material_id: 'invalid-uuid',
        requested_qty: 100,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative requested_qty', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: -10,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero requested_qty', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 0,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative purchase_qty', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        purchase_qty: -50,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject hsn_code exceeding 20 characters', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        hsn_code: 'a'.repeat(21),
        requested_qty: 100,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject item_description exceeding 500 characters', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        item_description: 'a'.repeat(501),
        requested_qty: 100,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject site_unit exceeding 50 characters', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        site_unit: 'a'.repeat(51),
        requested_qty: 100,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative unit_rate', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        unit_rate: -350,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept zero unit_rate', () => {
      const validData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        unit_rate: 0,
      };

      const result = purchaseRequestItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative tax_percent', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        tax_percent: -5,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject tax_percent over 100', () => {
      const invalidData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        tax_percent: 101,
      };

      const result = purchaseRequestItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept tax_percent at exactly 0', () => {
      const validData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        tax_percent: 0,
      };

      const result = purchaseRequestItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept tax_percent at exactly 100', () => {
      const validData = {
        project_material_id: '123e4567-e89b-12d3-a456-426614174000',
        requested_qty: 100,
        tax_percent: 100,
      };

      const result = purchaseRequestItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('purchaseRequestAdditionalChargeSchema', () => {
    it('should accept valid additional charge', () => {
      const validData = {
        description: 'Transportation',
        hsn_code: '996511',
        amount: 2500,
        tax_percent: 18,
      };

      const result = purchaseRequestAdditionalChargeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject blank description', () => {
      const result = purchaseRequestAdditionalChargeSchema.safeParse({
        description: '   ',
        amount: 1000,
        tax_percent: 18,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = purchaseRequestAdditionalChargeSchema.safeParse({
        description: 'Loading',
        amount: -100,
        tax_percent: 18,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createPurchaseRequestSchema', () => {
    it('should accept valid purchase request with single item', () => {
      const validData = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        contractor_id: '223e4567-e89b-12d3-a456-426614174000',
        items: [
          {
            project_material_id: '323e4567-e89b-12d3-a456-426614174000',
            requested_qty: 100,
          },
        ],
      };

      const result = createPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept purchase request with multiple items', () => {
      const validData = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        contractor_id: '223e4567-e89b-12d3-a456-426614174000',
        items: [
          {
            project_material_id: '323e4567-e89b-12d3-a456-426614174000',
            requested_qty: 100,
          },
          {
            project_material_id: '423e4567-e89b-12d3-a456-426614174000',
            requested_qty: 50,
          },
        ],
      };

      const result = createPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const invalidData = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        contractor_id: '223e4567-e89b-12d3-a456-426614174000',
        items: [],
      };

      const result = createPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing items field', () => {
      const invalidData = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        contractor_id: '223e4567-e89b-12d3-a456-426614174000',
      };

      const result = createPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject remarks exceeding 1000 characters', () => {
      const invalidData = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        contractor_id: '223e4567-e89b-12d3-a456-426614174000',
        remarks: 'a'.repeat(1001),
        items: [
          {
            project_material_id: '323e4567-e89b-12d3-a456-426614174000',
            requested_qty: 100,
          },
        ],
      };

      const result = createPurchaseRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept null remarks', () => {
      const validData = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        contractor_id: '223e4567-e89b-12d3-a456-426614174000',
        remarks: null,
        items: [
          {
            project_material_id: '323e4567-e89b-12d3-a456-426614174000',
            requested_qty: 100,
          },
        ],
      };

      const result = createPurchaseRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('assignVendorSchema', () => {
    it('should accept valid vendor assignment', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        vendor_id: 123,
      };

      const result = assignVendorSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid purchase_request_id', () => {
      const invalidData = {
        purchase_request_id: 'invalid-uuid',
        vendor_id: 123,
      };

      const result = assignVendorSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative vendor_id', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        vendor_id: -1,
      };

      const result = assignVendorSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
