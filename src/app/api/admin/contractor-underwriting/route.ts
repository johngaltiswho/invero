import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import {
  DEFAULT_LATE_DEFAULT_TERMS,
  DEFAULT_PAYMENT_WINDOW_DAYS,
  DEFAULT_REPAYMENT_BASIS,
  getContractorUnderwritingSummary,
  syncContractorOnboarding,
} from '@/lib/contractor-onboarding';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor_id');

    if (!contractorId) {
      return NextResponse.json({ error: 'contractor_id is required' }, { status: 400 });
    }

    const underwriting = await getContractorUnderwritingSummary(contractorId);
    return NextResponse.json({ success: true, underwriting });
  } catch (error) {
    console.error('Error loading contractor underwriting:', error);
    return NextResponse.json({ error: 'Failed to load contractor underwriting' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json();
    const contractorId = body.contractor_id;

    if (!contractorId) {
      return NextResponse.json({ error: 'contractor_id is required' }, { status: 400 });
    }

    const status = body.status || 'commercial_review';
    const financingLimit =
      body.financing_limit !== undefined && body.financing_limit !== null && body.financing_limit !== ''
        ? Number(body.financing_limit)
        : null;
    const paymentWindowDays =
      body.payment_window_days !== undefined && body.payment_window_days !== null && body.payment_window_days !== ''
        ? Number(body.payment_window_days)
        : null;

    const { data, error } = await (supabaseAdmin as any)
      .from('contractor_underwriting_profiles')
      .upsert({
        contractor_id: contractorId,
        status,
        financing_limit: financingLimit,
        repayment_basis: DEFAULT_REPAYMENT_BASIS,
        payment_window_days: paymentWindowDays ?? DEFAULT_PAYMENT_WINDOW_DAYS,
        late_default_terms: typeof body.late_default_terms === 'string' && body.late_default_terms.trim()
          ? body.late_default_terms.trim()
          : DEFAULT_LATE_DEFAULT_TERMS,
        notes: typeof body.notes === 'string' ? body.notes.trim() : null,
        updated_by: adminUser?.id || 'system',
      }, { onConflict: 'contractor_id' })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to save contractor underwriting');
    }

    const snapshot = await syncContractorOnboarding(contractorId);

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'update',
      entityType: 'contractor_underwriting_profile',
      entityId: contractorId,
      description: 'Updated contractor underwriting terms',
      metadata: {
        contractor_id: contractorId,
        status,
        financing_limit: financingLimit,
      },
      newValues: data as any,
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, underwriting: data, onboarding: snapshot });
  } catch (error) {
    console.error('Error updating contractor underwriting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update contractor underwriting' },
      { status: 500 }
    );
  }
}
