'use client';

import { useState, useEffect, useRef } from 'react';
import { saveScheduleToSupabase } from '@/lib/supabase-boq';
import type { ScheduleItem, ProjectSchedule } from '@/types/boq';

interface EditableScheduleTableProps {
  projectId: string;
  contractorId: string;
  onSaveSuccess?: () => void;
}

interface EditableScheduleItem extends ScheduleItem {
  id: string;
}

export default function EditableScheduleTable({ projectId, contractorId, onSaveSuccess }: EditableScheduleTableProps) {
  const [numRows, setNumRows] = useState(5);
  const [tasks, setTasks] = useState<EditableScheduleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  // Initialize empty rows only on first load
  useEffect(() => {
    if (tasks.length === 0) {
      const newTasks: EditableScheduleItem[] = Array.from({ length: numRows }, (_, index) => ({
        id: `task-${index}`,
        task: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
        duration: 7,
        progress: 0
      }));
      setTasks(newTasks);
    }
  }, [numRows, tasks.length]);

  // Automatically add more rows when needed
  const autoAddRowsIfNeeded = (updatedTasks: EditableScheduleItem[]) => {
    // Count filled rows (rows with task name)
    const filledRows = updatedTasks.filter(task => task.task.trim() !== '').length;
    const totalRows = updatedTasks.length;
    const emptyRows = totalRows - filledRows;
    
    // If we have 2 or fewer empty rows left, add 5 more
    if (emptyRows <= 2 && filledRows > 0) {
      const additionalRows: EditableScheduleItem[] = Array.from({ length: 5 }, (_, index) => ({
        id: `task-${totalRows + index}`,
        task: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: 7,
        progress: 0
      }));
      return [...updatedTasks, ...additionalRows];
    }
    
    return updatedTasks;
  };

  // Auto-calculate duration when dates change
  const updateTask = (index: number, field: keyof EditableScheduleItem, value: string | number) => {
    const newTasks = [...tasks];
    if (!newTasks[index]) return;
    
    newTasks[index] = { ...newTasks[index], [field]: value };

    // Auto-calculate duration for date changes
    if (field === 'startDate' || field === 'endDate') {
      const startDate = new Date(newTasks[index].startDate);
      const endDate = new Date(newTasks[index].endDate);
      if (startDate && endDate && endDate >= startDate) {
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
        newTasks[index].duration = diffDays;
      }
    }

    // Auto-add more rows if needed
    const finalTasks = autoAddRowsIfNeeded(newTasks);
    setTasks(finalTasks);
  };

  // Parse number with comma support (e.g., "1,234.56" or "1234.56")
  const parseNumberWithCommas = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove commas and parse as float
    const cleanValue = value.toString().replace(/,/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
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
    const newTasks: EditableScheduleItem[] = [];
    
    console.log('=== SCHEDULE PASTE DEBUG ===');
    console.log('Parsed rows:', parsedRows);
    
    parsedRows.forEach((cols, index) => {
      console.log(`Row ${index}:`, cols);
      if (cols.length >= 1 && cols[0]?.trim()) { // At least have a task name
        // Check if this is a complete task (has dates) or just description
        const hasDateData = cols.length >= 3 && (cols[1]?.trim() || cols[2]?.trim());
        
        // Auto-detect date format with DD/MM priority
        const parseSmartDate = (dateStr: string): string => {
          if (!dateStr || !dateStr.trim()) {
            return new Date().toISOString().split('T')[0];
          }
          
          const trimmed = dateStr.trim();
          console.log('Parsing date:', trimmed);
          
          // Match DD/MM/YY or MM/DD/YY format
          const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
          if (dateMatch) {
            const first = parseInt(dateMatch[1]);
            const second = parseInt(dateMatch[2]);
            let year = parseInt(dateMatch[3]);
            
            // Handle 2-digit years
            if (year < 100) {
              year += year < 50 ? 2000 : 1900; // 25 -> 2025, 85 -> 1985
            }
            
            let day, month;
            
            // Auto-detect: if first number > 12, it must be DD/MM
            if (first > 12) {
              day = first;
              month = second - 1; // Month is 0-indexed
              console.log('Detected DD/MM (first > 12):', { day, month: month + 1, year });
            }
            // If second number > 12, it must be MM/DD  
            else if (second > 12) {
              day = second;
              month = first - 1;
              console.log('Detected MM/DD (second > 12):', { day, month: month + 1, year });
            }
            // Both <= 12: ambiguous, prioritize DD/MM as requested
            else {
              day = first;
              month = second - 1;
              console.log('Ambiguous, using DD/MM priority:', { day, month: month + 1, year });
            }
            
            const date = new Date(year, month, day);
            
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          
          // Try other common formats
          const date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
          
          // Fallback to today
          console.log('Date parsing failed, using today');
          return new Date().toISOString().split('T')[0];
        };

        let startDate: string, endDate: string;
        if (hasDateData) {
          startDate = parseSmartDate(cols[1] || '');
          endDate = parseSmartDate(cols[2] || '');
        } else {
          // Description-only task
          startDate = '';
          endDate = '';
        }
        
        // Calculate duration from dates if not provided in column 4
        let duration: number;
        if (cols[3] && cols[3].trim()) {
          // Duration provided in Excel
          duration = parseNumberWithCommas(cols[3]);
        } else if (hasDateData) {
          // Calculate duration from start and end dates
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
            const diffTime = end.getTime() - start.getTime();
            duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
          } else {
            duration = 0;
          }
        } else {
          duration = 0;
        }
        
        const progress = cols[4] ? Math.min(100, Math.max(0, parseNumberWithCommas(cols[4]))) : 0;
        
        newTasks.push({
          id: `task-${index}`,
          task: cols[0].trim(),
          startDate,
          endDate,
          duration,
          progress
        });
      }
    });

    if (newTasks.length > 0) {
      // Auto-add more rows if needed
      const finalTasks = autoAddRowsIfNeeded(newTasks);
      setTasks(finalTasks);
      setMessage(`${newTasks.length} tasks pasted successfully! Review and save.`);
    } else {
      setMessage('No valid tasks found in pasted data. Make sure the first column contains task names.');
    }
  };

  // Save to Supabase
  const handleSave = async () => {
    const validTasks = tasks.filter(task => 
      task.task.trim() && task.duration > 0
    );

    if (validTasks.length === 0) {
      setMessage('Please add at least one valid schedule task');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const totalDuration = Math.max(...validTasks.map(task => task.duration));
      
      const schedule: ProjectSchedule = {
        projectId,
        contractorId,
        uploadDate: new Date().toISOString(),
        tasks: validTasks.map(({ id, ...task }) => task), // Remove temporary id
        totalDuration,
        fileName: 'Manual Entry'
      };

      await saveScheduleToSupabase(schedule);
      setMessage('Schedule saved successfully!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      setMessage('Failed to save schedule. Please try again.');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (progress: number) => {
    if (progress >= 100) return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    if (progress > 0) return { text: 'In Progress', color: 'bg-blue-100 text-blue-800' };
    return { text: 'Not Started', color: 'bg-gray-100 text-gray-800' };
  };

  const totalTasks = tasks.filter(t => t.task.trim()).length;
  const completedTasks = tasks.filter(t => t.task.trim() && t.progress >= 100).length;
  const inProgressTasks = tasks.filter(t => t.task.trim() && t.progress > 0 && t.progress < 100).length;

  return (
    <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary">Schedule Entry</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-secondary">Tasks:</label>
            <input
              type="number"
              value={numRows}
              onChange={(e) => setNumRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-2 py-1 border border-neutral-medium bg-neutral-darker text-primary rounded text-sm focus:border-accent-amber focus:outline-none"
              min="1"
              max="100"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent-amber text-neutral-dark px-4 py-2 rounded hover:bg-accent-amber/90 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-lg text-sm text-accent-amber">
        💡 <strong>Tip:</strong> Copy data from Excel and paste directly into the table (Ctrl+V). 
        Expected format: Task | Start Date | End Date | Duration | Progress
      </div>

      {/* Summary Stats */}
      {totalTasks > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-4 p-4 bg-neutral-darker rounded-lg border border-neutral-medium">
          <div className="text-center">
            <div className="text-xl font-bold text-success">{completedTasks}</div>
            <div className="text-sm text-secondary">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-accent-blue">{inProgressTasks}</div>
            <div className="text-sm text-secondary">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{totalTasks - completedTasks - inProgressTasks}</div>
            <div className="text-sm text-secondary">Not Started</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto" onPaste={handlePaste}>
        <table ref={tableRef} className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-neutral-darker">
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">#</th>
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">Task</th>
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">Start Date</th>
              <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">End Date</th>
              <th className="border border-neutral-medium px-3 py-2 text-center text-sm font-medium text-secondary">Duration</th>
              <th className="border border-neutral-medium px-3 py-2 text-center text-sm font-medium text-secondary">Progress</th>
              <th className="border border-neutral-medium px-3 py-2 text-center text-sm font-medium text-secondary">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => {
              const status = getStatusBadge(task.progress);
              return (
                <tr key={task.id} className="hover:bg-neutral-darker/50">
                  <td className="border border-neutral-medium px-3 py-2 text-sm text-secondary">
                    {index + 1}
                  </td>
                  <td className="border border-neutral-medium px-3 py-2" style={{ minWidth: '300px' }}>
                    <textarea
                      value={task.task}
                      onChange={(e) => updateTask(index, 'task', e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded resize-none"
                      placeholder="Enter task name..."
                      rows={task.task.split('\n').length || 1}
                      style={{ minHeight: '32px' }}
                    />
                  </td>
                  <td className="border border-neutral-medium px-3 py-2">
                    <input
                      type="date"
                      value={task.startDate}
                      onChange={(e) => updateTask(index, 'startDate', e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
                    />
                  </td>
                  <td className="border border-neutral-medium px-3 py-2">
                    <input
                      type="date"
                      value={task.endDate}
                      onChange={(e) => updateTask(index, 'endDate', e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
                    />
                  </td>
                  <td className="border border-neutral-medium px-3 py-2 text-center">
                    <span className="text-sm font-medium text-primary">{task.duration} days</span>
                  </td>
                  <td className="border border-neutral-medium px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={task.progress}
                        onChange={(e) => updateTask(index, 'progress', parseFloat(e.target.value))}
                        className="flex-1 accent-accent-amber"
                      />
                      <span className="text-xs font-medium w-12 text-right text-secondary">{task.progress}%</span>
                    </div>
                    <div className="mt-1 w-full bg-neutral-medium rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${getProgressColor(task.progress)}`}
                        style={{ width: `${Math.min(task.progress, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="border border-neutral-medium px-3 py-2 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                      {status.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
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