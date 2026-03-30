import { auth } from '@clerk/nextjs/server';
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
  user: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
  };
  investor: T;
}> {
  const authState = await auth();
  const { userId } = authState;
  if (!userId) {
    throw new InvestorAuthError('Not authenticated', 401);
  }

  const sessionClaims = (authState.sessionClaims || {}) as Record<string, any>;
  const primaryEmail =
    sessionClaims.email ||
    sessionClaims.primary_email_address ||
    sessionClaims.email_address ||
    sessionClaims?.external_accounts?.[0]?.email_address ||
    null;

  const user = {
    id: userId,
    emailAddresses: primaryEmail ? [{ emailAddress: String(primaryEmail).toLowerCase() }] : [],
  };

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
