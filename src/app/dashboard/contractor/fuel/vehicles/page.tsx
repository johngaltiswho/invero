'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components/Button';
import { VehicleRegistrationModal } from '@/components/fuel/VehicleRegistrationModal';
import { VehicleTable } from '@/components/fuel/VehicleTable';
import Link from 'next/link';
import type { Vehicle } from '@/types/supabase';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contractor/vehicles');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch vehicles');
      }

      setVehicles(result.data || []);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    fetchVehicles(); // Refresh the list
  };

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">My Vehicles</h1>
              <p className="text-secondary text-sm mt-1">
                Manage your registered vehicles for fuel expense tracking
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>Add Vehicle</Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 border-b border-neutral-medium">
            <Link
              href="/dashboard/contractor/fuel/vehicles"
              className="px-4 py-2 text-sm font-medium border-b-2 border-amber-500 text-amber-500"
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
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Submit Bill
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-secondary">Loading vehicles...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">{error}</div>
              <Button onClick={fetchVehicles} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : (
            <VehicleTable vehicles={vehicles} />
          )}
        </div>
      </div>

      {/* Registration Modal */}
      <VehicleRegistrationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </ContractorDashboardLayout>
  );
}
