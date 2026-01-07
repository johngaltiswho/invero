import { RowType, ConfidenceLevel, BOQRow, BOQSection } from '@/types/boq';

// Simple BOQ detection - no auto sub-total tagging
export function detectRowType(row: any[], rowIndex: number): { type: RowType; confidence: ConfidenceLevel } {
  const description = String(row[1] || '').toLowerCase().trim(); // Column B (Description)
  const unit = String(row[2] || '').toLowerCase().trim(); // Column C (Unit)
  const quantity = String(row[3] || '').toLowerCase().trim(); // Column D (Quantity)
  const rate = parseFloat(String(row[4] || '0')); // Column E (Rate)
  const amount = parseFloat(String(row[5] || '0')); // Column F (Amount)

  // Debug logging
  console.log(`🔍 Row ${rowIndex + 2}:`, {
    description: String(row[1] || ''),
    unit,
    quantity,
    rate,
    amount
  });

  // Empty row detection
  if (!description && !unit && !quantity && rate === 0 && amount === 0) {
    console.log(`✅ Row ${rowIndex + 2}: SPACER (empty)`);
    return { type: RowType.SPACER, confidence: ConfidenceLevel.HIGH };
  }

  // Everything with description defaults to BOQ_ITEM
  // Users will manually change to BOQ_DESCRIPTION, SUB_TOTAL, etc.
  if (description.length > 0) {
    const hasValidUnit = unit.length > 0;
    const hasQuantity = quantity && quantity !== '0' && quantity !== '';
    const hasRate = rate > 0;
    const hasAmount = amount > 0;
    
    let confidence = ConfidenceLevel.MEDIUM; // Start with medium since user may need to adjust
    
    // Higher confidence if it has typical BOQ item data
    if (hasValidUnit && hasQuantity && hasRate) {
      confidence = ConfidenceLevel.HIGH;
    }
    
    console.log(`✅ Row ${rowIndex + 2}: BOQ_ITEM (default, user can adjust)`);
    return { type: RowType.BOQ_ITEM, confidence };
  }

  // Default to BOQ item with low confidence
  console.log(`⚠️ Row ${rowIndex + 2}: BOQ_ITEM (fallback)`);
  return { type: RowType.BOQ_ITEM, confidence: ConfidenceLevel.LOW };
}

// Convert raw Excel data to enhanced BOQ rows
export function parseExcelToBOQRows(sheets: { name: string; data: any[][] }[]): BOQRow[] {
  const rows: BOQRow[] = [];
  let globalRowIndex = 0;
  
  sheets.forEach(sheet => {
    // Skip abstract/summary sheets
    if (shouldSkipSheet(sheet.name)) {
      console.log(`⏭️ Skipping sheet: ${sheet.name}`);
      return;
    }

    console.log(`📋 Analyzing sheet: ${sheet.name}`);
    
    // Add sheet header
    rows.push({
      id: `row-${globalRowIndex++}`,
      description: `=== ${sheet.name.toUpperCase()} ===`,
      unit: 'SECTION',
      quantity: 0,
      rate: 0,
      amount: 0,
      type: RowType.SHEET_HEADER,
      confidence: ConfidenceLevel.HIGH,
      indentLevel: 0
    });

    // Process data rows
    const dataRows = sheet.data.slice(1); // Skip header
    
    dataRows.forEach((row, sheetRowIndex) => {
      if (!row || row.length === 0) return;
      
      const { type, confidence } = detectRowType(row, sheetRowIndex);
      
      // Parse row data with 2 decimal precision
      const quantity = parseQuantity(String(row[3] || ''));
      const rate = Math.round((parseFloat(String(row[4] || '0')) || 0) * 100) / 100;
      const amount = Math.round((parseFloat(String(row[5] || '0')) || 0) * 100) / 100;
      
      const boqRow: BOQRow = {
        id: `row-${globalRowIndex++}`,
        description: String(row[1] || '').trim(),
        unit: String(row[2] || 'Nos').trim(),
        quantity,
        rate,
        amount,
        type,
        confidence,
        originalRowIndex: sheetRowIndex,
        indentLevel: 0 // Start with no indentation
      };
      
      rows.push(boqRow);
      
      console.log(`${getConfidenceIcon(confidence)} Row ${sheetRowIndex + 2}: ${type} - "${boqRow.description.substring(0, 30)}..."`);
    });

    // Add spacer between sheets
    rows.push({
      id: `row-${globalRowIndex++}`,
      description: '',
      unit: '',
      quantity: 0,
      rate: 0,
      amount: 0,
      type: RowType.SPACER,
      confidence: ConfidenceLevel.HIGH,
      indentLevel: 0
    });
  });
  
  return rows;
}

