'use client';

import { useState, useEffect, useRef } from 'react';
import { saveBOQToSupabase, getBOQByProjectId } from '@/lib/supabase-boq';
import type { BOQItem, ProjectBOQ } from '@/types/boq';

interface EditableBOQTableProps {
  projectId: string;
  contractorId: string;
  onSaveSuccess?: () => void;
  loadExistingData?: boolean;
}

interface EditableBOQItem extends BOQItem {
  id: string;
}

export default function EditableBOQTable({ projectId, contractorId, onSaveSuccess, loadExistingData = false }: EditableBOQTableProps) {
  const [numRows] = useState(5);
  const [items, setItems] = useState<EditableBOQItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  // Load existing data or initialize empty rows
  useEffect(() => {
    const loadData = async () => {
      if (loadExistingData && items.length === 0) {
        try {
          const existingData = await getBOQByProjectId(projectId);
          if (existingData && existingData.length > 0) {
            const loadedItems: EditableBOQItem[] = existingData.map((item, index) => ({
              id: `item-${index}`,
              description: item.description || '',
              unit: item.unit || 'Nos',
              quantity: item.quantity || 0,
              rate: item.rate || 0,
              amount: item.amount || 0
            }));
            
            // Add some empty rows at the end for editing
            const additionalRows: EditableBOQItem[] = Array.from({ length: 5 }, (_, index) => ({
              id: `item-${loadedItems.length + index}`,
              description: '',
              unit: 'Nos',
              quantity: 0,
              rate: 0,
              amount: 0
            }));
            
            setItems([...loadedItems, ...additionalRows]);
            setMessage(`Loaded ${loadedItems.length} existing items for editing`);
            return;
          }
        } catch (error) {
          console.error('Error loading existing BOQ data:', error);
          setMessage('Error loading existing data. Starting with empty form.');
        }
      }
      
      // Initialize with empty rows if no existing data or not loading existing data
      if (items.length === 0) {
        const newItems: EditableBOQItem[] = Array.from({ length: numRows }, (_, index) => ({
          id: `item-${index}`,
          description: '',
          unit: 'Nos',
          quantity: 0,
          rate: 0,
          amount: 0
        }));
        setItems(newItems);
      }
    };

    loadData();
  }, [numRows, items.length, loadExistingData, projectId]);

  // Automatically add more rows when needed
  const autoAddRowsIfNeeded = (updatedItems: EditableBOQItem[]) => {
    // Count filled rows (rows with description or non-zero values)
    const filledRows = updatedItems.filter(item => 
      (item.description && item.description.trim() !== '') || 
      (typeof item.quantity === 'number' ? item.quantity > 0 : item.quantity && item.quantity.toString().trim() !== '') || 
      item.rate > 0
    ).length;
    
    const totalRows = updatedItems.length;
    const emptyRows = totalRows - filledRows;
    
    // If we have 2 or fewer empty rows left, add 5 more
    if (emptyRows <= 2 && filledRows > 0) {
      const additionalRows: EditableBOQItem[] = Array.from({ length: 5 }, (_, index) => ({
        id: `item-${totalRows + index}`,
        description: '',
        unit: 'Nos',
        quantity: 0,
        rate: 0,
        amount: 0
      }));
      return [...updatedItems, ...additionalRows];
    }
    
    return updatedItems;
  };

  // Auto-calculate amount when quantity or rate changes
  const updateItem = (index: number, field: keyof EditableBOQItem, value: string | number) => {
    const newItems = [...items];
    if (!newItems[index]) return;
    
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate amount for quantity/rate changes
    if (field === 'quantity' || field === 'rate') {
      const item = newItems[index];
      // Only auto-calculate if quantity is numeric
      if (typeof item.quantity === 'number' && !isNaN(item.quantity)) {
        const rate = typeof item.rate === 'number' ? item.rate : parseNumberWithCommas(String(item.rate));
        if (!isNaN(rate)) {
          item.amount = item.quantity * rate;
        }
      }
      // For text quantities (QRO, LS, etc.), don't auto-calculate - user must enter amount manually
    }

    // Auto-add more rows if needed
    const finalItems = autoAddRowsIfNeeded(newItems);
    setItems(finalItems);
  };

  // Parse number with comma support (e.g., "1,234.56" or "1234.56")
  const parseNumberWithCommas = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove commas and parse as float
    const cleanValue = value.toString().replace(/,/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  };

  // Parse quantity - handles both numeric and text (QRO, LS, etc.)
  const parseQuantity = (value: string): string | number => {
    if (!value || value.trim() === '') return 0;
    
    const trimmedValue = value.trim().toUpperCase();
    
    // Check for common text quantities
    if (trimmedValue === 'QRO' || trimmedValue === 'LS' || trimmedValue === 'LOT' || 
        trimmedValue === 'LUMPSUM' || trimmedValue === 'AS REQUIRED' || 
        trimmedValue === 'TBD' || trimmedValue === 'TO BE DECIDED') {
      return trimmedValue;
    }
    
    // Try to parse as number
    const cleanValue = value.replace(/,/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? value.trim() : num;
  };

  // Clean text data from copy-paste
  const cleanPasteData = (text: string): string => {
    return text
      .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes with regular quotes
      .replace(/[\u2018\u2019]/g, "'")  // Replace smart apostrophes
      .replace(/\u2013/g, '-')          // Replace en dash
      .replace(/\u2014/g, '--')         // Replace em dash
      .replace(/\u00A0/g, ' ')          // Replace non-breaking space
      .trim();
  };

  // Handle paste from clipboard (Excel copy-paste support)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const cleanedData = cleanPasteData(pasteData);
    
    // Pure Excel clipboard parser: parse exactly as Excel structures it
    // Excel format: rows separated by \n, columns by \t, quoted content preserved
    const parseExcelClipboard = (data: string): string[][] => {
      const rows: string[][] = [];
      const lines = data.split('\n');
      
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (const line of lines) {
        if (!inQuotes && line.trim() === '') continue; // Skip empty lines
        
        const chars = line.split('');
        let cellContent = '';
        
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === '\t' && !inQuotes) {
            // End of cell
            currentRow.push(currentCell + cellContent);
            cellContent = '';
            currentCell = '';
          } else {
            cellContent += char;
          }
        }
        
        if (inQuotes) {
          // This line continues a multi-line cell
          currentCell += (currentCell ? '\n' : '') + cellContent;
        } else {
          // End of row
          currentRow.push(currentCell + cellContent);
          if (currentRow.some(cell => cell.trim())) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        }
      }
      
      // Handle last row if not empty
      if (currentRow.length > 0 || currentCell) {
        if (currentCell) currentRow.push(currentCell);
        if (currentRow.some(cell => cell.trim())) {
          rows.push(currentRow);
        }
      }
      
      return rows;
    };
    
    const parsedRows = parseExcelClipboard(cleanedData);
    const filteredRows = parsedRows.map(row => row.join('\t'));
    
    
    if (filteredRows.length === 0) return;

    // Find the first empty row to start pasting
    const firstEmptyRowIndex = items.findIndex(item => 
      (!item.description || item.description.trim() === '') && 
      (typeof item.quantity === 'number' ? item.quantity === 0 : (!item.quantity || item.quantity.toString().trim() === '')) && 
      item.rate === 0
    );
    
    const startIndex = firstEmptyRowIndex !== -1 ? firstEmptyRowIndex : items.length;
    const updatedItems = [...items];
    
    let validRowIndex = 0;
    
    filteredRows.forEach((row) => {
      const cols = row.split('\t').map(col => cleanPasteData(col || '')); // Split by tabs only
      
      // Skip empty rows (rows where all cells are empty or whitespace)
      const isEmptyRow = cols.every(col => !col || col.trim() === '');
      if (isEmptyRow) return;
      
      // Handle both complete rows (5+ columns) and header rows (1-2 columns)
      if (cols.length >= 1) {
        const targetIndex = startIndex + validRowIndex;
        
        // Extend array if needed
        while (updatedItems.length <= targetIndex) {
          updatedItems.push({
            id: `item-${updatedItems.length}`,
            description: '',
            unit: 'Nos',
            quantity: 0,
            rate: 0,
            amount: 0
          });
        }

        // Check if this is a header row (only description, no quantity/rate)
        if (cols.length >= 3 && cols[2] && cols[2].trim() !== '') {
          // Complete BOQ item
          const quantity = parseQuantity(cols[2] || '0');
          const rate = parseNumberWithCommas(cols[3] || '0');
          
          // Calculate amount - if quantity is text (QRO), use provided amount or 0
          let amount: number;
          if (cols[4]) {
            amount = parseNumberWithCommas(cols[4]);
          } else if (typeof quantity === 'number') {
            amount = quantity * rate;
          } else {
            amount = 0; // For QRO items, amount should be specified separately
          }
          
          updatedItems[targetIndex] = {
            id: `item-${targetIndex}`,
            description: cols[0] || '',
            unit: cols[1] || 'Nos',
            quantity,
            rate,
            amount
          };
        } else {
          // Header row - only description
          updatedItems[targetIndex] = {
            id: `item-${targetIndex}`,
            description: cols[0] || '',
            unit: cols[1] || 'N/A',
            quantity: 0,
            rate: 0,
            amount: 0
          };
        }
        
        validRowIndex++;
      }
    });

    // Auto-add more rows if needed
    const finalItems = autoAddRowsIfNeeded(updatedItems);
    setItems(finalItems);
    setMessage(`${validRowIndex} rows pasted successfully from ${filteredRows.length} parsed rows (${filteredRows.length - validRowIndex} empty rows skipped)! Review and save.`);
  };

  // Save to Supabase
  const handleSave = async () => {
    const validItems = items.filter(item => {
      const hasDescription = item.description && item.description.trim() !== '';
      const hasQuantity = typeof item.quantity === 'number' ? item.quantity > 0 : item.quantity && item.quantity.toString().trim() !== '';
      const hasRate = item.rate > 0;
      
      // Include if:
      // 1. Has all fields (normal BOQ item)
      // 2. Has only description (header/context row)
      return hasDescription && (
        (hasQuantity && hasRate) ||  // Complete BOQ item
        (!hasQuantity && !hasRate)   // Description-only header
      );
    });

    if (validItems.length === 0) {
      setMessage('Please add at least one valid BOQ item');
      return;
    }

    setSaving(true);
    setMessage('Saving BOQ...');

    try {
      console.log('Saving BOQ with items:', validItems);
      console.log('Project ID:', projectId);
      console.log('Contractor ID:', contractorId);
      
      const totalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
      
      const boq: ProjectBOQ = {
        projectId,
        contractorId,
        uploadDate: new Date().toISOString(),
        items: validItems.map(({ id, ...item }) => item), // Remove temporary id
        totalAmount,
        fileName: 'Manual Entry'
      };

      console.log('BOQ object to save:', boq);
      
      const result = await saveBOQToSupabase(boq);
      console.log('Save result:', result);
      
      setMessage('BOQ saved successfully!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error('Detailed save error:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage(`Failed to save BOQ: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary">BOQ Entry</h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-secondary">
            {items.length} rows • {items.filter(item => 
              (item.description && item.description.trim() !== '') || 
              (typeof item.quantity === 'number' ? item.quantity > 0 : item.quantity && item.quantity.toString().trim() !== '')
            ).length} filled
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent-amber text-neutral-dark px-4 py-2 rounded hover:bg-accent-amber/90 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save BOQ'}
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-lg text-sm text-accent-amber">
        💡 <strong>Tip:</strong> Copy data from Excel and paste directly into the table (Ctrl+V). 
        Paste multiple sheets sequentially - more rows will be added automatically!<br/>
        Expected format: Description | Unit | Quantity | Rate | Amount
      </div>

      <div className="overflow-x-auto" onPaste={handlePaste}>
        <table ref={tableRef} className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-neutral-darker">
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">#</th>
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">Description</th>
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">Unit</th>
              <th className="border border-neutral-medium px-3 py-2 text-right text-sm font-medium text-secondary">Quantity</th>
              <th className="border border-neutral-medium px-3 py-2 text-right text-sm font-medium text-secondary">Rate</th>
              <th className="border border-neutral-medium px-3 py-2 text-right text-sm font-medium text-secondary">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="hover:bg-neutral-darker/50">
                <td className="border border-neutral-medium px-3 py-2 text-sm text-secondary">
                  {index + 1}
                </td>
                <td className="border border-neutral-medium px-3 py-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
                    placeholder="Enter description..."
                  />
                </td>
                <td className="border border-neutral-medium px-3 py-2">
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
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
                </td>
                <td className="border border-neutral-medium px-3 py-2">
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseQuantity(e.target.value))}
                    className="w-full px-2 py-1 text-sm text-right bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
                    placeholder="QRO or numeric"
                  />
                </td>
                <td className="border border-neutral-medium px-3 py-2">
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', parseNumberWithCommas(e.target.value))}
                    className="w-full px-2 py-1 text-sm text-right bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td className="border border-neutral-medium px-3 py-2 text-right font-medium text-accent-amber">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-darker font-semibold">
              <td colSpan={5} className="border border-neutral-medium px-3 py-2 text-right text-primary">
                Total Amount:
              </td>
              <td className="border border-neutral-medium px-3 py-2 text-right text-accent-amber">
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded text-sm ${
          message.includes('successfully') 
            ? 'bg-success/10 text-success border border-success/20' 
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}