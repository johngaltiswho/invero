'use client';

import { useState, useEffect, useRef } from 'react';
import { saveBOQToSupabase, getBOQByProjectId } from '@/lib/supabase-boq';
import { parseMultiSheetExcelFile } from '@/lib/excel-parser';
import { parseExcelToBOQRows, organizeIntoSections, calculateTotals } from '@/lib/boq-analyzer';
import { RowType, ConfidenceLevel, BOQRow, BOQSection } from '@/types/boq';
import type { ProjectBOQ } from '@/types/boq';

interface EnhancedBOQTableProps {
  projectId: string;
  contractorId: string;
  onSaveSuccess?: () => void;
  loadExistingData?: boolean;
}

const ROW_TYPE_LABELS = {
  [RowType.SHEET_HEADER]: 'Sheet Header',
  [RowType.SECTION_HEADER]: 'Section Header',
  [RowType.BOQ_DESCRIPTION]: 'BOQ Description',
  [RowType.BOQ_ITEM]: 'BOQ Item',
  [RowType.SUB_TOTAL]: 'Sub-total',
  [RowType.GRAND_TOTAL]: 'Grand Total',
  [RowType.SPACER]: 'Spacer'
};

const CONFIDENCE_ICONS = {
  [ConfidenceLevel.HIGH]: '🟢',
  [ConfidenceLevel.MEDIUM]: '🟡',
  [ConfidenceLevel.LOW]: '🔴'
};

