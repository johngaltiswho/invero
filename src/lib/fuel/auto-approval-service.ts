/**
 * Fuel Auto-Approval Service
 *
 * Validates fuel requests against contractor settings and limits
 * Determines if a fuel request should be auto-approved or require manual review
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export interface FuelRequestValidation {
  isApproved: boolean;
  reason: string;
  estimatedAmount?: number;
  validUntil?: string;
}

interface FuelRequestParams {
  contractorId: string;
  vehicleId: string;
  pumpId: string;
  requestedLiters: number;
}

/**
 * Main auto-approval validation function
 * Checks all rules and returns approval decision
 */
export async function validateFuelRequest(
  params: FuelRequestParams
): Promise<FuelRequestValidation> {
  const { contractorId, vehicleId, pumpId, requestedLiters } = params;

  try {
    // 1. Verify vehicle belongs to contractor and is active
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, vehicle_type, is_active')
      .eq('id', vehicleId)
      .eq('contractor_id', contractorId)
      .maybeSingle();

    if (vehicleError || !vehicleData) {
      return {
        isApproved: false,
        reason: 'Vehicle not found or does not belong to your account',
      };
    }

    const vehicle = vehicleData as { id: string; vehicle_type: string; is_active: boolean };

    if (vehicle.is_active === false) {
      return {
        isApproved: false,
        reason: 'Vehicle is inactive. Please contact admin.',
      };
    }

    // 2. Get contractor fuel settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('contractor_fuel_settings')
      .select('*')
      .eq('contractor_id', contractorId)
      .maybeSingle();

    if (settingsError || !settingsData) {
      return {
        isApproved: false,
        reason: 'Fuel settings not configured. Please contact admin.',
      };
    }

    const settings = settingsData as {
      monthly_fuel_budget: number;
      per_request_max_amount: number;
      per_request_max_liters: number;
      max_fills_per_vehicle_per_day: number;
      min_hours_between_fills: number;
      auto_approve_enabled: boolean;
    };

    // 3. Check if auto-approval is enabled
    if (!settings.auto_approve_enabled) {
      return {
        isApproved: false,
        reason: 'Auto-approval is disabled. Request sent for manual review.',
      };
    }

    // 4. Verify pump is in approved list for this contractor
    const { data: approvedPump, error: pumpError } = await supabase
      .from('contractor_approved_pumps')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('pump_id', pumpId)
      .eq('is_active', true)
      .maybeSingle();

    if (pumpError || !approvedPump) {
      return {
        isApproved: false,
        reason: 'Selected fuel pump is not in your approved list',
      };
    }

    // 5. Estimate total amount (assume average rate of Rs 100/liter)
    // In production, fetch actual rate from pump or use recent rates
    const estimatedRate = 100;
    const estimatedAmount = requestedLiters * estimatedRate;

    // 6. Check per-request amount limit
    if (estimatedAmount > settings.per_request_max_amount) {
      return {
        isApproved: false,
        reason: `Estimated amount (Rs ${estimatedAmount.toFixed(0)}) exceeds per-request limit of Rs ${settings.per_request_max_amount.toFixed(0)}`,
        estimatedAmount,
      };
    }

    // 7. Check per-request liters limit
    if (requestedLiters > settings.per_request_max_liters) {
      return {
        isApproved: false,
        reason: `Requested ${requestedLiters}L exceeds per-request limit of ${settings.per_request_max_liters}L`,
      };
    }

    // 8. Check monthly budget (current month spend)
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const { data: monthlyApprovalsData, error: monthlyError } = await supabase
      .from('fuel_approvals')
      .select('max_amount')
      .eq('contractor_id', contractorId)
      .gte('created_at', currentMonthStart.toISOString())
      .in('status', ['pending', 'filled']);

    if (monthlyError) {
      console.error('Error fetching monthly approvals:', monthlyError);
      return {
        isApproved: false,
        reason: 'Unable to verify monthly budget. Please try again.',
      };
    }

    const monthlyApprovals = (monthlyApprovalsData || []) as Array<{ max_amount: number }>;

    const monthlySpend = monthlyApprovals.reduce(
      (sum, approval) => sum + Number(approval.max_amount),
      0
    );

    const remainingBudget = settings.monthly_fuel_budget - monthlySpend;

    if (estimatedAmount > remainingBudget) {
      return {
        isApproved: false,
        reason: `Insufficient monthly budget. Remaining: Rs ${remainingBudget.toFixed(0)}, Required: Rs ${estimatedAmount.toFixed(0)}`,
        estimatedAmount,
      };
    }

    // 9. Check daily frequency limit for this vehicle
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayFills, error: dailyError } = await supabase
      .from('fuel_approvals')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .gte('created_at', todayStart.toISOString())
      .in('status', ['pending', 'filled']);

    if (dailyError) {
      console.error('Error fetching daily fills:', dailyError);
      return {
        isApproved: false,
        reason: 'Unable to verify daily limit. Please try again.',
      };
    }

    if (todayFills.length >= settings.max_fills_per_vehicle_per_day) {
      return {
        isApproved: false,
        reason: `Daily limit reached. Maximum ${settings.max_fills_per_vehicle_per_day} fill(s) per vehicle per day.`,
      };
    }

    // 10. Check minimum time between fills
    const minHoursAgo = new Date();
    minHoursAgo.setHours(minHoursAgo.getHours() - settings.min_hours_between_fills);

    const { data: recentFillsData, error: recentError } = await supabase
      .from('fuel_approvals')
      .select('created_at')
      .eq('vehicle_id', vehicleId)
      .gte('created_at', minHoursAgo.toISOString())
      .in('status', ['pending', 'filled'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentError) {
      console.error('Error fetching recent fills:', recentError);
      return {
        isApproved: false,
        reason: 'Unable to verify fill frequency. Please try again.',
      };
    }

    const recentFills = (recentFillsData || []) as Array<{ created_at: string }>;

    if (recentFills.length > 0) {
      const lastFillTime = new Date(recentFills[0].created_at);
      const hoursSinceLastFill = (Date.now() - lastFillTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastFill < settings.min_hours_between_fills) {
        const hoursRemaining = settings.min_hours_between_fills - hoursSinceLastFill;
        return {
          isApproved: false,
          reason: `Too soon since last fill. Please wait ${hoursRemaining.toFixed(1)} more hours.`,
        };
      }
    }

    // All checks passed - AUTO-APPROVED
    // Approval valid for 24 hours
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    return {
      isApproved: true,
      reason: 'Request auto-approved',
      estimatedAmount,
      validUntil: validUntil.toISOString(),
    };
  } catch (error) {
    console.error('Auto-approval validation error:', error);
    return {
      isApproved: false,
      reason: 'System error during validation. Please contact support.',
    };
  }
}

/**
 * Calculate current month fuel budget status
 */
export async function getMonthlyBudgetStatus(contractorId: string) {
  try {
    const { data: settingsData } = await supabase
      .from('contractor_fuel_settings')
      .select('monthly_fuel_budget')
      .eq('contractor_id', contractorId)
      .maybeSingle();

    if (!settingsData) {
      return { budget: 0, spent: 0, remaining: 0 };
    }

    const settings = settingsData as { monthly_fuel_budget: number };

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const { data: approvalsData } = await supabase
      .from('fuel_approvals')
      .select('max_amount')
      .eq('contractor_id', contractorId)
      .gte('created_at', currentMonthStart.toISOString())
      .in('status', ['pending', 'filled']);

    const approvals = (approvalsData || []) as Array<{ max_amount: number }>;

    const spent = approvals.reduce(
      (sum, approval) => sum + Number(approval.max_amount),
      0
    );

    return {
      budget: settings.monthly_fuel_budget,
      spent,
      remaining: settings.monthly_fuel_budget - spent,
    };
  } catch (error) {
    console.error('Error fetching budget status:', error);
    return { budget: 0, spent: 0, remaining: 0 };
  }
}
