import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive configuration
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const GOOGLE_WORKBOOK_PARENT_FOLDER_ID =
  process.env.GOOGLE_WORKBOOK_PARENT_FOLDER_ID;

interface GoogleDriveConfig {
  credentials: string;
}

const GOOGLE_WORKBOOK_PARENT_FOLDER = process.env.GOOGLE_WORKBOOK_PARENT_FOLDER || 'Finverno/BOQ Workbooks';

class GoogleDriveAPI {
  private drive: any;
  private auth: any;

  constructor(config: GoogleDriveConfig) {
    this.initializeAuth(config);
  }

  private initializeAuth(config: GoogleDriveConfig) {
    try {
      // Try individual environment variables first (for service account)
      if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_PROJECT_ID) {
        // Fix private key format - handle both escaped and unescaped newlines
        let privateKey = GOOGLE_PRIVATE_KEY;
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        
        // Ensure proper formatting
        if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
          throw new Error('Invalid private key format');
        }
        
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
            project_id: GOOGLE_PROJECT_ID,
            type: 'service_account',
          },
          scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
          ],
        });
      } else if (CREDENTIALS) {
        // Fallback to JSON credentials
        const credentials = JSON.parse(config.credentials);
        
        if (credentials.private_key) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }

        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
          ],
        });
      } else {
        throw new Error('No valid Google credentials found');
      }

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('✅ Google Drive API initialized successfully');
    } catch (error) {
      console.error('💥 Failed to initialize Google Drive auth:', error);
      throw new Error(`Google Drive authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createApplicationFolder(applicationId: string): Promise<string> {
    try {
      // First, check if "Contractor Applications" folder exists
      const parentFolderName = 'Contractor Applications';
      let parentFolderId = await this.findOrCreateFolder(parentFolderName);

      // Create application-specific folder
      const applicationFolderName = `${applicationId}`;
      const applicationFolderId = await this.findOrCreateFolder(applicationFolderName, parentFolderId);

      console.log(`✅ Created application folder: ${applicationId}`);
      return applicationFolderId;
    } catch (error) {
      console.error('❌ Error creating application folder:', error);
      throw error;
    }
  }

  private async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    try {
      // Search for existing folder
      const query = parentId 
        ? `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`
        : `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;

      const searchResponse = await this.drive.files.list({
        q: query,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        // Folder exists
        return searchResponse.data.files[0].id;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      console.error(`❌ Error finding/creating folder ${folderName}:`, error);
      throw error;
    }
  }

  async findOrCreateFolderPath(folderPath: string): Promise<string> {
    const parts = folderPath.split('/').map(part => part.trim()).filter(Boolean);
    let parentId: string | undefined;

    for (const part of parts) {
      parentId = await this.findOrCreateFolder(part, parentId);
    }

    if (!parentId) {
      throw new Error('Failed to resolve Google Drive folder path');
    }

    return parentId;
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
  ): Promise<{ fileId: string; fileUrl: string }> {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: fileBuffer,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      const fileId = response.data.id;

      // Make file viewable by anyone with the link
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

      console.log(`✅ Uploaded file: ${fileName} (${fileId})`);
      return { fileId, fileUrl };
    } catch (error) {
      console.error(`❌ Error uploading file ${fileName}:`, error);
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
    applicationId: string
  ): Promise<Record<string, string>> {
    try {
      // Create application folder
      const folderId = await this.createApplicationFolder(applicationId);

      // Upload all files
      const uploadPromises = files.map(async (file) => {
        const result = await this.uploadFile(file.buffer, file.fileName, file.mimeType, folderId);
        return { fileName: file.fileName, url: result.fileUrl };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Convert to object with fileName as key and URL as value
      const fileUrls: Record<string, string> = {};
      uploadResults.forEach(result => {
        fileUrls[result.fileName] = result.url;
      });

      console.log(`✅ Uploaded ${files.length} files for application ${applicationId}`);
      return fileUrls;
    } catch (error) {
      console.error(`❌ Error uploading files for application ${applicationId}:`, error);
      throw error;
    }
  }

  async createEditableSpreadsheetFromExcel(
    fileBuffer: Buffer,
    fileName: string,
    parentFolderPath: string = GOOGLE_WORKBOOK_PARENT_FOLDER
  ): Promise<{ fileId: string; webUrl: string; mimeType: string }> {
    try {
      const folderId =
        GOOGLE_WORKBOOK_PARENT_FOLDER_ID ||
        (await this.findOrCreateFolderPath(parentFolderPath));
      const normalizedName = fileName.replace(/\.(xlsx|xls)$/i, '') || 'BOQ Working Workbook';

      const response = await this.drive.files.create({
        requestBody: {
          name: normalizedName,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId],
        },
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: Readable.from(fileBuffer),
        },
        supportsAllDrives: true,
        fields: 'id, mimeType, webViewLink',
      });

      const fileId = response.data.id;

      await this.drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          role: 'writer',
          type: 'anyone',
        },
      });

      return {
        fileId,
        webUrl: response.data.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
        mimeType: response.data.mimeType || 'application/vnd.google-apps.spreadsheet',
      };
    } catch (error) {
      console.error('❌ Error creating editable Google spreadsheet:', error);
      throw error;
    }
  }

  async exportSpreadsheetAsXlsx(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.export(
        {
          fileId,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          supportsAllDrives: true,
        },
        {
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      console.error(`❌ Error exporting spreadsheet ${fileId} as XLSX:`, error);
      throw error;
    }
  }

  async getFolderUrl(folderId: string): Promise<string> {
    return `https://drive.google.com/drive/folders/${folderId}`;
  }
}

// Singleton instance
let driveAPI: GoogleDriveAPI | null = null;

export function getGoogleDriveAPI(): GoogleDriveAPI {
  console.log('🔧 Initializing Google Drive API...');
  
  // Check available authentication methods
  const hasIndividualVars = GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_PROJECT_ID;
  const hasJsonCredentials = !!CREDENTIALS;
  
  if (!hasIndividualVars && !hasJsonCredentials) {
    console.error('❌ Missing Google credentials for Drive. Need one of:');
    console.error('  Option 1: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID');
    console.error('  Option 2: GOOGLE_SERVICE_ACCOUNT_KEY (JSON)');
    throw new Error('Google Drive credentials environment variables are missing');
  }

  try {
    driveAPI = new GoogleDriveAPI({
      credentials: CREDENTIALS || '{}',
    });
    console.log('✅ Google Drive API initialized successfully');
  } catch (error) {
    console.error('💥 Failed to initialize Google Drive API:', error);
    throw error;
  }

  return driveAPI;
}

export { GoogleDriveAPI };
