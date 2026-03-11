import { z, ZodError } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Validation error response format
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format Zod validation errors into a user-friendly structure
 */
export function formatValidationErrors(error: ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Validate request body against a Zod schema
 * Returns parsed data on success, or NextResponse with error on failure
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = formatValidationErrors(error);
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: errors,
          },
          { status: 400 }
        ),
      };
    }
    // Unexpected error
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Async version of validateRequest for use with request.json()
 */
export async function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  return validateRequest(schema, body);
}

/**
 * Re-export validation schemas for convenient imports
 */
export * from './common';
export * from './purchase-requests';
export * from './capital';
export * from './delivery';
