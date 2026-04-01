jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { InvestorAuthError, resolveActiveInvestor } from '@/lib/investor-auth';
import { createMaybeSingleChain } from '@/__tests__/utils/auth-test-helpers';

describe('resolveActiveInvestor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves by clerk_user_id when linked', async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123', sessionClaims: { email: 'investor@example.com' } });

    const byClerkId = createMaybeSingleChain({
      data: { id: 'inv_123', email: 'investor@example.com', name: 'Investor' },
      error: null,
    });

    (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
      select: byClerkId.select,
    });

    const result = await resolveActiveInvestor('id, email, name');

    expect(result.investor).toEqual({ id: 'inv_123', email: 'investor@example.com', name: 'Investor' });
    expect(supabaseAdmin.from).toHaveBeenCalledWith('investors');
  });

  it('falls back to email and heals clerk_user_id', async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123', sessionClaims: { email: 'investor@example.com' } });

    const byClerkId = createMaybeSingleChain({ data: null, error: null });
    const byEmail = createMaybeSingleChain({
      data: { id: 'inv_456', email: 'investor@example.com', name: 'Investor' },
      error: null,
    });
    const updateEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });

    (supabaseAdmin.from as jest.Mock)
      .mockReturnValueOnce({ select: byClerkId.select })
      .mockReturnValueOnce({ select: byEmail.select })
      .mockReturnValueOnce({ update });

    const result = await resolveActiveInvestor('id, email, name');

    expect(result.investor.id).toBe('inv_456');
    expect(update).toHaveBeenCalledWith({ clerk_user_id: 'user_123' });
    expect(updateEq).toHaveBeenCalledWith('id', 'inv_456');
  });

  it('falls back cleanly when clerk_user_id column is missing', async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123', sessionClaims: { email: 'investor@example.com' } });

    const byEmail = createMaybeSingleChain({
      data: { id: 'inv_789', email: 'investor@example.com', name: 'Investor' },
      error: null,
    });
    const updateEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });

    (supabaseAdmin.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Could not find the 'clerk_user_id' column of 'investors' in the schema cache" },
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({ select: byEmail.select })
      .mockReturnValueOnce({ update });

    const result = await resolveActiveInvestor('id, email, name');

    expect(result.investor.id).toBe('inv_789');
  });

  it('throws 401 when not authenticated', async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });

    await expect(resolveActiveInvestor()).rejects.toEqual(expect.objectContaining<Partial<InvestorAuthError>>({
      message: 'Not authenticated',
      status: 401,
    }));
  });

  it('throws 404 when no active investor exists', async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123', sessionClaims: { email: 'investor@example.com' } });

    const byClerkId = createMaybeSingleChain({ data: null, error: null });
    const byEmail = createMaybeSingleChain({ data: null, error: null });

    (supabaseAdmin.from as jest.Mock)
      .mockReturnValueOnce({ select: byClerkId.select })
      .mockReturnValueOnce({ select: byEmail.select });

    await expect(resolveActiveInvestor('id, email')).rejects.toEqual(expect.objectContaining<Partial<InvestorAuthError>>({
      message: 'Investor profile not found',
      status: 404,
    }));
  });
});
