// TypeScript types for normalized purchase request system

export interface PurchaseRequest {
  id: string;
  project_id: string;
  project_po_reference_id?: string | null;
  project_po_reference?: Pick<ProjectPOReferenceSummary, 'id' | 'po_number' | 'po_type' | 'status' | 'is_default'> | null;
  contractor_id: string;
  shipping_location?: string | null;
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

export interface PurchaseRequestAdditionalCharge {
  id: string;
  purchase_request_id: string;
  description: string;
  hsn_code?: string | null;
  amount: number;
  tax_percent?: number | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestItem {
  id: string;
  purchase_request_id: string;
  project_material_id: string;
  hsn_code?: string | null;
  item_description?: string | null;
  site_unit?: string | null;
  purchase_unit?: string | null;
  conversion_factor?: number | null;
  purchase_qty?: number | null;
  normalized_qty?: number | null;
  requested_qty: number;
  approved_qty?: number;
  unit_rate?: number;
  tax_percent?: number;
  round_off_amount?: number | null;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ProjectMaterialForUI {
  id: string;                   // project_materials.id
  project_id: string;
  material_id?: string;
  hsn_code?: string | null;
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
    purchase_request?: Pick<PurchaseRequest, 'id' | 'status' | 'submitted_at' | 'created_at' | 'project_po_reference_id'> & {
      project_po_reference?: Pick<ProjectPOReferenceSummary, 'id' | 'po_number' | 'po_type' | 'status' | 'is_default'> | null;
    };
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
  project_po_reference_id?: string | null;
  shipping_location?: string;
  remarks?: string;
  additional_charges?: Array<{
    description: string;
    hsn_code?: string | null;
    amount: number;
    tax_percent?: number | null;
  }>;
  items: Array<{
    project_material_id: string;
    hsn_code?: string;
    item_description?: string;
    site_unit?: string;
    purchase_unit?: string;
    conversion_factor?: number;
    purchase_qty?: number;
    normalized_qty?: number;
    requested_qty: number;
    unit_rate?: number;
    tax_percent?: number;
    round_off_amount?: number | null;
  }>;
}

export interface ProjectPOReferenceSummary {
  id: string;
  project_id: string;
  po_number: string;
  po_date?: string | null;
  po_value?: number | null;
  po_type: 'original' | 'amendment' | 'supplemental' | 'replacement';
  status: 'active' | 'exhausted' | 'closed';
  is_default: boolean;
  notes?: string | null;
  previous_po_reference_id?: string | null;
  request_count?: number;
  linked_value?: number;
}

export interface PurchaseRequestWithItems extends PurchaseRequest {
  items: PurchaseRequestItem[];
  additional_charges?: PurchaseRequestAdditionalCharge[];
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
