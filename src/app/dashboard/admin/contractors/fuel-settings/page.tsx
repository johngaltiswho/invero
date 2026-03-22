'use client';

import React, { useState, useEffect } from 'react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import { Button } from '@/components/Button';

interface Contractor {
  id: string;
  company_name: string;
  contact_person: string;
}

interface FuelSettings {
  monthly_fuel_budget: number;
  per_request_max_amount: number;
  per_request_max_liters: number;
  max_fills_per_vehicle_per_day: number;
  min_hours_between_fills: number;
  auto_approve_enabled: boolean;
}

interface FuelPump {
  id: string;
  pump_name: string;
  city: string;
  state: string;
}

interface ApprovedPump {
  id: string;
  pump_id: string;
  is_active: boolean;
  fuel_pumps: FuelPump;
}

export default function AdminFuelSettingsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [settings, setSettings] = useState<FuelSettings | null>(null);
  const [approvedPumps, setApprovedPumps] = useState<ApprovedPump[]>([]);
  const [allPumps, setAllPumps] = useState<FuelPump[]>([]);

  const [isLoadingContractors, setIsLoadingContractors] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load contractors on mount
  useEffect(() => {
    fetchContractors();
    fetchAllPumps();
  }, []);

  // Load settings when contractor selected
  useEffect(() => {
    if (selectedContractorId) {
      fetchSettings();
      fetchApprovedPumps();
    }
  }, [selectedContractorId]);

  const fetchContractors = async () => {
    try {
      // This endpoint should exist - fetches all contractors
      const response = await fetch('/api/admin/contractors');
      const data = await response.json();

      if (response.ok) {
        setContractors(data.contractors || []);
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
    } finally {
      setIsLoadingContractors(false);
    }
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch(`/api/admin/fuel-settings/${selectedContractorId}`);
      const data = await response.json();

      if (response.ok) {
        setSettings(data.data || {
          monthly_fuel_budget: 50000,
          per_request_max_amount: 10000,
          per_request_max_liters: 100,
          max_fills_per_vehicle_per_day: 1,
          min_hours_between_fills: 12,
          auto_approve_enabled: true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchApprovedPumps = async () => {
    try {
      const response = await fetch(`/api/admin/contractor-pumps/${selectedContractorId}`);
      const data = await response.json();

      if (response.ok) {
        setApprovedPumps(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch approved pumps:', error);
    }
  };

  const fetchAllPumps = async () => {
    try {
      const response = await fetch('/api/admin/fuel-pumps?is_active=true');
      const data = await response.json();

      if (response.ok) {
        setAllPumps(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pumps:', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !selectedContractorId) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/fuel-settings/${selectedContractorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprovePump = async (pumpId: string) => {
    try {
      const response = await fetch(`/api/admin/contractor-pumps/${selectedContractorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pump_id: pumpId }),
      });

      if (response.ok) {
        fetchApprovedPumps();
        setMessage({ type: 'success', text: 'Pump approved successfully' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve pump');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to approve pump',
      });
    }
  };

  const handleRemovePump = async (pumpId: string) => {
    try {
      const response = await fetch(
        `/api/admin/contractor-pumps/${selectedContractorId}?pump_id=${pumpId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        fetchApprovedPumps();
        setMessage({ type: 'success', text: 'Pump removed successfully' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove pump');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove pump',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-neutral-darkest">
      <AdminNavbar />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Fuel Settings Management</h1>
          <p className="text-secondary text-sm mt-1">
            Configure fuel budgets, limits, and approved pumps for contractors
          </p>
        </div>

      {/* Contractor Selection */}
      <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-6">
        <label className="block text-sm font-medium text-primary mb-2">
          Select Contractor
        </label>
        {isLoadingContractors ? (
          <div className="text-secondary">Loading contractors...</div>
        ) : (
          <select
            value={selectedContractorId}
            onChange={(e) => setSelectedContractorId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
          >
            <option value="">Select a contractor</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.company_name} - {contractor.contact_person}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Settings Form */}
      {selectedContractorId && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Settings */}
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Fuel Budget & Limits
            </h2>

            {isLoadingSettings ? (
              <div className="text-secondary">Loading settings...</div>
            ) : settings ? (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Monthly Fuel Budget (Rs)
                  </label>
                  <input
                    type="number"
                    value={settings.monthly_fuel_budget}
                    onChange={(e) =>
                      setSettings({ ...settings, monthly_fuel_budget: parseFloat(e.target.value) })
                    }
                    min="1000"
                    max="10000000"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                  />
                  <p className="mt-1 text-xs text-secondary">
                    Total fuel budget per month: {formatCurrency(settings.monthly_fuel_budget)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Per Request Max Amount (Rs)
                  </label>
                  <input
                    type="number"
                    value={settings.per_request_max_amount}
                    onChange={(e) =>
                      setSettings({ ...settings, per_request_max_amount: parseFloat(e.target.value) })
                    }
                    min="100"
                    max="1000000"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Per Request Max Liters
                  </label>
                  <input
                    type="number"
                    value={settings.per_request_max_liters}
                    onChange={(e) =>
                      setSettings({ ...settings, per_request_max_liters: parseFloat(e.target.value) })
                    }
                    min="1"
                    max="1000"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Max Fills Per Vehicle Per Day
                  </label>
                  <input
                    type="number"
                    value={settings.max_fills_per_vehicle_per_day}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        max_fills_per_vehicle_per_day: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    max="10"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Minimum Hours Between Fills
                  </label>
                  <input
                    type="number"
                    value={settings.min_hours_between_fills}
                    onChange={(e) =>
                      setSettings({ ...settings, min_hours_between_fills: parseFloat(e.target.value) })
                    }
                    min="1"
                    max="168"
                    className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="auto-approve"
                    checked={settings.auto_approve_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_approve_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-neutral-medium"
                  />
                  <label htmlFor="auto-approve" className="text-sm text-primary">
                    Enable Auto-Approval
                  </label>
                </div>

                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </form>
            ) : null}
          </div>

          {/* Right: Approved Pumps */}
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Approved Fuel Pumps</h2>

            {/* Current Approved Pumps */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Currently Approved</h3>
              {approvedPumps.filter((ap) => ap.is_active).length === 0 ? (
                <p className="text-sm text-secondary">No pumps approved yet</p>
              ) : (
                <div className="space-y-2">
                  {approvedPumps
                    .filter((ap) => ap.is_active)
                    .map((ap) => (
                      <div
                        key={ap.id}
                        className="flex items-center justify-between p-3 bg-neutral-darker rounded-lg"
                      >
                        <div>
                          <div className="text-sm text-primary font-medium">
                            {ap.fuel_pumps.pump_name}
                          </div>
                          <div className="text-xs text-secondary">
                            {ap.fuel_pumps.city}, {ap.fuel_pumps.state}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemovePump(ap.pump_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add New Pump */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Add Pump</h3>
              {allPumps.length === 0 ? (
                <p className="text-sm text-secondary">No pumps available</p>
              ) : (
                <div className="space-y-2">
                  {allPumps
                    .filter(
                      (pump) =>
                        !approvedPumps.some((ap) => ap.pump_id === pump.id && ap.is_active)
                    )
                    .map((pump) => (
                      <div
                        key={pump.id}
                        className="flex items-center justify-between p-3 bg-neutral-darker rounded-lg"
                      >
                        <div>
                          <div className="text-sm text-primary font-medium">{pump.pump_name}</div>
                          <div className="text-xs text-secondary">
                            {pump.city}, {pump.state}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleApprovePump(pump.id)}>
                          Approve
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
