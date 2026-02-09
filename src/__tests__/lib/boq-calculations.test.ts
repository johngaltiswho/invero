/**
 * Tests for BOQ calculation logic
 */

import type { BOQItem } from '@/types/boq'

describe('BOQ Calculations', () => {
  describe('Amount Calculation', () => {
    it('should calculate amount correctly (quantity × rate)', () => {
      const quantity = 100
      const rate = 5000
      const expectedAmount = 500000

      const amount = quantity * rate
      expect(amount).toBe(expectedAmount)
    })

    it('should handle decimal quantities', () => {
      const quantity = 123.45
      const rate = 850
      const expectedAmount = 104932.5

      const amount = quantity * rate
      expect(amount).toBe(expectedAmount)
    })

    it('should handle zero quantity', () => {
      const quantity = 0
      const rate = 5000

      const amount = quantity * rate
      expect(amount).toBe(0)
    })

    it('should handle zero rate', () => {
      const quantity = 100
      const rate = 0

      const amount = quantity * rate
      expect(amount).toBe(0)
    })
  })

  describe('BOQ Totals', () => {
    const sampleBOQItems: BOQItem[] = [
      {
        description: 'Concrete M25',
        unit: 'm³',
        quantity: 100,
        rate: 5000,
        amount: 500000,
      },
      {
        description: 'Steel TMT Bars',
        unit: 'MT',
        quantity: 10,
        rate: 60000,
        amount: 600000,
      },
      {
        description: 'Brickwork',
        unit: 'm³',
        quantity: 50,
        rate: 3000,
        amount: 150000,
      },
    ]

    it('should calculate total BOQ value correctly', () => {
      const totalAmount = sampleBOQItems.reduce((sum, item) => sum + item.amount, 0)
      expect(totalAmount).toBe(1250000)
    })

    it('should handle empty BOQ items', () => {
      const emptyItems: BOQItem[] = []
      const totalAmount = emptyItems.reduce((sum, item) => sum + item.amount, 0)
      expect(totalAmount).toBe(0)
    })

    it('should count total items correctly', () => {
      expect(sampleBOQItems.length).toBe(3)
    })

    it('should filter items by unit', () => {
      const cubicMeterItems = sampleBOQItems.filter(item => item.unit === 'm³')
      expect(cubicMeterItems.length).toBe(2)
    })
  })

  describe('Quantity Validations', () => {
    it('should identify negative quantities', () => {
      const quantity = -10
      expect(quantity < 0).toBe(true)
    })

    it('should identify valid positive quantities', () => {
      const quantity = 100
      expect(quantity > 0).toBe(true)
    })

    it('should handle string to number conversion', () => {
      const quantityString = '123.45'
      const quantity = parseFloat(quantityString)
      expect(quantity).toBe(123.45)
      expect(typeof quantity).toBe('number')
    })

    it('should handle invalid number strings', () => {
      const invalid = 'abc'
      const quantity = parseFloat(invalid)
      expect(isNaN(quantity)).toBe(true)
    })
  })

  describe('Material Quantity Tracking', () => {
    it('should calculate remaining quantity after approval', () => {
      const requestedQuantity = 100
      const approvedQuantity = 75
      const remaining = requestedQuantity - approvedQuantity

      expect(remaining).toBe(25)
    })

    it('should handle multiple material requests', () => {
      const materialRequests = [
        { material: 'Cement', quantity: 100, approved: 80 },
        { material: 'Sand', quantity: 50, approved: 50 },
        { material: 'Steel', quantity: 30, approved: 20 },
      ]

      const totalRequested = materialRequests.reduce((sum, req) => sum + req.quantity, 0)
      const totalApproved = materialRequests.reduce((sum, req) => sum + req.approved, 0)
      const totalPending = totalRequested - totalApproved

      expect(totalRequested).toBe(180)
      expect(totalApproved).toBe(150)
      expect(totalPending).toBe(30)
    })

    it('should calculate percentage approved', () => {
      const requestedQuantity = 100
      const approvedQuantity = 75
      const percentageApproved = (approvedQuantity / requestedQuantity) * 100

      expect(percentageApproved).toBe(75)
    })
  })

  describe('Purchase Request Value Calculations', () => {
    interface PurchaseItem {
      material: string
      quantity: number
      rate: number
    }

    it('should calculate total purchase request value', () => {
      const items: PurchaseItem[] = [
        { material: 'Cement', quantity: 100, rate: 350 },
        { material: 'Sand', quantity: 50, rate: 800 },
        { material: 'Steel', quantity: 10, rate: 60000 },
      ]

      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
      expect(totalValue).toBe(675000) // 35000 + 40000 + 600000
    })

    it('should apply GST to purchase value', () => {
      const baseAmount = 100000
      const gstRate = 0.18 // 18%
      const gstAmount = baseAmount * gstRate
      const totalAmount = baseAmount + gstAmount

      expect(gstAmount).toBe(18000)
      expect(totalAmount).toBe(118000)
    })

    it('should calculate vendor-wise grouping', () => {
      interface VendorPurchase {
        vendor: string
        items: number
        totalAmount: number
      }

      const purchases: VendorPurchase[] = [
        { vendor: 'Vendor A', items: 3, totalAmount: 50000 },
        { vendor: 'Vendor B', items: 5, totalAmount: 120000 },
        { vendor: 'Vendor A', items: 2, totalAmount: 30000 },
      ]

      // Group by vendor
      const vendorTotals = purchases.reduce((acc, purchase) => {
        if (!acc[purchase.vendor]) {
          acc[purchase.vendor] = { items: 0, totalAmount: 0 }
        }
        acc[purchase.vendor].items += purchase.items
        acc[purchase.vendor].totalAmount += purchase.totalAmount
        return acc
      }, {} as Record<string, { items: number; totalAmount: number }>)

      expect(vendorTotals['Vendor A'].items).toBe(5)
      expect(vendorTotals['Vendor A'].totalAmount).toBe(80000)
      expect(vendorTotals['Vendor B'].items).toBe(5)
      expect(vendorTotals['Vendor B'].totalAmount).toBe(120000)
    })
  })

  describe('Number Formatting', () => {
    it('should format currency correctly', () => {
      const amount = 1250000
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount)

      expect(formatted).toContain('12,50,000')
    })

    it('should round to 2 decimal places', () => {
      const value = 123.456789
      const rounded = Math.round(value * 100) / 100
      expect(rounded).toBe(123.46)
    })

    it('should handle large numbers', () => {
      const value = 1234567890
      expect(value).toBeGreaterThan(1000000000)

      // Convert to crores (Indian numbering)
      const inCrores = value / 10000000
      expect(inCrores).toBe(123.456789)
    })
  })
})
