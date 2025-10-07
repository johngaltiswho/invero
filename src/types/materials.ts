// Material and mapping types for the enhanced system

export interface Material {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  unit: string;
  current_price: number;
  supplier_info?: Record<string, any>;
  specifications?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialMapping {
  id: string;
  project_id: string;
  boq_item_id?: string;
  boq_item_description: string;
  material_id: string;
  suggested_quantity: number;
  actual_quantity?: number;
  unit_cost: number;
  total_cost?: number; // Calculated field
  status: 'ai_suggested' | 'user_modified' | 'approved' | 'rejected';
  confidence_score?: number;
  modified_by?: string;
  modification_reason?: string;
  ai_reasoning?: string;
  ai_model_version?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  materials?: Material;
  boq_items?: {
    id: string;
    description: string;
    unit: string;
    quantity_text: string;
    quantity_numeric?: number;
    rate: number;
    amount: number;
  };
}

export interface MaterialMappingCreate {
  project_id: string;
  boq_item_id?: string;
  boq_item_description: string;
  material_id: string;
  suggested_quantity: number;
  actual_quantity?: number;
  unit_cost?: number;
  modification_reason?: string;
}

export interface MaterialMappingUpdate {
  id: string;
  material_id?: string;
  suggested_quantity?: number;
  actual_quantity?: number;
  unit_cost?: number;
  status?: 'ai_suggested' | 'user_modified' | 'approved' | 'rejected';
  modification_reason?: string;
}

export interface MaterialMappingStats {
  total_mappings: number;
  ai_suggested: number;
  user_modified: number;
  approved: number;
  rejected: number;
  total_estimated_cost: number;
}

// API Response types
export interface MaterialMappingResponse {
  success: boolean;
  data?: MaterialMapping | MaterialMapping[];
  message?: string;
  error?: string;
  details?: string;
}

export interface MaterialResponse {
  success: boolean;
  data?: Material | Material[];
  grouped?: Record<string, Material[]>;
  count?: number;
  message?: string;
  error?: string;
  details?: string;
}