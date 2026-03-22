import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { saveBOQToSupabase } from '@/lib/supabase-boq';
import { getAuthenticatedContractorProject } from '@/lib/contractor-project-auth';
import { buildProjectBoqFromWorkbookBuffer, downloadGoogleWorkbook, getLatestProjectBoq } from '@/lib/boq-workbooks';
import type { BoqSyncWriteMode, LinkedBoqWorkbook } from '@/types/boq-workbooks';

type RouteContext = {
  params: Promise<{ id: string; workbookId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, workbookId } = await context.params;
    const authResult = await getAuthenticatedContractorProject(projectId);
    if ('error' in authResult) return authResult.error;

    const body = await request.json().catch(() => ({}));
    const writeMode = (body.write_mode || 'new_revision') as BoqSyncWriteMode;

    if (writeMode !== 'new_revision' && writeMode !== 'overwrite') {
      return NextResponse.json({ success: false, error: 'Invalid sync write mode' }, { status: 400 });
    }

    const [{ data: workbook, error: workbookError }, { count: measurementCount, error: measurementError }, latestBoq] = await Promise.all([
      supabaseAdmin
        .from('boq_linked_workbooks')
        .select('*')
        .eq('id', workbookId)
        .eq('project_id', projectId)
        .eq('contractor_id', authResult.contractorId)
        .single(),
      supabaseAdmin
        .from('boq_measurement_rows')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('contractor_id', authResult.contractorId),
      getLatestProjectBoq(projectId),
    ]);

    if (workbookError || !workbook) {
      return NextResponse.json({ success: false, error: 'Linked workbook not found' }, { status: 404 });
    }

    if (measurementError) {
      throw new Error(measurementError.message);
    }

    if (measurementCount && measurementCount > 0) {
      return NextResponse.json({
        success: false,
        error: 'BOQ sync is locked because measurements already exist for this project.',
      }, { status: 409 });
    }

    if (writeMode === 'overwrite' && !latestBoq) {
      return NextResponse.json({
        success: false,
        error: 'There is no existing parsed BOQ revision to overwrite.',
      }, { status: 400 });
    }

    await supabaseAdmin
      .from('boq_linked_workbooks')
      .update({
        status: 'syncing',
        last_sync_error: null,
        updated_by: authResult.userId,
      })
      .eq('id', workbookId);

    try {
      const workbookBuffer = await downloadGoogleWorkbook(workbook as LinkedBoqWorkbook);
      const workbookName = (workbook as LinkedBoqWorkbook).original_file_name || 'Synced Excel Workbook';
      const syncFileName = writeMode === 'new_revision'
        ? `${workbookName} - Synced ${new Date().toLocaleString('en-IN')}`
        : workbookName;

      const { boq, totalSheets, rowsAnalyzed, sectionsDetected } = buildProjectBoqFromWorkbookBuffer({
        workbookBuffer,
        projectId,
        contractorId: authResult.contractorId,
        fileName: syncFileName,
      });

      const boqRecord = await saveBOQToSupabase(boq, {
        dbClient: supabaseAdmin,
        overwriteBoqId: writeMode === 'overwrite' ? latestBoq?.id : undefined,
      });

      await supabaseAdmin
        .from('boq_linked_workbooks')
        .update({
          status: 'synced',
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
          last_synced_boq_id: boqRecord.id,
          updated_by: authResult.userId,
        })
        .eq('id', workbookId);

      return NextResponse.json({
        success: true,
        data: {
          workbook_id: workbookId,
          write_mode: writeMode,
          boq_id: boqRecord.id,
          boq_file_name: boqRecord.file_name,
          total_sheets: totalSheets,
          rows_analyzed: rowsAnalyzed,
          sections_detected: sectionsDetected,
          synced_at: new Date().toISOString(),
        },
      });
    } catch (syncError) {
      await supabaseAdmin
        .from('boq_linked_workbooks')
        .update({
          status: 'sync_failed',
          last_sync_status: 'failed',
          last_sync_error: syncError instanceof Error ? syncError.message : 'Failed to sync workbook',
          updated_by: authResult.userId,
        })
        .eq('id', workbookId);

      throw syncError;
    }
  } catch (error) {
    console.error('Failed to sync linked workbook:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync linked workbook' }, { status: 500 });
  }
}
