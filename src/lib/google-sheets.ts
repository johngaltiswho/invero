import { google } from 'googleapis';

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CONTRACTORS_SHEET = 'Contractors';
const PROJECTS_SHEET = 'Projects';
const CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Alternative: Individual environment variables (more reliable)
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface GoogleSheetsConfig {
  spreadsheetId: string;
  credentials: string;
}

class GoogleSheetsAPI {
  private sheets: any;
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      // Try API key first (most reliable for public sheets)
      if (GOOGLE_API_KEY) {
        this.sheets = google.sheets({ 
          version: 'v4', 
          auth: GOOGLE_API_KEY 
        });
        return;
      }

      // Try individual environment variables (for service account)
      if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_PROJECT_ID) {
        // Fix private key format
        const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        const auth = new google.auth.JWT(
          GOOGLE_CLIENT_EMAIL,
          undefined,
          privateKey,
          ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        this.sheets = google.sheets({ version: 'v4', auth });
        return;
      }

      // Fallback to JSON credentials
      const credentials = JSON.parse(this.config.credentials);
      
      // Fix potential issues with private key encoding
      if (credentials.private_key) {
        // Ensure proper line breaks in private key
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        
        // Log key info for debugging (without exposing actual key)
        console.log('🔑 JSON credentials info:', {
          hasPrivateKey: !!credentials.private_key,
          keyLength: credentials.private_key.length,
          startsWithBegin: credentials.private_key.startsWith('-----BEGIN'),
          endsWithEnd: credentials.private_key.endsWith('-----END PRIVATE KEY-----\n') || credentials.private_key.endsWith('-----END PRIVATE KEY-----'),
          clientEmail: credentials.client_email,
          projectId: credentials.project_id
        });
      }

      // Try multiple authentication approaches
      let auth;
      
      try {
        // Primary approach: Direct credentials
        console.log('🔄 Trying direct credentials authentication...');
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        // Direct credentials successful
      } catch (directError) {
        // Fallback: JWT Client
        auth = new google.auth.JWT(
          credentials.client_email,
          undefined,
          credentials.private_key,
          ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );
      }

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('💥 Failed to initialize Google Sheets auth:', error);
      throw new Error(`Google Sheets authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSheetData(sheetName: string, range: string = 'A:Z'): Promise<any[][]> {
    try {
      const sheetRange = `${sheetName}!${range}`;
      
      console.log(`🔍 Attempting to fetch from sheet: ${this.config.spreadsheetId}, range: ${sheetRange}`);
      
      // Skip authentication test - API key auth works without explicit testing
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: sheetRange,
      });

      console.log(`✅ Successfully fetched ${response.data.values?.length || 0} rows from ${sheetName}`);
      return response.data.values || [];
    } catch (error) {
      // If range parsing fails, try to get available sheet names
      if ((error as any)?.code === 400 && (error as any)?.message?.includes('Unable to parse range')) {
        console.log(`Sheet "${sheetName}" not found, checking available sheets...`);
        await this.listSheetNames();
        
        // Try with the first sheet (default name is usually "Sheet1") for contractors
        if (sheetName === CONTRACTORS_SHEET) {
          try {
            console.log('Trying with Sheet1 for contractors...');
            const response = await this.sheets.spreadsheets.values.get({
              spreadsheetId: this.config.spreadsheetId,
              range: 'Sheet1!A:Z',
            });
            console.log(`Successfully fetched ${response.data.values?.length || 0} rows from Sheet1`);
            return response.data.values || [];
          } catch (sheet1Error) {
            console.error('Sheet1 also failed:', sheet1Error);
          }
        }
      }
      
      console.error('Detailed Google Sheets error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        details: (error as any)?.response?.data,
        spreadsheetId: this.config.spreadsheetId,
        sheetName: sheetName,
      });
      
      if (error instanceof Error) {
        throw new Error(`Google Sheets API Error: ${error.message}`);
      }
      throw new Error('Failed to fetch data from Google Sheets - Unknown error');
    }
  }

  async listSheetNames(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });
      
      const sheetNames = response.data.sheets?.map(sheet => sheet.properties?.title) || [];
      console.log('Available sheet names:', sheetNames);
      console.log(`💡 Please ensure you have sheets named: "Contractors" and "Projects"`);
    } catch (error) {
      console.error('Could not list sheet names:', error);
    }
  }

  async getContractorData(): Promise<any[][]> {
    return this.getSheetData(CONTRACTORS_SHEET, 'A:AC');
  }

  async getProjectData(): Promise<any[][]> {
    return this.getSheetData(PROJECTS_SHEET, 'A:N');
  }

  // Write data methods
  async appendToSheet(sheetName: string, values: any[][]): Promise<void> {
    try {
      console.log(`📝 Appending data to sheet: ${sheetName}`);
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });
      
      console.log(`✅ Successfully appended ${values.length} rows to ${sheetName}`);
    } catch (error) {
      console.error(`❌ Error appending to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateSheetRow(sheetName: string, row: number, values: any[]): Promise<void> {
    try {
      console.log(`📝 Updating row ${row} in sheet: ${sheetName}`);
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!A${row}:Z${row}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      
      console.log(`✅ Successfully updated row ${row} in ${sheetName}`);
    } catch (error) {
      console.error(`❌ Error updating row ${row} in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  // Get data from additional sheets
  async getProjectMilestonesData(): Promise<any[][]> {
    return this.getSheetData('ProjectMilestones', 'A:G');
  }

  async getFinancialMilestonesData(): Promise<any[][]> {
    // Try different possible sheet names
    try {
      return await this.getSheetData('FinancialMilestones', 'A:J');
    } catch (error) {
      console.warn('FinancialMilestones sheet not found, trying alternative names...');
      try {
        return await this.getSheetData('Financial Milestones', 'A:J');
      } catch (error2) {
        try {
          return await this.getSheetData('FinancialMilestone', 'A:J');
        } catch (error3) {
          console.warn('No financial milestones sheet found with any expected name');
          return [];
        }
      }
    }
  }

  async getActivitiesData(): Promise<any[][]> {
    return this.getSheetData('Activities', 'A:H');
  }
}

// Singleton instance
let sheetsAPI: GoogleSheetsAPI | null = null;

export function getGoogleSheetsAPI(): GoogleSheetsAPI {
  console.log('🔧 Initializing Google Sheets API...');
  
  if (!SPREADSHEET_ID) {
    console.error('❌ GOOGLE_SPREADSHEET_ID environment variable is missing');
    throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing');
  }
  
  // Check available authentication methods
  const hasApiKey = !!GOOGLE_API_KEY;
  const hasIndividualVars = GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_PROJECT_ID;
  const hasJsonCredentials = !!CREDENTIALS;
  
  if (!hasApiKey && !hasIndividualVars && !hasJsonCredentials) {
    console.error('❌ Missing Google credentials. Need one of:');
    console.error('  Option 1: GOOGLE_API_KEY (for public sheets)');
    console.error('  Option 2: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID');
    console.error('  Option 3: GOOGLE_SERVICE_ACCOUNT_KEY (JSON)');
    throw new Error('Google credentials environment variables are missing');
  }

  const authMethod = hasApiKey ? 'api-key' : 
                    hasIndividualVars ? 'individual-env-vars' : 
                    'json-credentials';

  // Config validation passed

  // Always recreate the instance to test new authentication approach
  try {
    sheetsAPI = new GoogleSheetsAPI({
      spreadsheetId: SPREADSHEET_ID,
      credentials: CREDENTIALS || '{}', // Dummy JSON if using individual vars
    });
    console.log('✅ Google Sheets API initialized successfully');
  } catch (error) {
    console.error('💥 Failed to initialize Google Sheets API:', error);
    throw error;
  }

  return sheetsAPI;
}

export { GoogleSheetsAPI };