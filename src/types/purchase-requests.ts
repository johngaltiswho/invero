// TypeScript types for normalized purchase request system

export interface PurchaseRequest {
  id: string;
  project_id: string;
  contractor_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'funded' | 'po_generated' | 'completed' | 'rejected';
  created_by?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  funded_at?: string;
  approved_by?: string;
  approval_notes?: string;
}

export interface PurchaseRequestItem {
  id: string;
  purchase_request_id: string;
  project_material_id: string;
  hsn_code?: string | null;
  item_description?: string | null;
  requested_qty: number;
  approved_qty?: number;
  unit_rate?: number;
  tax_percent?: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ProjectMaterialForUI {
  id: string;                   // project_materials.id
  project_id: string;
  material_id?: string;
  contractor_id: string;
  name: string;                 // from materials table or fallback
  description?: string;
  unit: string;
  category?: string;
  required_qty: number;         // total required for project
  available_qty: number;        // already available/delivered
  requested_qty: number;        // computed from active purchase requests
  ordered_qty: number;          // computed from approved purchase requests
  purchase_status?: string | null;
  request_history?: Array<PurchaseRequestItem & {
    purchase_request?: Pick<PurchaseRequest, 'id' | 'status' | 'submitted_at' | 'created_at'>;
  }>;
  notes?: string;
  source_type?: string;
  source_file_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequestPayload {
  project_id: string;
  contractor_id: string;
  remarks?: string;
  items: Array<{
    project_material_id: string;
    hsn_code?: string;
    item_description?: string;
    requested_qty: number;
    unit_rate?: number;
    tax_percent?: number;
  }>;
}

export interface PurchaseRequestWithItems extends PurchaseRequest {
  items: PurchaseRequestItem[];
  total_items: number;
  total_requested_qty: number;
}

// Utility type for validation
export interface MaterialAvailability {
  project_material_id: string;
  required_qty: number;
  available_qty: number;
  requested_qty: number;  // currently requested in other active requests
  ordered_qty: number;    // already approved/ordered
  max_requestable: number; // calculated: required - requested - available
}
