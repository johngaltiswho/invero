import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 Investor Profile API called');
    
    // Get user info from Clerk
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const userEmail = user.emailAddresses[0]?.emailAddress;
    console.log('✅ User authenticated, email:', userEmail);
    
    // Investor functionality is not yet available in Supabase
    console.log('⚠️ Investor functionality not yet migrated to Supabase');
    
    return NextResponse.json({
      success: false,
      error: 'Investor portal is under development',
      message: 'The investor portal is being rebuilt with enhanced features. Please check back soon.',
      userEmail,
      status: 'coming_soon'
    }, { status: 503 });

  } catch (error) {
    console.error('💥 Error in investor profile API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}