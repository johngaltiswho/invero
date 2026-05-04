import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPurchaseRequestAdditionalChargesByRequestIds } from '@/lib/purchase-request-additional-charges';
import { calculatePurchaseRequestTotals } from '@/lib/purchase-request-totals';

const EDITABLE_STATUSES = new Set(['draft', 'submitted', 'approved']);

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PurchaseRequestItemWithMaterial = {
  id: string;
  purchase_request_id: string;
  project_material_id: string;
  item_description: string | null;
  site_unit: string | null;
  purchase_unit: string | null;
  conversion_factor: number | null;
  purchase_qty: number | null;
  normalized_qty: number | null;
  requested_qty: number;
  approved_qty: number | null;
  unit_rate: number | null;
  tax_percent: number | null;
  round_off_amount: number | null;
  hsn_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  project_materials?: Array<{
    id: string;
    unit: string | null;
    material_id: string | null;
    materials?: Array<{
      name: string | null;
    }> | null;
  }> | {
    id: string;
    unit: string | null;
    material_id: string | null;
    materials?: Array<{
      name: string | null;
    }> | {
      name: string | null;
    } | null;
  } | null;
};

type PurchaseRequestAdditionalChargeRow = {
  id: string;
  purchase_request_id: string;
  description: string;
  hsn_code: string | null;
  amount: number;
  tax_percent: number | null;
  created_at: string;
  updated_at: string;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getContractorIdForUser(userId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  return contractor?.id || null;
}

async function resolveProjectPOReferenceForRequest(
  supabase: any,
  projectId: string,
  projectStatus: string | null | undefined,
  requestedPOReferenceId?: string | null
) {
  const normalizedStatus = String(projectStatus || '').toLowerCase();
  const requiresPO = ['awarded', 'finalized', 'completed'].includes(normalizedStatus);
  if (!requiresPO) return null;
  if (!requestedPOReferenceId) {
    throw new Error('An active client PO is required for this project');
  }

  const { data: poReferences, error } = await supabase
    .from('project_po_references')
    .select('id, status')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch project POs: ${error.message}`);
  }

  const requested = (poReferences || []).find((po: any) => po.id === requestedPOReferenceId);
  if (!requested) throw new Error('Selected client PO does not belong to this project');
  if (requested.status !== 'active') throw new Error('Selected client PO is not active');
  return requested.id;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const contractorId = await getContractorIdForUser(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    const { data: requestRow, error: requestError } = await supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        project_po_reference_id,
        contractor_id,
        status,
        remarks,
        shipping_location,
        created_at,
        updated_at,
        submitted_at,
        approved_at,
        funded_at,
        project_po_references:project_po_reference_id (
          id,
          po_number,
          po_type,
          status,
          is_default
        )
      `)
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    let items: PurchaseRequestItemWithMaterial[] | null = null;
    let itemsError: { message?: string } | null = null;

    const itemsWithConversion = await supabase
      .from('purchase_request_items')
      .select(`
        id,
        purchase_request_id,
        project_material_id,
        item_description,
        site_unit,
        purchase_unit,
        conversion_factor,
        purchase_qty,
        normalized_qty,
        requested_qty,
        approved_qty,
        unit_rate,
        tax_percent,
        round_off_amount,
        hsn_code,
        status,
        created_at,
        updated_at,
        project_materials(
          id,
          unit,
          material_id,
          materials(
            name
          )
        )
      `)
      .eq('purchase_request_id', requestId)
      .order('created_at', { ascending: true });
    items = (itemsWithConversion.data as PurchaseRequestItemWithMaterial[] | null) ?? null;
    itemsError = itemsWithConversion.error;

    if (
      itemsError &&
      (
        String(itemsError.message || '').includes('purchase_qty') ||
        String(itemsError.message || '').includes('round_off_amount')
      )
    ) {
      const fallbackItems = await supabase
        .from('purchase_request_items')
        .select(`
          id,
          purchase_request_id,
          project_material_id,
          item_description,
          requested_qty,
          approved_qty,
          unit_rate,
          tax_percent,
          hsn_code,
          status,
          created_at,
          updated_at,
          project_materials(
            id,
            unit,
            material_id,
            materials(
              name
            )
          )
        `)
        .eq('purchase_request_id', requestId)
        .order('created_at', { ascending: true });
      items = (fallbackItems.data as PurchaseRequestItemWithMaterial[] | null) ?? null;
      itemsError = fallbackItems.error;
    }

    if (itemsError) {
      console.error('Failed to load purchase request items:', itemsError);
      return NextResponse.json({ error: 'Failed to load purchase request items' }, { status: 500 });
    }

    const transformedItems = ((items || []) as PurchaseRequestItemWithMaterial[]).map((item) => {
      const projectMaterial = Array.isArray(item.project_materials)
        ? item.project_materials[0]
        : item.project_materials;
      const materialNode = Array.isArray(projectMaterial?.materials)
        ? projectMaterial?.materials[0]
        : projectMaterial?.materials;
      const materialName = materialNode?.name || 'Material';
      return {
        ...item,
        material_name: materialName,
        unit: projectMaterial?.unit || 'unit'
      };
    });

    const { chargesByRequestId } = await fetchPurchaseRequestAdditionalChargesByRequestIds(supabase, [requestId]);
    const additionalCharges = (chargesByRequestId.get(requestId) || []) as PurchaseRequestAdditionalChargeRow[];
    const totals = calculatePurchaseRequestTotals({
      items: transformedItems,
      additionalCharges
    });

    return NextResponse.json({
      success: true,
      data: {
        ...requestRow,
        items: transformedItems,
        additional_charges: additionalCharges,
        estimated_total: totals.grand_total,
        material_total: totals.material_total,
        additional_charge_total: totals.additional_charge_total,
        editable: EDITABLE_STATUSES.has((requestRow.status || '').toLowerCase())
      }
    });
  } catch (error) {
    console.error('Error fetching purchase request details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase request details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const body = await request.json();
    const remarks = typeof body.remarks === 'string' ? body.remarks : null;
    const shippingLocation = typeof body.shipping_location === 'string' ? body.shipping_location.trim() || null : null;
    const requestedPOReferenceId =
      typeof body.project_po_reference_id === 'string' && body.project_po_reference_id.trim()
        ? body.project_po_reference_id.trim()
        : body.project_po_reference_id === null
          ? null
          : undefined;
    const items = Array.isArray(body.items) ? body.items : [];
    const additionalCharges = Array.isArray(body.additional_charges) ? body.additional_charges : [];

    const contractorId = await getContractorIdForUser(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    const { data: requestRow, error: requestError } = await supabase
      .from('purchase_requests')
      .select('id, status, contractor_id, project_id, project_po_reference_id, shipping_location')
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    const normalizedStatus = (requestRow.status || '').toLowerCase();
    if (!EDITABLE_STATUSES.has(normalizedStatus)) {
      return NextResponse.json(
        { error: `Purchase request cannot be edited in '${requestRow.status}' status` },
        { status: 400 }
      );
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, project_status')
      .eq('id', requestRow.project_id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Linked project not found' }, { status: 404 });
    }

    let nextProjectPOReferenceId = requestRow.project_po_reference_id || null;
    if (requestedPOReferenceId !== undefined) {
      try {
        nextProjectPOReferenceId = await resolveProjectPOReferenceForRequest(
          supabase,
          requestRow.project_id,
          (project as any).project_status,
          requestedPOReferenceId
        );
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Invalid client PO selection' },
          { status: 400 }
        );
      }
    }

    const { data: existingItems, error: existingItemsError } = await supabase
      .from('purchase_request_items')
      .select('id, project_material_id')
      .eq('purchase_request_id', requestId);

    if (existingItemsError) {
      console.error('Failed to fetch existing request items:', existingItemsError);
      return NextResponse.json({ error: 'Failed to validate purchase request items' }, { status: 500 });
    }

    const existingIds = new Set((existingItems || []).map((item) => item.id));
    const existingItemRowsById = new Map((existingItems || []).map((item) => [item.id, item]));
    const seenProjectMaterialIds = new Set<string>();
    const newItems: any[] = [];

    for (const item of items) {
      const itemId = item?.id?.toString() || '';
      const projectMaterialId = item?.project_material_id?.toString() || existingItemRowsById.get(itemId)?.project_material_id || '';

      if (!projectMaterialId) {
        return NextResponse.json({ error: 'project_material_id is required for each item' }, { status: 400 });
      }
      if (seenProjectMaterialIds.has(projectMaterialId)) {
        return NextResponse.json({ error: 'Duplicate material entries are not allowed in a purchase request' }, { status: 400 });
      }
      seenProjectMaterialIds.add(projectMaterialId);

      const requestedQty = Number(item.requested_qty);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        return NextResponse.json({ error: 'Requested quantity must be greater than zero' }, { status: 400 });
      }

      const conversionFactor =
        item.conversion_factor === null || item.conversion_factor === undefined || item.conversion_factor === ''
          ? null
          : Number(item.conversion_factor);
      if (conversionFactor !== null && (!Number.isFinite(conversionFactor) || conversionFactor <= 0)) {
        return NextResponse.json({ error: 'Conversion factor must be greater than zero' }, { status: 400 });
      }

      const purchaseQty =
        item.purchase_qty === null || item.purchase_qty === undefined || item.purchase_qty === ''
          ? null
          : Number(item.purchase_qty);
      if (purchaseQty !== null && (!Number.isFinite(purchaseQty) || purchaseQty <= 0)) {
        return NextResponse.json({ error: 'Purchase quantity must be greater than zero' }, { status: 400 });
      }

      const normalizedQty =
        item.normalized_qty === null || item.normalized_qty === undefined || item.normalized_qty === ''
          ? null
          : Number(item.normalized_qty);
      if (normalizedQty !== null && (!Number.isFinite(normalizedQty) || normalizedQty <= 0)) {
        return NextResponse.json({ error: 'Normalized quantity must be greater than zero' }, { status: 400 });
      }

      const updatePayload = {
        project_material_id: projectMaterialId,
        requested_qty: requestedQty,
        item_description: item.item_description?.toString().trim() || null,
        site_unit: item.site_unit?.toString().trim() || null,
        purchase_unit: item.purchase_unit?.toString().trim() || null,
        conversion_factor: conversionFactor,
        purchase_qty: purchaseQty,
        normalized_qty: normalizedQty,
        unit_rate: item.unit_rate === null || item.unit_rate === '' ? null : Number(item.unit_rate),
        tax_percent: item.tax_percent === null || item.tax_percent === '' ? 0 : Number(item.tax_percent),
        round_off_amount:
          item.round_off_amount === null || item.round_off_amount === undefined || item.round_off_amount === ''
            ? 0
            : Number(item.round_off_amount),
        hsn_code: item.hsn_code?.toString().trim() || null,
        updated_at: new Date().toISOString()
      };

      if (itemId && existingIds.has(itemId)) {
        let { error: itemUpdateError } = await supabase
          .from('purchase_request_items')
          .update(updatePayload)
          .eq('id', itemId)
          .eq('purchase_request_id', requestId);

        if (itemUpdateError && String(itemUpdateError.message || '').includes('round_off_amount')) {
          const { round_off_amount: _roundOffAmount, ...legacyUpdatePayload } = updatePayload;
          const legacyUpdate = await supabase
            .from('purchase_request_items')
            .update(legacyUpdatePayload)
            .eq('id', itemId)
            .eq('purchase_request_id', requestId);
          itemUpdateError = legacyUpdate.error;
        }

        if (itemUpdateError) {
          console.error('Failed to update purchase request item:', itemUpdateError);
          return NextResponse.json({ error: 'Failed to update purchase request items' }, { status: 500 });
        }
      } else if (!itemId) {
        newItems.push({
          purchase_request_id: requestId,
          project_material_id: projectMaterialId,
          hsn_code: updatePayload.hsn_code,
          item_description: updatePayload.item_description,
          site_unit: updatePayload.site_unit,
          purchase_unit: updatePayload.purchase_unit,
          conversion_factor: updatePayload.conversion_factor,
          purchase_qty: updatePayload.purchase_qty,
          normalized_qty: updatePayload.normalized_qty,
          requested_qty: updatePayload.requested_qty,
          unit_rate: updatePayload.unit_rate,
          tax_percent: updatePayload.tax_percent,
          round_off_amount: updatePayload.round_off_amount,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        return NextResponse.json({ error: 'Invalid purchase request item in payload' }, { status: 400 });
      }
    }

    let nextCharges: Array<{
      id: string;
      purchase_request_id: string;
      description: string;
      hsn_code: string | null;
      amount: number;
      tax_percent: number;
      created_at: string;
      updated_at: string;
    }> = [];

    try {
      nextCharges = additionalCharges.map((charge, index) => {
        const description = charge?.description?.toString().trim() || '';
        if (!description) {
          throw new Error(`Additional charge description is required for row ${index + 1}`);
        }
        const amount = Number(charge?.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error(`Additional charge amount must be zero or greater for row ${index + 1}`);
        }
        const taxPercent =
          charge?.tax_percent === null || charge?.tax_percent === undefined || charge?.tax_percent === ''
            ? 0
            : Number(charge.tax_percent);
        if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
          throw new Error(`Additional charge tax percent must be between 0 and 100 for row ${index + 1}`);
        }

        return {
          id: charge?.id?.toString().trim() || '',
          purchase_request_id: requestId,
          description,
          hsn_code: charge?.hsn_code?.toString().trim() || null,
          amount,
          tax_percent: taxPercent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid additional charges payload' },
        { status: 400 }
      );
    }

    if (newItems.length > 0) {
      const newProjectMaterialIds = Array.from(new Set(newItems.map((item) => item.project_material_id)));

      const { data: availabilityRows, error: availabilityError } = await supabase
        .from('project_materials_with_totals')
        .select('project_material_id, project_id, required_qty, requested_qty, available_qty')
        .in('project_material_id', newProjectMaterialIds);

      if (availabilityError) {
        console.error('Failed to validate new purchase request items availability:', availabilityError);
        return NextResponse.json({ error: 'Failed to validate material availability' }, { status: 500 });
      }

      const availabilityMap = new Map((availabilityRows || []).map((row: any) => [row.project_material_id, row]));

      for (const item of newItems) {
        const availability = availabilityMap.get(item.project_material_id);
        if (!availability) {
          return NextResponse.json({ error: 'Selected material is not part of this project' }, { status: 400 });
        }
        if (availability.project_id !== requestRow.project_id) {
          return NextResponse.json({ error: 'Selected material does not belong to this purchase request project' }, { status: 400 });
        }

        const maxRequestable = Math.max(
          Number(availability.required_qty || 0) -
            Number(availability.requested_qty || 0) -
            Number(availability.available_qty || 0),
          0
        );
        const qty = Number(item.requested_qty || 0);
        if (maxRequestable <= 0) {
          return NextResponse.json({ error: 'Selected material has no available quantity left for requesting' }, { status: 400 });
        }
        if (qty > maxRequestable) {
          return NextResponse.json(
            { error: `Requested quantity for new material exceeds available quantity (${maxRequestable.toFixed(3)})` },
            { status: 400 }
          );
        }
      }

      let { error: insertError } = await supabase
        .from('purchase_request_items')
        .insert(newItems);

      if (insertError && String(insertError.message || '').includes('round_off_amount')) {
        const legacyNewItems = newItems.map(({ round_off_amount: _roundOffAmount, ...rest }) => rest);
        const legacyInsert = await supabase
          .from('purchase_request_items')
          .insert(legacyNewItems);
        insertError = legacyInsert.error;
      }

      if (insertError) {
        console.error('Failed to insert new purchase request items:', insertError);
        return NextResponse.json({ error: 'Failed to add new materials to purchase request' }, { status: 500 });
      }
    }

    const { data: updatedRequest, error: requestUpdateError } = await supabase
      .from('purchase_requests')
      .update({
        remarks,
        shipping_location: shippingLocation,
        project_po_reference_id: nextProjectPOReferenceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .select('id, project_id, project_po_reference_id, contractor_id, status, remarks, shipping_location, updated_at')
      .single();

    if (requestUpdateError || !updatedRequest) {
      console.error('Failed to update purchase request:', requestUpdateError);
      return NextResponse.json({ error: 'Failed to update purchase request' }, { status: 500 });
    }

    const { error: deleteChargesError } = await supabase
      .from('purchase_request_additional_charges')
      .delete()
      .eq('purchase_request_id', requestId);

    if (deleteChargesError && !String(deleteChargesError.message || '').includes('purchase_request_additional_charges')) {
      console.error('Failed to replace purchase request additional charges:', deleteChargesError);
      return NextResponse.json({ error: 'Failed to update additional charges' }, { status: 500 });
    }

    if (nextCharges.length > 0) {
      const { error: insertChargesError } = await supabase
        .from('purchase_request_additional_charges')
        .insert(nextCharges.map(({ id, ...charge }) => charge));

      if (insertChargesError) {
        const missingChargesTable = String(insertChargesError.message || '').includes('purchase_request_additional_charges');
        if (!missingChargesTable) {
          console.error('Failed to insert purchase request additional charges:', insertChargesError);
          return NextResponse.json({ error: 'Failed to update additional charges' }, { status: 500 });
        }
        console.warn('Skipping additional charge updates because table is not available yet:', insertChargesError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const contractorId = await getContractorIdForUser(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    const { data: requestRow, error: requestError } = await supabase
      .from('purchase_requests')
      .select('id, status, contractor_id')
      .eq('id', requestId)
      .eq('contractor_id', contractorId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    const normalizedStatus = (requestRow.status || '').toLowerCase();
    if (!EDITABLE_STATUSES.has(normalizedStatus)) {
      return NextResponse.json(
        { error: `Purchase request cannot be deleted in '${requestRow.status}' status` },
        { status: 400 }
      );
    }

    // Extra safety checks to avoid deleting requests already linked to downstream workflow records.
    const [{ data: invoice }, { data: linkedTx }] = await Promise.all([
      supabase
        .from('invoices')
        .select('id')
        .eq('purchase_request_id', requestId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('capital_transactions')
        .select('id')
        .eq('purchase_request_id', requestId)
        .limit(1)
        .maybeSingle()
    ]);

    if (invoice || linkedTx) {
      return NextResponse.json(
        { error: 'Purchase request is already linked to invoices or capital transactions and cannot be deleted' },
        { status: 400 }
      );
    }

    // Items cascade via FK ON DELETE CASCADE.
    const { error: deleteError } = await supabase
      .from('purchase_requests')
      .delete()
      .eq('id', requestId)
      .eq('contractor_id', contractorId);

    if (deleteError) {
      console.error('Failed to delete purchase request:', deleteError);
      return NextResponse.json({ error: 'Failed to delete purchase request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase request' },
      { status: 500 }
    );
  }
}
