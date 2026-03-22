import {
  recordCapitalInflowSchema,
  deployCapitalSchema,
  recordCapitalReturnSchema,
  recordWithdrawalSchema,
  updateTransactionStatusSchema,
  submitCapitalSchema,
  capitalTransactionStatuses,
} from '@/lib/validations/capital';

describe('Capital Transaction Validation Schemas', () => {
  describe('recordCapitalInflowSchema', () => {
    it('should accept valid capital inflow', () => {
      const validData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000000,
      };

      const result = recordCapitalInflowSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid inflow with all optional fields', () => {
      const validData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000000,
        transaction_date: '2024-01-15T10:30:00Z',
        payment_reference: 'TXN123456',
        notes: 'Initial investment',
      };

      const result = recordCapitalInflowSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid investor_id UUID', () => {
      const invalidData = {
        investor_id: 'invalid-uuid',
        amount: 1000000,
      };

      const result = recordCapitalInflowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: -1000,
      };

      const result = recordCapitalInflowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const invalidData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 0,
      };

      const result = recordCapitalInflowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate transaction_date format', () => {
      const invalidData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000000,
        transaction_date: '2024-01-15',
      };

      const result = recordCapitalInflowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject payment_reference exceeding 200 characters', () => {
      const invalidData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000000,
        payment_reference: 'a'.repeat(201),
      };

      const result = recordCapitalInflowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject notes exceeding 1000 characters', () => {
      const invalidData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000000,
        notes: 'a'.repeat(1001),
      };

      const result = recordCapitalInflowSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('deployCapitalSchema', () => {
    it('should accept valid capital deployment', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 500000,
      };

      const result = deployCapitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept deployment with optional fields', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 500000,
        transaction_date: '2024-01-15T10:30:00Z',
        notes: 'Funding for material purchase',
      };

      const result = deployCapitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid purchase_request_id UUID', () => {
      const invalidData = {
        purchase_request_id: 'not-a-uuid',
        amount: 500000,
      };

      const result = deployCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative deployment amount', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: -500000,
      };

      const result = deployCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('recordCapitalReturnSchema', () => {
    it('should accept valid capital return', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 550000,
      };

      const result = recordCapitalReturnSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all required fields', () => {
      const invalidData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = recordCapitalReturnSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept all optional fields', () => {
      const validData = {
        purchase_request_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 550000,
        transaction_date: '2024-02-15T10:30:00Z',
        payment_reference: 'RETURN123',
        notes: 'Capital returned with profit',
      };

      const result = recordCapitalReturnSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('recordWithdrawalSchema', () => {
    it('should accept valid investor withdrawal', () => {
      const validData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 200000,
      };

      const result = recordWithdrawalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid amounts', () => {
      const invalidData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: -100,
      };

      const result = recordWithdrawalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept withdrawal with all optional fields', () => {
      const validData = {
        investor_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 200000,
        transaction_date: '2024-03-15T10:30:00Z',
        payment_reference: 'WITHDRAW789',
        notes: 'Partial withdrawal requested',
      };

      const result = recordWithdrawalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateTransactionStatusSchema', () => {
    it('should accept all valid status values', () => {
      const statuses = capitalTransactionStatuses;

      statuses.forEach(status => {
        const result = updateTransactionStatusSchema.safeParse({
          transaction_id: '123e4567-e89b-12d3-a456-426614174000',
          status,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept status "pending"', () => {
      const validData = {
        transaction_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending' as const,
      };

      const result = updateTransactionStatusSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept status "completed"', () => {
      const validData = {
        transaction_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed' as const,
      };

      const result = updateTransactionStatusSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept status "cancelled"', () => {
      const validData = {
        transaction_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'cancelled' as const,
      };

      const result = updateTransactionStatusSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidData = {
        transaction_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid_status',
      };

      const result = updateTransactionStatusSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate transaction_id UUID format', () => {
      const invalidData = {
        transaction_id: 'not-a-uuid',
        status: 'completed' as const,
      };

      const result = updateTransactionStatusSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('submitCapitalSchema', () => {
    it('should accept valid capital submission', () => {
      const validData = {
        amount: 5000000,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: 'PAY12345',
      };

      const result = submitCapitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept submission with payment_proof_url', () => {
      const validData = {
        amount: 5000000,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: 'PAY12345',
        payment_proof_url: 'https://example.com/proof.pdf',
      };

      const result = submitCapitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject amount exceeding maximum limit (10 billion)', () => {
      const invalidData = {
        amount: 10000000001,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: 'PAY12345',
      };

      const result = submitCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept amount at exactly 10 billion', () => {
      const validData = {
        amount: 10000000000,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: 'PAY12345',
      };

      const result = submitCapitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require payment_reference (min length 1)', () => {
      const invalidData = {
        amount: 5000000,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: '',
      };

      const result = submitCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate payment_proof_url is valid URL', () => {
      const invalidData = {
        amount: 5000000,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: 'PAY12345',
        payment_proof_url: 'not-a-url',
      };

      const result = submitCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL formats', () => {
      const invalidData = {
        amount: 5000000,
        payment_date: '2024-01-15T10:30:00Z',
        payment_reference: 'PAY12345',
        payment_proof_url: 'not-a-valid-url',
      };

      const result = submitCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate payment_date datetime format', () => {
      const invalidData = {
        amount: 5000000,
        payment_date: '2024-01-15',
        payment_reference: 'PAY12345',
      };

      const result = submitCapitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
