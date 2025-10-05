import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDriveAPI } from '@/lib/google-drive';

// Temporarily disabled during migration to Supabase
export async function POST(_request: NextRequest) {
  console.log('⚠️ Contractor application API temporarily disabled - migrating to Supabase');
  
  return NextResponse.json({
    success: false,
    error: 'Contractor application submission is temporarily disabled during migration to Supabase',
    message: 'Please check back later. We are migrating from Google Sheets to a more robust database system.'
  }, { status: 503 });
}