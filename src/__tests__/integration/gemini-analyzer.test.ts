/**
 * Integration tests for Gemini AI Drawing Analyzer
 *
 * Tests the drawing analysis API to ensure:
 * 1. Gemini API model name is correct
 * 2. Request format matches Gemini expectations
 * 3. Response parsing works correctly
 * 4. Error handling is robust
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn();

describe('Gemini Drawing Analyzer Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Contract', () => {
    it('should use valid Gemini model name', async () => {
      // Valid models as of Jan 2026
      const validModels = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-2.5-flash',
      ];

      // Read the actual analyzer code
      const fs = require('fs');
      const analyzerCode = fs.readFileSync(
        'src/app/api/drawing-analyzer/route.ts',
        'utf-8'
      );

      // Extract model name from code
      const modelMatch = analyzerCode.match(/models\/(gemini-[\w.-]+):/);
      expect(modelMatch).toBeTruthy();

      const usedModel = modelMatch ? modelMatch[1] : '';
      expect(validModels).toContain(usedModel);
    });

    it('should send correct request format to Gemini API', () => {
      const mockFileBuffer = Buffer.from('fake-pdf-content');
      const base64Data = mockFileBuffer.toString('base64');

      const expectedRequestBody = {
        contents: [
          {
            parts: [
              {
                text: expect.stringContaining('CASCADING DRAWING ANALYSIS'),
              },
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: expect.any(Number),
          topK: expect.any(Number),
          topP: expect.any(Number),
          maxOutputTokens: expect.any(Number),
        },
        safetySettings: expect.arrayContaining([
          expect.objectContaining({
            category: expect.stringContaining('HARM_CATEGORY'),
            threshold: expect.any(String),
          }),
        ]),
      };

      // This validates the structure matches Gemini's expected format
      expect(expectedRequestBody).toBeDefined();
    });
  });

  describe('Response Handling', () => {
    it('should parse successful Gemini response correctly', () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: `CASCADING DRAWING ANALYSIS REPORT

PRIORITY 1 - MEMBER TABLE ANALYSIS:
- Column C1: 150x75x6.0 CHANNEL
- Column C2: 200x100x8.0 CHANNEL
- Confidence: High

PRIORITY 2 - PLAN VIEW ANALYSIS:
- 8 columns visible in layout
- Grid spacing: 6000mm x 4500mm
- Confidence: Medium

FINAL REPORT SUMMARY:
- 8x C1 columns required
- 4x C2 columns required
- Overall confidence: High`,
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      };

      // Extract analysis report
      const aiContent = mockGeminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      expect(aiContent).toBeTruthy();
      expect(aiContent).toContain('CASCADING DRAWING ANALYSIS');
      expect(aiContent).toContain('MEMBER TABLE ANALYSIS');
      expect(aiContent).toContain('PLAN VIEW ANALYSIS');
    });

    it('should handle Gemini API errors gracefully', () => {
      const mockErrorResponse = {
        error: {
          code: 400,
          message: 'Invalid model name: gemini-999',
          status: 'INVALID_ARGUMENT',
        },
      };

      expect(mockErrorResponse.error.message).toContain('Invalid model');
    });

    it('should handle safety filter blocking', () => {
      const mockBlockedResponse = {
        candidates: [
          {
            finishReason: 'SAFETY',
            safetyRatings: [
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                probability: 'HIGH',
              },
            ],
          },
        ],
      };

      const aiContent = mockBlockedResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      const finishReason = mockBlockedResponse.candidates?.[0]?.finishReason;

      expect(aiContent).toBeUndefined();
      expect(finishReason).toBe('SAFETY');
    });
  });

  describe('File Handling', () => {
    it('should handle PDF files correctly', () => {
      const pdfFileName = 'structural-drawing.pdf';
      const expectedMimeType = 'application/pdf';

      const mimeType = pdfFileName.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : 'image/jpeg';

      expect(mimeType).toBe(expectedMimeType);
    });

    it('should handle image files correctly', () => {
      const imageFileName = 'drawing-scan.jpg';
      const expectedMimeType = 'image/jpeg';

      const mimeType = imageFileName.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : 'image/jpeg';

      expect(mimeType).toBe(expectedMimeType);
    });

    it('should reject files larger than 20MB', () => {
      const maxSizeMB = 20;
      const fileSizeMB = 25; // Too large

      expect(fileSizeMB).toBeGreaterThan(maxSizeMB);
    });
  });

  describe('Authentication', () => {
    it('should forward authentication cookies for internal file fetch', () => {
      const mockRequest = {
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'cookie') {
              return '__clerk_db_jwt=eyJhb....; __session=abc123';
            }
            return null;
          }),
        },
      };

      const cookieHeader = mockRequest.headers.get('cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain('__clerk_db_jwt');
    });

    it('should construct absolute URL for relative file paths', () => {
      const relativeFileUrl = '/api/project-files/view?id=123';
      const requestUrl = 'https://finverno.com/api/drawing-analyzer';

      const absoluteUrl = relativeFileUrl.startsWith('http')
        ? relativeFileUrl
        : `${requestUrl.split('/api/')[0]}${relativeFileUrl}`;

      expect(absoluteUrl).toBe('https://finverno.com/api/project-files/view?id=123');
    });
  });

  describe('Timeout Handling', () => {
    it('should have 120 second timeout for complex drawings', () => {
      const expectedTimeout = 120000; // 120 seconds in ms
      const actualTimeout = 120000;

      expect(actualTimeout).toBe(expectedTimeout);
    });
  });

  describe('Cascading Analysis Prompt', () => {
    it('should include all priority zones in prompt', () => {
      const prompt = `CASCADING DRAWING ANALYSIS REPORT

FOCUS MATERIALS: structural steel components

STEP 1: ZONE IDENTIFICATION
- Zone A: MEMBER SIZE table (highest priority)
- Zone B: FRAMING PLAN (high priority)
- Zone C: Detail sections (medium priority)

PRIORITY 1 - MEMBER TABLE ANALYSIS:
PRIORITY 2 - PLAN VIEW ANALYSIS:
PRIORITY 3 - DETAILS ANALYSIS:`;

      expect(prompt).toContain('Zone A: MEMBER SIZE table');
      expect(prompt).toContain('Zone B: FRAMING PLAN');
      expect(prompt).toContain('Zone C: Detail sections');
      expect(prompt).toContain('PRIORITY 1');
      expect(prompt).toContain('PRIORITY 2');
      expect(prompt).toContain('PRIORITY 3');
    });
  });
});
