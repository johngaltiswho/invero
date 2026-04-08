import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';
import { calculateSoftPoolValuation } from '@/lib/pool-valuation';
import { applyLenderCapitalAllocations, normalizeLenderCapitalAllocations } from '@/lib/lender-sleeves';
import { selectDirectInflowAllocationIntent } from '@/lib/direct-inflow-allocation';
import { recordCapitalReturn } from '@/lib/capital-returns';
import {
  calculateTrancheAllocations,
  getAllocationIntentFundingSnapshot,
  getLenderAllocationIntentById,
  listLenderAllocationIntentsForInvestor,
  syncAllocationIntentFundingStatus,
  type LenderAllocationIntent,
} from '@/lib/lender-allocation-intents';
import {
  capitalUpdateInvestorEmail,
  contractorFundsDeployedEmail,
} from '@/lib/notifications/email-templates';
import { supabaseAdmin as supabase } from '@/lib/supabase';
const db = supabase as any;

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

    let query = db
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
    const transactions = ((data || []) as any[]).map(transaction => ({
      ...transaction,
      project_name: transaction.project?.project_name
    }));

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
      allocation_intent_id,
      transaction_type, 
      transaction_date,
      amount, 
      project_id, 
      contractor_id,
      contractor_name,
      project_name,
      purchase_request_id,
      description, 
      reference_number 
    } = body;

    if (!transaction_type || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: transaction_type, amount, description' },
        { status: 400 }
      );
    }

    const normalizedInvestorId = typeof investor_id === 'string' && investor_id.trim().length > 0
      ? investor_id.trim()
      : null;
    const requiresInvestorId = transaction_type === 'inflow' || transaction_type === 'withdrawal';

    if (requiresInvestorId && !normalizedInvestorId) {
      return NextResponse.json(
        { error: 'investor_id is required for this transaction type' },
        { status: 400 }
      );
    }

    const referenceNumberTrimmed = typeof reference_number === 'string' && reference_number.trim().length > 0
      ? reference_number.trim()
      : null;

    // Ensure investor account exists (for legacy investors without auto-created accounts)
    if (requiresInvestorId && normalizedInvestorId) {
      const { error: ensureAccountError } = await db
        .from('investor_accounts')
        .upsert({ investor_id: normalizedInvestorId }, { onConflict: 'investor_id' });

      if (ensureAccountError) {
        console.error('Failed to ensure investor account exists:', ensureAccountError);
        return NextResponse.json(
          { error: 'Unable to prepare investor account for transaction' },
          { status: 500 }
        );
      }
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

    const selectedDate = typeof transaction_date === 'string' ? transaction_date.trim() : '';
    if (!selectedDate) {
      return NextResponse.json(
        { error: 'transaction_date is required' },
        { status: 400 }
      );
    }

    const transactionTimestamp = new Date(`${selectedDate}T00:00:00.000Z`);
    if (Number.isNaN(transactionTimestamp.getTime())) {
      return NextResponse.json(
        { error: 'Invalid transaction_date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // For deployment and withdrawal, check if investor has sufficient balance
    if ((transaction_type === 'deployment' || transaction_type === 'withdrawal') && normalizedInvestorId) {
      const { data: account, error: accountError } = await db
        .from('investor_accounts')
        .select('available_balance')
        .eq('investor_id', normalizedInvestorId)
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

    const normalizedPurchaseRequestId = purchase_request_id?.trim() || '';

    if (transaction_type === 'return') {
      if (!normalizedPurchaseRequestId) {
        return NextResponse.json(
          { error: 'purchase_request_id is required for capital returns' },
          { status: 400 }
        );
      }
      try {
        const result = await recordCapitalReturn({
          purchaseRequestId: normalizedPurchaseRequestId,
          amount: numAmount,
          description,
          referenceNumber: referenceNumberTrimmed,
          transactionTimestamp,
          adminUserId: adminUser?.id || 'unknown',
        });

        return NextResponse.json({
          message: 'Capital return recorded and distributed successfully',
          transactions: result.transactions,
        }, { status: 201 });
      } catch (returnError) {
        return NextResponse.json(
          { error: returnError instanceof Error ? returnError.message : 'Failed to record capital return' },
          { status: 400 }
        );
      }
    }
    let linkedPurchaseRequestId: string | null = null;
    let purchaseRequestTotal = 0;
    let existingFundedAmount = 0;
    let shouldMarkRequestFunded = false;
    let purchaseRequestApprovedAt: string | null = null;
    let linkedAllocationIntent: LenderAllocationIntent | null = null;
    let normalizedInflowAllocations: ReturnType<typeof normalizeLenderCapitalAllocations> | null = null;

    if (transaction_type === 'inflow' && normalizedInvestorId) {
      const explicitAllocationIntentId = typeof allocation_intent_id === 'string' && allocation_intent_id.trim().length > 0
        ? allocation_intent_id.trim()
        : null;

      if (explicitAllocationIntentId) {
        linkedAllocationIntent = await getLenderAllocationIntentById(explicitAllocationIntentId);
        if (!linkedAllocationIntent || linkedAllocationIntent.investor_id !== normalizedInvestorId) {
          return NextResponse.json(
            { error: 'Linked allocation intent not found for this investor' },
            { status: 400 }
          );
        }
      } else {
        const intentCandidates = await listLenderAllocationIntentsForInvestor(normalizedInvestorId);
        const candidatesWithRemaining = await Promise.all(
          intentCandidates.map(async (intent) => {
            const snapshot = await getAllocationIntentFundingSnapshot(intent.id, Number(intent.total_amount || 0));
            return {
              id: intent.id,
              status: intent.status,
              created_at: intent.created_at,
              remainingAmount: snapshot.remainingAmount,
            };
          })
        );
        const selectedIntent = selectDirectInflowAllocationIntent(candidatesWithRemaining);
        linkedAllocationIntent = selectedIntent
          ? (intentCandidates.find((intent) => intent.id === selectedIntent.id) || null)
          : null;
      }

      if (linkedAllocationIntent) {
        const linkedAllocationSnapshot = await getAllocationIntentFundingSnapshot(
          linkedAllocationIntent.id,
          Number(linkedAllocationIntent.total_amount || 0)
        );

        if (linkedAllocationSnapshot.remainingAmount <= 0.009) {
          return NextResponse.json(
            { error: 'This allocation has already been fully funded' },
            { status: 400 }
          );
        }

        if (numAmount - linkedAllocationSnapshot.remainingAmount > 0.01) {
          return NextResponse.json(
            {
              error: `Direct inflow exceeds the remaining approved amount of ${linkedAllocationSnapshot.remainingAmount.toFixed(2)}`
            },
            { status: 400 }
          );
        }

        normalizedInflowAllocations = calculateTrancheAllocations({
          totalIntentAmount: Number(linkedAllocationIntent.total_amount || 0),
          trancheAmount: numAmount,
          targetAllocations: Array.isArray(linkedAllocationIntent.allocation_payload)
            ? linkedAllocationIntent.allocation_payload
            : [],
          alreadyAllocatedByModel: linkedAllocationSnapshot.allocatedByModel,
        });
      }
    }

    if (transaction_type === 'deployment' && normalizedPurchaseRequestId) {
      let purchaseRequest: any = null;
      let purchaseRequestError: { message?: string } | null = null;

      const purchaseRequestWithPurchaseQty = await db
        .from('purchase_requests')
        .select(`
          id,
          status,
          approved_at,
          purchase_request_items (
            requested_qty,
            purchase_qty,
            unit_rate,
            tax_percent
          )
        `)
        .eq('id', normalizedPurchaseRequestId)
        .single();
      purchaseRequest = purchaseRequestWithPurchaseQty.data;
      purchaseRequestError = purchaseRequestWithPurchaseQty.error;

      if (purchaseRequestError && String(purchaseRequestError.message || '').includes('purchase_qty')) {
        const fallbackPurchaseRequest = await db
          .from('purchase_requests')
          .select(`
            id,
            status,
            approved_at,
            purchase_request_items (
              requested_qty,
              unit_rate,
              tax_percent
            )
          `)
          .eq('id', normalizedPurchaseRequestId)
          .single();
        purchaseRequest = fallbackPurchaseRequest.data;
        purchaseRequestError = fallbackPurchaseRequest.error;
      }

      if (purchaseRequestError || !purchaseRequest) {
        console.error('Failed to load purchase request for deployment:', purchaseRequestError);
        return NextResponse.json(
          { error: 'Purchase request not found' },
          { status: 404 }
        );
      }

      purchaseRequestApprovedAt = purchaseRequest.approved_at ?? null;

      const currentStatus = (purchaseRequest.status || '').toLowerCase();
      if (['funded', 'po_generated', 'completed'].includes(currentStatus)) {
        return NextResponse.json(
          { error: 'This purchase request has already been fully funded' },
          { status: 400 }
        );
      }

      purchaseRequestTotal = (purchaseRequest.purchase_request_items || []).reduce((sum, item) => {
        const qty = Number((item as any).purchase_qty ?? item.requested_qty) || 0;
        const rate = Number(item.unit_rate) || 0;
        const taxPercent = Number(item.tax_percent) || 0;
        const base = qty * rate;
        const tax = base * (taxPercent / 100);
        return sum + base + tax;
      }, 0);

      if (purchaseRequestTotal > 0) {
        const { data: fundingRows, error: existingFundingError } = await db
          .from('capital_transactions')
          .select('amount')
          .eq('transaction_type', 'deployment')
          .eq('status', 'completed')
          .eq('purchase_request_id', normalizedPurchaseRequestId);

        if (existingFundingError) {
          console.error('Failed to load previous deployments for purchase request:', existingFundingError);
        } else {
          existingFundedAmount = (fundingRows || []).reduce(
            (sum, txn) => sum + (Number(txn.amount) || 0),
            0
          );
        }

        const remainingAmount = Math.max(purchaseRequestTotal - existingFundedAmount, 0);
        if (remainingAmount <= 0) {
          return NextResponse.json(
            { error: 'This purchase request has already been fully funded' },
            { status: 400 }
          );
        }

        if (numAmount - remainingAmount > 1e-2) {
          const formattedRemaining = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
          }).format(remainingAmount);

          return NextResponse.json(
            { error: `Only ${formattedRemaining} remains to fund for this purchase request` },
            { status: 400 }
          );
        }

        shouldMarkRequestFunded = existingFundedAmount + numAmount >= purchaseRequestTotal - 1e-2;
      } else {
        shouldMarkRequestFunded = true;
      }

      linkedPurchaseRequestId = purchaseRequest.id;
    }

    // Create transaction
    const transactionData: Record<string, unknown> = {
      investor_id: normalizedInvestorId,
      transaction_type,
      amount: numAmount,
      description: description.trim(),
      admin_user_id: adminUser?.id || 'unknown',
      status: 'completed',
      created_at: transactionTimestamp.toISOString(),
      updated_at: transactionTimestamp.toISOString()
    };

    if (transaction_type === 'inflow' && normalizedInflowAllocations?.length === 1) {
      transactionData.model_type = normalizedInflowAllocations[0]?.modelType || null;
    }

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

    if (referenceNumberTrimmed) {
      transactionData.reference_number = referenceNumberTrimmed;
    }

    if (normalizedPurchaseRequestId) {
      transactionData.purchase_request_id = normalizedPurchaseRequestId;
    }

    const { data, error } = await db
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

    if (transaction_type === 'inflow' && normalizedInvestorId && linkedAllocationIntent && normalizedInflowAllocations) {
      let poolNavPerUnit: number | null = null;

      if (normalizedInflowAllocations.some((allocation) => allocation.modelType === 'pool_participation')) {
        const [
          poolInflowsRes,
          poolDistributionsRes,
          poolTransactionsRes,
          poolRequestsRes,
          contractorsRes,
          projectsRes,
        ] = await Promise.all([
          db
            .from('capital_transactions')
            .select('investor_id, amount, created_at, status, transaction_type')
            .eq('transaction_type', 'inflow')
            .eq('status', 'completed'),
          db
            .from('capital_transactions')
            .select('investor_id, amount, created_at, status, transaction_type')
            .eq('transaction_type', 'return')
            .not('investor_id', 'is', null)
            .eq('status', 'completed'),
          db
            .from('capital_transactions')
            .select('purchase_request_id, amount, created_at, status, transaction_type')
            .in('transaction_type', ['deployment', 'return'])
            .not('purchase_request_id', 'is', null)
            .eq('status', 'completed'),
          db
            .from('purchase_requests')
            .select('id, project_id, contractor_id, status'),
          db
            .from('contractors')
            .select('id, company_name, participation_fee_rate_daily'),
          db
            .from('projects')
            .select('id, project_name'),
        ]);

        const poolValuation = calculateSoftPoolValuation({
          investorInflows: poolInflowsRes.data || [],
          investorDistributions: poolDistributionsRes.data || [],
          poolTransactions: poolTransactionsRes.data || [],
          purchaseRequests: poolRequestsRes.data || [],
          contractors: contractorsRes.data || [],
          projects: projectsRes.data || [],
        });

        poolNavPerUnit = Number(poolValuation.netNavPerUnit || 0) > 0
          ? Number(poolValuation.netNavPerUnit)
          : 100;
      }

      try {
        await applyLenderCapitalAllocations({
          investorId: normalizedInvestorId,
          totalAmount: numAmount,
          capitalTransactionId: data.id,
          allocations: normalizedInflowAllocations,
          poolNavPerUnit,
        });
      } catch (allocationError) {
        console.error('Failed to apply lender allocations for direct inflow:', allocationError);
        return NextResponse.json(
          { error: 'Failed to apply lender sleeve allocations for direct inflow' },
          { status: 500 }
        );
      }

      const { error: paymentSubmissionError } = await db
        .from('investor_payment_submissions')
        .insert({
          investor_id: normalizedInvestorId,
          amount: numAmount,
          payment_date: selectedDate,
          payment_method: 'admin_direct_entry',
          payment_reference: referenceNumberTrimmed,
          notes: description.trim() || null,
          allocation_intent_id: linkedAllocationIntent.id,
          allocation_payload: normalizedInflowAllocations,
          status: 'approved',
          review_notes: 'Recorded directly by admin',
          approved_at: new Date().toISOString(),
          approved_by: adminUser?.id || 'unknown',
          capital_transaction_id: data.id,
        });

      if (paymentSubmissionError) {
        console.error('Failed to create approved payment submission for direct inflow:', paymentSubmissionError);
        return NextResponse.json(
          { error: 'Failed to create funding snapshot record for direct inflow' },
          { status: 500 }
        );
      }

      await syncAllocationIntentFundingStatus(linkedAllocationIntent.id);
    }

    const investorEmail = data?.investor?.email;
    const investorName = data?.investor?.name || 'Investor';
    const projectName = data?.project?.project_name || data?.project_name || 'Project';

    if (investorEmail) {
      try {
        await sendEmail({
          to: investorEmail,
          ...capitalUpdateInvestorEmail({
            recipientName: investorName,
            projectName,
            description: description.trim(),
            amount: numAmount,
            transactionType: transaction_type,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send investor capital update email:', emailError);
      }
    }

    // If this is a deployment, create a project deployment record
    if (transaction_type === 'deployment' && project_id?.trim()) {
      const deploymentData = {
        investor_id: normalizedInvestorId,
        project_id: project_id.trim(),
        amount_deployed: numAmount,
        deployment_date: selectedDate,
        admin_deployed_by: adminUser?.id || 'unknown',
        notes: description,
        purchase_request_id: normalizedPurchaseRequestId || null
      };

      await db
        .from('project_deployments')
        .insert([deploymentData]);
    }

    if (linkedPurchaseRequestId && shouldMarkRequestFunded) {
      const now = new Date().toISOString();
      const { error: purchaseRequestUpdateError } = await db
        .from('purchase_requests')
        .update({
          status: 'funded',
          funded_at: now,
          updated_at: now,
          approved_at: purchaseRequestApprovedAt || now
        })
        .eq('id', linkedPurchaseRequestId);

      if (purchaseRequestUpdateError) {
        console.error('Failed to update purchase request status after deployment:', purchaseRequestUpdateError);
      } else {
        const { error: purchaseRequestItemsUpdateError } = await db
          .from('purchase_request_items')
          .update({
            status: 'ordered',
            updated_at: now
          })
          .eq('purchase_request_id', linkedPurchaseRequestId);

        if (purchaseRequestItemsUpdateError) {
          console.error('Failed to update purchase request items status after deployment:', purchaseRequestItemsUpdateError);
        }
      }
    }

    if (transaction_type === 'deployment' && contractor_id?.trim()) {
      const { data: contractor } = await db
        .from('contractors')
        .select('email, contact_person, company_name')
        .eq('id', contractor_id.trim())
        .single();

      if (contractor?.email) {
        try {
          await sendEmail({
            to: contractor.email,
            ...contractorFundsDeployedEmail({
              recipientName: contractor.contact_person || contractor.company_name || 'there',
              projectName,
              amount: numAmount,
              purchaseRequestId: linkedPurchaseRequestId,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send contractor deployment email:', emailError);
        }
      }
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
