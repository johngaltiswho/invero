export type MeasurementMode =
  | 'direct_qty'
  | 'nos_x_l'
  | 'nos_x_l_x_b'
  | 'nos_x_l_x_b_x_h';

export type BoqMeasurementRow = {
  id: string;
  boq_item_id: string;
  measurement_date: string;
  location_description: string | null;
  remarks: string | null;
  measurement_mode: MeasurementMode;
  nos: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  direct_qty: number | null;
  computed_qty: number;
  created_at?: string;
  updated_at?: string;
};

export type BoqMeasurementSummaryRow = {
  boq_item_id: string;
  description: string;
  unit: string;
  category: string | null;
  is_measurable: boolean;
  has_conversion: boolean;
  measurement_input_unit: string | null;
  measurement_conversion_factor: number | null;
  converted_unit: string | null;
  line_order: number;
  planned_qty: number | null;
  executed_native_qty: number;
  executed_qty: number;
  balance_qty: number | null;
  measurement_count: number;
  measurement_rows: BoqMeasurementRow[];
};
