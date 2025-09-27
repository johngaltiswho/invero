import * as XLSX from 'xlsx';
import type { BOQItem, ProjectBOQ, ScheduleItem, ProjectSchedule } from '@/types/boq';

// Simplified Excel column mappings
const BOQ_COLUMNS = {
  DESCRIPTION: 0,    // A - Description
  UNIT: 1,          // B - Unit
  QUANTITY: 2,      // C - Quantity
  RATE: 3,          // D - Rate
  AMOUNT: 4         // E - Amount
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

  const quantity = parseNumber(getCell(BOQ_COLUMNS.QUANTITY));
  const rate = parseNumber(getCell(BOQ_COLUMNS.RATE));
  const amount = parseNumber(getCell(BOQ_COLUMNS.AMOUNT), quantity * rate);

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