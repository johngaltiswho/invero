'use client';

import React, { useState } from 'react';
import type { Vehicle } from '@/types/supabase';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
}

type SortField = 'vehicle_number' | 'vehicle_type' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function VehicleTable({ vehicles, onEdit }: VehicleTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortField === 'created_at') {
      aValue = new Date(a[sortField]).getTime();
      bValue = new Date(b[sortField]).getTime();
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-500">⇅</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="text-amber-500">↑</span>
    ) : (
      <span className="text-amber-500">↓</span>
    );
  };

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-primary mb-2">
          No vehicles registered
        </h3>
        <p className="text-secondary text-sm">
          Click "Add Vehicle" to register your first vehicle
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-medium">
            <th
              className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('vehicle_number')}
            >
              <div className="flex items-center space-x-2">
                <span>Vehicle Number</span>
                <SortIcon field="vehicle_number" />
              </div>
            </th>
            <th
              className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('vehicle_type')}
            >
              <div className="flex items-center space-x-2">
                <span>Type</span>
                <SortIcon field="vehicle_type" />
              </div>
            </th>
            <th
              className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('created_at')}
            >
              <div className="flex items-center space-x-2">
                <span>Registered On</span>
                <SortIcon field="created_at" />
              </div>
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedVehicles.map((vehicle) => (
            <tr
              key={vehicle.id}
              className="border-b border-neutral-medium hover:bg-neutral-medium/30 transition-colors"
            >
              <td className="px-4 py-4 text-sm">
                <div className="font-medium text-primary">
                  {vehicle.vehicle_number}
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-secondary">
                {vehicle.vehicle_type}
              </td>
              <td className="px-4 py-4 text-sm text-secondary">
                {formatDate(vehicle.created_at)}
              </td>
              <td className="px-4 py-4 text-sm">
                {vehicle.is_active ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-sm">
                <button
                  type="button"
                  onClick={() => onEdit(vehicle)}
                  className="text-accent-orange hover:text-accent-orange/80 transition-colors font-medium"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
