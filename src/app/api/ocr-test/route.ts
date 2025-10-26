import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { fileUrl, fileName } = body;

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL required' }, { status: 400 });
    }

    // Use Google Cloud Vision API for OCR
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    try {
      // Fetch the file
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file');
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      const base64File = Buffer.from(fileBuffer).toString('base64');
      const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

      console.log('Extracting text with OCR...');
      const startTime = Date.now();

      // Use Gemini for text extraction only
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Extract ALL text from this fabrication drawing. Return only the extracted text, preserving layout and spacing as much as possible. Include all dimensions, material specifications, notes, and table data." },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64File
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 4096,
          }
        })
      });

      const endTime = Date.now();
      console.log(`OCR completed in ${endTime - startTime}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!extractedText) {
        throw new Error('No text extracted from document');
      }

      return NextResponse.json({
        success: true,
        data: {
          extractedText,
          fileName,
          processingTime: endTime - startTime,
          method: 'gemini-ocr'
        }
      });

    } catch (error) {
      console.error('OCR error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to extract text',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}