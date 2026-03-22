'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components/Button';
import Link from 'next/link';

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
}

interface FuelPump {
  id: string;
  pump_name: string;
  address: string;
  city: string;
  state: string;
  contact_person: string;
  contact_phone: string;
}

interface FuelSettings {
  monthly_fuel_budget: number;
  per_request_max_amount: number;
  per_request_max_liters: number;
  max_fills_per_vehicle_per_day: number;
  min_hours_between_fills: number;
  auto_approve_enabled: boolean;
}

interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
}

interface ApprovalResponse {
  id: string;
  approval_code: string;
  max_amount: number;
  max_liters: number;
  valid_until: string;
  vehicle: {
    vehicle_number: string;
    vehicle_type: string;
  };
  pump: {
    pump_name: string;
    address: string;
    city: string;
    contact_person: string;
    contact_phone: string;
  };
}

export default function RequestFuelPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pumps, setPumps] = useState<FuelPump[]>([]);
  const [settings, setSettings] = useState<FuelSettings | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedPumpId, setSelectedPumpId] = useState('');
  const [requestedLiters, setRequestedLiters] = useState('');
  const [requestedNotes, setRequestedNotes] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approval, setApproval] = useState<ApprovalResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch vehicles, pumps, and settings in parallel
      const [vehiclesRes, pumpsRes, settingsRes] = await Promise.all([
        fetch('/api/contractor/vehicles'),
        fetch('/api/contractor/approved-pumps'),
        fetch('/api/contractor/fuel-settings'),
      ]);

      const vehiclesData = await vehiclesRes.json();
      const pumpsData = await pumpsRes.json();
      const settingsData = await settingsRes.json();

      if (!vehiclesRes.ok) throw new Error(vehiclesData.error);
      if (!pumpsRes.ok) throw new Error(pumpsData.error);
      if (!settingsRes.ok) throw new Error(settingsData.error);

      setVehicles(vehiclesData.data || []);
      setPumps(pumpsData.data || []);
      setSettings(settingsData.data.settings);
      setBudgetStatus(settingsData.data.budget_status);

      // Auto-select if only one option
      if (vehiclesData.data?.length === 1) {
        setSelectedVehicleId(vehiclesData.data[0].id);
      }
      if (pumpsData.data?.length === 1) {
        setSelectedPumpId(pumpsData.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRejectionReason(null);
    setApproval(null);

    // Validation
    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (!selectedPumpId) {
      setError('Please select a fuel pump');
      return;
    }
    if (!requestedLiters || parseFloat(requestedLiters) <= 0) {
      setError('Please enter valid liters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contractor/fuel-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: selectedVehicleId,
          pump_id: selectedPumpId,
          requested_liters: parseFloat(requestedLiters),
          requested_notes: requestedNotes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit request');
      }

      if (result.approved) {
        // Auto-approved
        setApproval(result.approval);
        // Reset form
        setSelectedVehicleId(vehicles.length === 1 ? vehicles[0].id : '');
        setSelectedPumpId(pumps.length === 1 ? pumps[0].id : '');
        setRequestedLiters('');
        setRequestedNotes('');
        // Refresh budget
        fetchData();
      } else {
        // Rejected
        setRejectionReason(result.reason);
      }
    } catch (err) {
      console.error('Failed to submit fuel request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedAmount = requestedLiters ? parseFloat(requestedLiters) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ContractorDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">Request Fuel</h1>
              <p className="text-secondary text-sm mt-1">
                Auto-approval based on your fuel settings
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
              className="px-4 py-2 text-sm font-medium border-b-2 border-amber-500 text-amber-500"
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-secondary">Loading...</div>
          </div>
        ) : !settings ? (
          <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Fuel Settings Not Configured
            </h3>
            <p className="text-secondary text-sm">
              Please contact admin to configure your fuel settings and budget.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Budget & Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Budget Status Card */}
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
                  Monthly Budget
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500">Total Budget</div>
                    <div className="text-lg font-semibold text-primary">
                      {formatCurrency(budgetStatus?.budget || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Spent This Month</div>
                    <div className="text-lg font-semibold text-orange-400">
                      {formatCurrency(budgetStatus?.spent || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Remaining</div>
                    <div className="text-lg font-semibold text-green-400">
                      {formatCurrency(budgetStatus?.remaining || 0)}
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="pt-2">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            ((budgetStatus?.spent || 0) / (budgetStatus?.budget || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Card */}
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
                  Your Limits
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Per Request Max</span>
                    <span className="text-primary font-medium">
                      {formatCurrency(settings.per_request_max_amount)} / {settings.per_request_max_liters}L
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Daily Fills</span>
                    <span className="text-primary font-medium">
                      {settings.max_fills_per_vehicle_per_day} per vehicle
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min Time Between</span>
                    <span className="text-primary font-medium">
                      {settings.min_hours_between_fills} hours
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Auto-Approval</span>
                    <span className={`font-medium ${settings.auto_approve_enabled ? 'text-green-400' : 'text-red-400'}`}>
                      {settings.auto_approve_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Request Form */}
            <div className="lg:col-span-2">
              <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6">
                {vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      No Vehicles Registered
                    </h3>
                    <p className="text-secondary text-sm mb-6">
                      Please register a vehicle first before requesting fuel
                    </p>
                    <Link href="/dashboard/contractor/fuel/vehicles">
                      <Button>Register Vehicle</Button>
                    </Link>
                  </div>
                ) : pumps.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      No Approved Fuel Pumps
                    </h3>
                    <p className="text-secondary text-sm">
                      Please contact admin to get fuel pumps approved for your account
                    </p>
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

                    {/* Pump Selection */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Select Fuel Pump
                      </label>
                      <select
                        value={selectedPumpId}
                        onChange={(e) => setSelectedPumpId(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                      >
                        <option value="">Select a fuel pump</option>
                        {pumps.map((pump) => (
                          <option key={pump.id} value={pump.id}>
                            {pump.pump_name} - {pump.city}
                          </option>
                        ))}
                      </select>
                      {selectedPumpId && (
                        <div className="mt-2 p-3 bg-neutral-darker rounded-lg text-xs text-secondary">
                          {pumps.find((p) => p.id === selectedPumpId)?.address}
                          <br />
                          Contact: {pumps.find((p) => p.id === selectedPumpId)?.contact_person} -{' '}
                          {pumps.find((p) => p.id === selectedPumpId)?.contact_phone}
                        </div>
                      )}
                    </div>

                    {/* Requested Liters */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Requested Liters
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={settings.per_request_max_liters}
                        value={requestedLiters}
                        onChange={(e) => setRequestedLiters(e.target.value)}
                        placeholder={`Max ${settings.per_request_max_liters}L per request`}
                        className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                      />
                      {requestedLiters && (
                        <p className="mt-2 text-xs text-secondary">
                          Estimated Amount: {formatCurrency(estimatedAmount)} (@ Rs 100/L)
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={requestedNotes}
                        onChange={(e) => setRequestedNotes(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="e.g., Urgent delivery project"
                        className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {requestedNotes.length}/500 characters
                      </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                        {error}
                      </div>
                    )}

                    {/* Rejection Message */}
                    {rejectionReason && (
                      <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-start space-x-3">
                          <div className="text-orange-400 text-xl">⚠</div>
                          <div>
                            <div className="text-sm font-semibold text-orange-400 mb-1">
                              Request Not Approved
                            </div>
                            <div className="text-sm text-orange-500">
                              {rejectionReason}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approval Success */}
                    {approval && (
                      <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="text-center mb-4">
                          <div className="text-sm font-semibold text-green-400 mb-2">
                            Fuel Request Approved
                          </div>
                          <div className="text-xs text-green-500 mb-4">
                            Share this code with your driver
                          </div>

                          {/* Approval Code - Large Display */}
                          <div className="bg-neutral-darker rounded-lg p-6 mb-4">
                            <div className="text-xs text-gray-500 mb-2">Approval Code</div>
                            <div className="text-3xl font-bold text-green-400 tracking-wider font-mono">
                              {approval.approval_code}
                            </div>
                          </div>

                          {/* Approval Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-left">
                              <div className="text-xs text-gray-500">Vehicle</div>
                              <div className="text-primary font-medium">
                                {approval.vehicle.vehicle_number}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-gray-500">Max Amount</div>
                              <div className="text-primary font-medium">
                                {formatCurrency(approval.max_amount)}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-gray-500">Max Liters</div>
                              <div className="text-primary font-medium">
                                {approval.max_liters}L
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-gray-500">Valid Until</div>
                              <div className="text-primary font-medium">
                                {formatDate(approval.valid_until)}
                              </div>
                            </div>
                          </div>

                          {/* Pump Details */}
                          <div className="mt-4 p-3 bg-neutral-darker rounded-lg text-left">
                            <div className="text-xs text-gray-500 mb-1">Fill Fuel At</div>
                            <div className="text-sm text-primary font-medium">
                              {approval.pump.pump_name}
                            </div>
                            <div className="text-xs text-secondary mt-1">
                              {approval.pump.address}, {approval.pump.city}
                            </div>
                            <div className="text-xs text-secondary mt-1">
                              Contact: {approval.pump.contact_person} - {approval.pump.contact_phone}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setApproval(null)}
                          className="w-full"
                        >
                          Request Another
                        </Button>
                      </div>
                    )}

                    {/* Submit Button */}
                    {!approval && (
                      <Button
                        type="submit"
                        disabled={isSubmitting || !selectedVehicleId || !selectedPumpId || !requestedLiters}
                        className="w-full"
                      >
                        {isSubmitting ? 'Processing...' : 'Request Fuel Approval'}
                      </Button>
                    )}

                    <p className="text-xs text-secondary text-center">
                      Auto-approval based on your budget, limits, and frequency rules
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}
