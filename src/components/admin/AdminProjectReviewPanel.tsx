'use client';

import React, { useEffect, useMemo, useState } from 'react';

type ReviewProject = {
  id: string;
  contractor_id: string | null;
  project_name: string | null;
  client_name: string | null;
  project_address: string | null;
  estimated_value: number | null;
  funding_required: number | null;
  funding_status: string | null;
  project_status: string | null;
  po_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  contractor: {
    id: string;
    company_name: string | null;
    email: string | null;
  } | null;
  po_reference_count: number;
  po_file_count: number;
  po_documents: Array<{
    id: string;
    original_name: string | null;
    file_name: string | null;
    created_at: string | null;
    signed_url: string | null;
  }>;
  po_references: Array<{
    id: string;
    po_number: string;
    po_date: string | null;
    po_value: number | null;
    po_type: string;
    status: string;
    is_default: boolean;
    notes: string | null;
    previous_po_reference_id: string | null;
    created_at: string;
    updated_at: string;
    request_count: number;
    linked_value: number;
    open_request_count: number;
  }>;
  active_po_reference: {
    id: string;
    po_number: string;
    status: string;
    is_default: boolean;
  } | null;
  purchase_summary: {
    total: number;
    linked_to_po: number;
    total_request_value: number;
    statuses: Record<string, number>;
  };
};

type ReviewSummary = {
  total: number;
  by_status: {
    draft: number;
    awarded: number;
    finalized: number;
    completed: number;
  };
  with_po_references: number;
  without_po_references: number;
  with_po_documents: number;
  with_purchase_requests: number;
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number | null) {
  return currency.format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN');
}

