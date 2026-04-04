import { selectDirectInflowAllocationIntent } from '@/lib/direct-inflow-allocation';

describe('selectDirectInflowAllocationIntent', () => {
  it('returns null when no active intent has remaining funding', () => {
    const selected = selectDirectInflowAllocationIntent([
      {
        id: 'intent-complete',
        status: 'completed',
        created_at: '2026-04-01T00:00:00.000Z',
        remainingAmount: 0,
      },
      {
        id: 'intent-draft',
        status: 'draft',
        created_at: '2026-04-02T00:00:00.000Z',
        remainingAmount: 50000,
      },
    ]);

    expect(selected).toBeNull();
  });

  it('selects the single fundable intent for direct admin inflows', () => {
    const selected = selectDirectInflowAllocationIntent([
      {
        id: 'intent-ready',
        status: 'ready_for_funding',
        created_at: '2026-04-02T00:00:00.000Z',
        remainingAmount: 46000,
      },
      {
        id: 'intent-complete',
        status: 'completed',
        created_at: '2026-03-29T00:00:00.000Z',
        remainingAmount: 0,
      },
    ]);

    expect(selected?.id).toBe('intent-ready');
  });

  it('throws when more than one active intent still has remaining funding', () => {
    expect(() =>
      selectDirectInflowAllocationIntent([
        {
          id: 'intent-one',
          status: 'ready_for_funding',
          created_at: '2026-04-01T00:00:00.000Z',
          remainingAmount: 10000,
        },
        {
          id: 'intent-two',
          status: 'funding_submitted',
          created_at: '2026-04-02T00:00:00.000Z',
          remainingAmount: 20000,
        },
      ])
    ).toThrow('Multiple allocation intents still have remaining funding');
  });
});
