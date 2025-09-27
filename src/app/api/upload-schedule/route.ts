import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile, parseExcelToSchedule } from '@/lib/excel-parser';
import { saveScheduleToSupabase } from '@/lib/supabase-boq';

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
    
    // Convert to Schedule format
    const schedule = parseExcelToSchedule(sheetData, projectId, contractorId, file.name);

    // Validate Schedule data
    if (!schedule.tasks || schedule.tasks.length === 0) {
      return NextResponse.json(
        { error: 'No valid schedule tasks found in the uploaded file' },
        { status: 400 }
      );
    }

    // Save to Supabase
    const savedSchedule = await saveScheduleToSupabase(schedule);

    return NextResponse.json({
      success: true,
      message: 'Schedule uploaded successfully',
      data: savedSchedule
    });

  } catch (error) {
    console.error('Schedule upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload schedule' },
      { status: 500 }
    );
  }
}