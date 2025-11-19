import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ProjectMaterialForUI } from '@/types/purchase-requests';

// GET /api/project-materials-normalized - Get materials with computed quantities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching materials with totals for project:', project_id);

    // Query the aggregated view
    const { data: materials, error } = await supabaseAdmin
      .from('project_materials_with_totals')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project materials' },
        { status: 500 }
      );
    }

    const materialIds = (materials || []).map(m => m.project_material_id);
    const materialMetaMap = new Map<string, { purchase_status: string | null; source_file_name: string | null }>();
    const requestHistoryMap = new Map<string, any[]>();
    if (materialIds.length > 0) {
      const { data: materialRows, error: materialError } = await supabaseAdmin
        .from('project_materials')
        .select('id, purchase_status, source_file_name')
        .in('id', materialIds);
      if (materialError) {
        console.error('Failed to fetch purchase material metadata:', materialError);
      } else {
        materialRows?.forEach(row => {
          materialMetaMap.set(row.id, {
            purchase_status: row.purchase_status,
            source_file_name: row.source_file_name || null
          });
        });
      }
    }

    console.log(`✅ Fetched ${materials?.length || 0} materials with computed quantities`);

    // Transform to UI format
    if (materialIds.length > 0) {
      const { data: requestItems, error: requestError } = await supabaseAdmin
        .from('purchase_request_items')
        .select(`
          id,
          purchase_request_id,
          project_material_id,
          requested_qty,
          approved_qty,
          unit_rate,
          tax_percent,
          status,
          created_at,
          updated_at,
          purchase_requests (
            id,
            status,
            submitted_at,
            created_at
          )
        `)
        .in('project_material_id', materialIds)
        .order('created_at', { ascending: false });

      if (requestError) {
        console.error('Failed to fetch request history:', requestError);
      } else {
        requestItems?.forEach(item => {
          const list = requestHistoryMap.get(item.project_material_id) || [];
          list.push({
            id: item.id,
            purchase_request_id: item.purchase_request_id,
            project_material_id: item.project_material_id,
            requested_qty: item.requested_qty,
            approved_qty: item.approved_qty,
            unit_rate: item.unit_rate,
            tax_percent: item.tax_percent,
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at,
            purchase_request: item.purchase_requests
          });
          requestHistoryMap.set(item.project_material_id, list);
        });
      }
    }

    const materialsForUI: ProjectMaterialForUI[] = (materials || []).map(material => ({
      id: material.project_material_id,
      project_id: material.project_id,
      material_id: material.material_id,
      contractor_id: material.contractor_id,
      name: material.name,
      description: material.description,
      unit: material.unit,
      category: material.category,
      required_qty: material.required_qty || 0,
      available_qty: material.available_qty || 0,
      requested_qty: material.requested_qty || 0,
      ordered_qty: material.ordered_qty || 0,
      purchase_status: materialMetaMap.get(material.project_material_id)?.purchase_status || 'none',
      source_file_name: materialMetaMap.get(material.project_material_id)?.source_file_name || null,
      request_history: requestHistoryMap.get(material.project_material_id) || [],
      notes: material.notes,
      source_type: material.source_type,
      created_at: material.created_at,
      updated_at: material.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: materialsForUI,
      count: materialsForUI.length
    });

  } catch (error) {
    console.error('💥 Error in project-materials API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Alternative implementation using direct SQL query instead of view
export async function GET_ALTERNATIVE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Direct SQL query with JOINs and aggregation
    const { data: materials, error } = await supabaseAdmin.rpc('get_project_materials_with_totals', {
      input_project_id: project_id
    });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project materials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: materials || [],
      count: materials?.length || 0
    });

  } catch (error) {
    console.error('💥 Error in project-materials API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
