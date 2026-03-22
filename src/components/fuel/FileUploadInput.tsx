'use client';

import React, { useRef, useState } from 'react';

interface FileUploadInputProps {
  accept: string;
  maxSizeMB: number;
  onFileSelect: (file: File) => void;
  preview?: string | null;
  error?: string;
}

export function FileUploadInput({
  accept,
  maxSizeMB,
  onFileSelect,
  preview,
  error,
}: FileUploadInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map((type) => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    const isValid = acceptedTypes.some((acceptedType) => {
      if (acceptedType.startsWith('.')) {
        return fileExtension === acceptedType.toLowerCase();
      }
      return mimeType.startsWith(acceptedType.replace('*', ''));
    });

    if (!isValid) {
      return `File type not accepted. Accepted types: ${accept}`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const acceptTypes = accept.split(',').map((t) => t.trim().toUpperCase()).join(', ');

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer ${
          isDragging
            ? 'border-amber-500 bg-amber-500/5'
            : error
            ? 'border-red-500 bg-red-500/5'
            : 'border-neutral-medium bg-neutral-darker hover:border-amber-500/50 hover:bg-neutral-medium/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {preview ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-full max-w-xs">
              <img
                src={preview}
                alt="Bill preview"
                className="w-full h-auto rounded-lg border border-neutral-medium"
              />
            </div>
            <p className="text-xs text-secondary">
              Click or drag to replace image
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium text-primary mb-1">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-secondary">
                {acceptTypes} (max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
