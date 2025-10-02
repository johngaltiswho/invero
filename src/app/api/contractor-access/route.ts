import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ContractorAccessService } from '@/lib/contractor-access';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check dashboard access
    const accessStatus = await ContractorAccessService.checkDashboardAccess(userId);
    
    // Get contractor with progress if they have access or contractor exists
    let contractorWithProgress = null;
    if (accessStatus.contractor) {
      contractorWithProgress = await ContractorAccessService.getContractorWithProgress(userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...accessStatus,
        contractor: contractorWithProgress || accessStatus.contractor
      }
    });

  } catch (error) {
    console.error('Error checking contractor access:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check access'
    }, { status: 500 });
  }
}