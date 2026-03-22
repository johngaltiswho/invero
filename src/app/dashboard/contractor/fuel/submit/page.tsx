'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components/Button';
import { FileUploadInput } from '@/components/fuel/FileUploadInput';
import Link from 'next/link';
import type { Vehicle } from '@/types/supabase';

export default function SubmitExpensePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [billImage, setBillImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/contractor/vehicles');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch vehicles');
      }

      const activeVehicles = (result.data || []).filter(
        (v: Vehicle) => v.is_active
      );
      setVehicles(activeVehicles);

      // Auto-select first vehicle if only one exists
      if (activeVehicles.length === 1) {
        setSelectedVehicleId(activeVehicles[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setBillImage(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitMessage(null);

    // Validation
    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }

    if (!billImage) {
      setError('Please upload a bill image');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('vehicle_id', selectedVehicleId);
      formData.append('bill_image', billImage);

      const response = await fetch('/api/contractor/fuel-expenses', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit expense');
      }

      setSubmitMessage('Fuel expense submitted successfully! Redirecting...');
      setBillImage(null);
      setImagePreview(null);
      setSelectedVehicleId(vehicles.length === 1 ? vehicles[0].id : '');

      // Redirect to history page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/contractor/fuel/history');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">Submit Fuel Expense</h1>
              <p className="text-secondary text-sm mt-1">
                Upload your fuel bill for reimbursement
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 border-b border-neutral-medium">
            <Link
              href="/dashboard/contractor/fuel/vehicles"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              My Vehicles
            </Link>
            <Link
              href="/dashboard/contractor/fuel/request"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Request Fuel
            </Link>
            <Link
              href="/dashboard/contractor/fuel/history"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Request History
            </Link>
            <Link
              href="/dashboard/contractor/fuel/submit"
              className="px-4 py-2 text-sm font-medium border-b-2 border-amber-500 text-amber-500"
            >
              Submit Bill
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 max-w-2xl">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-secondary">Loading...</div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-primary mb-2">
                No vehicles registered
              </h3>
              <p className="text-secondary text-sm mb-6">
                Please register a vehicle first before submitting fuel expenses
              </p>
              <Link href="/dashboard/contractor/fuel/vehicles">
                <Button>Register Vehicle</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Select Vehicle
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_number} - {vehicle.vehicle_type}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Upload Bill Photo
                </label>
                <FileUploadInput
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  maxSizeMB={10}
                  onFileSelect={handleFileSelect}
                  preview={imagePreview}
                  error={error && error.includes('file') ? error : undefined}
                />
                <p className="text-xs text-secondary mt-2">
                  Supported formats: JPG, PNG, WEBP (max 10MB)
                </p>
              </div>

              {/* Error Message */}
              {error && !error.includes('file') && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {submitMessage && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                  {submitMessage}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !selectedVehicleId || !billImage}
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Expense'}
              </Button>

              <p className="text-xs text-secondary text-center">
                Your bill will be processed using OCR and sent for admin review
              </p>
            </form>
          )}
        </div>
      </div>
    </ContractorDashboardLayout>
  );
}
