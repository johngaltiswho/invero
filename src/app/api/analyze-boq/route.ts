import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔍 Fetching BOQ data for project:', projectId);

    // First check if project has BOQ record
    const { data: projectBOQ, error: boqError } = await supabase
      .from('project_boqs')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (boqError || !projectBOQ) {
      return NextResponse.json({ 
        error: 'No BOQ record found for this project',
        details: boqError?.message,
        hint: 'Please upload BOQ data first'
      }, { status: 404 });
    }

    // Fetch BOQ items for the project
    const { data: boqItems, error: itemsError } = await supabase
      .from('boq_items')
      .select('*')
      .eq('boq_id', projectBOQ.id);

    if (itemsError || !boqItems || boqItems.length === 0) {
      return NextResponse.json({ 
        error: 'No BOQ items found for this project',
        details: itemsError?.message 
      }, { status: 404 });
    }

    console.log('📊 Found BOQ items:', boqItems.length, 'items');

    // Fetch available materials from our database
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('id, name, description, category, unit, current_price')
      .eq('is_active', true);

    if (materialsError || !materials) {
      return NextResponse.json({ 
        error: 'Failed to fetch materials database',
        details: materialsError?.message 
      }, { status: 500 });
    }

    console.log('🏗️ Found materials in database:', materials.length, 'items');

    // Prepare BOQ data for AI analysis
    const boqItemsForAI = boqItems.map(item => ({
      description: item.description,
      quantity: item.quantity_numeric || item.quantity_text,
      unit: item.unit,
      rate: item.rate
    }));

    // Create material database summary for AI
    const materialsSummary = materials.map(mat => ({
      id: mat.id,
      name: mat.name,
      description: mat.description,
      category: mat.category,
      unit: mat.unit,
      price: mat.current_price
    }));

    // Check if we already have analysis for this project (avoid re-analyzing)
    const { data: existingMappings } = await supabase
      .from('boq_material_mappings')
      .select('id')
      .eq('project_id', projectId)
      .limit(1);

    if (existingMappings && existingMappings.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'BOQ already analyzed. Use existing mappings.',
        mappings: [],
        stats: {
          boqItemsAnalyzed: 0,
          materialsIdentified: 0,
          availableMaterials: materials.length,
          cached: true
        }
      });
    }

    // Limit BOQ items to reduce API costs (process max 20 items per request)
    const limitedBoqItems = boqItemsForAI.slice(0, 20);
    console.log(`🤖 Sending ${limitedBoqItems.length} BOQ items to OpenAI (limited from ${boqItemsForAI.length})...`);

    // Optimized AI Prompt - reduced token usage
    const prompt = `Map BOQ items to materials from database. Return JSON only.

BOQ: ${JSON.stringify(limitedBoqItems)}
Materials: ${JSON.stringify(materialsSummary)}

Format:
{"mappings":[{"boq_item_description":"exact BOQ text","material_id":"UUID","material_name":"name","suggested_quantity":number,"reasoning":"brief why"}]}

Rules:
- Use only provided material_ids
- Calculate realistic quantities
- Skip if no match`;

    // Call OpenAI with cost optimizations
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Already using the cheapest model
      messages: [
        {
          role: "system",
          content: "You are a construction materials expert. Respond with valid JSON only. Be concise."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1500, // Reduced from 2000
      presence_penalty: 0, // Avoid repetition
      frequency_penalty: 0.1, // Slight penalty for repetition
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    console.log('🎯 AI Response received:', aiResponse.substring(0, 200) + '...');

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ 
        error: 'Invalid AI response format',
        details: aiResponse.substring(0, 500)
      }, { status: 500 });
    }

    // Validate the response structure
    if (!parsedResponse.mappings || !Array.isArray(parsedResponse.mappings)) {
      return NextResponse.json({ 
        error: 'Invalid AI response structure',
        details: 'Expected mappings array'
      }, { status: 500 });
    }

    console.log('✅ AI identified', parsedResponse.mappings.length, 'material mappings');

    // Store the mappings in database
    const mappingsToInsert = parsedResponse.mappings.map((mapping: any) => ({
      project_id: projectId,
      boq_item_description: mapping.boq_item_description,
      material_id: mapping.material_id,
      suggested_quantity: mapping.suggested_quantity,
      unit_cost: materials.find(m => m.id === mapping.material_id)?.current_price || 0,
      status: 'ai_suggested',
      ai_reasoning: mapping.reasoning,
      ai_model_version: 'gpt-4o-mini',
      confidence_score: 0.75 // Default confidence score
    }));

    // Clear existing mappings for this project
    await supabase
      .from('boq_material_mappings')
      .delete()
      .eq('project_id', projectId);

    // Insert new mappings
    const { error: insertError } = await supabase
      .from('boq_material_mappings')
      .insert(mappingsToInsert);

    if (insertError) {
      console.error('Failed to store mappings:', insertError);
      return NextResponse.json({ 
        error: 'Failed to store material mappings',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('💾 Stored', mappingsToInsert.length, 'material mappings in database');

    // Calculate approximate cost (GPT-4o-mini: $0.15/1M input + $0.60/1M output tokens)
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const estimatedCost = (inputTokens * 0.15 + outputTokens * 0.60) / 1000000;

    console.log('💰 OpenAI usage:', {
      inputTokens,
      outputTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    return NextResponse.json({
      success: true,
      message: `Successfully analyzed ${limitedBoqItems.length} BOQ items and identified ${parsedResponse.mappings.length} material mappings`,
      mappings: parsedResponse.mappings,
      stats: {
        boqItemsAnalyzed: limitedBoqItems.length,
        totalBoqItems: boqItems.length,
        materialsIdentified: parsedResponse.mappings.length,
        availableMaterials: materials.length,
        tokensUsed: { input: inputTokens, output: outputTokens },
        estimatedCost: `$${estimatedCost.toFixed(4)}`
      }
    });

  } catch (error) {
    console.error('💥 Error in BOQ analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze BOQ',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}