import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      fileUrl,
      fileName,
      projectType,
      expectedMaterials,
      availableMaterials
    } = body;

    if (!fileUrl || !fileName) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileUrl and fileName' 
      }, { status: 400 });
    }

    // Use Google's Gemini API for superior drawing analysis
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ 
        error: 'Drawing analyzer not configured. Please add GEMINI_API_KEY to environment variables.' 
      }, { status: 500 });
    }

    // Build context for the AI (simplified for now)
    // const materialsList = availableMaterials?.map((m: any) => `${m.name} (${m.unit})`).join(', ') || '';
    // const expectedMaterialsList = expectedMaterials?.join(', ') || '';

    const prompt = `CASCADING DRAWING ANALYSIS REPORT - Follow this structured approach:

FOCUS MATERIALS: ${expectedMaterials?.join(', ') || 'structural steel components'}

STEP 1: ZONE IDENTIFICATION
First, quickly identify these zones in the drawing:
- Zone A: MEMBER SIZE table (highest priority)
- Zone B: FRAMING PLAN/main structural view (high priority) 
- Zone C: Detail sections and connections (medium priority)

STEP 2: CASCADING ANALYSIS
Analyze each zone in priority order and provide detailed reports:

PRIORITY 1 - MEMBER TABLE ANALYSIS:
- Locate and read the member size table
- Report each member mark (C1, B1, etc.) with specifications
- Note material grades and section properties
- Confidence level for this data

PRIORITY 2 - PLAN VIEW ANALYSIS:
- Count structural elements visible in the main plan
- Read major dimensions (convert mm to meters)
- Match visible elements to member marks from the table
- Estimate total quantities based on layout patterns
- Confidence level for counts and dimensions

PRIORITY 3 - DETAILS ANALYSIS (if needed):
- Examine connection details for bolts, plates, hardware
- Note specifications, sizes, and quantities where visible
- Describe connection configurations
- Confidence level for detail interpretations

FINAL REPORT SUMMARY:
- Key quantities and specifications found
- Overall confidence assessment
- Recommendations for quantity takeoff

Please provide a clear, structured report that follows this cascading approach.`;

    try {

      // First, fetch the file to get it as base64 for Gemini
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch the drawing file');
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      
      // Check file size (Gemini has limits)
      const fileSizeMB = fileBuffer.byteLength / (1024 * 1024);
      console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
      
      if (fileSizeMB > 20) {
        throw new Error('File too large. Please use files smaller than 20MB for analysis.');
      }
      
      const base64File = Buffer.from(fileBuffer).toString('base64');
      console.log(`Base64 file size: ${(base64File.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Determine MIME type
      const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
      console.log(`MIME type: ${mimeType}`);

      // Call Gemini API using the latest flash model that supports vision
      console.log('Sending request to Gemini API...');
      const startTime = Date.now();
      
      // Create abort controller for timeout - increased to 120 seconds for complex drawings
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64File
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 16384,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      console.log(`Gemini API request completed in ${endTime - startTime}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Gemini API Response:', JSON.stringify(result, null, 2));
      
      const aiContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiContent) {
        console.error('No AI content found. Full response:', result);
        
        // Check for safety concerns or other issues
        if (result.candidates?.[0]?.finishReason) {
          throw new Error(`Gemini stopped generation: ${result.candidates[0].finishReason}. This might be due to safety filters or content policies.`);
        }
        
        throw new Error('No response from Gemini AI service. Check console for full response details.');
      }

      // Save the analysis report as-is
      const analysisReport = aiContent;
      
      // TODO: JSON parsing for structured data (commented out for future use)
      /*
      let extractedItems = [];
      try {
        // Look for JSON object with zones
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const structuredData = JSON.parse(jsonMatch[0]);
          
          // Flatten zone data into items array
          const allZones = ['memberTable', 'planView', 'details'];
          allZones.forEach(zone => {
            if (structuredData[zone] && Array.isArray(structuredData[zone])) {
              structuredData[zone].forEach((item: any) => {
                extractedItems.push({
                  ...item,
                  zone: zone,
                  source: `Extracted from ${zone} section`
                });
              });
            }
          });
        } else {
          // Fallback: Try to parse as simple array (backwards compatibility)
          const arrayMatch = aiContent.match(/\[([\s\S]*?)\]/);
          if (arrayMatch) {
            extractedItems = JSON.parse(arrayMatch[0]);
          }
        }

        // Validate and clean the extracted items
        extractedItems = extractedItems.filter((item: any) => 
          item && typeof item === 'object' && (item.materialName || item.section || item.mark)
        ).map((item: any) => ({
          materialName: item.materialName || item.section || item.mark || '',
          description: item.description || item.materialName || item.section || 'Component from drawing',
          nos: Number(item.nos) || Number(item.count) || 1,
          length: Number(item.length) || 1,
          breadth: Number(item.breadth) || 1,  
          height: Number(item.height) || 1,
          unit: item.unit || (item.materialName?.toLowerCase().includes('plate') ? 'kg' : 
                              item.materialName?.toLowerCase().includes('bolt') ? 'nos' : 'kg'),
          quantity: Number(item.quantity) || Number(item.nos) || Number(item.count) || 1,
          confidence: item.confidence || 'medium',
          notes: item.notes || item.source || `Identified from ${fileName} using structured analysis`,
          zone: item.zone || 'unknown'
        }));

      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.log('AI Response:', aiContent);
        
        // Return the raw response for debugging
        return NextResponse.json({
          success: false,
          error: 'Failed to parse drawing analysis results',
          rawResponse: aiContent,
          message: 'The AI analyzed the drawing but returned data in an unexpected format. Please try again.'
        });
      }
      */

      return NextResponse.json({
        success: true,
        data: {
          analysisReport: analysisReport,
          fileName,
          projectType,
          analysisMethod: 'gemini-cascading-report',
          processingTime: endTime - startTime,
          reportGenerated: true
        }
      });

    } catch (error) {
      console.error('Drawing analysis error:', error);
      return NextResponse.json({
        success: false,
        error: 'Drawing analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to analyze the drawing. Please ensure the file is accessible and try again.'
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}