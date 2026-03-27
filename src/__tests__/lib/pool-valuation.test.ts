import { calculateSoftPoolValuation } from '@/lib/pool-valuation';

describe('soft pool valuation', () => {
  it('mints later investors at the current net NAV and accrues only management fee into net NAV', () => {
    const valuation = calculateSoftPoolValuation({
      investorInflows: [
        {
          investor_id: 'investor-a',
          amount: 100000,
          transaction_type: 'inflow',
          status: 'completed',
          created_at: '2026-03-01T00:00:00.000Z'
        },
        {
          investor_id: 'investor-b',
          amount: 100000,
          transaction_type: 'inflow',
          status: 'completed',
          created_at: '2026-03-11T00:00:00.000Z'
        }
      ],
      poolTransactions: [
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'deployment',
          amount: 100000,
          status: 'completed',
          created_at: '2026-03-01T00:00:00.000Z'
        }
      ],
      purchaseRequests: [
        {
          id: 'pr-1',
          contractor_id: 'contractor-1',
          project_id: 'project-1'
        }
      ],
      contractors: [
        {
          id: 'contractor-1',
          participation_fee_rate_daily: 0.001
        }
      ],
      projects: [
        {
          id: 'project-1',
          project_name: 'Pool Project'
        }
      ],
      asOf: new Date('2026-03-21T00:00:00.000Z')
    });

    const investorA = valuation.positions.find((position) => position.investorId === 'investor-a');
    const investorB = valuation.positions.find((position) => position.investorId === 'investor-b');

    expect(valuation.deployedPrincipal).toBeCloseTo(100000, 6);
    expect(valuation.accruedParticipationIncome).toBeCloseTo(2000, 6);
    expect(valuation.managementFeeAccrued).toBeCloseTo(109.589041, 3);
    expect(valuation.realizedCarryAccrued).toBe(0);
    expect(valuation.potentialCarry).toBeGreaterThan(0);
    expect(valuation.grossNavPerUnit).toBeGreaterThan(valuation.netNavPerUnit);
    expect(investorA?.unitsHeld ?? 0).toBeCloseTo(1000, 6);
    expect(investorB?.entryNavPerUnit ?? 0).toBeGreaterThan(100);
    expect(investorB?.unitsHeld ?? 0).toBeLessThan(1000);
    expect(investorA?.netValue ?? 0).toBeGreaterThan(100000);
    expect(investorB?.netValue ?? 0).toBeGreaterThan(100000);
  });

  it('crystallizes carry only from realized participation income above the preferred return hurdle', () => {
    const valuation = calculateSoftPoolValuation({
      investorInflows: [
        {
          investor_id: 'investor-a',
          amount: 100000,
          transaction_type: 'inflow',
          status: 'completed',
          created_at: '2026-03-01T00:00:00.000Z'
        }
      ],
      poolTransactions: [
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'deployment',
          amount: 100000,
          status: 'completed',
          created_at: '2026-03-01T00:00:00.000Z'
        },
        {
          purchase_request_id: 'pr-1',
          transaction_type: 'return',
          amount: 120000,
          status: 'completed',
          created_at: '2026-03-21T00:00:00.000Z'
        }
      ],
      purchaseRequests: [
        {
          id: 'pr-1',
          contractor_id: 'contractor-1',
          project_id: 'project-1'
        }
      ],
      contractors: [
        {
          id: 'contractor-1',
          participation_fee_rate_daily: 0.001
        }
      ],
      projects: [
        {
          id: 'project-1',
          project_name: 'Pool Project'
        }
      ],
      asOf: new Date('2026-03-21T00:00:00.000Z')
    });

    expect(valuation.realizedParticipationIncome).toBeCloseTo(2000, 6);
    expect(valuation.preferredReturnAccrued).toBeCloseTo(657.534246, 3);
    expect(valuation.realizedCarryAccrued).toBeCloseTo((2000 - valuation.preferredReturnAccrued) * 0.2, 3);
    expect(valuation.potentialCarry).toBeCloseTo(0, 6);
    expect(valuation.netPoolValue).toBeLessThan(valuation.grossPoolValue);
  });
});
