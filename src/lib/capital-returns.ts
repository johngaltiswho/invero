import { calculateCapitalAccrualMetrics } from '@/lib/capital-accrual';
import { formatCurrency } from '@/lib/email';
import { generateRepaymentFeeInvoice } from '@/lib/invoice-service';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const db = supabase as any;

type ReturnDeploymentRow = {
  investor_id?: string | null;
  amount?: number | string | null;
  project_id?: string | null;
  contractor_id?: string | null;
  created_at?: string | null;
};

type ExistingReturnRow = {
  purchase_request_id?: string | null;
  transaction_type?: string | null;
  amount?: number | string | null;
  created_at?: string | null;
};

type PurchaseRequestContext = {
  purchaseRequest: { id: string; status: string; contractor_id: string; project_id?: string | null };
  deployments: ReturnDeploymentRow[];
  existingReturns: ExistingReturnRow[];
  contractorTerms: {
    platform_fee_rate?: number | null;
    platform_fee_cap?: number | null;
    participation_fee_rate_daily?: number | null;
  } | null;
  metricsBeforeReturn: ReturnType<typeof calculateCapitalAccrualMetrics>;
};

type RecordCapitalReturnInput = {
  purchaseRequestId: string;
  amount: number;
  description: string;
  referenceNumber?: string | null;
  transactionTimestamp: Date;
  adminUserId: string;
};

type InsertedReturnTransaction = {
  id: string;
  amount: number | string;
  reference_number?: string | null;
  project_id?: string | null;
  contractor_id?: string | null;
  purchase_request_id?: string | null;
};

async function getPurchaseRequestReturnContext(purchaseRequestId: string): Promise<PurchaseRequestContext> {
  const { data: deployments, error: deploymentsError } = await db
    .from('capital_transactions')
    .select('investor_id, amount, project_id, contractor_id, created_at')
    .eq('transaction_type', 'deployment')
    .eq('status', 'completed')
    .eq('purchase_request_id', purchaseRequestId);

  if (deploymentsError) {
    throw new Error('Unable to allocate return across investors');
  }

  if (!deployments || deployments.length === 0) {
    throw new Error('No completed deployments found for this purchase request');
  }

  const { data: purchaseRequest, error: purchaseRequestError } = await db
    .from('purchase_requests')
    .select('id, status, contractor_id, project_id')
    .eq('id', purchaseRequestId)
    .single();

  if (purchaseRequestError || !purchaseRequest) {
    throw new Error('Purchase request not found for return allocation');
  }

  const { data: contractorTerms } = await db
    .from('contractors')
    .select('platform_fee_rate, platform_fee_cap, participation_fee_rate_daily')
    .eq('id', purchaseRequest.contractor_id)
    .single();

  const { data: existingReturns } = await db
    .from('capital_transactions')
    .select('purchase_request_id, transaction_type, amount, created_at')
    .eq('transaction_type', 'return')
    .eq('status', 'completed')
    .eq('purchase_request_id', purchaseRequestId);

  const metricsBeforeReturn = calculateCapitalAccrualMetrics({
    transactions: [
      ...(deployments || []).map((row: ReturnDeploymentRow) => ({
        purchase_request_id: purchaseRequestId,
        transaction_type: 'deployment',
        amount: row.amount,
        created_at: row.created_at,
      })),
      ...((existingReturns || []).map((row: ExistingReturnRow) => ({
        purchase_request_id: purchaseRequestId,
        transaction_type: 'return',
        amount: row.amount,
        created_at: row.created_at,
      }))),
    ],
    terms: contractorTerms || undefined,
  });

  return {
    purchaseRequest,
    deployments: (deployments || []) as ReturnDeploymentRow[],
    existingReturns: (existingReturns || []) as ExistingReturnRow[],
    contractorTerms,
    metricsBeforeReturn,
  };
}

