'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { LoadingSpinner } from '@/components';
import SimplePDFViewer from '@/components/SimplePDFViewer';
import * as XLSX from 'xlsx';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

type Tab = 'boqs' | 'purchase-orders' | 'drawings' | 'invoices' | 'agreements';

interface ProjectFile {
  id: string;
  file_name: string;
  original_name: string;
  category: string;
  description?: string;
  version: string;
  file_url: string;
  file_size: number;
  mime_type?: string | null;
  created_at: string;
  project?: { id: string; project_name: string; client_name?: string };
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  invoice_url?: string;
  invoice_download_url?: string;
  project_id: string;
  purchase_request_id: string;
}

const AGREEMENTS = [
  {
    name: 'Procurement Agreement Template',
    description: 'Standard procurement agreement between contractor and Finverno',
    category: 'Agreement',
    icon: '📝',
  },
  {
    name: 'Material Purchase Terms & Conditions',
    description: 'Terms governing all material purchases through the platform',
    category: 'Terms',
    icon: '📋',
  },
  {
    name: 'Vendor NDA Template',
    description: 'Non-disclosure agreement for use with vendors and suppliers',
    category: 'NDA',
    icon: '🔒',
  },
  {
    name: 'Platform Participation Agreement',
    description: 'Agreement governing participation in Finverno supply enablement',
    category: 'Agreement',
    icon: '🤝',
  },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DocumentsPage() {
  const { contractor, loading: contractorLoading } = useContractorV2();
  const [activeTab, setActiveTab] = useState<Tab>('boqs');
  const [boqFiles, setBOQFiles] = useState<ProjectFile[]>([]);
  const [poFiles, setPOFiles] = useState<ProjectFile[]>([]);
  const [drawingFiles, setDrawingFiles] = useState<ProjectFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDFUrl, setCurrentPDFUrl] = useState('');
  const [currentPDFName, setCurrentPDFName] = useState('');
  const [showExcelViewer, setShowExcelViewer] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelSheets, setExcelSheets] = useState<{ name: string; data: any[][]; merges: XLSX.Range[] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [excelFileName, setExcelFileName] = useState('');

  useEffect(() => {
    if (!contractor?.id) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const [boqRes, poRes, drawingRes] = await Promise.all([
          fetch('/api/project-files?category=boq'),
          fetch('/api/project-files?category=po'),
          fetch('/api/project-files?category=drawings'),
        ]);

        const [boqData, poData, drawingData] = await Promise.all([
          boqRes.json(),
          poRes.json(),
          drawingRes.json(),
        ]);

        if (boqData.success) setBOQFiles(boqData.data);
        if (poData.success) setPOFiles(poData.data);
        if (drawingData.success) setDrawingFiles(drawingData.data);

        // Fetch invoices if the endpoint exists
        try {
          const invRes = await fetch('/api/invoices');
          const invData = await invRes.json();
          if (invData.success) setInvoices(invData.data || []);
        } catch {
          // Invoices table may not exist yet
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [contractor?.id]);

  if (contractorLoading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const downloadFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/project-files/download?id=${fileId}`);
      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to download file');
        return;
      }

      const { downloadUrl, fileName } = result.data;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const viewFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/project-files/download?id=${fileId}`);
      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to view file');
        return;
      }

      const { downloadUrl, fileName, mimeType } = result.data;
      const lowerName = (fileName || '').toLowerCase();
      const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
      const isExcel = mimeType === 'application/vnd.ms-excel'
        || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx');

      if (isPdf) {
        setCurrentPDFUrl(downloadUrl);
        setCurrentPDFName(fileName);
        setShowPDFViewer(true);
        return;
      }

      if (isExcel) {
        setExcelLoading(true);
        setExcelFileName(fileName);
        const fileResponse = await fetch(downloadUrl);
        const buffer = await fileResponse.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: true,
            defval: ''
          }) as any[][];
          const merges = (worksheet['!merges'] || []) as XLSX.Range[];
          return { name: sheetName, data, merges };
        });
        setExcelSheets(sheets);
        setActiveSheetIndex(0);
        setShowExcelViewer(true);
        setExcelLoading(false);
        return;
      }

      downloadFile(fileId);
    } catch (error) {
      setExcelLoading(false);
      console.error('Error viewing file:', error);
      alert('Error viewing file');
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'boqs', label: 'BOQs', count: boqFiles.length },
    { key: 'purchase-orders', label: 'Purchase Orders', count: poFiles.length },
    { key: 'drawings', label: 'Drawings', count: drawingFiles.length },
    { key: 'invoices', label: 'Invoices', count: invoices.length },
    { key: 'agreements', label: 'Agreements & Forms', count: AGREEMENTS.length },
  ];

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Documents</h1>
          <p className="text-secondary">
            Centralised view of all your BOQs, purchase orders, invoices, and procurement forms.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-medium overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-accent-amber text-accent-amber'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 text-xs bg-neutral-medium text-secondary px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!loading && (
          <>
            {/* BOQs Tab */}
            {activeTab === 'boqs' && (
              <div>
                {boqFiles.length === 0 ? (
                  <div className="text-center py-16 text-secondary">
                    <div className="text-4xl mb-3">📐</div>
                    <p className="font-medium text-primary mb-1">No BOQ documents yet</p>
                    <p className="text-sm">Upload BOQ files from a project to see them here.</p>
                  </div>
                ) : (
                  <FileTable files={boqFiles} onDownload={downloadFile} onView={viewFile} />
                )}
              </div>
            )}

            {/* Purchase Orders Tab */}
            {activeTab === 'purchase-orders' && (
              <div>
                {poFiles.length === 0 ? (
                  <div className="text-center py-16 text-secondary">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="font-medium text-primary mb-1">No purchase orders yet</p>
                    <p className="text-sm">PO documents uploaded against projects will appear here.</p>
                  </div>
                ) : (
                  <FileTable files={poFiles} onDownload={downloadFile} onView={viewFile} />
                )}
              </div>
            )}

            {/* Drawings Tab */}
            {activeTab === 'drawings' && (
              <div>
                {drawingFiles.length === 0 ? (
                  <div className="text-center py-16 text-secondary">
                    <div className="text-4xl mb-3">📐</div>
                    <p className="font-medium text-primary mb-1">No drawings yet</p>
                    <p className="text-sm">Drawing files uploaded against projects will appear here.</p>
                  </div>
                ) : (
                  <FileTable files={drawingFiles} onDownload={downloadFile} onView={viewFile} />
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                {invoices.length === 0 ? (
                  <div className="text-center py-16 text-secondary">
                    <div className="text-4xl mb-3">🧾</div>
                    <p className="font-medium text-primary mb-1">No invoices generated yet</p>
                    <p className="text-sm">
                      Invoices are auto-generated by Finverno after material delivery is confirmed.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-medium text-left">
                          <th className="py-3 px-4 text-secondary font-medium">Invoice #</th>
                          <th className="py-3 px-4 text-secondary font-medium">Date</th>
                          <th className="py-3 px-4 text-secondary font-medium">Amount</th>
                          <th className="py-3 px-4 text-secondary font-medium">Status</th>
                          <th className="py-3 px-4 text-secondary font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-neutral-medium/50 hover:bg-neutral-dark/30">
                            <td className="py-3 px-4 text-primary font-mono text-xs">{inv.invoice_number}</td>
                            <td className="py-3 px-4 text-secondary">{formatDate(inv.invoice_date)}</td>
                            <td className="py-3 px-4 text-primary">{formatCurrency(inv.total_amount)}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                inv.status === 'generated'
                                  ? 'bg-accent-amber/10 text-accent-amber'
                                  : inv.status === 'acknowledged'
                                  ? 'bg-green-900/20 text-green-400'
                                  : 'bg-neutral-medium text-secondary'
                              }`}>
                                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {(inv.invoice_download_url || inv.invoice_url) ? (
                                <a
                                  href={inv.invoice_download_url || inv.invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent-amber hover:underline text-xs"
                                >
                                  Download
                                </a>
                              ) : (
                                <span className="text-secondary text-xs">Processing</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Agreements & Forms Tab */}
            {activeTab === 'agreements' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {AGREEMENTS.map((doc) => (
                  <div
                    key={doc.name}
                    className="bg-neutral-dark border border-neutral-medium rounded-lg p-5 flex items-start gap-4"
                  >
                    <div className="text-2xl shrink-0">{doc.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-primary">{doc.name}</p>
                          <p className="text-xs text-secondary mt-1">{doc.description}</p>
                          <span className="mt-2 inline-block text-xs bg-neutral-medium text-secondary px-2 py-0.5 rounded">
                            {doc.category}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-accent-amber/60 italic">
                        Contact your Finverno account manager to obtain this document.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {showPDFViewer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-5xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-medium">
              <div className="text-primary font-semibold text-sm">
                File Viewer: {currentPDFName}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPDFViewer(false);
                  setCurrentPDFUrl('');
                  setCurrentPDFName('');
                }}
                className="text-secondary hover:text-primary"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-neutral-darker">
              <SimplePDFViewer
                fileUrl={currentPDFUrl}
                fileName={currentPDFName}
              />
            </div>
          </div>
        </div>
      )}
      {showExcelViewer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#f7f6f3] rounded-lg border border-neutral-200 w-full max-w-5xl h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-[#f7f6f3]">
              <div className="text-neutral-900 font-semibold text-sm">
                Excel Preview: {excelFileName}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExcelViewer(false);
                  setExcelSheets([]);
                  setExcelFileName('');
                }}
                className="text-neutral-500 hover:text-neutral-900"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#f7f6f3] p-4">
              {excelLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                </div>
              ) : (
                <ExcelPreviewTable
                  sheets={excelSheets}
                  activeSheetIndex={activeSheetIndex}
                  onSelectSheet={setActiveSheetIndex}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ContractorDashboardLayout>
  );
}

function FileTable({
  files,
  onDownload,
  onView
}: {
  files: ProjectFile[];
  onDownload: (fileId: string) => void;
  onView: (fileId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-medium text-left">
            <th className="py-3 px-4 text-secondary font-medium">File Name</th>
            <th className="py-3 px-4 text-secondary font-medium">Project</th>
            <th className="py-3 px-4 text-secondary font-medium">Version</th>
            <th className="py-3 px-4 text-secondary font-medium">Size</th>
            <th className="py-3 px-4 text-secondary font-medium">Uploaded</th>
            <th className="py-3 px-4 text-secondary font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id} className="border-b border-neutral-medium/50 hover:bg-neutral-dark/30">
              <td className="py-3 px-4">
                <p className="text-primary font-medium truncate max-w-xs">{file.original_name || file.file_name}</p>
                {file.description && (
                  <p className="text-xs text-secondary mt-0.5 truncate max-w-xs">{file.description}</p>
                )}
              </td>
              <td className="py-3 px-4 text-secondary text-xs">
                {file.project?.project_name || '—'}
              </td>
              <td className="py-3 px-4 text-secondary text-xs">v{file.version}</td>
              <td className="py-3 px-4 text-secondary text-xs">{formatFileSize(file.file_size)}</td>
              <td className="py-3 px-4 text-secondary text-xs">{formatDate(file.created_at)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {(file.mime_type === 'application/pdf'
                    || file.mime_type === 'application/vnd.ms-excel'
                    || file.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') && (
                    <button
                      type="button"
                      onClick={() => onView(file.id)}
                      className="text-accent-amber hover:underline text-xs"
                    >
                      View
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDownload(file.id)}
                    className="text-accent-amber hover:underline text-xs"
                  >
                    Download
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExcelPreviewTable({
  sheets,
  activeSheetIndex,
  onSelectSheet
}: {
  sheets: { name: string; data: any[][]; merges: XLSX.Range[] }[];
  activeSheetIndex: number;
  onSelectSheet: (index: number) => void;
}) {
  const activeSheet = sheets[activeSheetIndex];
  const data = activeSheet?.data || [];
  const merges = activeSheet?.merges || [];
  const rows = data.slice(0, 50);
  const columnCount = rows.reduce((max, row) => Math.max(max, row?.length || 0), 0);
  const columns = Math.min(columnCount, 12);

  if (!rows.length || columns === 0) {
    return (
      <div className="text-sm text-neutral-600">No readable data found in this sheet.</div>
    );
  }

  const mergedStarts = new Map<string, { rowSpan: number; colSpan: number }>();
  const mergedCovered = new Set<string>();

  merges.forEach((merge) => {
    const startRow = merge.s.r;
    const startCol = merge.s.c;
    const endRow = merge.e.r;
    const endCol = merge.e.c;
    if (startRow >= 50 || startCol >= columns) return;
    const rowSpan = Math.min(endRow, 49) - startRow + 1;
    const colSpan = Math.min(endCol, columns - 1) - startCol + 1;
    mergedStarts.set(`${startRow}-${startCol}`, { rowSpan, colSpan });
    for (let r = startRow; r <= Math.min(endRow, 49); r += 1) {
      for (let c = startCol; c <= Math.min(endCol, columns - 1); c += 1) {
        if (r === startRow && c === startCol) continue;
        mergedCovered.add(`${r}-${c}`);
      }
    }
  });

  return (
    <div className="space-y-3">
      {sheets.length > 1 && (
      <div className="flex flex-wrap gap-2">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => onSelectSheet(index)}
              className={`px-3 py-1.5 rounded-md text-xs border ${
                index === activeSheetIndex
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-600'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full text-xs text-neutral-900">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-b border-neutral-200">
              {Array.from({ length: columns }).map((_, colIndex) => {
                if (mergedCovered.has(`${rowIndex}-${colIndex}`)) {
                  return null;
                }
                const merge = mergedStarts.get(`${rowIndex}-${colIndex}`);
                const value = row?.[colIndex];
                const isNumber =
                  typeof value === 'number' ||
                  (typeof value === 'string' && value.match(/^[₹\s]*[\d,.]+$/));
                return (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    rowSpan={merge?.rowSpan}
                    colSpan={merge?.colSpan}
                    className="px-3 py-2 border-r border-neutral-200 align-top whitespace-pre-wrap bg-white"
                    style={{ minWidth: 90 }}
                  >
                    <div className={isNumber ? 'text-right' : 'text-left'}>
                      {value === undefined || value === null || value === '' ? '' : String(value)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {data.length > 50 && (
        <div className="text-xs text-neutral-600 px-3 py-2 bg-neutral-200/60 border border-neutral-200 rounded-md">
          Showing first 50 rows. Download to view the full file.
        </div>
      )}
    </div>
  );
}
