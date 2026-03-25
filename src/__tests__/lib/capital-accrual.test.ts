import { calculateCapitalAccrualMetrics } from '@/lib/capital-accrual';

describe('capital accrual metrics', () => {
  it('accrues participation fee per deployment tranche from each funding date', () => {
    const metrics = calculateCapitalAccrualMetrics({
      transactions: [
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'deployment',
          amount: 10000,
          created_at: '2026-03-01T00:00:00.000Z'
        },
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'deployment',
          amount: 10000,
          created_at: '2026-03-11T00:00:00.000Z'
        }
      ],
      terms: {
        platform_fee_rate: 0.02,
        platform_fee_cap: 1000,
        participation_fee_rate_daily: 0.01
      },
      purchaseRequestTotal: 25000,
      asOf: new Date('2026-03-21T00:00:00.000Z')
    });

    expect(metrics.fundedAmount).toBe(20000);
    expect(metrics.returnedAmount).toBe(0);
    expect(metrics.participationFee).toBeCloseTo(3000, 6);
    expect(metrics.outstandingParticipationFee).toBeCloseTo(3000, 6);
    expect(metrics.outstandingPrincipal).toBeCloseTo(20000, 6);
    expect(metrics.investorDue).toBeCloseTo(23000, 6);
    expect(metrics.remainingInvestorDue).toBeCloseTo(23000, 6);
    expect(metrics.platformFee).toBeCloseTo(400, 6);
    expect(metrics.totalDue).toBeCloseTo(23400, 6);
    expect(metrics.remainingDue).toBeCloseTo(23400, 6);
    expect(metrics.remainingAmount).toBeCloseTo(5000, 6);
    expect(metrics.fundingProgress).toBeCloseTo(0.8, 6);
    expect(metrics.daysOutstanding).toBe(20);
  });

  it('applies contractor returns to accrued fee first, then principal FIFO across tranches', () => {
    const metrics = calculateCapitalAccrualMetrics({
      transactions: [
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'deployment',
          amount: 10000,
          created_at: '2026-03-01T00:00:00.000Z'
        },
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'deployment',
          amount: 10000,
          created_at: '2026-03-11T00:00:00.000Z'
        },
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'return',
          amount: 5000,
          created_at: '2026-03-16T00:00:00.000Z'
        }
      ],
      terms: {
        platform_fee_rate: 0.02,
        platform_fee_cap: 1000,
        participation_fee_rate_daily: 0.01
      },
      purchaseRequestTotal: 25000,
      asOf: new Date('2026-03-21T00:00:00.000Z')
    });

    expect(metrics.fundedAmount).toBe(20000);
    expect(metrics.returnedAmount).toBe(5000);
    expect(metrics.participationFee).toBeCloseTo(2850, 6);
    expect(metrics.outstandingParticipationFee).toBeCloseTo(850, 6);
    expect(metrics.outstandingPrincipal).toBeCloseTo(17000, 6);
    expect(metrics.investorDue).toBeCloseTo(22850, 6);
    expect(metrics.remainingInvestorDue).toBeCloseTo(17850, 6);
    expect(metrics.platformFee).toBeCloseTo(400, 6);
    expect(metrics.totalDue).toBeCloseTo(23250, 6);
    expect(metrics.remainingDue).toBeCloseTo(18250, 6);
    expect(metrics.daysOutstanding).toBe(20);
  });
});
