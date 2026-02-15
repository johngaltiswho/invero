'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button, LoadingSpinner } from '@/components';

interface InvestorDocument {
  name: string;
  documentType: string;
  size: number;
  createdAt: string | null;
  signedUrl: string | null;
}

const formatSize = (bytes: number) => {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const categoryLabels: Record<string, string> = {
  pan: 'PAN',
  'cancelled-cheque': 'Cancelled Cheque',
  agreement: 'Agreement',
  general: 'General'
};

export default function InvestorDocuments(): React.ReactElement {
  const [documents, setDocuments] = useState<InvestorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/investor/documents');
        const result = await response.json();
        if (response.ok && result?.success) {
          setDocuments(result.documents || []);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Failed to load investor documents:', error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const categories = useMemo(() => {
    const uniqueTypes = new Set(documents.map((doc) => doc.documentType || 'general'));
    return ['all', ...Array.from(uniqueTypes)];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.documentType === selectedCategory;
      const matchesSearch = !searchTerm || doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedCategory, searchTerm]);

  return (
    <DashboardLayout activeTab="documents">
      <div className="p-6">
        {loading && (
          <LoadingSpinner
            title="Loading Documents"
            description="Fetching your investor documents securely"
            icon="📄"
            fullScreen={false}
            steps={[
              'Verifying access...',
              'Fetching document metadata...',
              'Preparing secure links...'
            ]}
          />
        )}
        {!loading && (
        <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Investor Documents</h1>
          <p className="text-secondary">Manage your PAN, cancelled cheque, and agreement uploads.</p>
        </div>

        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Search Documents</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name"
                className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded text-primary text-sm"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Documents' : (categoryLabels[category] || category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
          <div className="p-6 border-b border-neutral-medium flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-primary">Documents</h2>
              <p className="text-secondary text-sm">Uploaded investor records</p>
            </div>
            <div className="text-sm text-secondary">{filteredDocuments.length} files</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-medium">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-primary">Document</th>
                  <th className="text-left p-4 text-sm font-medium text-primary">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-primary">Uploaded</th>
                  <th className="text-left p-4 text-sm font-medium text-primary">Size</th>
                  <th className="text-right p-4 text-sm font-medium text-primary">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="p-4 text-sm text-secondary" colSpan={5}>Loading documents...</td>
                  </tr>
                )}
                {!loading && filteredDocuments.length === 0 && (
                  <tr>
                    <td className="p-4 text-sm text-secondary" colSpan={5}>No documents found.</td>
                  </tr>
                )}
                {filteredDocuments.map((doc) => (
                  <tr key={`${doc.documentType}-${doc.name}`} className="border-b border-neutral-medium">
                    <td className="p-4 text-sm text-primary">{doc.name}</td>
                    <td className="p-4 text-sm text-secondary">
                      {categoryLabels[doc.documentType] || doc.documentType || 'General'}
                    </td>
                    <td className="p-4 text-sm text-secondary">{formatDate(doc.createdAt)}</td>
                    <td className="p-4 text-sm text-secondary">{formatSize(doc.size)}</td>
                    <td className="p-4 text-right">
                      {doc.signedUrl ? (
                        <a
                          href={doc.signedUrl}
                          className="text-accent-amber text-sm hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-sm text-secondary">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}
