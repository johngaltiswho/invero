import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export class InvestorAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'InvestorAuthError';
    this.status = status;
  }
}

function isMissingColumnError(message?: string | null) {
  return !!message && message.includes("Could not find the 'clerk_user_id' column");
}

export async function resolveActiveInvestor<T = any>(select = '*'): Promise<{
  user: Awaited<ReturnType<typeof currentUser>>;
  investor: T;
}> {
  const { userId } = await auth();
  if (!userId) {
    throw new InvestorAuthError('Not authenticated', 401);
  }

  let user = await currentUser();
  if (!user) {
    throw new InvestorAuthError('Not authenticated', 401);
  }

  let byClerkId: T | null = null;
  const byClerkIdResponse = await (supabaseAdmin as any)
    .from('investors')
    .select(select)
    .eq('clerk_user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (byClerkIdResponse.error && !isMissingColumnError(byClerkIdResponse.error.message)) {
    console.error('Error fetching investor by clerk_user_id:', byClerkIdResponse.error);
    throw new InvestorAuthError('Failed to load investor profile', 500);
  }

  if (!byClerkIdResponse.error && byClerkIdResponse.data) {
    byClerkId = byClerkIdResponse.data as T;
  }

  if (byClerkId) {
    return { user, investor: byClerkId };
  }

  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    throw new InvestorAuthError('Missing email', 400);
  }

  const { data: byEmail, error: byEmailError } = await (supabaseAdmin as any)
    .from('investors')
    .select(select)
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle();

  if (byEmailError) {
    console.error('Error fetching investor by email fallback:', byEmailError);
    throw new InvestorAuthError('Failed to load investor profile', 500);
  }

  if (!byEmail) {
    throw new InvestorAuthError('Investor profile not found', 404);
  }

  try {
    await (supabaseAdmin as any)
      .from('investors')
      .update({ clerk_user_id: userId })
      .eq('id', (byEmail as any).id);
  } catch (linkError) {
    console.warn('Failed to link investor clerk_user_id during auth heal:', linkError);
  }

  return { user, investor: byEmail as T };
}

export function getInvestorAuthErrorStatus(error: unknown, fallbackStatus = 500) {
  if (error instanceof InvestorAuthError) {
    return error.status;
  }
  return fallbackStatus;
}
