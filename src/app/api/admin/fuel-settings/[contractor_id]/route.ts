import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { getSmeFuelAccountSummary } from '@/lib/fuel/finance';

/**
 * Validation schema for fuel settings
 */
const fuelSettingsSchema = z.object({
  overdraft_allowed: z.boolean(),
  overdraft_limit_amount: z.number().min(0).max(10000000),
  warning_threshold_amount: z.number().min(0).max(10000000),
  monthly_fuel_budget: z.number().positive().max(10000000),
  per_request_max_amount: z.number().positive().max(1000000),
  per_request_max_liters: z.number().positive().max(1000),
  max_fills_per_vehicle_per_day: z.number().int().positive().max(10),
  min_hours_between_fills: z.number().positive().max(168), // Max 1 week
  auto_approve_enabled: z.boolean(),
});

/**
 * GET /api/admin/fuel-settings/[contractor_id]
 * Get fuel settings for a contractor
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contractor_id: string }> }
) {
  try {
    const params = await context.params;
    const contractorId = params.contractor_id;

    // Fetch settings
    const { data: settings, error } = await supabaseAdmin
      .from('contractor_fuel_settings')
      .select('*')
      .eq('contractor_id', contractorId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch fuel settings:', error);
      return NextResponse.json(
        { error: 'Failed to load fuel settings' },
        { status: 500 }
      );
    }

    const accountSummary = await getSmeFuelAccountSummary(contractorId);

    return NextResponse.json({
      success: true,
      data: {
        settings,
        account_summary: accountSummary,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/fuel-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/fuel-settings/[contractor_id]
 * Update fuel settings for a contractor
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ contractor_id: string }> }
) {
  try {
    const params = await context.params;
    const contractorId = params.contractor_id;
    const body = await request.json();

    // Validate input
    const validationResult = fuelSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const settingsData = validationResult.data;

    const normalizedSettingsData = {
      ...settingsData,
      // Keep legacy columns populated for backward compatibility, but the
      // unified balance engine now reads overdraft settings instead.
      account_mode: settingsData.overdraft_allowed ? 'credit' : 'cash_carry',
      account_limit_amount: settingsData.overdraft_limit_amount,
    };

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
      .from('contractor_fuel_settings')
      .select('id')
      .eq('contractor_id', contractorId)
      .maybeSingle();

    let result;

    if (existing) {
      // Update existing settings
      const { data, error } = await supabaseAdmin
        .from('contractor_fuel_settings')
        .update(normalizedSettingsData)
        .eq('contractor_id', contractorId)
        .select('*')
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabaseAdmin
        .from('contractor_fuel_settings')
        .insert({
          contractor_id: contractorId,
          ...normalizedSettingsData,
        })
        .select('*')
        .single();

      if (error) throw error;
      result = data;
    }

    const accountSummary = await getSmeFuelAccountSummary(contractorId);

    return NextResponse.json({
      success: true,
      data: {
        settings: result,
        account_summary: accountSummary,
      },
      message: 'Fuel settings updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/fuel-settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
