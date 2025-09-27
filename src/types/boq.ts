// Simplified BOQ and Schedule types for Excel upload

export interface BOQItem {
  description: string;
  unit: string;
  quantity: string | number; // Can be "QRO", "LS", or numeric value
  rate: number;
  amount: number;
}

export interface ProjectBOQ {
  projectId: string;
  contractorId: string;
  uploadDate: string;
  items: BOQItem[];
  totalAmount: number;
  fileName: string;
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