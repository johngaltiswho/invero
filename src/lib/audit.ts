/**
 * Enterprise Audit Trail System
 * Logs all critical user actions for compliance and debugging
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'generate'
  | 'submit'
  | 'dispatch'
  | 'deliver'
  | 'view'
  | 'export'
  | 'upload'
  | 'issue'
  | 'send'
  | 'execute'
  | 'void';

export type EntityType =
  | 'purchase_request'
  | 'purchase_request_item'
  | 'invoice'
  | 'vendor'
  | 'contractor'
  | 'investor'
  | 'capital_submission'
  | 'project'
  | 'material'
  | 'delivery'
  | 'purchase_order'
  | 'investor_agreement'
  | 'agreement_delivery'
  | 'contractor_agreement'
  | 'contractor_agreement_delivery'
  | 'contractor_underwriting_profile';

export interface AuditLogEntry {
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Create audit log entry in database
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        user_email: entry.userEmail,
        user_name: entry.userName,
        user_role: entry.userRole,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_values: entry.oldValues || null,
        new_values: entry.newValues || null,
        description: entry.description,
        metadata: entry.metadata || null,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        request_id: entry.requestId,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Audit] Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    } else {
      console.log(`[Audit] ${entry.action} ${entry.entityType} ${entry.entityId} by ${entry.userEmail}`);
    }
  } catch (error) {
    console.error('[Audit] Error creating audit log:', error);
    // Fail silently - audit logging is important but shouldn't break operations
  }
}

/**
 * Extract request context from NextRequest
 */
export function getRequestContext(request?: NextRequest): Pick<AuditLogEntry, 'ipAddress' | 'userAgent' | 'requestId'> {
  if (!request) return {};

  return {
    ipAddress: request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId: request.headers.get('x-request-id') || crypto.randomUUID()
  };
}

/**
 * Helper function for purchase request audit logs
 */
export async function auditPurchaseRequest(params: {
  action: AuditAction;
  purchaseRequestId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  oldStatus?: string;
  newStatus?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  description?: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}): Promise<void> {
  const requestContext = getRequestContext(params.request);

  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    entityType: 'purchase_request',
    entityId: params.purchaseRequestId,
    oldValues: params.oldValues || (params.oldStatus ? { status: params.oldStatus } : undefined),
    newValues: params.newValues || (params.newStatus ? { status: params.newStatus } : undefined),
    description: params.description || `${params.action} purchase request`,
    metadata: params.metadata,
    ...requestContext
  });
}

/**
 * Helper function for invoice audit logs
 */
export async function auditInvoice(params: {
  action: AuditAction;
  invoiceId: string;
  invoiceNumber?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  description?: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}): Promise<void> {
  const requestContext = getRequestContext(params.request);

  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    entityType: 'invoice',
    entityId: params.invoiceId,
    description: params.description || `${params.action} invoice`,
    metadata: {
      ...params.metadata,
      invoice_number: params.invoiceNumber
    },
    ...requestContext
  });
}

/**
 * Helper function for capital submission audit logs
 */
export async function auditCapitalSubmission(params: {
  action: AuditAction;
  submissionId: string;
  investorId: string;
  amount: number;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  oldStatus?: string;
  newStatus?: string;
  description?: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}): Promise<void> {
  const requestContext = getRequestContext(params.request);

  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    entityType: 'capital_submission',
    entityId: params.submissionId,
    oldValues: params.oldStatus ? { status: params.oldStatus } : undefined,
    newValues: params.newStatus ? { status: params.newStatus } : undefined,
    description: params.description || `${params.action} capital submission`,
    metadata: {
      ...params.metadata,
      amount: params.amount,
      investor_id: params.investorId
    },
    ...requestContext
  });
}

/**
 * Helper function for vendor assignment audit logs
 */
export async function auditVendorAssignment(params: {
  purchaseRequestId: string;
  vendorId: string;
  vendorName?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  oldVendorId?: string;
  request?: NextRequest;
}): Promise<void> {
  const requestContext = getRequestContext(params.request);

  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    userRole: params.userRole,
    action: 'assign',
    entityType: 'purchase_request',
    entityId: params.purchaseRequestId,
    oldValues: params.oldVendorId ? { vendor_id: params.oldVendorId } : undefined,
    newValues: { vendor_id: params.vendorId },
    description: `Assigned vendor ${params.vendorName || params.vendorId} to purchase request`,
    metadata: {
      vendor_id: params.vendorId,
      vendor_name: params.vendorName
    },
    ...requestContext
  });
}

/**
 * Helper function for delivery status audit logs
 */
export async function auditDeliveryStatus(params: {
  purchaseRequestId: string;
  oldStatus: string;
  newStatus: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  disputeReason?: string;
  request?: NextRequest;
}): Promise<void> {
  const requestContext = getRequestContext(params.request);

  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    userRole: params.userRole,
    action: 'update',
    entityType: 'delivery',
    entityId: params.purchaseRequestId,
    oldValues: { delivery_status: params.oldStatus },
    newValues: { delivery_status: params.newStatus },
    description: `Updated delivery status from ${params.oldStatus} to ${params.newStatus}`,
    metadata: {
      dispute_reason: params.disputeReason
    },
    ...requestContext
  });
}

/**
 * Get audit trail for specific entity
 */
export async function getAuditTrail(
  entityType: EntityType,
  entityId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_entity_audit_trail', {
        p_entity_type: entityType,
        p_entity_id: entityId
      });

    if (error) {
      console.error('[Audit] Failed to fetch audit trail:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Audit] Error fetching audit trail:', error);
    return [];
  }
}
