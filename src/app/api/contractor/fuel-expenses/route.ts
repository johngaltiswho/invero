import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { submitExpenseSchema } from '@/lib/validations/fuel';

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
 * POST /api/contractor/fuel-expenses
 * Submit a fuel expense (upload bill photo)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Parse FormData
    const formData = await request.formData();
    const vehicleId = formData.get('vehicle_id') as string;
    const billImage = formData.get('bill_image') as File;

    // Validate vehicle_id
    const validationResult = submitExpenseSchema.safeParse({ vehicle_id: vehicleId });
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    // Validate bill_image file
    if (!billImage || !(billImage instanceof File)) {
      return NextResponse.json(
        { error: 'Bill image is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (billImage.size > maxSize) {
      return NextResponse.json(
        { error: 'Bill image must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExtension = billImage.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    const isValidType =
      allowedTypes.includes(billImage.type) ||
      allowedExtensions.includes(fileExtension || '');

    if (!isValidType) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: JPG, PNG, WEBP images. Received: ${billImage.type}`,
        },
        { status: 400 }
      );
    }

    // Verify vehicle belongs to contractor
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, vehicle_number, is_active')
      .eq('id', vehicleId)
      .eq('contractor_id', contractor.id)
      .eq('is_active', true)
      .maybeSingle();

    if (vehicleError) {
      console.error('Error fetching vehicle:', vehicleError);
      return NextResponse.json(
        { error: 'Failed to verify vehicle' },
        { status: 500 }
      );
    }

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Create expense record first to get ID for filename
    const { data: newExpense, error: expenseError } = await supabaseAdmin
      .from('fuel_expenses')
      .insert({
        contractor_id: contractor.id,
        vehicle_id: vehicleId,
        bill_image_url: 'pending', // Temporary, will update after upload
        status: 'submitted',
      })
      .select('id')
      .single();

    if (expenseError || !newExpense) {
      console.error('Failed to create expense record:', expenseError);
      return NextResponse.json(
        { error: 'Failed to submit fuel expense' },
        { status: 500 }
      );
    }

    // Upload bill image to Supabase Storage
    const fileName = `fuel-bills/${contractor.id}/${newExpense.id}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('contractor-documents')
      .upload(fileName, billImage, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Bill image upload error:', uploadError);

      // Clean up expense record if upload fails
      await supabaseAdmin
        .from('fuel_expenses')
        .delete()
        .eq('id', newExpense.id);

      return NextResponse.json(
        { error: 'Failed to upload bill image' },
        { status: 500 }
      );
    }

    // Update expense record with actual file URL
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('fuel_expenses')
      .update({ bill_image_url: fileName })
      .eq('id', newExpense.id)
      .select('*')
      .single();

    if (updateError || !updatedExpense) {
      console.error('Failed to update expense with bill URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to finalize fuel expense submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedExpense.id,
        vehicle_id: updatedExpense.vehicle_id,
        bill_image_url: updatedExpense.bill_image_url,
        status: updatedExpense.status,
        submitted_at: updatedExpense.submitted_at,
      },
      message: 'Fuel expense submitted successfully. OCR processing will begin shortly.',
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/fuel-expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/contractor/fuel-expenses
 * List all fuel expenses for the authenticated contractor
 */
export async function GET() {
  try {
    // Authenticate contractor
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const contractor = resolved.contractor;

    // Fetch all expenses with vehicle details
    const { data: expenses, error: fetchError } = await supabaseAdmin
      .from('fuel_expenses')
      .select(`
        *,
        vehicle:vehicles(id, vehicle_number, vehicle_type)
      `)
      .eq('contractor_id', contractor.id)
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('Failed to fetch fuel expenses:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load fuel expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expenses || [],
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/fuel-expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
