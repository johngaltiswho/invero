import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile, parseExcelToBOQ } from '@/lib/excel-parser';
import { saveBOQToSupabase } from '@/lib/supabase-boq';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const contractorId = formData.get('contractorId') as string;

    if (!file || !projectId || !contractorId) {
      return NextResponse.json(
        { error: 'File, projectId, and contractorId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      return NextResponse.json(
        { error: 'Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Parse Excel file
    const sheetData = await parseExcelFile(file);
    
    // Convert to BOQ format
    const boq = parseExcelToBOQ(sheetData, projectId, contractorId, file.name);

    // Validate BOQ data
    if (!boq.items || boq.items.length === 0) {
      return NextResponse.json(
        { error: 'No valid BOQ items found in the uploaded file' },
        { status: 400 }
      );
    }

    // Save to Supabase
    const savedBOQ = await saveBOQToSupabase(boq);

    return NextResponse.json({
      success: true,
      message: 'BOQ uploaded successfully',
      data: savedBOQ
    });

  } catch (error) {
    console.error('BOQ upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload BOQ' },
      { status: 500 }
    );
  }
}