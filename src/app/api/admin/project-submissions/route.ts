import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { fetchPurchaseRequestAdditionalChargesByRequestIds } from '@/lib/purchase-request-additional-charges';
import { calculatePurchaseRequestTotals } from '@/lib/purchase-request-totals';
import { getDefaultPOReference } from '@/lib/project-po-references';
import { supabaseAdmin } from '@/lib/supabase';

const DOC_BUCKET = 'contractor-documents';
const db = supabaseAdmin as any;

type ProjectRow = {
  id: string;
  contractor_id: string | null;
  project_name: string | null;
  client_name: string | null;
  project_address: string | null;
  estimated_value: number | null;
  funding_required: number | null;
  funding_status: string | null;
  project_status: string | null;
  po_number: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ContractorRow = {
  id: string;
  company_name: string | null;
  email: string | null;
};

type ProjectPOReferenceRow = {
  id: string;
  project_id: string;
  po_number: string;
  po_date: string | null;
  po_value: number | null;
  po_type: string;
  status: string;
  is_default: boolean;
  notes: string | null;
  previous_po_reference_id: string | null;
  created_at: string;
  updated_at: string;
};

type PurchaseRequestRow = {
  id: string;
  project_id: string | null;
  project_po_reference_id: string | null;
  status: string | null;
};

type PurchaseRequestItemRow = {
  purchase_request_id: string;
  requested_qty: number | null;
  purchase_qty: number | null;
  unit_rate: number | null;
  tax_percent: number | null;
};

type ProjectFileRow = {
  id: string;
  project_id: string;
  original_name: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string | null;
  category: string | null;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all').trim().toLowerCase();
    const contractorId = (searchParams.get('contractor_id') || '').trim();

    let projectsQuery = db
      .from('projects')
      .select(`
        id,
        contractor_id,
        project_name,
        client_name,
        project_address,
        estimated_value,
        funding_required,
        funding_status,
        project_status,
        po_number,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(300);

    if (status && status !== 'all') {
      projectsQuery = projectsQuery.eq('project_status', status);
    }

    if (contractorId) {
      projectsQuery = projectsQuery.eq('contractor_id', contractorId);
    }

    const { data: projects, error: projectsError } = await projectsQuery;
    if (projectsError) {
      console.error('Failed to load project submissions:', projectsError);
      return NextResponse.json({ error: 'Failed to load project submissions' }, { status: 500 });
    }

    const projectRows = (projects || []) as ProjectRow[];
    const projectIds = projectRows.map((project) => project.id);
    const contractorIds = Array.from(new Set(projectRows.map((project) => project.contractor_id).filter(Boolean)));

    const [
      { data: contractors, error: contractorsError },
      { data: poReferences, error: poReferencesError },
      { data: purchaseRequests, error: purchaseRequestsError },
      { data: poFiles, error: poFilesError },
    ] = await Promise.all([
      contractorIds.length
        ? db.from('contractors').select('id, company_name, email').in('id', contractorIds)
        : Promise.resolve({ data: [] as ContractorRow[], error: null }),
      projectIds.length
        ? db.from('project_po_references').select('*').in('project_id', projectIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as ProjectPOReferenceRow[], error: null }),
      projectIds.length
        ? db.from('purchase_requests').select('id, project_id, project_po_reference_id, status').in('project_id', projectIds)
        : Promise.resolve({ data: [] as PurchaseRequestRow[], error: null }),
      projectIds.length
        ? db
            .from('project_files')
            .select('id, project_id, original_name, file_name, file_path, created_at, category')
            .in('project_id', projectIds)
            .eq('category', 'po')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as ProjectFileRow[], error: null }),
    ]);

    if (contractorsError || poReferencesError || purchaseRequestsError || poFilesError) {
      console.error('Failed to load project submission dependencies:', {
        contractorsError,
        poReferencesError,
        purchaseRequestsError,
        poFilesError,
      });
      return NextResponse.json({ error: 'Failed to load project submission details' }, { status: 500 });
    }

    const requestIds = ((purchaseRequests || []) as PurchaseRequestRow[]).map((row) => row.id);
    const { data: requestItems, error: requestItemsError } = requestIds.length
      ? await db
          .from('purchase_request_items')
          .select('purchase_request_id, requested_qty, purchase_qty, unit_rate, tax_percent')
          .in('purchase_request_id', requestIds)
      : { data: [] as PurchaseRequestItemRow[], error: null };

    if (requestItemsError) {
      console.error('Failed to load purchase request items for project submissions:', requestItemsError);
      return NextResponse.json({ error: 'Failed to load project submission values' }, { status: 500 });
    }

    const requestItemsByRequestId = new Map<string, PurchaseRequestItemRow[]>();
    ((requestItems || []) as PurchaseRequestItemRow[]).forEach((item) => {
      const existing = requestItemsByRequestId.get(item.purchase_request_id) || [];
      existing.push(item);
      requestItemsByRequestId.set(item.purchase_request_id, existing);
    });

    const { chargesByRequestId } = await fetchPurchaseRequestAdditionalChargesByRequestIds(db, requestIds);
    const requestValueById = new Map<string, number>();
    ((purchaseRequests || []) as PurchaseRequestRow[]).forEach((requestRow) => {
      requestValueById.set(
        requestRow.id,
        calculatePurchaseRequestTotals({
          items: requestItemsByRequestId.get(requestRow.id) || [],
          additionalCharges: chargesByRequestId.get(requestRow.id) || []
        }).grand_total
      );
    });

    const contractorMap = new Map(((contractors || []) as ContractorRow[]).map((row) => [row.id, row]));
    const poReferencesByProjectId = new Map<string, ProjectPOReferenceRow[]>();
    ((poReferences || []) as ProjectPOReferenceRow[]).forEach((poReference) => {
      const existing = poReferencesByProjectId.get(poReference.project_id) || [];
      existing.push(poReference);
      poReferencesByProjectId.set(poReference.project_id, existing);
    });

    const requestsByProjectId = new Map<string, PurchaseRequestRow[]>();
    const requestsByPOReferenceId = new Map<string, PurchaseRequestRow[]>();
    ((purchaseRequests || []) as PurchaseRequestRow[]).forEach((purchaseRequest) => {
      if (purchaseRequest.project_id) {
        const byProject = requestsByProjectId.get(purchaseRequest.project_id) || [];
        byProject.push(purchaseRequest);
        requestsByProjectId.set(purchaseRequest.project_id, byProject);
      }

      if (purchaseRequest.project_po_reference_id) {
        const byPo = requestsByPOReferenceId.get(purchaseRequest.project_po_reference_id) || [];
        byPo.push(purchaseRequest);
        requestsByPOReferenceId.set(purchaseRequest.project_po_reference_id, byPo);
      }
    });

    const poFilesByProjectId = new Map<string, ProjectFileRow[]>();
    for (const row of ((poFiles || []) as ProjectFileRow[])) {
      const existing = poFilesByProjectId.get(row.project_id) || [];
      existing.push(row);
      poFilesByProjectId.set(row.project_id, existing);
    }

    const projectsWithSignedUrls = await Promise.all(
      projectRows.map(async (project) => {
        const projectPOReferences = poReferencesByProjectId.get(project.id) || [];
        const projectRequests = requestsByProjectId.get(project.id) || [];
        const projectPOFiles = poFilesByProjectId.get(project.id) || [];
        const activePOReference = getDefaultPOReference(projectPOReferences as any);

        const poDocuments = await Promise.all(
          projectPOFiles.slice(0, 5).map(async (file) => {
            if (!file.file_path) {
              return {
                id: file.id,
                original_name: file.original_name,
                file_name: file.file_name,
                created_at: file.created_at,
                signed_url: null,
              };
            }

            const { data: signedUrlData } = await db.storage
              .from(DOC_BUCKET)
              .createSignedUrl(file.file_path, 60 * 60);

            return {
              id: file.id,
              original_name: file.original_name,
              file_name: file.file_name,
              created_at: file.created_at,
              signed_url: signedUrlData?.signedUrl || null,
            };
          })
        );

        const purchaseSummary = projectRequests.reduce(
          (summary, purchaseRequest) => {
            const normalizedStatus = String(purchaseRequest.status || 'unknown').toLowerCase();
            summary.total += 1;
            if (normalizedStatus in summary.statuses) {
              summary.statuses[normalizedStatus as keyof typeof summary.statuses] += 1;
            }
            if (purchaseRequest.project_po_reference_id) {
              summary.linked_to_po += 1;
            }
            summary.total_request_value += requestValueById.get(purchaseRequest.id) || 0;
            return summary;
          },
          {
            total: 0,
            linked_to_po: 0,
            total_request_value: 0,
            statuses: {
              draft: 0,
              submitted: 0,
              approved: 0,
              funded: 0,
              po_generated: 0,
              completed: 0,
              rejected: 0,
            },
          }
        );

        const poReferenceDetails = projectPOReferences.map((poReference) => {
          const linkedRequests = requestsByPOReferenceId.get(poReference.id) || [];
          const linkedValue = linkedRequests.reduce((sum, linkedRequest) => sum + (requestValueById.get(linkedRequest.id) || 0), 0);
          const openRequestCount = linkedRequests.filter((linkedRequest) => {
            const normalizedStatus = String(linkedRequest.status || '').toLowerCase();
            return normalizedStatus !== 'completed' && normalizedStatus !== 'rejected';
          }).length;

          return {
            ...poReference,
            request_count: linkedRequests.length,
            linked_value: linkedValue,
            open_request_count: openRequestCount,
          };
        });

        return {
          ...project,
          contractor: project.contractor_id ? contractorMap.get(project.contractor_id) || null : null,
          po_reference_count: poReferenceDetails.length,
          po_file_count: projectPOFiles.length,
          po_documents: poDocuments,
          po_references: poReferenceDetails,
          active_po_reference: activePOReference,
          purchase_summary: purchaseSummary,
        };
      })
    );

    const summary = projectsWithSignedUrls.reduce(
      (acc, project) => {
        const normalizedStatus = String(project.project_status || 'unknown').toLowerCase();
        acc.total += 1;
        if (normalizedStatus in acc.by_status) {
          acc.by_status[normalizedStatus as keyof typeof acc.by_status] += 1;
        }
        if (project.po_reference_count > 0) {
          acc.with_po_references += 1;
        } else {
          acc.without_po_references += 1;
        }
        if (project.po_file_count > 0) {
          acc.with_po_documents += 1;
        }
        if (project.purchase_summary.total > 0) {
          acc.with_purchase_requests += 1;
        }
        return acc;
      },
      {
        total: 0,
        by_status: {
          draft: 0,
          awarded: 0,
          finalized: 0,
          completed: 0,
        },
        with_po_references: 0,
        without_po_references: 0,
        with_po_documents: 0,
        with_purchase_requests: 0,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsWithSignedUrls,
        summary,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/project-submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load project submissions' },
      { status: 500 }
    );
  }
}
