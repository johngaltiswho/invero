import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ContractorAccessService } from '@/lib/contractor-access';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;

    // Check dashboard access — pass email for pre-registered contractor matching
    const accessStatus = await ContractorAccessService.checkDashboardAccess(user.id, email);

    // Get contractor with progress details if a record exists
    let contractorWithProgress = null;
    if (accessStatus.contractor) {
      contractorWithProgress = await ContractorAccessService.getContractorWithProgress(user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        hasAccess: accessStatus.hasAccess,
        registrationComplete: accessStatus.registrationComplete,
        registrationStep: accessStatus.registrationStep,
        reason: accessStatus.reason,
        message: accessStatus.message,
        canRetry: accessStatus.canRetry,
        redirectTo: accessStatus.redirectTo,
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