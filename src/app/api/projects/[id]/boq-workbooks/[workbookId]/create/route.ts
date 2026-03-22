import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedContractorProject } from '@/lib/contractor-project-auth';
import { createGoogleWorkingWorkbookFromStorage, createOriginalWorkbookSignedUrl } from '@/lib/boq-workbooks';
import type { LinkedBoqWorkbook } from '@/types/boq-workbooks';

type RouteContext = {
  params: Promise<{ id: string; workbookId: string }>;
};

async function serializeWorkbook(workbook: LinkedBoqWorkbook) {
  let originalFileUrl: string | null = null;
  try {
    originalFileUrl = await createOriginalWorkbookSignedUrl(workbook.original_file_path);
  } catch (error) {
    console.error('Failed to create original workbook signed URL:', error);
  }

  return {
    ...workbook,
    original_file_url: originalFileUrl,
  };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  let projectId = '';
  let workbookId = '';
  let userId = '';
  try {
    ({ id: projectId, workbookId } = await context.params);
    const authResult = await getAuthenticatedContractorProject(projectId);
    if ('error' in authResult) return authResult.error;
    userId = authResult.userId;

    const { data: workbook, error } = await supabaseAdmin
      .from('boq_linked_workbooks')
      .select('*')
      .eq('id', workbookId)
      .eq('project_id', projectId)
      .eq('contractor_id', authResult.contractorId)
      .single();

    if (error || !workbook) {
      return NextResponse.json({ success: false, error: 'Linked workbook not found' }, { status: 404 });
    }

    const googleWorkbook = await createGoogleWorkingWorkbookFromStorage({
      workbookId,
      storagePath: workbook.original_file_path,
      originalFileName: workbook.original_file_name,
    });

    const { data: updatedWorkbook, error: updateError } = await supabaseAdmin
      .from('boq_linked_workbooks')
      .update({
        provider_file_id: googleWorkbook.fileId,
        provider_drive_id: googleWorkbook.driveId,
        provider_site_id: googleWorkbook.siteId,
        provider_web_url: googleWorkbook.webUrl,
        status: 'linked',
        last_sync_error: null,
        updated_by: authResult.userId,
        metadata: googleWorkbook.raw,
      })
      .eq('id', workbookId)
      .select('*')
      .single();

    if (updateError || !updatedWorkbook) {
      throw new Error(updateError?.message || 'Failed to update linked workbook');
    }

    return NextResponse.json({
      success: true,
      data: {
        workbook: await serializeWorkbook(updatedWorkbook as LinkedBoqWorkbook),
      },
    });
  } catch (error) {
    console.error('Failed to create Google working workbook:', error);
    if (workbookId) {
      await supabaseAdmin
        .from('boq_linked_workbooks')
        .update({
          status: 'link_failed',
          last_sync_error: error instanceof Error ? error.message : 'Failed to create working workbook',
          updated_by: userId || null,
        })
        .eq('id', workbookId)
        .eq('project_id', projectId);
    }
    return NextResponse.json({ success: false, error: 'Failed to create Google working workbook' }, { status: 500 });
  }
}
