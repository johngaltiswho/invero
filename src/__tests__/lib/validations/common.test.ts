import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  gstinSchema,
  panSchema,
  amountSchema,
  percentageSchema,
  dateStringSchema,
  paginationSchema,
} from '@/lib/validations/common';

describe('Common Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('should accept valid UUID v4', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = uuidSchema.safeParse('invalid-uuid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject random string', () => {
      const result = uuidSchema.safeParse('not-a-uuid-at-all');
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.in',
        'user+tag@example.com',
        'test123@test-domain.com',
      ];

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      });
    });

    it('should reject email without @', () => {
      const result = emailSchema.safeParse('userexample.com');
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = emailSchema.safeParse('user@');
      expect(result.success).toBe(false);
    });
  });

  describe('phoneSchema (India)', () => {
    it('should accept valid 10-digit Indian mobile starting with 6', () => {
      const result = phoneSchema.safeParse('6123456789');
      expect(result.success).toBe(true);
    });

    it('should accept valid 10-digit Indian mobile starting with 7', () => {
      const result = phoneSchema.safeParse('7123456789');
      expect(result.success).toBe(true);
    });

    it('should accept valid 10-digit Indian mobile starting with 8', () => {
      const result = phoneSchema.safeParse('8123456789');
      expect(result.success).toBe(true);
    });

    it('should accept valid 10-digit Indian mobile starting with 9', () => {
      const result = phoneSchema.safeParse('9123456789');
      expect(result.success).toBe(true);
    });

    it('should reject numbers starting with 0-5', () => {
      const invalidNumbers = ['0123456789', '1123456789', '2123456789', '5123456789'];

      invalidNumbers.forEach(number => {
        const result = phoneSchema.safeParse(number);
        expect(result.success).toBe(false);
      });
    });

    it('should reject 9-digit numbers', () => {
      const result = phoneSchema.safeParse('912345678');
      expect(result.success).toBe(false);
    });

    it('should reject 11-digit numbers', () => {
      const result = phoneSchema.safeParse('91234567890');
      expect(result.success).toBe(false);
    });

    it('should reject numbers with special characters', () => {
      const result = phoneSchema.safeParse('9123-456789');
      expect(result.success).toBe(false);
    });
  });

  describe('gstinSchema (India)', () => {
    it('should accept valid GSTIN format', () => {
      const result = gstinSchema.safeParse('22AAAAA0000A1Z5');
      expect(result.success).toBe(true);
    });

    it('should accept another valid GSTIN format', () => {
      const result = gstinSchema.safeParse('29ABCDE1234F2Z9');
      expect(result.success).toBe(true);
    });

    it('should reject invalid GSTIN with wrong length', () => {
      const result = gstinSchema.safeParse('22AAAAA0000A1Z');
      expect(result.success).toBe(false);
    });

    it('should reject GSTIN with lowercase letters', () => {
      const result = gstinSchema.safeParse('22aaaaa0000a1z5');
      expect(result.success).toBe(false);
    });

    it('should reject GSTIN with invalid pattern', () => {
      const result = gstinSchema.safeParse('AAAAAAA0000A1Z5');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = gstinSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('panSchema (India)', () => {
    it('should accept valid PAN format', () => {
      const result = panSchema.safeParse('ABCDE1234F');
      expect(result.success).toBe(true);
    });

    it('should accept another valid PAN format', () => {
      const result = panSchema.safeParse('ZYXWV5678Q');
      expect(result.success).toBe(true);
    });

    it('should reject PAN with lowercase letters', () => {
      const result = panSchema.safeParse('abcde1234f');
      expect(result.success).toBe(false);
    });

    it('should reject PAN with wrong length', () => {
      const result = panSchema.safeParse('ABCDE1234');
      expect(result.success).toBe(false);
    });

    it('should reject PAN with invalid pattern', () => {
      const result = panSchema.safeParse('12345ABCDE');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = panSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('amountSchema', () => {
    it('should accept positive amounts', () => {
      const result = amountSchema.safeParse(100.50);
      expect(result.success).toBe(true);
    });

    it('should accept amounts with 2 decimal places', () => {
      const result = amountSchema.safeParse(99.99);
      expect(result.success).toBe(true);
    });

    it('should accept large amounts', () => {
      const result = amountSchema.safeParse(1000000.50);
      expect(result.success).toBe(true);
    });

    it('should reject negative amounts', () => {
      const result = amountSchema.safeParse(-100);
      expect(result.success).toBe(false);
    });

    it('should reject zero', () => {
      const result = amountSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should reject more than 2 decimal places', () => {
      const result = amountSchema.safeParse(100.999);
      expect(result.success).toBe(false);
    });

    it('should accept exactly 2 decimal places', () => {
      const result = amountSchema.safeParse(50.01);
      expect(result.success).toBe(true);
    });
  });

  describe('percentageSchema', () => {
    it('should accept 0 percent', () => {
      const result = percentageSchema.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should accept 100 percent', () => {
      const result = percentageSchema.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should accept values between 0-100', () => {
      const validPercentages = [1, 25, 50, 75, 99.5];

      validPercentages.forEach(percentage => {
        const result = percentageSchema.safeParse(percentage);
        expect(result.success).toBe(true);
      });
    });

    it('should reject negative percentages', () => {
      const result = percentageSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should reject percentages over 100', () => {
      const result = percentageSchema.safeParse(101);
      expect(result.success).toBe(false);
    });

    it('should reject percentages way over 100', () => {
      const result = percentageSchema.safeParse(500);
      expect(result.success).toBe(false);
    });
  });

  describe('dateStringSchema', () => {
    it('should accept valid ISO datetime strings', () => {
      const result = dateStringSchema.safeParse('2024-01-15T10:30:00Z');
      expect(result.success).toBe(true);
    });

    it('should accept datetime with milliseconds', () => {
      const result = dateStringSchema.safeParse('2024-01-15T10:30:00.000Z');
      expect(result.success).toBe(true);
    });

    it('should accept datetime with UTC timezone', () => {
      const result = dateStringSchema.safeParse('2024-01-15T10:30:00.000Z');
      expect(result.success).toBe(true);
    });

    it('should reject date-only strings', () => {
      const result = dateStringSchema.safeParse('2024-01-15');
      expect(result.success).toBe(false);
    });

    it('should reject invalid date formats', () => {
      const result = dateStringSchema.safeParse('15-01-2024');
      expect(result.success).toBe(false);
    });

    it('should reject non-date strings', () => {
      const result = dateStringSchema.safeParse('not a date');
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should use default limit of 50', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should use default offset of 0', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept custom limit and offset', () => {
      const result = paginationSchema.safeParse({ limit: 100, offset: 20 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
        expect(result.data.offset).toBe(20);
      }
    });

    it('should reject negative limit', () => {
      const result = paginationSchema.safeParse({ limit: -10 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = paginationSchema.safeParse({ offset: -5 });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 1000', () => {
      const result = paginationSchema.safeParse({ limit: 1001 });
      expect(result.success).toBe(false);
    });

    it('should accept limit at exactly 1000', () => {
      const result = paginationSchema.safeParse({ limit: 1000 });
      expect(result.success).toBe(true);
    });

    it('should reject non-integer values', () => {
      const result = paginationSchema.safeParse({ limit: 50.5 });
      expect(result.success).toBe(false);
    });
  });
});
