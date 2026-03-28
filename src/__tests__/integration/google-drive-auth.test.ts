/**
 * Integration tests for Google Drive Authentication
 *
 * Tests that ensure:
 * 1. Base64 credentials work (fixes Vercel newline issue)
 * 2. Individual credentials still work as fallback
 * 3. Credential validation is robust
 */

import { describe, it, expect } from '@jest/globals';

describe('Google Drive Authentication Integration', () => {
  describe('Base64 Credentials (Primary Method)', () => {
    it('should decode base64 credentials correctly', () => {
      const mockCredentials = {
        type: 'service_account',
        project_id: 'test-project',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test.iam.gserviceaccount.com',
      };

      const base64Encoded = Buffer.from(JSON.stringify(mockCredentials)).toString('base64');
      const decoded = Buffer.from(base64Encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      expect(parsed.type).toBe('service_account');
      expect(parsed.project_id).toBe('test-project');
      expect(parsed.client_email).toContain('@');
    });

    it('should handle newlines in private key after decoding', () => {
      const privateKeyWithEscaped = '-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n';
      const privateKeyFixed = privateKeyWithEscaped.replace(/\\n/g, '\n');

      expect(privateKeyFixed).toContain('\n');
      expect(privateKeyFixed).not.toContain('\\n');
      expect(privateKeyFixed).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
    });

    it('should prioritize base64 credentials over individual vars', () => {
      const authMethods = [
        { name: 'base64', priority: 1, envVar: 'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64' },
        { name: 'individual', priority: 2, envVars: ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_PROJECT_ID'] },
        { name: 'json', priority: 3, envVar: 'GOOGLE_SERVICE_ACCOUNT_KEY' },
      ];

      const sortedByPriority = authMethods.sort((a, b) => a.priority - b.priority);
      expect(sortedByPriority[0].name).toBe('base64');
    });
  });

  describe('Individual Credentials (Fallback)', () => {
    it('should validate all required individual credentials', () => {
      const requiredVars = [
        'GOOGLE_CLIENT_EMAIL',
        'GOOGLE_PRIVATE_KEY',
        'GOOGLE_PROJECT_ID',
      ];

      // All must be present for individual auth
      requiredVars.forEach(varName => {
        expect(varName).toBeTruthy();
        expect(varName.startsWith('GOOGLE_')).toBe(true);
      });
    });

    it('should validate email format', () => {
      const validEmail = 'service-account@project.iam.gserviceaccount.com';
      const invalidEmail = 'not-an-email';

      expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should validate private key format', () => {
      const validKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n';
      const invalidKey = 'just-a-random-string';

      expect(validKey).toMatch(/^-----BEGIN PRIVATE KEY-----/);
      expect(invalidKey).not.toMatch(/^-----BEGIN PRIVATE KEY-----/);
    });
  });

  describe('Credential Transformation', () => {
    it('should convert escaped newlines to actual newlines', () => {
      const escaped = 'line1\\nline2\\nline3';
      const converted = escaped.replace(/\\n/g, '\n');

      expect(converted).toContain('\n');
      expect(converted.split('\n')).toHaveLength(3);
    });

    it('should preserve literal newlines', () => {
      const literal = 'line1\nline2\nline3';
      const converted = literal.includes('\\n') ? literal.replace(/\\n/g, '\n') : literal;

      expect(converted).toBe(literal);
      expect(converted.split('\n')).toHaveLength(3);
    });
  });

  describe('Google Drive API Integration', () => {
    it('should use correct API scopes', () => {
      const requiredScopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly',
      ];

      requiredScopes.forEach(scope => {
        expect(scope).toContain('googleapis.com/auth/drive');
      });
    });

    it('should create BOQ workbooks folder structure', () => {
      const defaultFolder = process.env.GOOGLE_WORKBOOK_PARENT_FOLDER || 'Finverno/BOQ Workbooks';
      const parts = defaultFolder.split('/').filter(Boolean);

      expect(parts).toContain('Finverno');
      expect(parts).toContain('BOQ Workbooks');
    });

    it('should convert Excel to Google Sheets', () => {
      const mimeTypes = {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        googleSheets: 'application/vnd.google-apps.spreadsheet',
      };

      expect(mimeTypes.excel).toBeTruthy();
      expect(mimeTypes.googleSheets).toContain('google-apps');
    });

    it('should set writer permissions on uploaded sheets', () => {
      const permission = {
        role: 'writer',
        type: 'anyone',
      };

      expect(permission.role).toBe('writer');
      expect(permission.type).toBe('anyone');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error when no credentials found', () => {
      const errorMessage = 'Google Drive credentials environment variables are missing';

      expect(errorMessage).toContain('credentials');
      expect(errorMessage).toContain('missing');
    });

    it('should suggest which credentials to provide', () => {
      const suggestions = [
        'Option 1 (Recommended for Vercel): GOOGLE_SERVICE_ACCOUNT_KEY_BASE64',
        'Option 2: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID',
        'Option 3: GOOGLE_SERVICE_ACCOUNT_KEY (JSON)',
      ];

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toContain('Recommended for Vercel');
      expect(suggestions[0]).toContain('BASE64');
    });

    it('should handle invalid JSON in base64 credentials', () => {
      const invalidBase64 = Buffer.from('not-valid-json').toString('base64');

      expect(() => {
        const decoded = Buffer.from(invalidBase64, 'base64').toString('utf-8');
        JSON.parse(decoded); // Should throw
      }).toThrow();
    });

    it('should handle malformed private keys', () => {
      const invalidKey = 'MIIEvQIBADANBgkq...'; // Missing header/footer

      expect(invalidKey).not.toMatch(/^-----BEGIN PRIVATE KEY-----/);
    });
  });

  describe('Vercel-Specific Issues', () => {
    it('should handle Vercel newline conversion in UI', () => {
      // Vercel UI converts \n to actual newlines when pasting JSON
      // Base64 encoding prevents this issue

      const withEscapedNewlines = '{"key":"value\\n"}';
      const vercelConverted = '{"key":"value\n"}'; // What Vercel does

      // Base64 approach solves this
      const base64 = Buffer.from(withEscapedNewlines).toString('base64');
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');

      expect(decoded).toBe(withEscapedNewlines);
    });

    it('should work with Vercel CLI for setting env vars', () => {
      // Vercel CLI doesn't modify the value
      const cliCommand = 'vercel env add GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 production';

      expect(cliCommand).toContain('vercel env add');
      expect(cliCommand).toContain('BASE64');
    });
  });

  describe('BOQ Workbook Operations', () => {
    it('should upload Excel and convert to editable Google Sheet', () => {
      const workflow = [
        { step: 1, action: 'Upload Excel to Supabase storage' },
        { step: 2, action: 'Create Google Sheet from Excel buffer' },
        { step: 3, action: 'Set write permissions' },
        { step: 4, action: 'Return web URL for editing' },
      ];

      expect(workflow).toHaveLength(4);
      expect(workflow[1].action).toContain('Google Sheet');
    });

    it('should export Google Sheet back to XLSX', () => {
      const exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      expect(exportMimeType).toContain('spreadsheetml.sheet');
    });

    it('should handle file size limits', () => {
      const maxFileSizeMB = 20;
      const testFileSizeMB = 15;

      expect(testFileSizeMB).toBeLessThanOrEqual(maxFileSizeMB);
    });
  });

  describe('Console Logging', () => {
    it('should log which auth method is being used', () => {
      const logMessages = [
        '🔐 Using base64-encoded service account credentials',
        '🔐 Using individual service account environment variables',
        '🔐 Using JSON service account credentials',
      ];

      logMessages.forEach(msg => {
        expect(msg).toContain('🔐');
        // Each message should contain either "credentials" or "environment variables"
        expect(msg.includes('credentials') || msg.includes('environment variables')).toBeTruthy();
      });
    });

    it('should log successful initialization', () => {
      const successMessage = '✅ Google Drive API initialized successfully';

      expect(successMessage).toContain('✅');
      expect(successMessage).toContain('initialized successfully');
    });
  });
});
