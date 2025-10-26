'use client';

import React, { useState } from 'react';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onError?: (error: Error) => void;
  isAnalyzing?: boolean;
  onAnalyzeClick?: () => void;
}

export default function SimplePDFViewer({ fileUrl, fileName, onError, isAnalyzing, onAnalyzeClick }: SimplePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    const errorMsg = 'Failed to load PDF document';
    setError(errorMsg);
    setLoading(false);
    onError?.(new Error(errorMsg));
  };

  const downloadFile = () => {
    window.open(fileUrl, '_blank');
  };

  if (error) {
    return (
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-primary mb-2">Error Loading PDF</h3>
          <p className="text-secondary text-sm mb-4">{error}</p>
          <button
            onClick={downloadFile}
            className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg hover:bg-accent-amber/80 transition-colors"
          >
            Download File Instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with controls */}
      <div className="border-b border-neutral-medium p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              BOQ Takeoff - {fileName || 'PDF Document'}
            </h3>
            <p className="text-sm text-secondary">
              Drawing analysis and quantity takeoff workspace
            </p>
          </div>
          
          {onAnalyzeClick && (
            <button
              onClick={onAnalyzeClick}
              disabled={isAnalyzing}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isAnalyzing
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-accent-orange text-white hover:bg-accent-orange/80'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </span>
              ) : (
                'Analyze Drawing'
              )}
            </button>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="max-h-[600px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark/80 z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-amber mb-4"></div>
              <p className="text-secondary">Loading PDF...</p>
            </div>
          </div>
        )}

        <div className="w-full h-[550px] bg-white rounded-lg overflow-hidden">
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`}
            width="100%"
            height="100%"
            className="border-0"
            onLoad={handleLoad}
            onError={handleError}
            title={fileName || 'PDF Document'}
          />
        </div>

      </div>
    </div>
  );
}