// Simplified: Sheet-based sections only with manual indentation
export function organizeIntoSections(rows: BOQRow[]): BOQSection[] {
  const sections: BOQSection[] = [];
  let currentSection: BOQSection | null = null;
  let sectionIndex = 0;

  rows.forEach(row => {
    // Only sheet headers create sections now
    if (row.type === RowType.SHEET_HEADER && row.description.includes('===')) {
      // Start new section (sheet-based)
      if (currentSection) {
        sections.push(currentSection);
      }
      
      currentSection = {
        id: `section-${sectionIndex++}`,
        title: row.description,
        isCollapsed: false, // Start expanded as requested
        items: [],
        subTotal: 0,
        calculatedTotal: 0,
        level: 0,
        hasDiscrepancy: false
      };
      
      // Update row with section ID
      row.sectionId = currentSection.id;
      
    } else if (currentSection) {
      // Add to current section with indentation support
      row.sectionId = currentSection.id;
      
      // Initialize indentLevel if not set
      if (row.indentLevel === undefined) {
        row.indentLevel = 0;
      }
      
      currentSection.items.push(row);
      
      // Calculate running totals with 2-decimal precision  
      if (row.type === RowType.BOQ_ITEM) {
        currentSection.calculatedTotal = Math.round((currentSection.calculatedTotal + row.amount) * 100) / 100;
      } else if (row.type === RowType.SUB_TOTAL) {
        // Manual sub-totals set by user
        currentSection.subTotal = Math.round(row.amount * 100) / 100;
      }
    }
  });
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Check for discrepancies with enhanced validation
  sections.forEach(section => {
    if (section.subTotal > 0) {
      const difference = Math.abs(section.calculatedTotal - section.subTotal);
      section.hasDiscrepancy = difference > 0.01; // Allow for rounding errors
      
      // Log detailed discrepancy information for debugging
      if (section.hasDiscrepancy) {
        console.warn(`💸 Discrepancy in section "${section.title}": Calculated ₹${section.calculatedTotal} vs Sub-total ₹${section.subTotal} (Diff: ₹${difference.toFixed(2)})`);
      }
    } else {
      // If no sub-total provided, check if section has any sub-total rows
      const hasSubTotalRows = section.items.some(item => item.type === RowType.SUB_TOTAL);
      if (hasSubTotalRows) {
        const subTotalRow = section.items.find(item => item.type === RowType.SUB_TOTAL);
        if (subTotalRow) {
          section.subTotal = subTotalRow.amount;
          const difference = Math.abs(section.calculatedTotal - section.subTotal);
          section.hasDiscrepancy = difference > 0.01;
          
          if (section.hasDiscrepancy) {
            console.warn(`💸 Inline sub-total discrepancy in "${section.title}": Calculated ₹${section.calculatedTotal} vs Sub-total ₹${section.subTotal} (Diff: ₹${difference.toFixed(2)})`);
          }
        }
      }
    }
  });
  
  return sections;
}

// Helper functions
function shouldSkipSheet(sheetName: string): boolean {
  const skipKeywords = ['abstract', 'summary', 'total', 'overview', 'index'];
  const name = sheetName.toLowerCase();
  return skipKeywords.some(keyword => name.includes(keyword));
}

function parseQuantity(value: string): string | number {
  if (!value || value.trim() === '') return 0;
  
  const trimmedValue = value.trim().toUpperCase();
  
  // Check for common text quantities
  if (trimmedValue === 'QRO' || trimmedValue === 'LS' || trimmedValue === 'LOT' || 
      trimmedValue === 'LUMPSUM' || trimmedValue === 'AS REQUIRED' || 
      trimmedValue === 'TBD' || trimmedValue === 'TO BE DECIDED') {
    return trimmedValue;
  }
  
  // Try to parse as number
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? trimmedValue : Math.round(num * 100) / 100;
}

function getConfidenceIcon(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case ConfidenceLevel.HIGH: return '🟢';
    case ConfidenceLevel.MEDIUM: return '🟡';
    case ConfidenceLevel.LOW: return '🔴';
    default: return '⚪';
  }
}

// Calculate total amounts with enhanced validation and warnings
export function calculateTotals(sections: BOQSection[]): {
  totalAmount: number;
  calculatedAmount: number;
  hasDiscrepancies: boolean;
  discrepancyDetails: {
    sectionsWithIssues: number;
    totalDifference: number;
    worstDiscrepancy: { sectionTitle: string; difference: number } | null;
  };
} {
  let totalAmount = 0;
  let calculatedAmount = 0;
  let hasDiscrepancies = false;
  let sectionsWithIssues = 0;
  let totalDifference = 0;
  let worstDiscrepancy: { sectionTitle: string; difference: number } | null = null;

  sections.forEach(section => {
    // Prefer sub-total if available, otherwise use calculated total
    if (section.subTotal > 0) {
      totalAmount += section.subTotal;
    } else {
      totalAmount += section.calculatedTotal;
    }
    
    calculatedAmount += section.calculatedTotal;
    
    if (section.hasDiscrepancy) {
      hasDiscrepancies = true;
      sectionsWithIssues++;
      
      const difference = Math.abs(section.calculatedTotal - section.subTotal);
      totalDifference += difference;
      
      // Track worst discrepancy
      if (!worstDiscrepancy || difference > worstDiscrepancy.difference) {
        worstDiscrepancy = {
          sectionTitle: section.title,
          difference
        };
      }
    }
  });

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    calculatedAmount: Math.round(calculatedAmount * 100) / 100,
    hasDiscrepancies,
    discrepancyDetails: {
      sectionsWithIssues,
      totalDifference: Math.round(totalDifference * 100) / 100,
      worstDiscrepancy
    }
  };
}