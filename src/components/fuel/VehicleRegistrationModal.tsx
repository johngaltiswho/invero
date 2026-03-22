'use client';

import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { vehicleSchema, type VehicleInput } from '@/lib/validations/fuel';

interface VehicleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VehicleRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: VehicleRegistrationModalProps) {
  const [formData, setFormData] = useState<VehicleInput>({
    vehicle_number: '',
    vehicle_type: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitMessage(null);
    setIsSubmitting(true);

    try {
      // Validate with Zod
      const validationResult = vehicleSchema.safeParse(formData);
      if (!validationResult.success) {
        const fieldErrors: { [key: string]: string } = {};
        validationResult.error.issues.forEach((err) => {
          const path = err.path[0] as string;
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      // Submit to API
      const response = await fetch('/api/contractor/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationResult.data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register vehicle');
      }

      // Success
      setSubmitMessage('Vehicle registered successfully!');
      setFormData({ vehicle_number: '', vehicle_type: '' });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to register vehicle:', error);
      setSubmitMessage(
        error instanceof Error ? error.message : 'Failed to register vehicle'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neutral-dark rounded-lg border border-neutral-medium w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-neutral-dark border-b border-neutral-medium p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">
              Register Vehicle
            </h2>
            <p className="text-secondary text-sm mt-1">
              Add a new vehicle for fuel expense tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Vehicle Number"
            placeholder="e.g., KA01AB1234"
            value={formData.vehicle_number}
            onChange={(e) => {
              // Auto-uppercase as user types
              const value = e.target.value.toUpperCase().replace(/\s/g, '');
              setFormData((prev) => ({ ...prev, vehicle_number: value }));
              // Clear error when user starts typing
              if (errors.vehicle_number) {
                setErrors((prev) => ({ ...prev, vehicle_number: '' }));
              }
            }}
            error={errors.vehicle_number}
            helperText="Indian vehicle registration number (e.g., KA01AB1234)"
            maxLength={20}
          />

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Vehicle Type
            </label>
            <select
              value={formData.vehicle_type}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, vehicle_type: e.target.value }));
                // Clear error when user selects
                if (errors.vehicle_type) {
                  setErrors((prev) => ({ ...prev, vehicle_type: '' }));
                }
              }}
              className={`w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 ${
                errors.vehicle_type
                  ? 'border-warning'
                  : 'border-neutral-medium hover:border-neutral-dark'
              }`}
            >
              <option value="">Select vehicle type</option>
              <option value="Truck">Truck</option>
              <option value="JCB">JCB</option>
              <option value="Loader">Loader</option>
              <option value="Excavator">Excavator</option>
              <option value="Crane">Crane</option>
              <option value="Dumper">Dumper</option>
              <option value="Tipper">Tipper</option>
              <option value="Other">Other</option>
            </select>
            {errors.vehicle_type && (
              <p className="mt-2 text-sm text-warning">{errors.vehicle_type}</p>
            )}
          </div>

          {submitMessage && (
            <div
              className={`p-3 rounded-lg text-sm ${
                submitMessage.includes('success')
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {submitMessage}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Registering...' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