export default function EnhancedBOQTable({ projectId, contractorId, onSaveSuccess, loadExistingData = false }: EnhancedBOQTableProps) {
  const [sections, setSections] = useState<BOQSection[]>([]);
  const [rows, setRows] = useState<BOQRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDiscrepancies, setShowDiscrepancies] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing BOQ data with hierarchy preserved
  const loadExistingBOQ = async () => {
    if (!loadExistingData) return;
    
    setLoading(true);
    try {
      const { getBOQByProjectId } = await import('@/lib/supabase-boq');
      const existingBOQ = await getBOQByProjectId(projectId);
      
      if (existingBOQ && (existingBOQ as any).items) {
        console.log('📥 Loading existing BOQ:', existingBOQ);
        const boqData = existingBOQ as any;
        
        // Check if it's enhanced format with hierarchy
        if (boqData.rows && Array.isArray(boqData.rows)) {
          console.log('📊 Loading enhanced BOQ with hierarchy');
          setRows(boqData.rows);
          
          if (boqData.sections) {
            setSections(boqData.sections);
          } else {
            // Re-organize if sections weren't saved
            const organizedSections = organizeIntoSections(boqData.rows);
            setSections(organizedSections);
          }
        } else {
          // Legacy format - convert to enhanced
          console.log('📋 Converting legacy BOQ to enhanced format');
          const legacyRows: BOQRow[] = boqData.items.map((item: any, index: number) => ({
            id: `legacy-row-${index}`,
            description: item.description || '',
            unit: item.unit || '',
            quantity: item.quantity || 0,
            rate: item.rate || 0,
            amount: item.amount || 0,
            type: RowType.BOQ_ITEM,
            confidence: ConfidenceLevel.HIGH,
            indentLevel: 0
          }));
          
          setRows(legacyRows);
          const organizedSections = organizeIntoSections(legacyRows);
          setSections(organizedSections);
        }
        
        setMessage('✅ Existing BOQ loaded successfully');
      }
    } catch (error) {
      console.error('Error loading existing BOQ:', error);
      setMessage('Failed to load existing BOQ');
    } finally {
      setLoading(false);
    }
  };

  // Load existing data on mount
  useEffect(() => {
    loadExistingBOQ();
  }, [projectId, loadExistingData]);

  // Handle Excel file upload with enhanced analysis
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setMessage('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(true);
    setMessage('📚 Analyzing Excel workbook...');

    try {
      // Parse multi-sheet Excel file
      const { sheets, totalSheets } = await parseMultiSheetExcelFile(file);
      
      setMessage(`🔍 Analyzing ${totalSheets} sheets for smart detection...`);
      
      // Enhanced parsing with row type detection
      const analyzedRows = parseExcelToBOQRows(sheets);
      setRows(analyzedRows);
      
      // Organize into sections
      const organizedSections = organizeIntoSections(analyzedRows);
      setSections(organizedSections);
      
      // Calculate totals and check discrepancies
      const { totalAmount, calculatedAmount, hasDiscrepancies, discrepancyDetails } = calculateTotals(organizedSections);
      
      console.log('📊 Analysis complete:', {
        totalRows: analyzedRows.length,
        sections: organizedSections.length,
        totalAmount,
        calculatedAmount,
        hasDiscrepancies
      });

      const discrepancyWarning = hasDiscrepancies ? 
        ` ⚠️ ${discrepancyDetails.sectionsWithIssues} sections with discrepancies (Total diff: ₹${discrepancyDetails.totalDifference.toLocaleString()})` : 
        '';
      setMessage(`✅ Analyzed ${totalSheets} sheets: ${organizedSections.length} sections, ${analyzedRows.length} rows, ₹${totalAmount.toLocaleString()}${discrepancyWarning}`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error analyzing Excel file:', error);
      setMessage(`Failed to analyze Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  // Toggle section collapse/expand
  const toggleSection = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, isCollapsed: !section.isCollapsed }
        : section
    ));
  };

  // Update row type manually
  const updateRowType = (rowId: string, newType: RowType) => {
    const updatedRows = rows.map(row => 
      row.id === rowId 
        ? { ...row, type: newType, confidence: ConfidenceLevel.HIGH } // User override = high confidence
        : row
    );
    setRows(updatedRows);
    
    // Re-organize sections with updated row types
    const reorganizedSections = organizeIntoSections(updatedRows);
    setSections(reorganizedSections);
  };

  // Indent controls - move row left or right
  const adjustIndent = (rowId: string, direction: 'left' | 'right') => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        const currentLevel = row.indentLevel || 0;
        const newLevel = direction === 'right' 
          ? Math.min(currentLevel + 1, 3) // Max 3 levels
          : Math.max(currentLevel - 1, 0); // Min 0 levels
        return { ...row, indentLevel: newLevel };
      }
      return row;
    });
    
    setRows(updatedRows);
    
    // Re-organize sections to maintain consistency
    const reorganizedSections = organizeIntoSections(updatedRows);
    setSections(reorganizedSections);
  };

  // Update row data with enhanced calculations
  const updateRowData = (rowId: string, field: keyof BOQRow, value: any) => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        const newRow = { ...row, [field]: value };
        
        // Auto-calculate amount for items with numeric quantity - 2 decimal precision
        if (field === 'quantity' || field === 'rate') {
          if (newRow.type === RowType.BOQ_ITEM && typeof newRow.quantity === 'number' && newRow.rate > 0) {
            newRow.amount = Math.round(newRow.quantity * newRow.rate * 100) / 100;
          }
        }
        
        // Ensure all monetary values are rounded to 2 decimals
        if (field === 'amount') {
          newRow.amount = Math.round(newRow.amount * 100) / 100;
        }
        
        return newRow;
      }
      return row;
    });
    
    setRows(updatedRows);
    
    // Re-calculate section totals with hierarchical warnings
    const reorganizedSections = organizeIntoSections(updatedRows);
    setSections(reorganizedSections);
  };

  // Add new row functionality
  const addNewRow = (sectionId: string, afterRowId?: string) => {
    // Find the indent level of the row we're adding after
    const afterRow = afterRowId ? rows.find(r => r.id === afterRowId) : null;
    const inheritedIndentLevel = afterRow?.indentLevel || 0;
    
    const newRow: BOQRow = {
      id: `row-${Date.now()}`,
      description: '',
      unit: 'Nos',
      quantity: 0,
      rate: 0,
      amount: 0,
      type: RowType.BOQ_ITEM,
      confidence: ConfidenceLevel.HIGH, // User created = high confidence
      sectionId,
      indentLevel: inheritedIndentLevel // Inherit indent level
    };
    
    let insertIndex = rows.length;
    if (afterRowId) {
      const rowIndex = rows.findIndex(r => r.id === afterRowId);
      if (rowIndex !== -1) {
        insertIndex = rowIndex + 1;
      }
    }
    
    const updatedRows = [
      ...rows.slice(0, insertIndex),
      newRow,
      ...rows.slice(insertIndex)
    ];
    
    setRows(updatedRows);
    const reorganizedSections = organizeIntoSections(updatedRows);
    setSections(reorganizedSections);
  };

  // Delete row functionality
  const deleteRow = (rowId: string) => {
    const updatedRows = rows.filter(row => row.id !== rowId);
    setRows(updatedRows);
    const reorganizedSections = organizeIntoSections(updatedRows);
    setSections(reorganizedSections);
  };

  // Save to Supabase (enhanced format with hierarchy preserved)
  const handleSave = async () => {
    // Save ALL rows with their types, indentation, and order
    const enhancedItems = rows
      .filter(row => row.description.trim() !== '' || row.type === RowType.SPACER) // Keep all rows including spacers
      .map((row, index) => ({
        description: row.description,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        amount: row.amount,
        // Enhanced metadata to preserve structure
        rowType: row.type,
        indentLevel: row.indentLevel || 0,
        confidence: row.confidence,
        sectionId: row.sectionId,
        displayOrder: index + 1 // Preserve exact order
      }));

    if (enhancedItems.length === 0) {
      setMessage('Please add at least one row');
      return;
    }

    setSaving(true);
    setMessage('Saving enhanced BOQ with hierarchy...');

    try {
      const { totalAmount } = calculateTotals(sections);
      
      // Save both legacy format (for compatibility) and enhanced format
      const boq: ProjectBOQ = {
        projectId,
        contractorId,
        uploadDate: new Date().toISOString(),
        items: enhancedItems, // Now contains ALL rows with metadata
        sections: sections, // Save organized sections
        rows: rows, // Save full enhanced rows
        totalAmount,
        calculatedAmount: totalAmount,
        fileName: 'Enhanced BOQ with Hierarchy',
        hasDiscrepancies: sections.some(s => s.hasDiscrepancy)
      };

      await saveBOQToSupabase(boq);
      setMessage('✅ Enhanced BOQ with hierarchy saved successfully!');
      if (onSaveSuccess) onSaveSuccess();
      
    } catch (error) {
      console.error('Error saving BOQ:', error);
      setMessage(`Failed to save BOQ: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const { totalAmount, hasDiscrepancies, discrepancyDetails } = calculateTotals(sections);

  return (
    <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary">Enhanced BOQ Manager</h3>
        <div className="flex items-center space-x-4">
          {loading && (
            <div className="text-sm text-secondary flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-amber mr-2"></div>
              Loading...
            </div>
          )}
          <div className="text-sm text-secondary">
            {sections.length} sections • {rows.filter(r => r.type === RowType.BOQ_ITEM).length} items
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading || rows.length === 0}
            className="bg-accent-amber text-neutral-dark px-4 py-2 rounded hover:bg-accent-amber/90 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save BOQ'}
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 p-4 bg-neutral-darker/50 border border-neutral-medium rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-primary font-medium">📄 Smart BOQ Analysis</h4>
          <span className="text-xs text-secondary">Auto-detects sections & row types</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="excel-upload"
          />
          <label 
            htmlFor="excel-upload" 
            className={`cursor-pointer px-4 py-2 rounded border-2 border-dashed text-sm font-medium transition-colors ${
              uploading 
                ? 'border-gray-400 text-gray-400 cursor-not-allowed' 
                : 'border-accent-amber/50 text-accent-amber hover:border-accent-amber hover:bg-accent-amber/10'
            }`}
          >
            {uploading ? '🔍 Analyzing...' : '📁 Upload & Analyze Excel'}
          </label>
          
          <div className="text-xs text-secondary">
            Smart detection of headers, items, and sub-totals
          </div>
        </div>
      </div>

      {/* BOQ Summary & Controls */}
      {sections.length > 0 && (
        <div className="mb-4 space-y-3">
          {/* BOQ Health Summary */}
          <div className="p-3 bg-neutral-darker/30 border border-neutral-medium rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-sm">
                  <span className="text-secondary">Sections:</span>
                  <span className="ml-1 font-medium text-primary">{sections.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-secondary">Items:</span>
                  <span className="ml-1 font-medium text-primary">{rows.filter(r => r.type === RowType.BOQ_ITEM).length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-secondary">Total:</span>
                  <span className="ml-1 font-semibold text-accent-amber">{formatCurrency(totalAmount)}</span>
                </div>
                {hasDiscrepancies && (
                  <div className="text-sm">
                    <span className="text-red-400">⚠️ {discrepancyDetails.sectionsWithIssues} discrepancies</span>
                    <span className="ml-1 text-yellow-400">(₹{discrepancyDetails.totalDifference.toFixed(2)} total diff)</span>
                  </div>
                )}
              </div>
              
              {/* Quality Score */}
              <div className="text-right">
                <div className="text-xs text-secondary">Detection Quality</div>
                <div className="flex items-center space-x-1 mt-1">
                  {[ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW].map(level => {
                    const count = rows.filter(r => r.confidence === level).length;
                    const percentage = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
                    return (
                      <div key={level} className="flex items-center space-x-1">
                        <span>{CONFIDENCE_ICONS[level]}</span>
                        <span className="text-xs text-secondary">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Worst Discrepancy Alert */}
            {hasDiscrepancies && discrepancyDetails.worstDiscrepancy && showDiscrepancies && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                <span className="text-red-400 font-medium">⚠️ Largest discrepancy:</span>
                <span className="ml-1 text-primary">"{discrepancyDetails.worstDiscrepancy.sectionTitle}"</span>
                <span className="ml-1 text-yellow-400">(₹{discrepancyDetails.worstDiscrepancy.difference.toFixed(2)} difference)</span>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSections(sections.map(s => ({ ...s, isCollapsed: false })))}
                className="text-sm text-accent-amber hover:underline"
              >
                Expand All
              </button>
              <button
                onClick={() => setSections(sections.map(s => ({ ...s, isCollapsed: true })))}
                className="text-sm text-accent-amber hover:underline"  
              >
                Collapse All
              </button>
              <label className="flex items-center space-x-2 text-sm text-secondary">
                <input 
                  type="checkbox" 
                  checked={showDiscrepancies}
                  onChange={(e) => setShowDiscrepancies(e.target.checked)}
                  className="rounded"
                />
                <span>Show warnings</span>
              </label>
            </div>
            
            <div className="text-xs text-secondary">
              Last analyzed: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className="border border-neutral-medium rounded-lg">
            {/* Section Header */}
            <div 
              className="flex items-center justify-between p-3 bg-neutral-darker/50 cursor-pointer hover:bg-neutral-darker/70"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-accent-amber">
                  {section.isCollapsed ? '▶' : '▼'}
                </span>
                <h4 className="font-medium text-primary">{section.title}</h4>
                {section.hasDiscrepancy && showDiscrepancies && (
                  <span className="text-red-400 text-sm">⚠️ Total mismatch</span>
                )}
              </div>
              <div className="text-sm text-secondary flex items-center space-x-3">
                <span>{section.items.length} items • {formatCurrency(section.calculatedTotal)}</span>
                {section.hasDiscrepancy && showDiscrepancies && (
                  <span className="text-red-400 text-xs">
                    ⚠️ Calc: {formatCurrency(section.calculatedTotal)} vs Sub: {formatCurrency(section.subTotal)}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addNewRow(section.id);
                  }}
                  className="text-xs text-accent-amber hover:text-accent-amber/80 px-2 py-1 border border-accent-amber/30 rounded"
                  title="Add item to this section"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Section Content */}
            {!section.isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-darker text-xs">
                      <th className="px-2 py-2 text-left w-24">Type & Indent</th>
                      <th className="px-2 py-2 text-left">Description</th>
                      <th className="px-2 py-2 text-left w-20">Unit</th>
                      <th className="px-2 py-2 text-right w-24">Quantity</th>
                      <th className="px-2 py-2 text-right w-24">Rate</th>
                      <th className="px-2 py-2 text-right w-28">Amount</th>
                      <th className="px-2 py-2 w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map(row => (
                      <tr key={row.id} className="border-t border-neutral-medium/30 hover:bg-neutral-darker/30">
                        {/* Row Type Selector */}
                        <td className="px-2 py-2">
                          <div className="flex flex-col items-start space-y-1">
                            <div className="flex items-center space-x-1">
                              <span>{CONFIDENCE_ICONS[row.confidence]}</span>
                              <select
                                value={row.type}
                                onChange={(e) => updateRowType(row.id, e.target.value as RowType)}
                                className="text-xs bg-neutral-dark border border-neutral-medium rounded px-1 py-1"
                              >
                                {Object.entries(ROW_TYPE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Indent Controls */}
                            {(row.type === RowType.BOQ_ITEM || row.type === RowType.BOQ_DESCRIPTION) && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => adjustIndent(row.id, 'left')}
                                  disabled={(row.indentLevel || 0) === 0}
                                  className="text-xs px-1 py-0.5 bg-neutral-medium hover:bg-neutral-medium/80 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                                  title="Move left (outdent)"
                                >
                                  ←
                                </button>
                                <span className="text-xs text-secondary w-4 text-center">{row.indentLevel || 0}</span>
                                <button
                                  onClick={() => adjustIndent(row.id, 'right')}
                                  disabled={(row.indentLevel || 0) >= 3}
                                  className="text-xs px-1 py-0.5 bg-neutral-medium hover:bg-neutral-medium/80 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                                  title="Move right (indent)"
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Description with Indentation */}
                        <td className="px-2 py-2">
                          <div className="flex items-center">
                            {/* Indent Visual */}
                            {(row.type === RowType.BOQ_ITEM || row.type === RowType.BOQ_DESCRIPTION) && (row.indentLevel || 0) > 0 && (
                              <div className="flex items-center mr-2">
                                {Array.from({ length: row.indentLevel || 0 }).map((_, i) => (
                                  <div key={i} className="w-4 flex justify-center">
                                    {i === (row.indentLevel || 0) - 1 ? (
                                      <span className="text-neutral-medium text-xs">└─</span>
                                    ) : (
                                      <span className="text-neutral-medium text-xs">│</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateRowData(row.id, 'description', e.target.value)}
                              className={`flex-1 px-2 py-1 text-sm bg-neutral-dark border-none rounded ${
                                row.type === RowType.SHEET_HEADER ? 'font-bold text-accent-amber' :
                                row.type === RowType.SECTION_HEADER ? 'font-semibold text-accent-amber' :
                                row.type === RowType.BOQ_DESCRIPTION ? 'font-medium text-blue-400' :
                                row.type === RowType.SUB_TOTAL ? 'font-medium text-secondary' :
                                (row.indentLevel || 0) > 0 ? 'text-primary pl-1' :
                                'text-primary'
                              }`}
                              placeholder="Enter description..."
                            />
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="px-2 py-2">
                          {row.type === RowType.BOQ_ITEM ? (
                            <select
                              value={row.unit}
                              onChange={(e) => updateRowData(row.id, 'unit', e.target.value)}
                              className="w-full px-1 py-1 text-sm bg-neutral-dark border border-neutral-medium rounded"
                            >
                              <option value="Nos">Nos</option>
                              <option value="Sqm">Sqm</option>
                              <option value="Cum">Cum</option>
                              <option value="MT">MT</option>
                              <option value="Kg">Kg</option>
                              <option value="Ltr">Ltr</option>
                              <option value="Days">Days</option>
                              <option value="Hours">Hours</option>
                              <option value="LS">LS</option>
                              <option value="Rm">Rm</option>
                            </select>
                          ) : (
                            <span className="text-xs text-secondary">{row.unit}</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-2 py-2">
                          {row.type === RowType.BOQ_ITEM ? (
                            <input
                              type="text"
                              value={row.quantity}
                              onChange={(e) => updateRowData(row.id, 'quantity', 
                                isNaN(parseFloat(e.target.value)) ? e.target.value : parseFloat(e.target.value)
                              )}
                              className="w-full px-2 py-1 text-sm text-right bg-neutral-dark border border-neutral-medium rounded"
                              placeholder="QRO"
                            />
                          ) : (
                            <span className="text-xs text-secondary text-right block">-</span>
                          )}
                        </td>

                        {/* Rate */}
                        <td className="px-2 py-2">
                          {row.type === RowType.BOQ_ITEM ? (
                            <input
                              type="number"
                              value={row.rate}
                              onChange={(e) => updateRowData(row.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm text-right bg-neutral-dark border border-neutral-medium rounded"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <span className="text-xs text-secondary text-right block">-</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-2 py-2 text-right">
                          {row.type === RowType.BOQ_ITEM ? (
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateRowData(row.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm text-right bg-neutral-dark border border-neutral-medium rounded"
                              step="0.01"
                              min="0"
                              placeholder="Auto-calculated"
                            />
                          ) : (
                            <span className={`text-sm font-medium ${
                              row.type === RowType.SUB_TOTAL ? 'text-accent-amber' :
                              row.type === RowType.GRAND_TOTAL ? 'text-green-400' :
                              'text-primary'
                            }`}>
                              {row.amount > 0 ? formatCurrency(row.amount) : '-'}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center space-x-1">
                            {/* Confidence Indicator */}
                            {row.confidence === ConfidenceLevel.LOW && (
                              <span className="text-xs text-red-400" title="Low confidence - please review">!</span>
                            )}
                            
                            {/* Add Row Button */}
                            <button
                              onClick={() => addNewRow(row.sectionId || '', row.id)}
                              className="text-xs text-accent-amber hover:text-accent-amber/80 w-4 h-4 flex items-center justify-center"
                              title="Add row after this"
                            >
                              +
                            </button>
                            
                            {/* Delete Row Button */}
                            {(row.type === RowType.BOQ_ITEM || row.type === RowType.BOQ_DESCRIPTION || row.type === RowType.SECTION_HEADER) && (
                              <button
                                onClick={() => deleteRow(row.id)}
                                className="text-xs text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center"
                                title="Delete this row"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`mt-4 p-3 rounded text-sm ${
          message.includes('✅') || message.includes('successfully') 
            ? 'bg-success/10 text-success border border-success/20' 
            : message.includes('⚠️') || message.includes('Discrepancies')
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}