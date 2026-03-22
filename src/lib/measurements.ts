import type { BoqMeasurementRow, BoqMeasurementSummaryRow, MeasurementMode } from '@/types/measurements';

export const measurementModeOptions: Array<{ value: MeasurementMode; label: string }> = [
  { value: 'direct_qty', label: 'Direct Qty' },
  { value: 'nos_x_l', label: 'Nos x L' },
  { value: 'nos_x_l_x_b', label: 'Nos x L x B' },
  { value: 'nos_x_l_x_b_x_h', label: 'Nos x L x B x H' },
];

export function isMeasurableBoqItem(input: {
  unit?: string | null;
  category?: string | null;
  quantity_numeric?: number | null;
}): boolean {
  if (input.category === 'HEADER') return false;
  if (!input.unit || input.unit === 'N/A') return false;
  if (input.quantity_numeric === null || input.quantity_numeric === undefined) return false;
  return Number.isFinite(input.quantity_numeric);
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function calculateMeasurementQty(input: {
  measurement_mode: MeasurementMode;
  nos?: number | null;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  direct_qty?: number | null;
}): number {
  const nos = input.nos ?? 1;
  const length = input.length ?? 0;
  const breadth = input.breadth ?? 0;
  const height = input.height ?? 0;
  const directQty = input.direct_qty ?? 0;

  const raw = (() => {
    switch (input.measurement_mode) {
      case 'direct_qty':
        return directQty;
      case 'nos_x_l':
        return nos * length;
      case 'nos_x_l_x_b':
        return nos * length * breadth;
      case 'nos_x_l_x_b_x_h':
        return nos * length * breadth * height;
      default:
        return 0;
    }
  })();

  return Number(raw.toFixed(3));
}

export function calculateConvertedQty(quantity: number, conversionFactor?: number | null): number {
  if (!conversionFactor || !Number.isFinite(conversionFactor) || conversionFactor <= 0) {
    return Number(quantity.toFixed(3));
  }

  return Number((quantity * conversionFactor).toFixed(3));
}

export function buildMeasurementSummary(input: {
  boqItems: Array<{
    id: string;
    description: string;
    unit: string;
    category?: string | null;
    quantity_numeric?: number | null;
    line_order?: number | null;
    measurement_input_unit?: string | null;
    measurement_conversion_factor?: number | null;
  }>;
  measurementRows: BoqMeasurementRow[];
}): BoqMeasurementSummaryRow[] {
  const rowsByBoqItem = new Map<string, BoqMeasurementRow[]>();
  input.measurementRows.forEach((row) => {
    const existing = rowsByBoqItem.get(row.boq_item_id) || [];
    existing.push(row);
    rowsByBoqItem.set(row.boq_item_id, existing);
  });

  return input.boqItems
    .map((item) => {
      const measurementRows = (rowsByBoqItem.get(item.id) || []).sort((a, b) => {
        const dateDiff = new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      const executedNativeQty = Number(
        measurementRows.reduce((sum, row) => sum + Number(row.computed_qty || 0), 0).toFixed(3)
      );
      const measurementInputUnit = item.measurement_input_unit?.trim() || null;
      const conversionFactor =
        item.measurement_conversion_factor && Number.isFinite(item.measurement_conversion_factor)
          ? Number(item.measurement_conversion_factor)
          : null;
      const hasConversion = Boolean(measurementInputUnit && conversionFactor && conversionFactor > 0);
      const executedQty = hasConversion
        ? calculateConvertedQty(executedNativeQty, conversionFactor)
        : executedNativeQty;
      const plannedQty = item.quantity_numeric ?? null;
      const balanceQty =
        plannedQty === null || !Number.isFinite(plannedQty)
          ? null
          : Number((plannedQty - executedQty).toFixed(3));

      return {
        boq_item_id: item.id,
        description: item.description,
        unit: item.unit,
        category: item.category || null,
        is_measurable: isMeasurableBoqItem(item),
        has_conversion: hasConversion,
        measurement_input_unit: measurementInputUnit,
        measurement_conversion_factor: conversionFactor,
        converted_unit: hasConversion ? item.unit : null,
        line_order: item.line_order || 0,
        planned_qty: plannedQty,
        executed_native_qty: executedNativeQty,
        executed_qty: executedQty,
        balance_qty: balanceQty,
        measurement_count: measurementRows.length,
        measurement_rows: measurementRows,
      };
    })
    .sort((a, b) => a.line_order - b.line_order);
}
