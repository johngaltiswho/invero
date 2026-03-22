'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { calculateConvertedQty, calculateMeasurementQty, measurementModeOptions } from '@/lib/measurements';
import type { BoqMeasurementRow, BoqMeasurementSummaryRow, MeasurementMode } from '@/types/measurements';

type MeasurementSheetTabProps = {
  projectId: string;
  hasBOQData: boolean;
  onMeasurementStatusChange?: (hasMeasurements: boolean) => void;
};

type MeasurementFormState = {
  measurement_date: string;
  location_description: string;
  remarks: string;
  measurement_mode: MeasurementMode;
  nos: string;
  length: string;
  breadth: string;
  height: string;
  direct_qty: string;
};

type ConversionFormState = {
  measurement_input_unit: string;
  measurement_conversion_factor: string;
};

const emptyForm = (): MeasurementFormState => ({
  measurement_date: new Date().toISOString().slice(0, 10),
  location_description: '',
  remarks: '',
  measurement_mode: 'direct_qty',
  nos: '',
  length: '',
  breadth: '',
  height: '',
  direct_qty: '',
});

const emptyConversionForm = (): ConversionFormState => ({
  measurement_input_unit: '',
  measurement_conversion_factor: '',
});

const formatQuantity = (value: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

const fieldVisibilityByMode: Record<
  MeasurementMode,
  { nos: boolean; length: boolean; breadth: boolean; height: boolean; direct_qty: boolean }
> = {
  direct_qty: { nos: false, length: false, breadth: false, height: false, direct_qty: true },
  nos_x_l: { nos: true, length: true, breadth: false, height: false, direct_qty: false },
  nos_x_l_x_b: { nos: true, length: true, breadth: true, height: false, direct_qty: false },
  nos_x_l_x_b_x_h: { nos: true, length: true, breadth: true, height: true, direct_qty: false },
};

export default function MeasurementSheetTab({
  projectId,
  hasBOQData,
  onMeasurementStatusChange,
}: MeasurementSheetTabProps) {
  const [summaryRows, setSummaryRows] = useState<BoqMeasurementSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, MeasurementFormState>>({});
  const [conversionDrafts, setConversionDrafts] = useState<Record<string, ConversionFormState>>({});
  const [savingRowFor, setSavingRowFor] = useState<string | null>(null);
  const [savingConversionFor, setSavingConversionFor] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/measurements`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load measurement register');
      }
      setSummaryRows(result.data.summary_rows || []);
      onMeasurementStatusChange?.(Boolean(result.data.has_measurements));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load measurement register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasBOQData) {
      setSummaryRows([]);
      setLoading(false);
      onMeasurementStatusChange?.(false);
      return;
    }
    fetchMeasurements();
  }, [projectId, hasBOQData]);

  const getDraft = (boqItemId: string) => drafts[boqItemId] || emptyForm();

  const updateDraft = (boqItemId: string, field: keyof MeasurementFormState, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [boqItemId]: {
        ...getDraft(boqItemId),
        [field]: value,
      },
    }));
  };

  const getConversionDraft = (row: BoqMeasurementSummaryRow): ConversionFormState =>
    conversionDrafts[row.boq_item_id] || {
      measurement_input_unit: row.measurement_input_unit || '',
      measurement_conversion_factor: row.measurement_conversion_factor?.toString() || '',
    };

  const updateConversionDraft = (boqItemId: string, field: keyof ConversionFormState, value: string) => {
    setConversionDrafts((prev) => ({
      ...prev,
      [boqItemId]: {
        ...(prev[boqItemId] || emptyConversionForm()),
        [field]: value,
      },
    }));
  };

  const resetDraft = (boqItemId: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[boqItemId];
      return next;
    });
    setEditingRowId(null);
  };

  const startEditing = (boqItemId: string, row: BoqMeasurementRow) => {
    setEditingRowId(row.id);
    setExpandedRows((prev) => new Set(prev).add(boqItemId));
    setDrafts((prev) => ({
      ...prev,
      [boqItemId]: {
        measurement_date: row.measurement_date,
        location_description: row.location_description || '',
        remarks: row.remarks || '',
        measurement_mode: row.measurement_mode,
        nos: row.nos?.toString() || '',
        length: row.length?.toString() || '',
        breadth: row.breadth?.toString() || '',
        height: row.height?.toString() || '',
        direct_qty: row.direct_qty?.toString() || '',
      },
    }));
  };

  const draftComputedQty = (boqItemId: string) => {
    const draft = getDraft(boqItemId);
    return calculateMeasurementQty({
      measurement_mode: draft.measurement_mode,
      nos: draft.nos === '' ? null : Number(draft.nos),
      length: draft.length === '' ? null : Number(draft.length),
      breadth: draft.breadth === '' ? null : Number(draft.breadth),
      height: draft.height === '' ? null : Number(draft.height),
      direct_qty: draft.direct_qty === '' ? null : Number(draft.direct_qty),
    });
  };

  const submitDraft = async (boqItemId: string) => {
    const draft = getDraft(boqItemId);
    if (!draft.measurement_date) {
      alert('Measurement date is required');
      return;
    }

    try {
      setSavingRowFor(boqItemId);
      const payload = {
        boq_item_id: boqItemId,
        ...draft,
      };

      const editingRow = summaryRows
        .find((row) => row.boq_item_id === boqItemId)
        ?.measurement_rows.find((row) => row.id === editingRowId);

      const endpoint = editingRow
        ? `/api/projects/${projectId}/measurements/${editingRow.id}`
        : `/api/projects/${projectId}/measurements`;
      const method = editingRow ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save measurement row');
      }

      resetDraft(boqItemId);
      await fetchMeasurements();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save measurement row');
    } finally {
      setSavingRowFor(null);
    }
  };

  const deleteRow = async (boqItemId: string, rowId: string) => {
    const confirmed = window.confirm('Delete this measurement row?');
    if (!confirmed) return;

    try {
      setDeletingRowId(rowId);
      const response = await fetch(`/api/projects/${projectId}/measurements/${rowId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete measurement row');
      }
      if (editingRowId === rowId) resetDraft(boqItemId);
      await fetchMeasurements();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete measurement row');
    } finally {
      setDeletingRowId(null);
    }
  };

  const exportRegister = async () => {
    try {
      setExporting(true);
      const response = await fetch(`/api/projects/${projectId}/measurements/export`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to export measurement register');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `measurement-register-${projectId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export measurement register');
    } finally {
      setExporting(false);
    }
  };

  const saveConversion = async (row: BoqMeasurementSummaryRow) => {
    const draft = getConversionDraft(row);

    try {
      setSavingConversionFor(row.boq_item_id);
      const response = await fetch('/api/quote-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.boq_item_id,
          measurement_input_unit: draft.measurement_input_unit.trim() || null,
          measurement_conversion_factor:
            draft.measurement_conversion_factor.trim() === ''
              ? null
              : Number(draft.measurement_conversion_factor),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save conversion settings');
      }
      await fetchMeasurements();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save conversion settings');
    } finally {
      setSavingConversionFor(null);
    }
  };

  const totals = useMemo(() => {
    return summaryRows.filter((row) => row.is_measurable).reduce(
      (acc, row) => {
        acc.planned += row.planned_qty || 0;
        acc.executed += row.executed_qty || 0;
        acc.balance += row.balance_qty || 0;
        return acc;
      },
      { planned: 0, executed: 0, balance: 0 }
    );
  }, [summaryRows]);

  if (!hasBOQData) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-6">
          <h3 className="text-lg font-semibold text-primary mb-2">Measurement Sheet</h3>
          <p className="text-sm text-secondary">Add BOQ data first to start tracking execution measurements.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-secondary">Loading measurement register...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Measurement Sheet</h3>
          <p className="text-sm text-secondary mt-1">
            Record dimension-based quantities against the active BOQ baseline and track cumulative execution progress.
          </p>
        </div>
        <button
          onClick={exportRegister}
          disabled={exporting || summaryRows.length === 0}
          className="px-4 py-2 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-neutral-darker border border-neutral-medium p-4">
          <div className="text-xs text-secondary mb-1">Planned Qty</div>
          <div className="text-xl font-semibold text-primary">{formatQuantity(totals.planned)}</div>
        </div>
        <div className="rounded-lg bg-neutral-darker border border-neutral-medium p-4">
          <div className="text-xs text-secondary mb-1">Executed Qty</div>
          <div className="text-xl font-semibold text-accent-amber">{formatQuantity(totals.executed)}</div>
        </div>
        <div className="rounded-lg bg-neutral-darker border border-neutral-medium p-4">
          <div className="text-xs text-secondary mb-1">Balance Qty</div>
          <div className="text-xl font-semibold text-primary">{formatQuantity(totals.balance)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-medium">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-darker text-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-right font-medium">Planned Qty</th>
              <th className="px-4 py-3 text-right font-medium">Executed Qty</th>
              <th className="px-4 py-3 text-right font-medium">Balance Qty</th>
              <th className="px-4 py-3 text-right font-medium">Rows</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => {
              const expanded = expandedRows.has(row.boq_item_id);
              const draft = getDraft(row.boq_item_id);
              const visibleFields = fieldVisibilityByMode[draft.measurement_mode];
              const isEditingThisItem = Boolean(
                editingRowId && row.measurement_rows.some((measurementRow) => measurementRow.id === editingRowId)
              );
              return (
                <Fragment key={row.boq_item_id}>
                  <tr
                    key={row.boq_item_id}
                    className={`border-t border-neutral-medium ${row.is_measurable ? 'bg-neutral-dark' : 'bg-neutral-darker/80'}`}
                  >
                    <td className={`px-4 py-3 ${row.is_measurable ? 'text-primary' : 'text-primary font-semibold uppercase tracking-[0.14em] text-xs'}`}>
                      <div>{row.description}</div>
                      {row.is_measurable && row.has_conversion && (
                        <div className="mt-1 text-xs text-secondary">
                          Measure in {row.measurement_input_unit?.toUpperCase()} and convert to {row.unit} at{' '}
                          {formatQuantity(row.measurement_conversion_factor)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary">{row.is_measurable ? row.unit : 'Section'}</td>
                    <td className="px-4 py-3 text-right text-primary">{row.is_measurable ? formatQuantity(row.planned_qty) : '—'}</td>
                    <td className="px-4 py-3 text-right text-accent-amber">{row.is_measurable ? formatQuantity(row.executed_qty) : '—'}</td>
                    <td className="px-4 py-3 text-right text-primary">{row.is_measurable ? formatQuantity(row.balance_qty) : '—'}</td>
                    <td className="px-4 py-3 text-right text-secondary">{row.is_measurable ? row.measurement_count : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {row.is_measurable ? (
                        <button
                          onClick={() =>
                            setExpandedRows((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.boq_item_id)) next.delete(row.boq_item_id);
                              else next.add(row.boq_item_id);
                              return next;
                            })
                          }
                          className="text-accent-blue hover:underline"
                        >
                          {expanded ? 'Hide' : row.measurement_count > 0 ? 'View / Measure' : 'Measure'}
                        </button>
                      ) : (
                        <span className="text-xs uppercase tracking-[0.14em] text-secondary">No Measurement</span>
                      )}
                    </td>
                  </tr>
                  {expanded && row.is_measurable && (
                    <tr key={`${row.boq_item_id}-expanded`} className="border-t border-neutral-medium bg-neutral-darker">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-4">
                          <div className="rounded-lg border border-neutral-medium bg-neutral-dark p-4">
                            <div className="text-sm font-medium text-primary">Conversion</div>
                            <p className="mt-1 text-xs text-secondary">
                              Optional. Use this when site measurement is captured in a native unit like `rmt` but the BOQ is tracked in `{row.unit}`.
                            </p>
                            <div className="mt-4 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
                              <label className="text-xs text-secondary">
                                Measurement Unit
                                <input
                                  value={getConversionDraft(row).measurement_input_unit}
                                  onChange={(e) => updateConversionDraft(row.boq_item_id, 'measurement_input_unit', e.target.value)}
                                  placeholder="rmt"
                                  className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                                />
                              </label>
                              <label className="text-xs text-secondary">
                                Conversion Factor to {row.unit}
                                <input
                                  value={getConversionDraft(row).measurement_conversion_factor}
                                  onChange={(e) =>
                                    updateConversionDraft(row.boq_item_id, 'measurement_conversion_factor', e.target.value)
                                  }
                                  placeholder="12.400"
                                  className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-primary"
                                />
                              </label>
                              <button
                                onClick={() => saveConversion(row)}
                                disabled={savingConversionFor === row.boq_item_id}
                                className="px-4 py-2 rounded-lg border border-neutral-medium text-primary hover:bg-neutral-medium disabled:opacity-50 transition-colors text-sm font-medium"
                              >
                                {savingConversionFor === row.boq_item_id ? 'Saving...' : 'Save Conversion'}
                              </button>
                            </div>
                            {row.has_conversion && (
                              <div className="mt-3 text-xs text-accent-amber">
                                Register totals are shown in {row.unit}. Row-level entry remains in {row.measurement_input_unit}.
                              </div>
                            )}
                          </div>

                          <div className="grid md:grid-cols-4 gap-3">
                            <label className="text-xs text-secondary">
                              Date
                              <input
                                type="date"
                                value={draft.measurement_date}
                                onChange={(e) => updateDraft(row.boq_item_id, 'measurement_date', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            <label className="text-xs text-secondary">
                              Mode
                              <select
                                value={draft.measurement_mode}
                                onChange={(e) => updateDraft(row.boq_item_id, 'measurement_mode', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              >
                                {measurementModeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs text-secondary md:col-span-2">
                              Location / Area / Spec Description
                              <input
                                value={draft.location_description}
                                onChange={(e) => updateDraft(row.boq_item_id, 'location_description', e.target.value)}
                                placeholder="Example: Block A / Staircase / Roof slab"
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            {visibleFields.nos && (
                            <label className="text-xs text-secondary">
                              Nos
                              <input
                                value={draft.nos}
                                onChange={(e) => updateDraft(row.boq_item_id, 'nos', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            )}
                            {visibleFields.length && (
                            <label className="text-xs text-secondary">
                              L
                              <input
                                value={draft.length}
                                onChange={(e) => updateDraft(row.boq_item_id, 'length', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            )}
                            {visibleFields.breadth && (
                            <label className="text-xs text-secondary">
                              B
                              <input
                                value={draft.breadth}
                                onChange={(e) => updateDraft(row.boq_item_id, 'breadth', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            )}
                            {visibleFields.height && (
                            <label className="text-xs text-secondary">
                              H
                              <input
                                value={draft.height}
                                onChange={(e) => updateDraft(row.boq_item_id, 'height', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            )}
                            {visibleFields.direct_qty && (
                            <label className="text-xs text-secondary">
                              Direct Qty
                              <input
                                value={draft.direct_qty}
                                onChange={(e) => updateDraft(row.boq_item_id, 'direct_qty', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                              />
                            </label>
                            )}
                            <div className="text-xs text-secondary">
                              Measured Qty {row.has_conversion && row.measurement_input_unit ? `(${row.measurement_input_unit})` : ''}
                              <div className="mt-1 rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-accent-amber min-h-[42px] flex items-center">
                                {formatQuantity(draftComputedQty(row.boq_item_id))}
                              </div>
                            </div>
                            {row.has_conversion && (
                              <div className="text-xs text-secondary">
                                Converted Qty ({row.unit})
                                <div className="mt-1 rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-accent-amber min-h-[42px] flex items-center">
                                  {formatQuantity(
                                    calculateConvertedQty(draftComputedQty(row.boq_item_id), row.measurement_conversion_factor)
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <label className="block text-xs text-secondary">
                            Remarks
                            <textarea
                              value={draft.remarks}
                              onChange={(e) => updateDraft(row.boq_item_id, 'remarks', e.target.value)}
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-neutral-medium bg-neutral-dark px-3 py-2 text-sm text-primary"
                            />
                          </label>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => submitDraft(row.boq_item_id)}
                              disabled={savingRowFor === row.boq_item_id}
                              className="px-4 py-2 rounded-lg bg-accent-amber text-neutral-dark hover:bg-accent-amber/90 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                              {savingRowFor === row.boq_item_id
                                ? isEditingThisItem
                                  ? 'Saving...'
                                  : 'Adding...'
                                : isEditingThisItem
                                  ? 'Save Row'
                                  : 'Add Measurement Row'}
                            </button>
                            {isEditingThisItem && (
                              <button
                                onClick={() => resetDraft(row.boq_item_id)}
                                className="px-4 py-2 rounded-lg border border-neutral-medium text-primary hover:bg-neutral-medium transition-colors text-sm font-medium"
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-neutral-medium">
                            <table className="min-w-full text-xs">
                              <thead className="bg-neutral-dark text-secondary">
                                <tr>
                                  <th className="px-3 py-2 text-left">Date</th>
                                  <th className="px-3 py-2 text-left">Location / Spec</th>
                                  <th className="px-3 py-2 text-right">Nos</th>
                                  <th className="px-3 py-2 text-right">L</th>
                                  <th className="px-3 py-2 text-right">B</th>
                                  <th className="px-3 py-2 text-right">H</th>
                                  <th className="px-3 py-2 text-right">Measured Qty</th>
                                  {row.has_conversion && <th className="px-3 py-2 text-right">Converted Qty</th>}
                                  <th className="px-3 py-2 text-left">Remarks</th>
                                  <th className="px-3 py-2 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.measurement_rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={row.has_conversion ? 10 : 9} className="px-3 py-4 text-center text-secondary">
                                      No measurement rows yet for this BOQ item.
                                    </td>
                                  </tr>
                                ) : (
                                  row.measurement_rows.map((measurementRow) => (
                                    <tr key={measurementRow.id} className="border-t border-neutral-medium">
                                      <td className="px-3 py-2 text-primary">{measurementRow.measurement_date}</td>
                                      <td className="px-3 py-2 text-secondary">{measurementRow.location_description || '—'}</td>
                                      <td className="px-3 py-2 text-right text-primary">{formatQuantity(measurementRow.nos)}</td>
                                      <td className="px-3 py-2 text-right text-primary">{formatQuantity(measurementRow.length)}</td>
                                      <td className="px-3 py-2 text-right text-primary">{formatQuantity(measurementRow.breadth)}</td>
                                      <td className="px-3 py-2 text-right text-primary">{formatQuantity(measurementRow.height)}</td>
                                      <td className="px-3 py-2 text-right text-accent-amber">{formatQuantity(measurementRow.computed_qty)}</td>
                                      {row.has_conversion && (
                                        <td className="px-3 py-2 text-right text-accent-amber">
                                          {formatQuantity(
                                            calculateConvertedQty(measurementRow.computed_qty, row.measurement_conversion_factor)
                                          )}
                                        </td>
                                      )}
                                      <td className="px-3 py-2 text-secondary">{measurementRow.remarks || '—'}</td>
                                      <td className="px-3 py-2 text-right space-x-3">
                                        <button
                                          onClick={() => startEditing(row.boq_item_id, measurementRow)}
                                          className="text-accent-blue hover:underline"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => deleteRow(row.boq_item_id, measurementRow.id)}
                                          disabled={deletingRowId === measurementRow.id}
                                          className="text-red-300 hover:underline disabled:opacity-50"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {summaryRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-secondary">
                  No measurable BOQ rows found for this project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
