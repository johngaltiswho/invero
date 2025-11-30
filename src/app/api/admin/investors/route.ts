import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

async function inviteInvestorToClerk(email: string, name: string) {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
  if (!clerkSecretKey) {
    console.warn('[Investors] Missing CLERK_SECRET_KEY, skipping Clerk invite');
    return;
  }

  try {
    const response = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clerkSecretKey}`
      },
      body: JSON.stringify({
        email_address: email,
        public_metadata: {
          role: 'investor',
          name
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isDuplicateInvite = (() => {
        if (response.status === 409) return true;
        if (response.status !== 400) return false;
        try {
          const parsed = JSON.parse(errorText);
          return Array.isArray(parsed.errors) && parsed.errors.some((err: { code?: string }) => err?.code === 'duplicate_record');
        } catch (parseError) {
          return false;
        }
      })();

      if (!isDuplicateInvite) {
        console.error('[Investors] Failed to invite investor via Clerk:', response.status, errorText);
      }
    }
  } catch (error) {
    console.error('[Investors] Error inviting investor via Clerk:', error);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('investors')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching investors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch investors' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      investors: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();
    const adminUser = await getAdminUser();

    const body = await request.json();
    const { email, name, investor_type, phone, notes } = body;

    // Validate required fields
    if (!email || !name || !investor_type) {
      return NextResponse.json(
        { error: 'Email, name, and investor type are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate investor type
    const validTypes = ['Individual', 'HNI', 'Family Office', 'Institutional'];
    if (!validTypes.includes(investor_type)) {
      return NextResponse.json(
        { error: 'Invalid investor type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('investors')
      .insert([
        {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          investor_type,
          phone: phone?.trim(),
          notes: notes?.trim(),
          status: 'active',
          created_by: adminUser?.id
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'An investor with this email already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating investor:', error);
      return NextResponse.json(
        { error: 'Failed to create investor' },
        { status: 500 }
      );
    }

    inviteInvestorToClerk(data.email, data.name);

    return NextResponse.json({
      message: 'Investor created successfully',
      investor: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/admin/investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
