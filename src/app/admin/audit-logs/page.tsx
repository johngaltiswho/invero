'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuditLog = {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  created_at: string;
};

type Filters = {
  entity_type: string;
  action: string;
  user_id: string;
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ limit: 100, offset: 0, total: 0 });
  const [filters, setFilters] = useState<Filters>({ entity_type: '', action: '', user_id: '' });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, pagination.offset]);

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.user_id) params.append('user_id', filters.user_id);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const result = await response.json();
      setLogs(result.data || []);
      setPagination(prev => ({ ...prev, total: result.pagination?.total || 0 }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      alert('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  }

  function handlePageChange(newOffset: number) {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function getActionBadgeColor(action: string) {
    switch (action) {
      case 'approve': return 'bg-green-100 text-green-800';
      case 'reject': return 'bg-red-100 text-red-800';
      case 'create':
      case 'generate': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'assign': return 'bg-purple-100 text-purple-800';
      case 'dispatch': return 'bg-indigo-100 text-indigo-800';
      case 'deliver': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-lightest via-primary-lighter to-accent-amber/10 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-darker">Audit Trail</h1>
            <p className="text-neutral-dark mt-1">Complete history of all critical actions</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-white text-neutral-darker rounded-lg hover:bg-neutral-lightest transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-darker mb-2">
                Entity Type
              </label>
              <select
                value={filters.entity_type}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:ring-2 focus:ring-primary-default focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="purchase_request">Purchase Request</option>
                <option value="invoice">Invoice</option>
                <option value="delivery">Delivery</option>
                <option value="capital_submission">Capital Submission</option>
                <option value="vendor">Vendor</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-darker mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:ring-2 focus:ring-primary-default focus:border-transparent"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="assign">Assign</option>
                <option value="generate">Generate</option>
                <option value="dispatch">Dispatch</option>
                <option value="deliver">Deliver</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ entity_type: '', action: '', user_id: '' });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-2 bg-neutral-light text-neutral-darker rounded-lg hover:bg-neutral-default transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-neutral-dark">Total Logs</div>
            <div className="text-2xl font-bold text-neutral-darker mt-1">
              {pagination.total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-neutral-dark">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-neutral-dark">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-lightest border-b border-neutral-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-darker">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-darker">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-darker">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-darker">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-darker">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-darker">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light">
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="hover:bg-neutral-lightest transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-darker whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-neutral-darker font-medium">
                            {log.user_name || log.user_email || 'Unknown'}
                          </div>
                          <div className="text-xs text-neutral-dark">
                            {log.user_role || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-neutral-darker font-medium">
                            {log.entity_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-neutral-dark font-mono">
                            {log.entity_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-darker max-w-md truncate">
                          {log.description || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="text-primary-default hover:text-primary-darker text-sm font-medium"
                          >
                            {expandedLog === log.id ? 'Hide' : 'Show'}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-neutral-lightest">
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs font-semibold text-neutral-dark uppercase mb-1">
                                  User Details
                                </div>
                                <div className="text-sm text-neutral-darker space-y-1">
                                  <div>Email: {log.user_email || 'N/A'}</div>
                                  <div>User ID: {log.user_id}</div>
                                  <div>IP Address: {log.ip_address || 'N/A'}</div>
                                </div>
                              </div>

                              {log.old_values && (
                                <div>
                                  <div className="text-xs font-semibold text-neutral-dark uppercase mb-1">
                                    Old Values
                                  </div>
                                  <pre className="text-xs bg-white p-2 rounded border border-neutral-light overflow-x-auto">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.new_values && (
                                <div>
                                  <div className="text-xs font-semibold text-neutral-dark uppercase mb-1">
                                    New Values
                                  </div>
                                  <pre className="text-xs bg-white p-2 rounded border border-neutral-light overflow-x-auto">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.metadata && (
                                <div>
                                  <div className="text-xs font-semibold text-neutral-dark uppercase mb-1">
                                    Metadata
                                  </div>
                                  <pre className="text-xs bg-white p-2 rounded border border-neutral-light overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-neutral-lightest border-t border-neutral-light flex items-center justify-between">
              <div className="text-sm text-neutral-dark">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 bg-white text-neutral-darker rounded-lg hover:bg-neutral-lightest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="px-4 py-2 bg-white text-neutral-darker rounded-lg">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-4 py-2 bg-white text-neutral-darker rounded-lg hover:bg-neutral-lightest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
