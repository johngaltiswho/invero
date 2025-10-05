import { NextRequest, NextResponse } from 'next/server';

// Temporarily disabled during migration to Supabase
export async function GET(request: NextRequest) {
  console.log('⚠️ Contractors API temporarily disabled - migrating to Supabase');
  
  return NextResponse.json({
    contractors: [],
    projects: [],
    errors: ['Google Sheets integration is being migrated to Supabase'],
    fromCache: false,
    message: 'This API is temporarily disabled during migration to Supabase'
  });
}