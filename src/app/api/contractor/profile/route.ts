import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

type ContractorProfilePayload = {
  company_name?: string;
  contact_person?: string;
  designation?: string;
  phone?: string;
  business_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
};

function sanitizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractMissingColumn(message?: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/);
  return match?.[1] ?? null;
}

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

  // Fallback for older contractor records that may not yet have clerk_user_id
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

  // Heal old records by linking them to the current Clerk user
  if (!byEmail.clerk_user_id) {
    await supabaseAdmin
      .from('contractors')
      .update({ clerk_user_id: userId })
      .eq('id', byEmail.id);
  }

  return { contractor: byEmail };
}

export async function GET() {
  try {
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;
    return NextResponse.json({
      success: true,
      data: {
        id: contractor.id,
        email: contractor.email,
        company_name: contractor.company_name ?? '',
        contact_person: contractor.contact_person ?? '',
        designation: contractor.designation ?? '',
        phone: contractor.phone ?? '',
        business_address: contractor.business_address ?? '',
        city: contractor.city ?? '',
        state: contractor.state ?? '',
        pincode: contractor.pincode ?? '',
        gstin: contractor.gstin ?? ''
      }
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;
    const body = (await request.json()) as ContractorProfilePayload;

    const sanitizedValues = {
      company_name: sanitizeOptionalString(body.company_name),
      contact_person: sanitizeOptionalString(body.contact_person),
      designation: sanitizeOptionalString(body.designation),
      phone: sanitizeOptionalString(body.phone),
      business_address: sanitizeOptionalString(body.business_address),
      city: sanitizeOptionalString(body.city),
      state: sanitizeOptionalString(body.state),
      pincode: sanitizeOptionalString(body.pincode),
      gstin: sanitizeOptionalString(body.gstin)
    };

    if (!sanitizedValues.company_name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!sanitizedValues.contact_person) {
      return NextResponse.json({ error: 'Contact person is required' }, { status: 400 });
    }
    if (!sanitizedValues.phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    const updatePayload: ContractorProfilePayload = {
      company_name: sanitizedValues.company_name,
      contact_person: sanitizedValues.contact_person,
      designation: sanitizedValues.designation,
      phone: sanitizedValues.phone,
      business_address: sanitizedValues.business_address,
      city: sanitizedValues.city,
      state: sanitizedValues.state,
      pincode: sanitizedValues.pincode,
      gstin: sanitizedValues.gstin
    };

    // Some environments may not yet have newer optional columns (e.g. alternate_phone).
    // Retry by removing unknown columns reported by PostgREST schema cache.
    let mutablePayload: Record<string, unknown> = { ...updatePayload };
    let updated: any = null;
    let updateError: any = null;

    for (let attempts = 0; attempts < 6; attempts += 1) {
      const response = await supabaseAdmin
        .from('contractors')
        .update(mutablePayload)
        .eq('id', contractor.id)
        .select('*')
        .single();

      updated = response.data;
      updateError = response.error;

      if (!updateError) break;

      if (updateError.code === 'PGRST204') {
        const missingColumn = extractMissingColumn(updateError.message);
        if (missingColumn && missingColumn in mutablePayload) {
          delete mutablePayload[missingColumn];
          continue;
        }
      }

      break;
    }

    if (updateError || !updated) {
      console.error('Failed to update contractor profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        company_name: updated.company_name ?? '',
        contact_person: updated.contact_person ?? '',
        designation: updated.designation ?? '',
        phone: updated.phone ?? '',
        business_address: updated.business_address ?? '',
        city: updated.city ?? '',
        state: updated.state ?? '',
        pincode: updated.pincode ?? '',
        gstin: updated.gstin ?? ''
      }
    });
  } catch (error) {
    console.error('Error in PATCH /api/contractor/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
