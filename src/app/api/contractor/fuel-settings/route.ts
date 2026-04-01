import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getMonthlyBudgetStatus } from '@/lib/fuel/auto-approval-service';
import { getSmeFuelAccountSummary } from '@/lib/fuel/finance';
import { getLatestContractorAgreementByType } from '@/lib/contractor-agreements/service';

/**
 * Helper to resolve contractor from Clerk auth
 */
async function resolveContractor() {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Not authenticated', status: 401 as const };
  }

  const { data: byClerkId, error: byClerkIdError } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (byClerkIdError) {
    console.error('Error fetching contractor by clerk_user_id:', byClerkIdError);
    return { error: 'Failed to load contractor profile', status: 500 as const };
  }

  if (byClerkId) {
    return { contractor: byClerkId };
  }

  // Fallback for older contractor records
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  const { data: byEmail, error: byEmailError } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (byEmailError) {
    console.error('Error fetching contractor by email fallback:', byEmailError);
    return { error: 'Failed to load contractor profile', status: 500 as const };
  }

  if (!byEmail) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  // Heal old records
  if (!byEmail.clerk_user_id) {
    await supabaseAdmin
      .from('contractors')
      .update({ clerk_user_id: userId })
      .eq('id', byEmail.id);
  }

  return { contractor: byEmail };
}

/**
 * GET /api/contractor/fuel-settings
 * Get fuel settings and budget status for the authenticated contractor
 */
export async function GET() {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Fetch fuel settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('contractor_fuel_settings')
      .select('*')
      .eq('contractor_id', contractor.id)
      .maybeSingle();

    if (settingsError) {
      console.error('Failed to fetch fuel settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to load fuel settings' },
        { status: 500 }
      );
    }

    // If no settings found, return defaults (settings should be created during onboarding)
    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          settings: null,
          budget_status: {
            budget: 0,
            spent: 0,
            remaining: 0,
          },
          account_summary: null,
          message: 'Fuel settings not configured. Please contact admin.',
        },
      });
    }

    const [budgetStatus, accountSummary] = await Promise.all([
      getMonthlyBudgetStatus(contractor.id),
      getSmeFuelAccountSummary(contractor.id),
    ]);

    const fuelAgreement = await getLatestContractorAgreementByType(
      contractor.id,
      'fuel_procurement_declaration'
    );

    // Get count of approved pumps
    const { count: approvedPumpsCount } = await supabaseAdmin
      .from('contractor_approved_pumps')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', contractor.id)
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      data: {
        settings: {
          overdraft_allowed: settings.overdraft_allowed ?? ((settings.account_mode ?? 'credit') === 'credit'),
          overdraft_limit_amount: settings.overdraft_limit_amount ?? settings.account_limit_amount ?? 0,
          warning_threshold_amount: settings.warning_threshold_amount ?? 0,
          monthly_fuel_budget: settings.monthly_fuel_budget,
          per_request_max_amount: settings.per_request_max_amount,
          per_request_max_liters: settings.per_request_max_liters,
          max_fills_per_vehicle_per_day: settings.max_fills_per_vehicle_per_day,
          min_hours_between_fills: settings.min_hours_between_fills,
          auto_approve_enabled: settings.auto_approve_enabled,
        },
        budget_status: budgetStatus,
        account_summary: accountSummary,
        fuel_agreement: fuelAgreement
          ? {
              id: fuelAgreement.id,
              status: fuelAgreement.status,
              agreement_date: fuelAgreement.agreement_date,
              issued_at: fuelAgreement.issued_at,
              executed_at: fuelAgreement.executed_at,
            }
          : null,
        fuel_access_enabled: fuelAgreement?.status === 'executed',
        approved_pumps_count: approvedPumpsCount || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/fuel-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
