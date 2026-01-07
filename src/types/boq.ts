// Enhanced BOQ types with sections and smart detection

export enum RowType {
  SHEET_HEADER = 'sheet_header',     // Level 1: Excel sheet sections (=== CIVIL WORKS ===)
  SECTION_HEADER = 'section_header', // Level 2: Manual sections within sheet (Foundation, Superstructure)
  BOQ_DESCRIPTION = 'boq_description', // Level 3: Work descriptions (RCC Work, Brick Work) 
  BOQ_ITEM = 'boq_item',             // Level 4: Actual items with qty/rate (M20 Concrete)
  SUB_TOTAL = 'subtotal',
  GRAND_TOTAL = 'grandtotal',
  SPACER = 'spacer'
}

export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low'
}

export interface BOQItem {
  description: string;
  unit: string;
  quantity: string | number; // Can be "QRO", "LS", or numeric value
  rate: number;
  amount: number;
}

export interface BOQRow extends BOQItem {
  id: string;
  type: RowType;
  confidence: ConfidenceLevel;
  sectionId?: string;
  originalRowIndex?: number;
  indentLevel?: number; // 0 = no indent, 1 = one level, etc.
}

export interface BOQSection {
  id: string;
  title: string;
  isCollapsed: boolean;
  items: BOQRow[];
  subTotal: number;
  calculatedTotal: number;
  level: number;
  hasDiscrepancy: boolean;
}

export interface ProjectBOQ {
  projectId: string;
  contractorId: string;
  uploadDate: string;
  items: BOQItem[]; // For backward compatibility
  sections?: BOQSection[]; // New organized structure
  rows?: BOQRow[]; // Enhanced rows with types
  totalAmount: number;
  calculatedAmount: number;
  fileName: string;
  hasDiscrepancies: boolean;
}

export interface ScheduleItem {
  task: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
}

export interface ProjectSchedule {
  projectId: string;
  contractorId: string;
  uploadDate: string;
  tasks: ScheduleItem[];
  totalDuration: number;
  fileName: string;
}