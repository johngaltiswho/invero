import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const investorId = searchParams.get('investor_id') || '';
    const transactionType = searchParams.get('transaction_type') || '';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('capital_transactions')
      .select(`
        *,
        investor:investors!capital_transactions_investor_id_fkey(
          id,
          name,
          email,
          investor_type
        ),
        project:projects!capital_transactions_project_id_fkey(
          id,
          project_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (investorId) {
      query = query.eq('investor_id', investorId);
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching capital transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch capital transactions' },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const transactions = data?.map(transaction => ({
      ...transaction,
      project_name: transaction.project?.project_name
    })) || [];

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/capital/transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();

    const body = await request.json();
    const { 
      investor_id, 
      transaction_type, 
      amount, 
      project_id, 
      contractor_id,
      contractor_name,
      project_name,
      purchase_request_id,
      description, 
      reference_number 
    } = body;

    // Validate required fields
    if (!investor_id || !transaction_type || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: investor_id, transaction_type, amount, description' },
        { status: 400 }
      );
    }

    // Ensure investor account exists (for legacy investors without auto-created accounts)
    const { error: ensureAccountError } = await supabase
      .from('investor_accounts')
      .upsert({ investor_id }, { onConflict: 'investor_id' });

    if (ensureAccountError) {
      console.error('Failed to ensure investor account exists:', ensureAccountError);
      return NextResponse.json(
        { error: 'Unable to prepare investor account for transaction' },
        { status: 500 }
      );
    }

    // Validate transaction type
    const validTypes = ['inflow', 'deployment', 'return', 'withdrawal'];
    if (!validTypes.includes(transaction_type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // For deployment and withdrawal, check if investor has sufficient balance
    if (transaction_type === 'deployment' || transaction_type === 'withdrawal') {
      const { data: account, error: accountError } = await supabase
        .from('investor_accounts')
        .select('available_balance')
        .eq('investor_id', investor_id)
        .single();

      if (accountError) {
        console.error('Failed to fetch investor account for balance check:', accountError);
      }

      if (!account || account.available_balance < numAmount) {
        console.warn('Insufficient balance for investor deployment', {
          investor_id,
          transaction_type,
          requested_amount: numAmount,
          available_balance: account?.available_balance ?? null,
          has_account: !!account
        });
        return NextResponse.json(
          {
            error: 'Insufficient available balance for this transaction',
            available_balance: account?.available_balance ?? 0,
            required_amount: numAmount
          },
          { status: 400 }
        );
      }
    }

    // Create transaction
    const transactionData: Record<string, unknown> = {
      investor_id,
      transaction_type,
      amount: numAmount,
      description: description.trim(),
      admin_user_id: adminUser?.id || 'unknown',
      status: 'completed'
    };

    if (project_id?.trim()) {
      transactionData.project_id = project_id.trim();
    }

    if (contractor_id?.trim()) {
      transactionData.contractor_id = contractor_id.trim();
    }

    if (contractor_name?.trim()) {
      transactionData.contractor_name = contractor_name.trim();
    }

    if (project_name?.trim()) {
      transactionData.project_name = project_name.trim();
    }

    if (reference_number?.trim()) {
      transactionData.reference_number = reference_number.trim();
    }

    if (purchase_request_id?.trim()) {
      transactionData.purchase_request_id = purchase_request_id.trim();
    }

    const { data, error } = await supabase
      .from('capital_transactions')
      .insert([transactionData])
      .select(`
        *,
        investor:investors!capital_transactions_investor_id_fkey(
          id,
          name,
          email,
          investor_type
        ),
        project:projects!capital_transactions_project_id_fkey(
          id,
          project_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating capital transaction:', error);
      return NextResponse.json(
        { error: 'Failed to create capital transaction' },
        { status: 500 }
      );
    }

    // If this is a deployment, create a project deployment record
    if (transaction_type === 'deployment' && project_id?.trim()) {
      const deploymentData = {
        investor_id,
        project_id: project_id.trim(),
        amount_deployed: numAmount,
        deployment_date: new Date().toISOString().split('T')[0],
        admin_deployed_by: adminUser?.id || 'unknown',
        notes: description,
        purchase_request_id: purchase_request_id?.trim() || null
      };

      await supabase
        .from('project_deployments')
        .insert([deploymentData]);
    }

    return NextResponse.json({
      message: 'Capital transaction created successfully',
      transaction: {
        ...data,
        project_name: data.project?.project_name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/admin/capital/transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
