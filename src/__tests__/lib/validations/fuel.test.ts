import {
  vehicleSchema,
  submitExpenseSchema,
  reviewExpenseSchema,
} from '@/lib/validations/fuel';

describe('Fuel Validation Schemas', () => {
  describe('vehicleSchema', () => {
    it('should accept valid vehicle registration', () => {
      const validData = {
        vehicle_number: 'KA01AB1234',
        vehicle_type: 'Truck',
      };

      const result = vehicleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should normalize vehicle number to uppercase', () => {
      const validData = {
        vehicle_number: 'ka01ab1234',
        vehicle_type: 'Truck',
      };

      const result = vehicleSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicle_number).toBe('KA01AB1234');
      }
    });

    it('should remove spaces from vehicle number', () => {
      const validData = {
        vehicle_number: 'KA 01 AB 1234',
        vehicle_type: 'Truck',
      };

      const result = vehicleSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicle_number).toBe('KA01AB1234');
      }
    });

    it('should accept valid vehicle number with single letter', () => {
      const validData = {
        vehicle_number: 'MH12A1234',
        vehicle_type: 'JCB',
      };

      const result = vehicleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid vehicle number with two letters', () => {
      const validData = {
        vehicle_number: 'DL01AB1234',
        vehicle_type: 'Loader',
      };

      const result = vehicleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid vehicle number format (too short)', () => {
      const invalidData = {
        vehicle_number: 'ABC123',
        vehicle_type: 'Truck',
      };

      const result = vehicleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid vehicle number format (wrong pattern)', () => {
      const invalidData = {
        vehicle_number: '01KA12345678',
        vehicle_type: 'Truck',
      };

      const result = vehicleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid vehicle number with special characters', () => {
      const invalidData = {
        vehicle_number: 'KA-01-AB-1234',
        vehicle_type: 'Truck',
      };

      const result = vehicleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty vehicle type', () => {
      const invalidData = {
        vehicle_number: 'KA01AB1234',
        vehicle_type: '',
      };

      const result = vehicleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject vehicle type exceeding 50 characters', () => {
      const invalidData = {
        vehicle_number: 'KA01AB1234',
        vehicle_type: 'A'.repeat(51),
      };

      const result = vehicleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim vehicle type', () => {
      const validData = {
        vehicle_number: 'KA01AB1234',
        vehicle_type: '  Truck  ',
      };

      const result = vehicleSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicle_type).toBe('Truck');
      }
    });
  });

  describe('submitExpenseSchema', () => {
    it('should accept valid UUID', () => {
      const validData = {
        vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = submitExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        vehicle_id: 'not-a-uuid',
      };

      const result = submitExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing vehicle_id', () => {
      const invalidData = {};

      const result = submitExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('reviewExpenseSchema', () => {
    it('should accept valid approval', () => {
      const validData = {
        action: 'approve' as const,
        admin_notes: 'Looks good',
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid rejection with reason', () => {
      const validData = {
        action: 'reject' as const,
        rejected_reason: 'Bill is unclear, please resubmit',
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject action other than approve/reject', () => {
      const invalidData = {
        action: 'pending',
      };

      const result = reviewExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require rejected_reason when action is reject', () => {
      const invalidData = {
        action: 'reject' as const,
        admin_notes: 'Some notes',
      };

      const result = reviewExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject rejected_reason less than 10 characters', () => {
      const invalidData = {
        action: 'reject' as const,
        rejected_reason: 'Too short',
      };

      const result = reviewExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject rejected_reason exceeding 500 characters', () => {
      const invalidData = {
        action: 'reject' as const,
        rejected_reason: 'A'.repeat(501),
      };

      const result = reviewExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept rejected_reason at exactly 500 characters', () => {
      const validData = {
        action: 'reject' as const,
        rejected_reason: 'A'.repeat(500),
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept admin_notes up to 1000 characters', () => {
      const validData = {
        action: 'approve' as const,
        admin_notes: 'A'.repeat(1000),
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject admin_notes exceeding 1000 characters', () => {
      const invalidData = {
        action: 'approve' as const,
        admin_notes: 'A'.repeat(1001),
      };

      const result = reviewExpenseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim admin_notes', () => {
      const validData = {
        action: 'approve' as const,
        admin_notes: '  Notes with spaces  ',
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.admin_notes).toBe('Notes with spaces');
      }
    });

    it('should trim rejected_reason', () => {
      const validData = {
        action: 'reject' as const,
        rejected_reason: '  This is a valid rejection reason  ',
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rejected_reason).toBe('This is a valid rejection reason');
      }
    });

    it('should allow approval without admin_notes', () => {
      const validData = {
        action: 'approve' as const,
      };

      const result = reviewExpenseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
