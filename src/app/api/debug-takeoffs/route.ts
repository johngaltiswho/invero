import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple debug endpoint to check what's in the boq_takeoffs table
export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Checking boq_takeoffs table...');
    
    // Get all takeoffs
    const { data: allTakeoffs, error } = await supabase
      .from('boq_takeoffs')
      .select('*')
      .limit(10);

    console.log('Debug: All takeoffs:', allTakeoffs);
    console.log('Debug: Error:', error);

    return NextResponse.json({
      success: true,
      data: {
        takeoffs: allTakeoffs,
        error: error,
        count: allTakeoffs?.length || 0
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error },
      { status: 500 }
    );
  }
}