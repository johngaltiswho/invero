/**
 * Environment Variable Validator
 *
 * Validates that all required environment variables are present and properly formatted.
 * Fails fast on startup if any critical configuration is missing.
 *
 * Usage: Import this file early in your application bootstrap
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Next.js
  NODE_ENV: z.enum(['development', 'test', 'production']),

  // Supabase (Critical)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),

  // Clerk Authentication (Critical)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key required'),

  // Google Drive & Sheets (Critical for BOQ)
  GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: z.string().min(1, 'Google service account base64 key required').optional(),
  GOOGLE_CLIENT_EMAIL: z.string().email('Invalid Google client email').optional(),
  GOOGLE_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_PROJECT_ID: z.string().min(1).optional(),
  GOOGLE_WORKBOOK_PARENT_FOLDER_ID: z.string().optional(),
  GOOGLE_WORKBOOK_PARENT_FOLDER: z.string().optional(),

  // AI Services (Critical for drawing analysis)
  GEMINI_API_KEY: z.string().min(1, 'Gemini API key required'),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key required').optional(),

  // Email (AWS SES)
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS access key required').optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS secret key required').optional(),
  AWS_SES_REGION: z.string().min(1, 'AWS SES region required').optional(),
  EMAIL_FROM: z.string().email('Invalid from email').optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_REPLY_TO: z.string().email('Invalid reply-to email').optional(),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
});

// Derived type from schema
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed config
 * Throws descriptive error if validation fails
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues.map(err => {
      return `  - ${err.path.join('.')}: ${err.message}`;
    });

    console.error('\n❌ Environment variable validation failed:\n');
    console.error(errors.join('\n'));
    console.error('\n💡 Check your .env.local file and Vercel environment variables\n');

    throw new Error(`Invalid environment configuration. See errors above.`);
  }

  // Additional custom validations
  const env = parsed.data;

  // Google Drive must have either base64 key OR individual credentials
  const hasGoogleBase64 = !!env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const hasGoogleIndividual = !!(env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PROJECT_ID);

  if (!hasGoogleBase64 && !hasGoogleIndividual) {
    throw new Error(
      'Google Drive credentials missing. Provide either:\n' +
      '  1. GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 (recommended for Vercel)\n' +
      '  OR\n' +
      '  2. GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY + GOOGLE_PROJECT_ID'
    );
  }

  // Email configuration check (all or none)
  const emailVars = [env.AWS_ACCESS_KEY_ID, env.AWS_SECRET_ACCESS_KEY, env.AWS_SES_REGION, env.EMAIL_FROM];
  const hasAnyEmail = emailVars.some(v => !!v);
  const hasAllEmail = emailVars.every(v => !!v);

  if (hasAnyEmail && !hasAllEmail) {
    throw new Error(
      'Incomplete email configuration. When using AWS SES, all of these are required:\n' +
      '  - AWS_ACCESS_KEY_ID\n' +
      '  - AWS_SECRET_ACCESS_KEY\n' +
      '  - AWS_SES_REGION\n' +
      '  - EMAIL_FROM'
    );
  }

  console.log('✅ Environment validation passed');
  return env;
}

/**
 * Get validated environment config
 * Memoized to validate only once
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get required env var or throw
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional env var with default
 */
export function getEnvOr(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
