'use client';

import React, { useState } from 'react';
import { Button } from './Button';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

interface CreateProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateProjectForm({ onSuccess, onCancel }: CreateProjectFormProps) {
  const { contractor } = useContractorV2();
  const [loading, setLoading] = useState(false);
  const [poFile, setPOFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    project_value: '',
    start_date: '',
    expected_end_date: '',
    project_id_external: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    team_size: '',
    project_tenure: '',
    funding_status: 'pending',
    risk_level: 'Medium'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPOFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor) return;
    
    setLoading(true);
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add project data
      formDataToSend.append('contractor_id', contractor.id);
      formDataToSend.append('project_name', formData.project_name);
      formDataToSend.append('client_name', formData.client_name);
      formDataToSend.append('project_value', formData.project_value);
      formDataToSend.append('start_date', formData.start_date);
      formDataToSend.append('expected_end_date', formData.expected_end_date);
      formDataToSend.append('project_id_external', formData.project_id_external);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('team_size', formData.team_size);
      formDataToSend.append('project_tenure', formData.project_tenure);
      formDataToSend.append('funding_status', formData.funding_status);
      formDataToSend.append('risk_level', formData.risk_level);
      
      // Add PO file if uploaded
      if (poFile) {
        formDataToSend.append('po_file', poFile);
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        alert('Project created successfully!');
        onSuccess?.();
      } else {
        alert(`Failed to create project: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Network error occurred while creating project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-primary">Create New Project</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-secondary hover:text-primary text-sm"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Project Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Project Name *
            </label>
            <input
              type="text"
              name="project_name"
              value={formData.project_name}
              onChange={handleInputChange}
              required
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Client Name *
            </label>
            <input
              type="text"
              name="client_name"
              value={formData.client_name}
              onChange={handleInputChange}
              required
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
              placeholder="Enter client name"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Project Value (₹) *
            </label>
            <input
              type="number"
              name="project_value"
              value={formData.project_value}
              onChange={handleInputChange}
              required
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
              placeholder="Enter project value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              External Project ID
            </label>
            <input
              type="text"
              name="project_id_external"
              value={formData.project_id_external}
              onChange={handleInputChange}
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
              placeholder="Client's project ID"
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Start Date *
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Expected End Date *
            </label>
            <input
              type="date"
              name="expected_end_date"
              value={formData.expected_end_date}
              onChange={handleInputChange}
              required
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
            />
          </div>
        </div>

        {/* Project Details */}
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Team Size
            </label>
            <input
              type="number"
              name="team_size"
              value={formData.team_size}
              onChange={handleInputChange}
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
              placeholder="Number of team members"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Project Tenure (months)
            </label>
            <input
              type="number"
              name="project_tenure"
              value={formData.project_tenure}
              onChange={handleInputChange}
              className="w-full bg-neutral-darker border border-neutral-medium rounded-lg px-4 py-3 text-primary focus:border-accent-amber focus:outline-none"
              placeholder="Duration in months"
            />
          </div>
        </div>

        {/* Purchase Order Upload */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Purchase Order (PO) Document
          </label>
          <div className="border-2 border-dashed border-neutral-medium rounded-lg p-6 text-center">
            <input
              type="file"
              id="po_file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
            />
            <label
              htmlFor="po_file"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="text-4xl mb-2">📄</div>
              <div className="text-sm text-primary mb-1">
                {poFile ? poFile.name : 'Click to upload PO document'}
              </div>
              <div className="text-xs text-secondary">
                PDF, DOC, DOCX, JPG, PNG (max 10MB)
              </div>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-neutral-medium">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Creating Project...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  );
}