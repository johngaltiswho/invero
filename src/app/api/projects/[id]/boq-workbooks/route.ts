import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedContractorProject } from '@/lib/contractor-project-auth';
import {
  createGoogleWorkingWorkbookFromStorage,
  createOriginalWorkbookSignedUrl,
  deactivateProjectWorkbooks,
  getLatestActiveWorkbook,
  getLatestProjectBoq,
  uploadOriginalWorkbookToStorage,
} from '@/lib/boq-workbooks';
import type { LinkedBoqWorkbook } from '@/types/boq-workbooks';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function serializeWorkbook(workbook: LinkedBoqWorkbook | null) {
  if (!workbook) return null;

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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const authResult = await getAuthenticatedContractorProject(projectId);
    if ('error' in authResult) return authResult.error;

    const [workbook, latestBoq, measurementResult] = await Promise.all([
      getLatestActiveWorkbook(projectId),
      getLatestProjectBoq(projectId),
      supabaseAdmin
        .from('boq_measurement_rows')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('contractor_id', authResult.contractorId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        workbook: await serializeWorkbook(workbook),
        latest_boq: latestBoq
          ? {
              id: latestBoq.id,
              file_name: latestBoq.file_name,
              created_at: latestBoq.created_at,
              total_amount: latestBoq.total_amount,
            }
          : null,
        has_measurements: Boolean(measurementResult.count && measurementResult.count > 0),
      },
    });
  } catch (error) {
    console.error('Failed to fetch BOQ workbook metadata:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch workbook metadata' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const authResult = await getAuthenticatedContractorProject(projectId);
    if ('error' in authResult) return authResult.error;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Excel workbook file is required' }, { status: 400 });
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ success: false, error: 'Only .xlsx and .xls workbooks are supported' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalFilePath = await uploadOriginalWorkbookToStorage({
      contractorId: authResult.contractorId,
      projectId,
      fileName: file.name,
      contentType: file.type,
      fileBuffer,
    });

    await deactivateProjectWorkbooks(projectId);

    const { data: workbook, error: workbookError } = await supabaseAdmin
      .from('boq_linked_workbooks')
      .insert({
        project_id: projectId,
        contractor_id: authResult.contractorId,
        provider: 'google',
        original_file_path: originalFilePath,
        original_file_name: file.name,
        original_content_type: file.type || null,
        status: 'source_uploaded',
        active: true,
        created_by: authResult.userId,
        updated_by: authResult.userId,
      })
      .select('*')
      .single();

    if (workbookError || !workbook) {
      throw new Error(workbookError?.message || 'Failed to create linked workbook record');
    }

    try {
      const googleWorkbook = await createGoogleWorkingWorkbookFromStorage({
        workbookId: workbook.id,
        storagePath: originalFilePath,
        originalFileName: file.name,
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
        .eq('id', workbook.id)
        .select('*')
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          workbook: await serializeWorkbook(updatedWorkbook as LinkedBoqWorkbook),
        },
      });
    } catch (linkError) {
      console.error('Failed to create Google working workbook:', linkError);

      const { data: failedWorkbook } = await supabaseAdmin
        .from('boq_linked_workbooks')
        .update({
          status: 'link_failed',
          last_sync_error: linkError instanceof Error ? linkError.message : 'Failed to create working workbook',
          updated_by: authResult.userId,
        })
        .eq('id', workbook.id)
        .select('*')
        .single();

      return NextResponse.json({
        success: true,
        data: {
          workbook: await serializeWorkbook((failedWorkbook || workbook) as LinkedBoqWorkbook),
          warning: 'Original workbook saved, but the Google working workbook could not be created yet.',
        },
      });
    }
  } catch (error) {
    console.error('Failed to upload source workbook:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload source workbook' }, { status: 500 });
  }
}
