import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, formatCurrency } from '@/lib/email';

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

    if (!transaction_type || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: transaction_type, amount, description' },
        { status: 400 }
      );
    }

    if (transaction_type !== 'return' && !investor_id) {
      return NextResponse.json(
        { error: 'investor_id is required for this transaction type' },
        { status: 400 }
      );
    }

    const referenceNumberTrimmed = typeof reference_number === 'string' && reference_number.trim().length > 0
      ? reference_number.trim()
      : null;

    // Ensure investor account exists (for legacy investors without auto-created accounts)
    if (transaction_type !== 'return' && investor_id) {
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
    if ((transaction_type === 'deployment' || transaction_type === 'withdrawal') && investor_id) {
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

    const normalizedPurchaseRequestId = purchase_request_id?.trim() || '';

    if (transaction_type === 'return') {
      if (!normalizedPurchaseRequestId) {
        return NextResponse.json(
          { error: 'purchase_request_id is required for capital returns' },
          { status: 400 }
        );
      }

      const { data: deployments, error: deploymentsError } = await supabase
        .from('capital_transactions')
        .select('investor_id, amount, project_id, contractor_id, created_at')
        .eq('transaction_type', 'deployment')
        .eq('status', 'completed')
        .eq('purchase_request_id', normalizedPurchaseRequestId);

      if (deploymentsError) {
        console.error('Failed to fetch deployments for return allocation:', deploymentsError);
        return NextResponse.json(
          { error: 'Unable to allocate return across investors' },
          { status: 500 }
        );
      }

      if (!deployments || deployments.length === 0) {
        return NextResponse.json(
          { error: 'No completed deployments found for this purchase request' },
          { status: 400 }
        );
      }

      const aggregatedDeployments = deployments.reduce<Map<string, { amount: number; project_id?: string | null; contractor_id?: string | null }>>((map, deployment) => {
        if (!deployment.investor_id) {
          return map;
        }
        const existing = map.get(deployment.investor_id) || { amount: 0, project_id: deployment.project_id, contractor_id: deployment.contractor_id };
        existing.amount += Number(deployment.amount) || 0;
        if (!existing.project_id && deployment.project_id) {
          existing.project_id = deployment.project_id;
        }
        if (!existing.contractor_id && deployment.contractor_id) {
          existing.contractor_id = deployment.contractor_id;
        }
        map.set(deployment.investor_id, existing);
        return map;
      }, new Map());

      const aggregatedEntries = Array.from(aggregatedDeployments.entries());

      const totalDeployed = aggregatedEntries.reduce(
        (sum, [, deployment]) => sum + deployment.amount,
        0
      );

      if (totalDeployed <= 0) {
        return NextResponse.json(
          { error: 'Cannot allocate returns because deployment totals are zero' },
          { status: 400 }
        );
      }

      if (aggregatedEntries.length === 0) {
        return NextResponse.json(
          { error: 'Unable to determine investors for this purchase request' },
          { status: 400 }
        );
      }

      await Promise.all(
        aggregatedEntries.map(([investorId]) =>
          supabase
            .from('investor_accounts')
            .upsert({ investor_id: investorId }, { onConflict: 'investor_id' })
        )
      );

      let amountAllocated = 0;
      const transactionsToInsert = aggregatedEntries.map(([investorId, deployment], index) => {
        const rawShare = totalDeployed === 0 ? 0 : deployment.amount / totalDeployed;
        let shareAmount = Number((numAmount * rawShare).toFixed(2));
        if (index === aggregatedEntries.length - 1) {
          shareAmount = Number((numAmount - amountAllocated).toFixed(2));
        }
        amountAllocated += shareAmount;

        return {
          investor_id: investorId,
          transaction_type: 'return' as const,
          amount: shareAmount,
          description: description.trim(),
          admin_user_id: adminUser?.id || 'unknown',
          status: 'completed',
          project_id: deployment.project_id,
          contractor_id: deployment.contractor_id,
          purchase_request_id: normalizedPurchaseRequestId,
          reference_number: referenceNumberTrimmed
        };
      }).filter((transaction) => transaction.amount > 0);

      if (transactionsToInsert.length === 0) {
        return NextResponse.json(
          { error: 'Unable to allocate capital return with the provided amount' },
          { status: 400 }
        );
      }

      const { data: purchaseRequest, error: purchaseRequestError } = await supabase
        .from('purchase_requests')
        .select('id, status, contractor_id')
        .eq('id', normalizedPurchaseRequestId)
        .single();

      if (purchaseRequestError || !purchaseRequest) {
        console.error('Failed to load purchase request for return:', purchaseRequestError);
        return NextResponse.json(
          { error: 'Purchase request not found for return allocation' },
          { status: 404 }
        );
      }

      const { data: contractorTerms, error: contractorTermsError } = await supabase
        .from('contractors')
        .select('platform_fee_rate, platform_fee_cap, participation_fee_rate_daily')
        .eq('id', purchaseRequest.contractor_id)
        .single();

      if (contractorTermsError) {
        console.error('Failed to load contractor terms for return allocation:', contractorTermsError);
      }

      const platformFeeRate = contractorTerms?.platform_fee_rate ?? 0.0025;
      const platformFeeCap = contractorTerms?.platform_fee_cap ?? 25000;
      const lateFeeRate = contractorTerms?.participation_fee_rate_daily ?? 0.001;

      const firstDeploymentAt = deployments
        ?.filter((deployment) => deployment.created_at)
        .map((deployment) => new Date(deployment.created_at as string).getTime())
        .sort((a, b) => a - b)[0];

      const daysOutstanding = firstDeploymentAt
        ? Math.max(0, Math.floor((Date.now() - firstDeploymentAt) / (1000 * 60 * 60 * 24)))
        : 0;

      const platformFee = Math.min(totalDeployed * platformFeeRate, platformFeeCap);
      const lateFees = totalDeployed * lateFeeRate * daysOutstanding;
      const totalDue = totalDeployed + platformFee + lateFees;
      const investorDue = totalDeployed + lateFees;

      const { data: existingReturns, error: existingReturnsError } = await supabase
        .from('capital_transactions')
        .select('amount')
        .eq('transaction_type', 'return')
        .eq('status', 'completed')
        .eq('purchase_request_id', normalizedPurchaseRequestId);

      if (existingReturnsError) {
        console.error('Failed to load existing returns for purchase request:', existingReturnsError);
      }

      const existingReturnTotal = (existingReturns || []).reduce(
        (sum, row) => sum + (Number(row.amount) || 0),
        0
      );

      const { data: insertedReturns, error: insertReturnsError } = await supabase
        .from('capital_transactions')
        .insert(transactionsToInsert)
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
        `);

      if (insertReturnsError) {
        console.error('Failed to record distributed capital returns:', insertReturnsError);
        return NextResponse.json(
          { error: 'Failed to record capital returns' },
          { status: 500 }
        );
      }

      await Promise.all(
        (insertedReturns || []).map(async (returnTxn: any) => {
          const investorEmail = returnTxn?.investor?.email;
          if (!investorEmail) return;
          const investorName = returnTxn?.investor?.name || 'Investor';
          const projectName = returnTxn?.project?.project_name || returnTxn.project_id || 'Project';
          await sendEmail({
            to: investorEmail,
            subject: `Capital return processed · ${projectName}`,
            text: `Hi ${investorName},\n\nWe have processed a capital return of ${formatCurrency(Number(returnTxn.amount) || 0)} for ${projectName}.\nReference: ${returnTxn.reference_number || '—'}`,
            html: `
              <p>Hi ${investorName},</p>
              <p>We have processed a capital return of <strong>${formatCurrency(Number(returnTxn.amount) || 0)}</strong> for <strong>${projectName}</strong>.</p>
              <p>Reference: ${returnTxn.reference_number || '—'}</p>
            `
          });
        })
      );

      const newReturnTotal = existingReturnTotal + numAmount;
      if (investorDue > 0 && newReturnTotal >= investorDue && purchaseRequest.status !== 'completed') {
        const { error: closeError } = await supabase
          .from('purchase_requests')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', normalizedPurchaseRequestId);

        if (closeError) {
          console.error('Failed to close purchase request after return:', closeError);
        }
      }

      return NextResponse.json({
        message: 'Capital return recorded and distributed successfully',
        transactions: insertedReturns
      }, { status: 201 });
    }
    let linkedPurchaseRequestId: string | null = null;
    let purchaseRequestTotal = 0;
    let existingFundedAmount = 0;
    let shouldMarkRequestFunded = false;
    let purchaseRequestApprovedAt: string | null = null;

    if (transaction_type === 'deployment' && normalizedPurchaseRequestId) {
      const { data: purchaseRequest, error: purchaseRequestError } = await supabase
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
        const qty = Number(item.requested_qty) || 0;
        const rate = Number(item.unit_rate) || 0;
        const taxPercent = Number(item.tax_percent) || 0;
        const base = qty * rate;
        const tax = base * (taxPercent / 100);
        return sum + base + tax;
      }, 0);

      if (purchaseRequestTotal > 0) {
        const { data: fundingRows, error: existingFundingError } = await supabase
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

    if (referenceNumberTrimmed) {
      transactionData.reference_number = referenceNumberTrimmed;
    }

    if (normalizedPurchaseRequestId) {
      transactionData.purchase_request_id = normalizedPurchaseRequestId;
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

    const investorEmail = data?.investor?.email;
    const investorName = data?.investor?.name || 'Investor';
    const projectName = data?.project?.project_name || data?.project_name || 'Project';

    if (investorEmail) {
      const subjectMap: Record<string, string> = {
        inflow: `Capital received · ${projectName}`,
        deployment: `Capital deployed · ${projectName}`,
        return: `Capital return processed · ${projectName}`,
        withdrawal: `Capital withdrawal processed · ${projectName}`
      };
      const subject = subjectMap[transaction_type] || `Capital update · ${projectName}`;
      await sendEmail({
        to: investorEmail,
        subject,
        text: `Hi ${investorName},\n\n${description.trim()}\nAmount: ${formatCurrency(numAmount)}\nProject: ${projectName}`,
        html: `
          <p>Hi ${investorName},</p>
          <p>${description.trim()}</p>
          <p><strong>Amount:</strong> ${formatCurrency(numAmount)}<br/>
          <strong>Project:</strong> ${projectName}</p>
        `
      });
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
        purchase_request_id: normalizedPurchaseRequestId || null
      };

      await supabase
        .from('project_deployments')
        .insert([deploymentData]);
    }

    if (linkedPurchaseRequestId && shouldMarkRequestFunded) {
      const now = new Date().toISOString();
      const { error: purchaseRequestUpdateError } = await supabase
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
        const { error: purchaseRequestItemsUpdateError } = await supabase
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
      const { data: contractor } = await supabase
        .from('contractors')
        .select('email, contact_person, company_name')
        .eq('id', contractor_id.trim())
        .single();

      if (contractor?.email) {
        await sendEmail({
          to: contractor.email,
          subject: `Funds deployed · ${projectName}`,
          text: `Hi ${contractor.contact_person || contractor.company_name || 'there'},\n\nFunds have been deployed for ${projectName}.\nAmount: ${formatCurrency(numAmount)}\n${linkedPurchaseRequestId ? `PR ID: ${linkedPurchaseRequestId}` : ''}`,
          html: `
            <p>Hi ${contractor.contact_person || contractor.company_name || 'there'},</p>
            <p>Funds have been deployed for <strong>${projectName}</strong>.</p>
            <p><strong>Amount:</strong> ${formatCurrency(numAmount)}${linkedPurchaseRequestId ? `<br/><strong>PR ID:</strong> ${linkedPurchaseRequestId}` : ''}</p>
          `
        });
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
