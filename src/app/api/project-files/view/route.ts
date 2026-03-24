import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    const download = searchParams.get('download') === '1';

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const { data: fileRecord, error: fetchError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .eq('contractor_id', contractor.id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('contractor-documents')
      .download(fileRecord.file_path);

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        {
          error: 'Failed to fetch file',
          details: downloadError?.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

    const buffer = await fileBlob.arrayBuffer();
    const fileName = fileRecord.original_name || fileRecord.file_name || 'document';
    const contentType = fileRecord.mime_type || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
