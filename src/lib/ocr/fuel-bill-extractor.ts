/**
 * Fuel Bill OCR Extraction using Google Gemini API
 * Extracts structured data from fuel bill images
 */

export interface FuelBillData {
  bill_number: string | null;
  bill_date: string | null; // YYYY-MM-DD format
  pump_name: string | null;
  fuel_type: 'Petrol' | 'Diesel' | null;
  quantity_liters: number | null;
  rate_per_liter: number | null;
  total_amount: number | null;
}

export interface ExtractFuelBillSuccess {
  success: true;
  data: FuelBillData;
  raw_response: string;
}

export interface ExtractFuelBillFailure {
  success: false;
  error: string;
}

export type ExtractFuelBillResult = ExtractFuelBillSuccess | ExtractFuelBillFailure;

/**
 * Extracts structured fuel bill data from an image URL using Gemini API
 * @param imageUrl - Public URL of the fuel bill image (from Supabase Storage)
 * @returns Structured fuel bill data or error
 */
export async function extractFuelBillData(
  imageUrl: string
): Promise<ExtractFuelBillResult> {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY not configured',
      };
    }

    // Fetch the image from storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return {
        success: false,
        error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`,
      };
    }

    // Convert to base64
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Prompt for structured JSON extraction
    const prompt = `Extract fuel bill details from this image. Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "bill_number": "invoice/bill number (string or null)",
  "bill_date": "date in YYYY-MM-DD format (string or null)",
  "pump_name": "fuel pump/station name (string or null)",
  "fuel_type": "Petrol or Diesel (string or null)",
  "quantity_liters": numeric value for liters (number or null),
  "rate_per_liter": numeric value for rate per liter (number or null),
  "total_amount": numeric total amount (number or null)
}

Important:
- Use null if field not found or unclear
- For bill_date, convert any date format to YYYY-MM-DD
- For fuel_type, only use "Petrol" or "Diesel" (exact case)
- For numeric fields, extract only the number value (no currency symbols)`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0, // Deterministic output for structured extraction
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return {
        success: false,
        error: `Gemini API error: ${geminiResponse.status} - ${errorText}`,
      };
    }

    const geminiResult = await geminiResponse.json();
    const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return {
        success: false,
        error: 'No response from Gemini API',
      };
    }

    // Clean up response (remove markdown code blocks if present)
    const cleanedJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    let parsedData: FuelBillData;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Raw response: ${cleanedJson}`,
      };
    }

    // Validate basic structure
    if (typeof parsedData !== 'object' || parsedData === null) {
      return {
        success: false,
        error: 'Invalid response format from OCR',
      };
    }

    // Return success with structured data
    return {
      success: true,
      data: parsedData,
      raw_response: responseText,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
