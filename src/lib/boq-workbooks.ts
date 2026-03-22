import { supabaseAdmin } from '@/lib/supabase';
import { calculateTotals, organizeIntoSections, parseExcelToBOQRows } from '@/lib/boq-analyzer';
import { parseMultiSheetWorkbookBuffer } from '@/lib/excel-parser';
import { getGoogleDriveAPI } from '@/lib/google-drive';
import type { ProjectBOQ } from '@/types/boq';
import type { LinkedBoqWorkbook } from '@/types/boq-workbooks';

const WORKBOOK_STORAGE_BUCKET = 'contractor-documents';
const WORKBOOK_STORAGE_PREFIX = 'boq-workbooks';

const GOOGLE_WORKBOOK_PARENT_FOLDER = process.env.GOOGLE_WORKBOOK_PARENT_FOLDER || 'Finverno/BOQ Workbooks';

function sanitizeFileName(fileName: string) {
  const extension = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  const basename = extension ? fileName.slice(0, -extension.length) : fileName;
  const safeBase = basename
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'boq-workbook';

  return `${safeBase}${extension || '.xlsx'}`;
}

export async function uploadOriginalWorkbookToStorage({
  contractorId,
  projectId,
  fileName,
  contentType,
  fileBuffer,
}: {
  contractorId: string;
  projectId: string;
  fileName: string;
  contentType?: string | null;
  fileBuffer: Buffer;
}) {
  const safeName = sanitizeFileName(fileName);
  const storagePath = `${contractorId}/${WORKBOOK_STORAGE_PREFIX}/${projectId}/${Date.now()}-${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from(WORKBOOK_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      upsert: false,
      contentType: contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Failed to upload original workbook: ${error.message}`);
  }

  return storagePath;
}

export async function createOriginalWorkbookSignedUrl(storagePath: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabaseAdmin.storage
    .from(WORKBOOK_STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to create signed URL for original workbook: ${error.message}`);
  }

  return data.signedUrl;
}

async function downloadOriginalWorkbookFromStorage(storagePath: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(WORKBOOK_STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download original workbook: ${error?.message || 'Unknown error'}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deactivateProjectWorkbooks(projectId: string) {
  const { error } = await supabaseAdmin
    .from('boq_linked_workbooks')
    .update({ active: false })
    .eq('project_id', projectId)
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to deactivate previous linked workbooks: ${error.message}`);
  }
}

export async function getLatestActiveWorkbook(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('boq_linked_workbooks')
    .select('*')
    .eq('project_id', projectId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch linked workbook: ${error.message}`);
  }

  return data as LinkedBoqWorkbook | null;
}

export async function getLatestProjectBoq(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_boqs')
    .select(`
      id,
      project_id,
      contractor_id,
      upload_date,
      total_amount,
      file_name,
      created_at,
      boq_items (
        id,
        description,
        unit,
        quantity_text,
        quantity_numeric,
        rate,
        amount,
        category,
        line_order,
        measurement_input_unit,
        measurement_conversion_factor,
        notes
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active BOQ revision: ${error.message}`);
  }

  return data as any;
}

export async function createGoogleWorkingWorkbookFromStorage({
  workbookId,
  storagePath,
  originalFileName,
}: {
  workbookId: string;
  storagePath: string;
  originalFileName: string;
}) {
  const workbookBuffer = await downloadOriginalWorkbookFromStorage(storagePath);
  const driveApi = getGoogleDriveAPI();
  const safeFileName = sanitizeFileName(originalFileName);
  const payload = await driveApi.createEditableSpreadsheetFromExcel(
    workbookBuffer,
    safeFileName,
    `${GOOGLE_WORKBOOK_PARENT_FOLDER}/project-${workbookId}`
  );

  return {
    fileId: payload.fileId,
    driveId: null,
    siteId: null,
    webUrl: payload.webUrl,
    raw: payload,
  };
}

export async function downloadGoogleWorkbook(workbook: Pick<LinkedBoqWorkbook, 'provider_file_id'>) {
  if (!workbook.provider_file_id) {
    throw new Error('Linked workbook is missing Google file metadata');
  }

  const driveApi = getGoogleDriveAPI();
  return driveApi.exportSpreadsheetAsXlsx(workbook.provider_file_id);
}

export function buildProjectBoqFromWorkbookBuffer({
  workbookBuffer,
  projectId,
  contractorId,
  fileName,
}: {
  workbookBuffer: Buffer;
  projectId: string;
  contractorId: string;
  fileName: string;
}): {
  boq: ProjectBOQ;
  totalSheets: number;
  rowsAnalyzed: number;
  sectionsDetected: number;
} {
  const { sheets, totalSheets } = parseMultiSheetWorkbookBuffer(workbookBuffer);
  const rows = parseExcelToBOQRows(sheets);
  const sections = organizeIntoSections(rows);
  const totals = calculateTotals(sections);

  const items = rows
    .filter(row => row.description.trim() !== '' || row.type === 'spacer')
    .map((row, index) => ({
      description: row.description,
      unit: row.unit,
      quantity: row.quantity,
      rate: row.rate,
      amount: row.amount,
      rowType: row.type,
      indentLevel: row.indentLevel || 0,
      confidence: row.confidence,
      sectionId: row.sectionId,
      displayOrder: index + 1,
    }));

  const boq: ProjectBOQ = {
    projectId,
    contractorId,
    uploadDate: new Date().toISOString(),
    items,
    sections,
    rows,
    totalAmount: totals.totalAmount,
    calculatedAmount: totals.calculatedAmount,
    fileName,
    hasDiscrepancies: totals.hasDiscrepancies,
  };

  return {
    boq,
    totalSheets,
    rowsAnalyzed: rows.length,
    sectionsDetected: sections.length,
  };
}
