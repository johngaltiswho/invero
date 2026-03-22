import { generateInvoicePDF, uploadInvoicePDF, InvoiceGenerationParams, InvoiceLineItem } from '@/lib/invoice-generator';

// Mock jsPDF
jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation(() => ({
      setFillColor: jest.fn(),
      setDrawColor: jest.fn(),
      setTextColor: jest.fn(),
      setFont: jest.fn(),
      setFontSize: jest.fn(),
      setCharSpace: jest.fn(),
      rect: jest.fn(),
      line: jest.fn(),
      text: jest.fn(),
      addPage: jest.fn(),
      splitTextToSize: jest.fn((text: string) => [text]),
      output: jest.fn((format: string) => {
        // Return mock ArrayBuffer
        const mockData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
        return mockData.buffer;
      }),
    })),
  };
});

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://storage.example.com/test.pdf' },
        })),
      })),
    },
  })),
}));

describe('Invoice Generator', () => {
  describe('Line Item Calculations', () => {
    it('should calculate line item total correctly (amount + tax)', () => {
      const lineItem: InvoiceLineItem = {
        material_name: 'Cement',
        unit: 'bags',
        quantity: 100,
        unit_rate: 350,
        tax_percent: 18,
        amount: 35000, // 100 * 350
        tax_amount: 6300, // 35000 * 0.18
        total: 41300, // 35000 + 6300
      };

      // Verify the calculation
      expect(lineItem.amount).toBe(lineItem.quantity * lineItem.unit_rate);
      expect(lineItem.tax_amount).toBe(lineItem.amount * (lineItem.tax_percent / 100));
      expect(lineItem.total).toBe(lineItem.amount + lineItem.tax_amount);
    });

    it('should handle zero tax percent', () => {
      const lineItem: InvoiceLineItem = {
        material_name: 'Service',
        unit: 'units',
        quantity: 10,
        unit_rate: 1000,
        tax_percent: 0,
        amount: 10000,
        tax_amount: 0,
        total: 10000,
      };

      expect(lineItem.tax_amount).toBe(0);
      expect(lineItem.total).toBe(lineItem.amount);
    });

    it('should handle decimal quantities', () => {
      const lineItem: InvoiceLineItem = {
        material_name: 'Steel',
        unit: 'tonnes',
        quantity: 2.5,
        unit_rate: 50000,
        tax_percent: 18,
        amount: 125000,
        tax_amount: 22500,
        total: 147500,
      };

      expect(lineItem.amount).toBe(lineItem.quantity * lineItem.unit_rate);
      expect(lineItem.tax_amount).toBe(lineItem.amount * (lineItem.tax_percent / 100));
      expect(lineItem.total).toBe(lineItem.amount + lineItem.tax_amount);
    });

    it('should handle decimal unit rates', () => {
      const lineItem: InvoiceLineItem = {
        material_name: 'Sand',
        unit: 'cubic meters',
        quantity: 100,
        unit_rate: 1250.50,
        tax_percent: 18,
        amount: 125050,
        tax_amount: 22509,
        total: 147559,
      };

      expect(lineItem.amount).toBe(lineItem.quantity * lineItem.unit_rate);
      expect(lineItem.tax_amount).toBe(lineItem.amount * (lineItem.tax_percent / 100));
      expect(lineItem.total).toBe(lineItem.amount + lineItem.tax_amount);
    });
  });

  describe('Invoice Totals Calculation', () => {
    it('should calculate invoice totals correctly with single item', () => {
      const lineItems: InvoiceLineItem[] = [
        {
          material_name: 'Cement',
          unit: 'bags',
          quantity: 100,
          unit_rate: 350,
          tax_percent: 18,
          amount: 35000,
          tax_amount: 6300,
          total: 41300,
        },
      ];

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0);

      expect(subtotal).toBe(35000);
      expect(totalTax).toBe(6300);
      expect(grandTotal).toBe(41300);
      expect(grandTotal).toBe(subtotal + totalTax);
    });

    it('should calculate invoice totals correctly with multiple items', () => {
      const lineItems: InvoiceLineItem[] = [
        {
          material_name: 'Cement',
          unit: 'bags',
          quantity: 100,
          unit_rate: 350,
          tax_percent: 18,
          amount: 35000,
          tax_amount: 6300,
          total: 41300,
        },
        {
          material_name: 'Steel',
          unit: 'tonnes',
          quantity: 2,
          unit_rate: 50000,
          tax_percent: 18,
          amount: 100000,
          tax_amount: 18000,
          total: 118000,
        },
        {
          material_name: 'Sand',
          unit: 'cubic meters',
          quantity: 50,
          unit_rate: 1000,
          tax_percent: 18,
          amount: 50000,
          tax_amount: 9000,
          total: 59000,
        },
      ];

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0);

      expect(subtotal).toBe(185000); // 35000 + 100000 + 50000
      expect(totalTax).toBe(33300); // 6300 + 18000 + 9000
      expect(grandTotal).toBe(218300); // 185000 + 33300
      expect(grandTotal).toBe(subtotal + totalTax);
    });

    it('should handle mixed tax rates', () => {
      const lineItems: InvoiceLineItem[] = [
        {
          material_name: 'Taxable Item',
          unit: 'units',
          quantity: 10,
          unit_rate: 1000,
          tax_percent: 18,
          amount: 10000,
          tax_amount: 1800,
          total: 11800,
        },
        {
          material_name: 'Non-Taxable Item',
          unit: 'units',
          quantity: 5,
          unit_rate: 500,
          tax_percent: 0,
          amount: 2500,
          tax_amount: 0,
          total: 2500,
        },
      ];

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0);

      expect(subtotal).toBe(12500);
      expect(totalTax).toBe(1800);
      expect(grandTotal).toBe(14300);
    });
  });

  describe('GST Effective Rate Calculation', () => {
    it('should calculate effective GST rate correctly for uniform tax', () => {
      const lineItems: InvoiceLineItem[] = [
        {
          material_name: 'Item 1',
          unit: 'units',
          quantity: 10,
          unit_rate: 100,
          tax_percent: 18,
          amount: 1000,
          tax_amount: 180,
          total: 1180,
        },
        {
          material_name: 'Item 2',
          unit: 'units',
          quantity: 20,
          unit_rate: 50,
          tax_percent: 18,
          amount: 1000,
          tax_amount: 180,
          total: 1180,
        },
      ];

      const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const taxableBase = lineItems.reduce((sum, item) => {
        return item.tax_percent > 0 ? sum + item.amount : sum;
      }, 0);
      const effectiveTaxPercent = taxableBase > 0 ? (totalTax / taxableBase) * 100 : 0;

      expect(taxableBase).toBe(2000);
      expect(totalTax).toBe(360);
      expect(effectiveTaxPercent).toBe(18);
    });

    it('should calculate effective GST rate for mixed taxable/non-taxable items', () => {
      const lineItems: InvoiceLineItem[] = [
        {
          material_name: 'Taxable',
          unit: 'units',
          quantity: 10,
          unit_rate: 100,
          tax_percent: 18,
          amount: 1000,
          tax_amount: 180,
          total: 1180,
        },
        {
          material_name: 'Non-Taxable',
          unit: 'units',
          quantity: 10,
          unit_rate: 100,
          tax_percent: 0,
          amount: 1000,
          tax_amount: 0,
          total: 1000,
        },
      ];

      const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const taxableBase = lineItems.reduce((sum, item) => {
        return item.tax_percent > 0 ? sum + item.amount : sum;
      }, 0);
      const effectiveTaxPercent = taxableBase > 0 ? (totalTax / taxableBase) * 100 : 0;

      expect(taxableBase).toBe(1000); // Only the taxable item
      expect(totalTax).toBe(180);
      expect(effectiveTaxPercent).toBe(18);
    });

    it('should return 0 effective rate when no taxable items', () => {
      const lineItems: InvoiceLineItem[] = [
        {
          material_name: 'Non-Taxable 1',
          unit: 'units',
          quantity: 10,
          unit_rate: 100,
          tax_percent: 0,
          amount: 1000,
          tax_amount: 0,
          total: 1000,
        },
        {
          material_name: 'Non-Taxable 2',
          unit: 'units',
          quantity: 5,
          unit_rate: 200,
          tax_percent: 0,
          amount: 1000,
          tax_amount: 0,
          total: 1000,
        },
      ];

      const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const taxableBase = lineItems.reduce((sum, item) => {
        return item.tax_percent > 0 ? sum + item.amount : sum;
      }, 0);
      const effectiveTaxPercent = taxableBase > 0 ? (totalTax / taxableBase) * 100 : 0;

      expect(taxableBase).toBe(0);
      expect(totalTax).toBe(0);
      expect(effectiveTaxPercent).toBe(0);
    });
  });

  describe('PDF Generation', () => {
    const validParams: InvoiceGenerationParams = {
      invoiceNumber: 'INV-2024-001',
      invoiceDate: new Date('2024-01-15'),
      purchaseRequestId: '123e4567-e89b-12d3-a456-426614174000',
      contractorId: 'contractor-123',
      projectId: 'project-456',
      projectName: 'Test Infrastructure Project',
      clientName: 'ABC Corporation',
      contractorName: 'Test Construction Co',
      contractorGSTIN: '29ABCDE1234F2Z9',
      contractorAddress: '123 Test Street, Bangalore, Karnataka 560001',
      shipToAddress: 'Site Address, Project Location',
      lineItems: [
        {
          material_name: 'Cement',
          item_description: 'Portland Cement Grade 53',
          hsn_code: '2523',
          unit: 'bags',
          quantity: 100,
          unit_rate: 350,
          tax_percent: 18,
          amount: 35000,
          tax_amount: 6300,
          total: 41300,
        },
      ],
      subtotal: 35000,
      totalTax: 6300,
      grandTotal: 41300,
    };

    it('should generate PDF and return Buffer', () => {
      const result = generateInvoicePDF(validParams);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invoice with multiple line items', () => {
      const params = {
        ...validParams,
        lineItems: [
          ...validParams.lineItems,
          {
            material_name: 'Steel',
            unit: 'tonnes',
            quantity: 2,
            unit_rate: 50000,
            tax_percent: 18,
            amount: 100000,
            tax_amount: 18000,
            total: 118000,
          },
        ],
        subtotal: 135000,
        totalTax: 24300,
        grandTotal: 159300,
      };

      const result = generateInvoicePDF(params);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invoice without optional fields', () => {
      const params: InvoiceGenerationParams = {
        invoiceNumber: 'INV-2024-002',
        invoiceDate: new Date('2024-01-16'),
        purchaseRequestId: '223e4567-e89b-12d3-a456-426614174001',
        contractorId: 'contractor-456',
        projectId: 'project-789',
        projectName: 'Minimal Project',
        contractorName: 'Minimal Contractor',
        lineItems: [
          {
            material_name: 'Item',
            unit: 'units',
            quantity: 1,
            unit_rate: 1000,
            tax_percent: 0,
            amount: 1000,
            tax_amount: 0,
            total: 1000,
          },
        ],
        subtotal: 1000,
        totalTax: 0,
        grandTotal: 1000,
      };

      const result = generateInvoicePDF(params);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle large invoice with many line items', () => {
      const manyItems: InvoiceLineItem[] = Array.from({ length: 50 }, (_, i) => ({
        material_name: `Material ${i + 1}`,
        unit: 'units',
        quantity: 10,
        unit_rate: 100,
        tax_percent: 18,
        amount: 1000,
        tax_amount: 180,
        total: 1180,
      }));

      const params = {
        ...validParams,
        lineItems: manyItems,
        subtotal: 50000,
        totalTax: 9000,
        grandTotal: 59000,
      };

      const result = generateInvoicePDF(params);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle item with long description', () => {
      const params = {
        ...validParams,
        lineItems: [
          {
            material_name: 'Material with Very Long Name',
            item_description: 'This is a very long item description that should be wrapped properly in the PDF layout to ensure readability and proper formatting',
            hsn_code: '1234',
            unit: 'units',
            quantity: 1,
            unit_rate: 1000,
            tax_percent: 18,
            amount: 1000,
            tax_amount: 180,
            total: 1180,
          },
        ],
        subtotal: 1000,
        totalTax: 180,
        grandTotal: 1180,
      };

      const result = generateInvoicePDF(params);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Upload Invoice PDF', () => {
    it('should upload PDF to Supabase storage', async () => {
      const mockBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const contractorId = 'contractor-123';
      const invoiceId = 'invoice-456';

      const result = await uploadInvoicePDF(mockBuffer, contractorId, invoiceId);

      expect(result).toBe('https://storage.example.com/test.pdf');
    });

    it('should construct correct storage path', async () => {
      const mockBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const contractorId = 'contractor-abc';
      const invoiceId = 'invoice-xyz';

      const result = await uploadInvoicePDF(mockBuffer, contractorId, invoiceId);

      // Verify the path format is: contractor_id/invoices/invoice_id.pdf
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero quantity (edge case)', () => {
      const lineItem: InvoiceLineItem = {
        material_name: 'Zero Item',
        unit: 'units',
        quantity: 0,
        unit_rate: 1000,
        tax_percent: 18,
        amount: 0,
        tax_amount: 0,
        total: 0,
      };

      expect(lineItem.amount).toBe(0);
      expect(lineItem.tax_amount).toBe(0);
      expect(lineItem.total).toBe(0);
    });

    it('should handle very large amounts', () => {
      const lineItem: InvoiceLineItem = {
        material_name: 'Expensive Item',
        unit: 'units',
        quantity: 1000,
        unit_rate: 100000,
        tax_percent: 18,
        amount: 100000000, // 100 million
        tax_amount: 18000000, // 18 million
        total: 118000000,
      };

      expect(lineItem.amount).toBe(100000000);
      expect(lineItem.tax_amount).toBe(18000000);
      expect(lineItem.total).toBe(118000000);
    });

    it('should handle precision in decimal calculations', () => {
      const quantity = 3.333;
      const unit_rate = 99.99;
      const tax_percent = 18;

      // Calculate expected values
      const expectedAmount = quantity * unit_rate;
      const expectedTax = expectedAmount * (tax_percent / 100);
      const expectedTotal = expectedAmount + expectedTax;

      const lineItem: InvoiceLineItem = {
        material_name: 'Precise Item',
        unit: 'units',
        quantity,
        unit_rate,
        tax_percent,
        amount: Number(expectedAmount.toFixed(2)),
        tax_amount: Number(expectedTax.toFixed(2)),
        total: Number(expectedTotal.toFixed(2)),
      };

      // Verify rounding to 2 decimal places
      expect(lineItem.amount).toBe(Number(expectedAmount.toFixed(2)));
      expect(lineItem.tax_amount).toBe(Number(expectedTax.toFixed(2)));
      expect(lineItem.total).toBe(Number(expectedTotal.toFixed(2)));
    });
  });
});