function ProjectStatusPill({ status }: { status?: string | null }) {
  const normalized = String(status || 'draft').toLowerCase();
  const classes =
    normalized === 'completed'
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : normalized === 'finalized'
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        : normalized === 'awarded'
          ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/20'
          : 'bg-neutral-medium text-secondary border-neutral-light';

  return (
    <span className={`inline-flex px-2 py-1 rounded border text-xs font-medium uppercase tracking-wide ${classes}`}>
      {normalized.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminProjectReviewPanel(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'awarded' | 'finalized' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const loadProjects = async (status: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/project-submissions?status=${encodeURIComponent(status)}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load project submissions');
      }

      const nextProjects = result.data?.projects || [];
      setProjects(nextProjects);
      setSummary(result.data?.summary || null);
      setSelectedProjectId((current) => (current && nextProjects.some((project: ReviewProject) => project.id === current) ? current : nextProjects[0]?.id || null));
    } catch (error) {
      console.error('Failed to load admin project review data:', error);
      alert(error instanceof Error ? error.message : 'Failed to load project submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects(statusFilter);
  }, [statusFilter]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      return [
        project.project_name,
        project.client_name,
        project.contractor?.company_name,
        project.active_po_reference?.po_number,
        project.po_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [projects, search]);

  const selectedProject =
    filteredProjects.find((project) => project.id === selectedProjectId) ||
    projects.find((project) => project.id === selectedProjectId) ||
    filteredProjects[0] ||
    null;

  return (
    <div className="space-y-6">
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">Projects &amp; Client POs</h2>
            <p className="text-sm text-secondary">Review SME-submitted projects, linked client POs, and downstream request linkage.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="awarded">Awarded</option>
              <option value="finalized">Finalized</option>
              <option value="completed">Completed</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SME, client, project, or PO..."
              className="px-3 py-2 rounded-lg border border-neutral-medium bg-neutral-darker text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange min-w-[280px]"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
            <div className="text-xs uppercase text-secondary">Projects</div>
            <div className="text-2xl font-semibold text-primary mt-2">{summary?.total ?? projects.length}</div>
          </div>
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
            <div className="text-xs uppercase text-secondary">Awarded</div>
            <div className="text-2xl font-semibold text-primary mt-2">{summary?.by_status.awarded ?? 0}</div>
          </div>
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
            <div className="text-xs uppercase text-secondary">Finalized</div>
            <div className="text-2xl font-semibold text-primary mt-2">{summary?.by_status.finalized ?? 0}</div>
          </div>
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
            <div className="text-xs uppercase text-secondary">With PO Refs</div>
            <div className="text-2xl font-semibold text-primary mt-2">{summary?.with_po_references ?? 0}</div>
          </div>
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
            <div className="text-xs uppercase text-secondary">PO Docs</div>
            <div className="text-2xl font-semibold text-primary mt-2">{summary?.with_po_documents ?? 0}</div>
          </div>
          <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
            <div className="text-xs uppercase text-secondary">With PRs</div>
            <div className="text-2xl font-semibold text-primary mt-2">{summary?.with_purchase_requests ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.3fr),minmax(360px,0.9fr)] gap-6">
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-darker border-b border-neutral-medium">
                <tr>
                  <th className="text-left p-3 text-primary font-semibold">Project</th>
                  <th className="text-left p-3 text-primary font-semibold">SME</th>
                  <th className="text-left p-3 text-primary font-semibold">Status</th>
                  <th className="text-left p-3 text-primary font-semibold">Value</th>
                  <th className="text-left p-3 text-primary font-semibold">POs</th>
                  <th className="text-left p-3 text-primary font-semibold">PRs</th>
                  <th className="text-left p-3 text-primary font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-secondary">Loading project submissions...</td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-secondary">No projects matched this filter.</td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className={`border-b border-neutral-medium cursor-pointer transition-colors ${
                        selectedProject?.id === project.id ? 'bg-neutral-medium/40' : 'hover:bg-neutral-medium/20'
                      }`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <td className="p-3 align-top">
                        <div className="font-medium text-primary">{project.project_name || 'Unnamed project'}</div>
                        <div className="text-xs text-secondary mt-1">{project.client_name || 'No client'}</div>
                        {project.active_po_reference?.po_number ? (
                          <div className="text-xs text-accent-amber mt-1">Active PO: {project.active_po_reference.po_number}</div>
                        ) : null}
                      </td>
                      <td className="p-3 align-top">
                        <div className="text-secondary">{project.contractor?.company_name || 'Unknown SME'}</div>
                        <div className="text-xs text-secondary/80 mt-1">{project.contractor?.email || '—'}</div>
                      </td>
                      <td className="p-3 align-top"><ProjectStatusPill status={project.project_status} /></td>
                      <td className="p-3 align-top text-primary">{formatCurrency(project.estimated_value)}</td>
                      <td className="p-3 align-top text-secondary">
                        <div>{project.po_reference_count} refs</div>
                        <div className="text-xs mt-1">{project.po_file_count} docs</div>
                      </td>
                      <td className="p-3 align-top text-secondary">
                        <div>{project.purchase_summary.total}</div>
                        <div className="text-xs mt-1">{formatCurrency(project.purchase_summary.total_request_value)}</div>
                      </td>
                      <td className="p-3 align-top text-secondary">{formatDate(project.updated_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-5">
          {selectedProject ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">{selectedProject.project_name || 'Unnamed project'}</h3>
                    <p className="text-secondary">{selectedProject.client_name || 'No client assigned'}</p>
                  </div>
                  <ProjectStatusPill status={selectedProject.project_status} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
                    <div className="text-xs uppercase text-secondary">SME</div>
                    <div className="text-primary mt-2">{selectedProject.contractor?.company_name || 'Unknown SME'}</div>
                  </div>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
                    <div className="text-xs uppercase text-secondary">Project Value</div>
                    <div className="text-primary mt-2">{formatCurrency(selectedProject.estimated_value)}</div>
                  </div>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
                    <div className="text-xs uppercase text-secondary">Funding Required</div>
                    <div className="text-primary mt-2">{formatCurrency(selectedProject.funding_required)}</div>
                  </div>
                  <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-3">
                    <div className="text-xs uppercase text-secondary">Funding Status</div>
                    <div className="text-primary mt-2">{selectedProject.funding_status || 'pending'}</div>
                  </div>
                </div>
                {selectedProject.project_address ? (
                  <div className="mt-4 text-sm text-secondary">{selectedProject.project_address}</div>
                ) : null}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">PO Documents</h4>
                {selectedProject.po_documents.length === 0 ? (
                  <p className="text-sm text-secondary mt-2">No PO documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2 mt-3">
                    {selectedProject.po_documents.map((document) => (
                      <div key={document.id} className="rounded-lg border border-neutral-medium bg-neutral-darker p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-primary">{document.original_name || document.file_name || 'PO document'}</div>
                          <div className="text-xs text-secondary mt-1">Uploaded {formatDate(document.created_at)}</div>
                        </div>
                        {document.signed_url ? (
                          <a href={document.signed_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-amber underline">
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-secondary">Unavailable</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">Client POs</h4>
                  <div className="text-xs text-secondary">
                    {selectedProject.purchase_summary.linked_to_po} / {selectedProject.purchase_summary.total} PRs linked
                  </div>
                </div>
                {selectedProject.po_references.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-medium p-4 text-sm text-secondary mt-3">
                    No PO references recorded yet.
                    {selectedProject.po_number ? ` Legacy PO number on project: ${selectedProject.po_number}` : ''}
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    {selectedProject.po_references.map((po) => (
                      <div key={po.id} className="rounded-lg border border-neutral-medium bg-neutral-darker p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-primary font-medium">
                              {po.po_number}
                              {po.is_default ? <span className="ml-2 text-xs text-accent-amber">Default</span> : null}
                            </div>
                            <div className="text-xs text-secondary mt-1">
                              {po.po_type} · {po.status} · {formatDate(po.po_date || po.created_at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-primary text-sm">{formatCurrency(po.po_value)}</div>
                            <div className="text-xs text-secondary mt-1">Linked value {formatCurrency(po.linked_value)}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                          <div>
                            <div className="text-xs uppercase text-secondary">Requests</div>
                            <div className="text-primary mt-1">{po.request_count}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase text-secondary">Open</div>
                            <div className="text-primary mt-1">{po.open_request_count}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase text-secondary">Created</div>
                            <div className="text-primary mt-1">{formatDate(po.created_at)}</div>
                          </div>
                        </div>
                        {po.notes ? <div className="text-sm text-secondary mt-3">{po.notes}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-neutral-medium bg-neutral-darker p-4">
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">Procurement Linkage</h4>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-xs uppercase text-secondary">Total PRs</div>
                    <div className="text-primary mt-1">{selectedProject.purchase_summary.total}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-secondary">Total PR Value</div>
                    <div className="text-primary mt-1">{formatCurrency(selectedProject.purchase_summary.total_request_value)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-secondary">Funded</div>
                    <div className="text-primary mt-1">{selectedProject.purchase_summary.statuses.funded || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-secondary">Completed</div>
                    <div className="text-primary mt-1">{selectedProject.purchase_summary.statuses.completed || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-secondary">
              Select a project to review its client POs and uploaded PO documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
