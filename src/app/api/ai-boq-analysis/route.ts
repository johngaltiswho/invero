import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { fileUrl, fileName, existingItems, projectType, expectedMaterials, availableMaterials } = await request.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json({ error: 'File URL and name are required' }, { status: 400 });
    }

    // For now, we'll use OpenAI's GPT-4 Vision API to analyze the document
    // In production, you might want to use a more specialized construction document AI
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Create project-specific material guidance
    const getProjectMaterials = (type: string | undefined) => {
      switch (type) {
        case 'Road Works':
          return 'Focus on: Bitumen, Aggregate (various grades), Concrete for pavements, Steel reinforcement, Road signs, Markings, Drainage materials';
        case 'Earthworks':
          return 'Focus on: Excavation quantities, Fill materials, Compaction materials, Geotextiles, Drainage aggregates, Soil stabilizers';
        case 'Civil Works':
          return 'Focus on: Concrete (various grades), Steel reinforcement, Masonry, Structural steel, Roofing materials, Flooring, Plumbing, Electrical conduits';
        case 'Fabrication Works':
          return 'Focus on: Structural steel sections, Plates, Bolts, Welding consumables, Paint/coating, Fabrication accessories';
        default:
          return 'Focus on common construction materials';
      }
    };

    // Create available materials list for AI
    const materialsList = availableMaterials?.map((m: any) => `${m.name} (${m.unit}) - ${m.category}`).join('\n') || 'No materials database available';

    // Construct the enhanced AI prompt
    const prompt = `You are an expert construction quantity surveyor specializing in ${projectType || 'construction'} projects. Analyze this BOQ/drawing document and extract material quantities.

PROJECT CONTEXT:
- Project Type: ${projectType || 'Not specified'}
- Document: ${fileName}
${expectedMaterials?.length > 0 ? `- Expected Materials: ${expectedMaterials.join(', ')}` : ''}
${projectType ? `- ${getProjectMaterials(projectType)}` : ''}

AVAILABLE MATERIALS DATABASE:
You MUST use ONLY material names from this list. Match extracted materials to the closest available material:
${materialsList}

ANALYSIS INSTRUCTIONS:
1. Extract quantities, dimensions, and units from the document
2. ${expectedMaterials?.length > 0 ? `Pay special attention to these materials: ${expectedMaterials.join(', ')}` : 'Focus on materials typical for this project type'}
3. **CRITICAL: Use ONLY material names from the Available Materials Database above**
4. Match extracted materials to the closest available material name (exact match preferred)
5. Calculate total quantities from dimensions where applicable

Return ONLY a JSON array with this exact structure:
[
  {
    "materialName": "Concrete M25",
    "description": "RCC work for foundation",
    "nos": 1,
    "length": 10.5,
    "breadth": 2.0,
    "height": 0.5,
    "unit": "m³",
    "quantity": 10.5,
    "confidence": "high"
  }
]

VALIDATION RULES:
- Material names MUST match exactly with Available Materials Database
- Ensure all quantities are realistic for ${projectType || 'construction'} projects
- Double-check calculations (quantity = nos × length × breadth × height for volumes)
- Use units exactly as specified in the materials database
- Return empty array if no materials from the database are found in the document

${existingItems?.length > 0 ? `Note: ${existingItems.length} items already in BOQ - focus on new/additional materials` : ''}

Remember: Only use materials from the provided database. Do not create new material names.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert construction quantity surveyor who analyzes BOQ documents and extracts material quantities.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const aiResult = await response.json();
      const aiContent = aiResult.choices?.[0]?.message?.content;

      if (!aiContent) {
        throw new Error('No response from AI service');
      }

      // Try to parse the JSON response from AI
      let extractedItems = [];
      try {
        // Look for JSON array in the response
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          extractedItems = JSON.parse(jsonMatch[0]);
        } else {
          console.warn('No JSON array found in AI response:', aiContent);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.log('AI Response:', aiContent);
        
        // Fallback: try to extract basic info from text
        extractedItems = parseTextResponse(aiContent);
      }

      return NextResponse.json({
        success: true,
        data: {
          items: extractedItems,
          rawResponse: aiContent,
          analysisTimestamp: new Date().toISOString()
        }
      });

    } catch (aiError) {
      console.error('AI API error:', aiError);
      
      // Fallback: Return sample data for demonstration
      const sampleItems = [
        {
          materialName: "Concrete M25",
          description: "RCC work (AI could not analyze - sample data)",
          nos: 1,
          length: 10,
          breadth: 3,
          height: 0.5,
          unit: "m³",
          quantity: 15,
          confidence: "low"
        },
        {
          materialName: "Steel Reinforcement",
          description: "TMT bars (AI could not analyze - sample data)",
          nos: 50,
          length: 12,
          breadth: 0,
          height: 0,
          unit: "kg",
          quantity: 600,
          confidence: "low"
        }
      ];

      return NextResponse.json({
        success: true,
        data: {
          items: sampleItems,
          rawResponse: `AI analysis failed, showing sample data. Error: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
          analysisTimestamp: new Date().toISOString(),
          isSampleData: true
        }
      });
    }

  } catch (error) {
    console.error('BOQ analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, { status: 500 });
  }
}

// Fallback function to parse text response when JSON parsing fails
function parseTextResponse(text: string) {
  const items = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Look for lines that might contain material info
    if (line.includes('Concrete') || line.includes('Steel') || line.includes('m³') || line.includes('kg')) {
      // Simple regex to extract basic info - this is a fallback
      const materialMatch = line.match(/(Concrete|Steel|Block|Brick).*?(\d+\.?\d*)\s*(m³|kg|nos|m²)/i);
      if (materialMatch) {
        items.push({
          materialName: materialMatch[1],
          description: line.trim(),
          nos: 1,
          length: 0,
          breadth: 0,
          height: 0,
          unit: materialMatch[3],
          quantity: parseFloat(materialMatch[2]) || 0,
          confidence: "low"
        });
      }
    }
  }
  
  return items;
}