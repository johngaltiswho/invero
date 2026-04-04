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

function isMissingColumnError(error?: { message?: string | null; code?: string | null } | null) {
  if (!error) return false;
  if (error.code === '42703') return true;

  const message = error.message || '';
  return (
    message.includes("Could not find the 'clerk_user_id' column") ||
    message.includes('column investors.clerk_user_id does not exist')
  );
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
  let primaryEmail =
    sessionClaims.email ||
    sessionClaims.primary_email_address ||
    sessionClaims.email_address ||
    sessionClaims?.external_accounts?.[0]?.email_address ||
    null;

  if (!primaryEmail) {
    try {
      const clerkUser = await currentUser();
      primaryEmail =
        clerkUser?.primaryEmailAddress?.emailAddress ||
        clerkUser?.emailAddresses?.[0]?.emailAddress ||
        null;
    } catch (error: any) {
      if (error?.status === 429 || error?.clerkError) {
        throw new InvestorAuthError('Too many authentication requests, please retry shortly', 429);
      }
      console.warn('Failed to fetch Clerk currentUser for investor email fallback:', error);
    }
  }

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

  if (byClerkIdResponse.error && !isMissingColumnError(byClerkIdResponse.error)) {
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
    const healResponse = await (supabaseAdmin as any)
      .from('investors')
      .update({ clerk_user_id: userId })
      .eq('id', (byEmail as any).id);

    if (healResponse?.error && !isMissingColumnError(healResponse.error)) {
      console.warn('Failed to link investor clerk_user_id during auth heal:', healResponse.error);
    }
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
