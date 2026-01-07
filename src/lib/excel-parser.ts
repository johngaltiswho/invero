import * as XLSX from 'xlsx';
import type { BOQItem, ProjectBOQ, ScheduleItem, ProjectSchedule } from '@/types/boq';

// Updated Excel column mappings (accounting for serial number in first column)
const BOQ_COLUMNS = {
  SERIAL: 0,        // A - Serial Number (skip this)
  DESCRIPTION: 1,   // B - Description  
  UNIT: 2,          // C - Unit
  QUANTITY: 3,      // D - Quantity
  RATE: 4,          // E - Rate
  AMOUNT: 5         // F - Amount
};

const SCHEDULE_COLUMNS = {
  TASK: 0,          // A - Task
  START_DATE: 1,    // B - Start Date
  END_DATE: 2,      // C - End Date
  DURATION: 3,      // D - Duration
  PROGRESS: 4       // E - Progress
};

export function parseExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(jsonData as any[][]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// NEW: Multi-sheet parser for comprehensive BOQ workbooks
export function parseMultiSheetExcelFile(file: File): Promise<{
  sheets: { name: string; data: any[][] }[];
  totalSheets: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log(`📚 Found ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
        
        const sheets = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log(`📄 Sheet "${sheetName}": ${jsonData.length} rows`);
          
          return {
            name: sheetName,
            data: jsonData as any[][]
          };
        });
        
        resolve({
          sheets,
          totalSheets: workbook.SheetNames.length
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Check if sheet should be skipped (abstract/summary sheets)
function shouldSkipSheet(sheetName: string): boolean {
  const skipKeywords = ['abstract', 'summary', 'total', 'overview', 'index'];
  const name = sheetName.toLowerCase();
  
  return skipKeywords.some(keyword => name.includes(keyword));
}

// NEW: Parse multi-sheet workbook to organized BOQ with sheet separators
export function parseMultiSheetToBOQ(
  sheets: { name: string; data: any[][] }[],
  projectId: string,
  contractorId: string,
  fileName: string
): ProjectBOQ {
  const allItems: BOQItem[] = [];
  let totalAmount = 0;
  
  console.log(`🔄 Processing ${sheets.length} sheets for organized BOQ`);
  
  // Filter out abstract/summary sheets
  const detailedSheets = sheets.filter(sheet => !shouldSkipSheet(sheet.name));
  
  console.log(`📊 Found ${sheets.length} total sheets, processing ${detailedSheets.length} detailed sheets`);
  console.log(`⏭️ Skipped sheets:`, sheets.filter(sheet => shouldSkipSheet(sheet.name)).map(s => s.name));
  
  detailedSheets.forEach((sheet, sheetIndex) => {
    console.log(`📋 Processing sheet: ${sheet.name}`);
    
    // Add sheet header
    const sheetHeader: BOQItem = {
      description: `=== ${sheet.name.toUpperCase()} ===`,
      unit: 'SECTION', 
      quantity: 0,
      rate: 0,
      amount: 0
    };
    allItems.push(sheetHeader);
    
    // Parse detailed sheet (Serial | Description | Unit | Qty | Rate | Amount)  
    const dataRows = sheet.data.slice(1).filter(row => row && row.length > 0 && row[BOQ_COLUMNS.DESCRIPTION]);
    
    const sheetItems: BOQItem[] = dataRows
      .map((row, index) => {
        try {
          return parseBOQRow(row);
        } catch (error) {
          console.error(`Error parsing row ${index + 2} in sheet "${sheet.name}":`, error);
          return null;
        }
      })
      .filter((item): item is BOQItem => item !== null);
    
    // Add sheet items
    allItems.push(...sheetItems);
    
    // Calculate sheet total
    const sheetTotal = sheetItems.reduce((sum, item) => sum + item.amount, 0);
    totalAmount += sheetTotal;
    
    console.log(`✅ Sheet "${sheet.name}": ${sheetItems.length} items, ₹${sheetTotal.toLocaleString()}`);
    
    // Add spacing between sheets (except last)
    if (sheetIndex < detailedSheets.length - 1) {
      allItems.push({
        description: '',
        unit: '',
        quantity: 0,
        rate: 0,
        amount: 0
      });
    }
  });
  
  // Add summary section
  allItems.push({
    description: '=== BOQ SUMMARY ===',
    unit: 'SUMMARY',
    quantity: 0,
    rate: 0,
    amount: 0
  });
  
  sheets.forEach(sheet => {
    const sheetItems = allItems.filter(item => 
      !item.description.includes('===') && 
      !item.description.includes('BOQ SUMMARY')
    );
    const sheetTotal = sheetItems.reduce((sum, item) => sum + item.amount, 0);
    
    allItems.push({
      description: `${sheet.name}: ₹${sheetTotal.toLocaleString()}`,
      unit: 'TOTAL',
      quantity: 0,
      rate: 0,
      amount: sheetTotal
    });
  });
  
  console.log(`🎯 Multi-sheet BOQ complete: ${allItems.length} total rows, ₹${totalAmount.toLocaleString()}`);
  
  return {
    projectId,
    contractorId,
    uploadDate: new Date().toISOString(),
    items: allItems,
    totalAmount,
    fileName: `${fileName} (${sheets.length} sheets)`
  };
}

export function parseExcelToBOQ(
  sheetData: any[][],
  projectId: string,
  contractorId: string,
  fileName: string
): ProjectBOQ {
  if (!sheetData || sheetData.length < 2) {
    throw new Error('BOQ file must have header row and at least one data row');
  }

  const dataRows = sheetData.slice(1); // Skip header
  
  const items: BOQItem[] = dataRows
    .filter(row => row && row.length > 0 && row[BOQ_COLUMNS.DESCRIPTION])
    .map((row, index) => {
      try {
        return parseBOQRow(row);
      } catch (error) {
        console.error(`Error parsing BOQ row ${index + 2}:`, error);
        return null;
      }
    })
    .filter((item): item is BOQItem => item !== null);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    projectId,
    contractorId,
    uploadDate: new Date().toISOString(),
    items,
    totalAmount,
    fileName
  };
}

export function parseExcelToSchedule(
  sheetData: any[][],
  projectId: string,
  contractorId: string,
  fileName: string
): ProjectSchedule {
  if (!sheetData || sheetData.length < 2) {
    throw new Error('Schedule file must have header row and at least one data row');
  }

  const dataRows = sheetData.slice(1); // Skip header
  
  const tasks: ScheduleItem[] = dataRows
    .filter(row => row && row.length > 0 && row[SCHEDULE_COLUMNS.TASK])
    .map((row, index) => {
      try {
        return parseScheduleRow(row);
      } catch (error) {
        console.error(`Error parsing Schedule row ${index + 2}:`, error);
        return null;
      }
    })
    .filter((task): task is ScheduleItem => task !== null);

  const totalDuration = Math.max(...tasks.map(task => task.duration), 0);

  return {
    projectId,
    contractorId,
    uploadDate: new Date().toISOString(),
    tasks,
    totalDuration,
    fileName
  };
}

function parseBOQRow(row: any[]): BOQItem {
  const getCell = (index: number, defaultValue: any = '') => {
    return row[index] !== undefined && row[index] !== null ? row[index] : defaultValue;
  };

  const parseNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Parse quantity - can be text (QRO, LS) or number
  const parseQuantity = (value: any): string | number => {
    if (value === null || value === undefined || value === '') return 0;
    
    const strValue = String(value).trim().toUpperCase();
    
    // Check for common text quantities
    if (strValue === 'QRO' || strValue === 'LS' || strValue === 'LOT' || 
        strValue === 'LUMPSUM' || strValue === 'AS REQUIRED' || 
        strValue === 'TBD' || strValue === 'TO BE DECIDED') {
      return strValue;
    }
    
    // Try to parse as number
    const num = Number(value);
    return isNaN(num) ? strValue : num;
  };

  const quantity = parseQuantity(getCell(BOQ_COLUMNS.QUANTITY));
  const rate = parseNumber(getCell(BOQ_COLUMNS.RATE));
  
  // Calculate amount - if quantity is numeric, multiply; otherwise use provided amount
  let amount = parseNumber(getCell(BOQ_COLUMNS.AMOUNT), 0);
  if (amount === 0 && typeof quantity === 'number' && rate > 0) {
    amount = quantity * rate;
  }

  return {
    description: String(getCell(BOQ_COLUMNS.DESCRIPTION)).trim(),
    unit: String(getCell(BOQ_COLUMNS.UNIT, 'Nos')).trim(),
    quantity,
    rate,
    amount
  };
}

function parseScheduleRow(row: any[]): ScheduleItem {
  const getCell = (index: number, defaultValue: any = '') => {
    return row[index] !== undefined && row[index] !== null ? row[index] : defaultValue;
  };

  const parseNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  const parseDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    
    // Handle Excel date serial number
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
  };

  return {
    task: String(getCell(SCHEDULE_COLUMNS.TASK)).trim(),
    startDate: parseDate(getCell(SCHEDULE_COLUMNS.START_DATE)),
    endDate: parseDate(getCell(SCHEDULE_COLUMNS.END_DATE)),
    duration: parseNumber(getCell(SCHEDULE_COLUMNS.DURATION)),
    progress: parseNumber(getCell(SCHEDULE_COLUMNS.PROGRESS))
  };
}