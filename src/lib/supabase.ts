import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    return null as any;
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Browser client for authenticated frontend usage.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Shared server-side admin client for API routes and backend services.
export const supabaseAdmin = createSupabaseAdminClient();

// Explicit helper for server-only flows that want a fresh admin client instance.
export function getSupabaseAdminClient() {
  return createSupabaseAdminClient();
}

// Create authenticated Supabase client for API routes acting on behalf of a signed-in user.
export function createAuthenticatedSupabaseClient(authToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
}