export async function getPurchaseRequestRepaymentSnapshot(purchaseRequestId: string) {
  const context = await getPurchaseRequestReturnContext(purchaseRequestId);
  const { purchaseRequest, metricsBeforeReturn } = context;

  const { data: requestMeta } = await db
    .from('purchase_requests')
    .select('id, contractor_id, project_id')
    .eq('id', purchaseRequestId)
    .single();

  let contractorMeta: { company_name?: string | null } | null = null;
  let projectMeta: { project_name?: string | null } | null = null;

  if (requestMeta?.contractor_id) {
    const { data } = await db
      .from('contractors')
      .select('company_name')
      .eq('id', requestMeta.contractor_id)
      .maybeSingle();
    contractorMeta = data || null;
  }

  if (requestMeta?.project_id) {
    const { data } = await db
      .from('projects')
      .select('project_name')
      .eq('id', requestMeta.project_id)
      .maybeSingle();
    projectMeta = data || null;
  }

  return {
    purchaseRequest,
    requestMeta: requestMeta
      ? {
          ...requestMeta,
          contractors: contractorMeta,
          project: projectMeta,
        }
      : null,
    metrics: metricsBeforeReturn,
  };
}

export async function recordCapitalReturn(input: RecordCapitalReturnInput) {
  const { purchaseRequestId, amount, description, referenceNumber, transactionTimestamp, adminUserId } = input;
  const context = await getPurchaseRequestReturnContext(purchaseRequestId);
  const { deployments, existingReturns, purchaseRequest, contractorTerms, metricsBeforeReturn } = context;

  if (metricsBeforeReturn.remainingDue <= 1e-2) {
    throw new Error('This purchase request has already been fully returned');
  }

  if (amount - metricsBeforeReturn.remainingDue > 1e-2) {
    throw new Error(`Only ${formatCurrency(metricsBeforeReturn.remainingDue)} remains due for this purchase request`);
  }

  const transactionsToInsert = [
    {
      transaction_type: 'return' as const,
      amount: Number(amount.toFixed(2)),
      description: description.trim(),
      admin_user_id: adminUserId,
      status: 'completed',
      created_at: transactionTimestamp.toISOString(),
      updated_at: transactionTimestamp.toISOString(),
      project_id: purchaseRequest.project_id || null,
      contractor_id: purchaseRequest.contractor_id,
      purchase_request_id: purchaseRequestId,
      reference_number: referenceNumber || null,
    },
  ];

  const { data: insertedReturns, error: insertReturnsError } = await db
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
    throw new Error('Failed to record capital returns');
  }

  const metricsAfterReturn = calculateCapitalAccrualMetrics({
    transactions: [
      ...deployments.map((row) => ({
        purchase_request_id: purchaseRequestId,
        transaction_type: 'deployment',
        amount: row.amount,
        created_at: row.created_at,
      })),
      ...existingReturns.map((row) => ({
        purchase_request_id: purchaseRequestId,
        transaction_type: 'return',
        amount: row.amount,
        created_at: row.created_at,
      })),
      {
        purchase_request_id: purchaseRequestId,
        transaction_type: 'return',
        amount,
        created_at: transactionTimestamp.toISOString(),
      },
    ],
    terms: contractorTerms || undefined,
  });

  if (metricsAfterReturn.remainingDue <= 1e-2 && purchaseRequest.status !== 'completed') {
    const { error: closeError } = await db
      .from('purchase_requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', purchaseRequestId);

    if (closeError) {
      console.error('Failed to close purchase request after return:', closeError);
    }
  }

  const feeAmountApplied = Math.min(
    Number(amount) || 0,
    Number(metricsBeforeReturn.outstandingParticipationFee || 0)
  );

  const feeInvoice =
    insertedReturns && insertedReturns[0] && feeAmountApplied > 0.01
      ? await generateRepaymentFeeInvoice({
          purchaseRequestId,
          capitalTransactionId: String(insertedReturns[0].id),
          feeAmount: feeAmountApplied,
          invoiceDate: transactionTimestamp,
        })
      : null;

  return {
    transactions: (insertedReturns || []) as InsertedReturnTransaction[],
    metricsBeforeReturn,
    metricsAfterReturn,
    feeInvoice,
  };
}
