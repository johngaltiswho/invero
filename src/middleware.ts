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

      // Primary lookup: Check if contractor exists using clerk_user_id
      let { data: contractor, error } = await supabase
        .from('contractors')
        .select('id, status, verification_status, email, clerk_user_id')
        .eq('clerk_user_id', userId)
        .single();

      console.log('Primary contractor check (clerk_user_id):', {
        userId,
        contractor: contractor ? { id: contractor.id, email: contractor.email } : null,
        error: error?.message,
        hasContractor: !!contractor
      });

      // Fallback lookup: If not found by clerk_user_id, try email lookup
      if (error || !contractor) {
        console.log('Primary lookup failed, attempting email fallback...');
        
        try {
          // Get user details from Clerk to extract email
          const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: {
              'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (clerkResponse.ok) {
            const clerkUser = await clerkResponse.json();
            const email = clerkUser.email_addresses?.find((e: any) => e.id === clerkUser.primary_email_address_id)?.email_address;
            
            if (email) {
            console.log('Trying email lookup for:', email);
            const { data: emailContractor, error: emailError } = await supabase
              .from('contractors')
              .select('id, status, verification_status, email, clerk_user_id')
              .eq('email', email)
              .single();

            if (emailContractor && !emailError) {
              contractor = emailContractor;
              console.log('✅ Found contractor by email:', { id: contractor.id, email: contractor.email });
              
              // Auto-link clerk_user_id for future requests (if not already linked)
              if (!contractor.clerk_user_id || contractor.clerk_user_id !== userId) {
                console.log('Linking clerk_user_id for future optimization...');
                await supabase
                  .from('contractors')
                  .update({ clerk_user_id: userId })
                  .eq('id', contractor.id);
                console.log('✅ Linked clerk_user_id successfully');
              }
            } else {
              console.log('Email lookup also failed:', emailError?.message);
            }
            } else {
              console.log('No email found in Clerk user data');
            }
          } else {
            console.log('Failed to fetch user from Clerk API');
          }
        } catch (fallbackError) {
          console.error('Email fallback lookup failed:', fallbackError);
        }
      }

      if (!contractor) {
        console.log('No contractor found via any method, redirecting to status page');
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