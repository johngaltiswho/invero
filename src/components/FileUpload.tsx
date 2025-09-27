'use client';

import { useState } from 'react';

interface FileUploadProps {
  projectId: string;
  contractorId: string;
  type: 'boq' | 'schedule';
  onUploadSuccess?: () => void;
}

export default function FileUpload({ projectId, contractorId, type, onUploadSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('contractorId', contractorId);

      const endpoint = type === 'boq' ? '/api/upload-boq' : '/api/upload-schedule';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`${type.toUpperCase()} uploaded successfully!`);
        setFile(null);
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setMessage(result.error || 'Upload failed');
      }
    } catch (error) {
      setMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const uploadType = type === 'boq' ? 'BOQ' : 'Schedule';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Upload {uploadType}</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select {uploadType} Excel File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="text-sm text-gray-600">
            Selected: {file.name}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : `Upload ${uploadType}`}
        </button>

        {message && (
          <div className={`text-sm p-3 rounded ${
            message.includes('successfully') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p className="font-medium">Expected format for {uploadType}:</p>
        {type === 'boq' ? (
          <p>Columns: Description | Unit | Quantity | Rate | Amount</p>
        ) : (
          <p>Columns: Task | Start Date | End Date | Duration | Progress</p>
        )}
      </div>
    </div>
  );
}