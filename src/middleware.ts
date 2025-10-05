import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/admin(.*)',
]);

const isContractorRoute = createRouteMatcher([
  '/dashboard/contractor(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  console.log('Middleware running for:', req.url);
  const { userId } = await auth();

  // If accessing a protected route and not authenticated, redirect to sign-in
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    // Preserve the original URL so we can redirect back after login
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // For contractor routes, check database access before allowing access
  console.log('Route check:', {
    url: req.url,
    isContractorRoute: isContractorRoute(req),
    userId: !!userId
  });
  
  if (isContractorRoute(req) && userId) {
    console.log('✅ Matched contractor route, checking access...');
    try {
      // Create Supabase client for middleware
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Check if contractor exists and has proper access using clerk_user_id
      const { data: contractor, error } = await supabase
        .from('contractors')
        .select('id, status, verification_status, email')
        .eq('clerk_user_id', userId)
        .single();

      console.log('Middleware contractor check:', {
        userId,
        contractor,
        error,
        hasContractor: !!contractor
      });

      if (error || !contractor) {
        console.log('No contractor found, redirecting to status page');
        const statusUrl = new URL('/contractors/status', req.url);
        return NextResponse.redirect(statusUrl);
      }

      // Check if contractor has dashboard access
      const hasAccess = contractor.status === 'approved' && contractor.verification_status === 'verified';
      
      console.log('Access check:', {
        status: contractor.status,
        verification_status: contractor.verification_status,
        hasAccess
      });
      
      if (!hasAccess) {
        console.log('Contractor exists but no access, redirecting to status page');
        const statusUrl = new URL('/contractors/status', req.url);
        return NextResponse.redirect(statusUrl);
      }

      console.log('Contractor has access, allowing through');

      // Contractor has access - allow through
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware contractor check error:', error);
      // On error, redirect to status page for safety
      const statusUrl = new URL('/contractors/status', req.url);
      return NextResponse.redirect(statusUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};