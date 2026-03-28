'use client';

import React, { useEffect, useState } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

type ContractorProfile = {
  email: string;
  company_name: string;
  registration_number: string;
  pan_number: string;
  incorporation_date: string;
  company_type: string;
  contact_person: string;
  designation: string;
  phone: string;
  business_address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
};

const emptyProfile: ContractorProfile = {
  email: '',
  company_name: '',
  registration_number: '',
  pan_number: '',
  incorporation_date: '',
  company_type: '',
  contact_person: '',
  designation: '',
  phone: '',
  business_address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: ''
};

export default function ContractorProfilePage() {
  const [profile, setProfile] = useState<ContractorProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refetch } = useContractorV2();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/contractor/profile');
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Failed to load profile');
        }

        setProfile({
          email: result.data.email || '',
          company_name: result.data.company_name || '',
          registration_number: result.data.registration_number || '',
          pan_number: result.data.pan_number || '',
          incorporation_date: result.data.incorporation_date || '',
          company_type: result.data.company_type || '',
          contact_person: result.data.contact_person || '',
          designation: result.data.designation || '',
          phone: result.data.phone || '',
          business_address: result.data.business_address || '',
          city: result.data.city || '',
          state: result.data.state || '',
          pincode: result.data.pincode || '',
          gstin: result.data.gstin || ''
        });
      } catch (loadError) {
        const errorMessage = loadError instanceof Error ? loadError.message : 'Failed to load profile';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateField = (key: keyof ContractorProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/contractor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: profile.company_name,
          registration_number: profile.registration_number,
          pan_number: profile.pan_number,
          incorporation_date: profile.incorporation_date,
          company_type: profile.company_type || null,
          contact_person: profile.contact_person,
          designation: profile.designation,
          phone: profile.phone,
          business_address: profile.business_address,
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
          gstin: profile.gstin
        })
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to save profile');
      }

      setProfile({
        email: result.data.email || '',
        company_name: result.data.company_name || '',
        registration_number: result.data.registration_number || '',
        pan_number: result.data.pan_number || '',
        incorporation_date: result.data.incorporation_date || '',
        company_type: result.data.company_type || '',
        contact_person: result.data.contact_person || '',
        designation: result.data.designation || '',
        phone: result.data.phone || '',
        business_address: result.data.business_address || '',
        city: result.data.city || '',
        state: result.data.state || '',
        pincode: result.data.pincode || '',
        gstin: result.data.gstin || ''
      });
      setMessage('Profile updated successfully');
      await refetch();
    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save profile';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContractorDashboardLayout activeTab="profile">
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Contractor Profile</h1>
          <p className="text-secondary">Update your company and contact details used across procurement and invoicing.</p>
        </div>

        {loading ? (
          <div className="bg-neutral-dark border border-neutral-medium rounded-xl p-6 text-secondary">
            Loading profile...
          </div>
        ) : error ? (
          <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4">{error}</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-neutral-dark border border-neutral-medium rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary mb-4">Company Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  value={profile.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="Enter company name"
                />
                <Input
                  label="GSTIN"
                  value={profile.gstin}
                  onChange={(e) => updateField('gstin', e.target.value)}
                  placeholder="Enter GSTIN"
                />
                <Input
                  label={profile.company_type === 'private-limited' ? 'CIN' : profile.company_type === 'llp' ? 'LLPIN' : 'Registration Number'}
                  value={profile.registration_number}
                  onChange={(e) => updateField('registration_number', e.target.value)}
                  placeholder="Enter legal registration number"
                />
                <Input
                  label="PAN Number"
                  value={profile.pan_number}
                  onChange={(e) => updateField('pan_number', e.target.value)}
                  placeholder="Enter PAN number"
                />
                <Input
                  label="Incorporation Date"
                  type="date"
                  value={profile.incorporation_date}
                  onChange={(e) => updateField('incorporation_date', e.target.value)}
                  placeholder="Enter incorporation date"
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-primary">Company Type</label>
                  <select
                    value={profile.company_type}
                    onChange={(e) => updateField('company_type', e.target.value)}
                    className="w-full rounded-lg border border-neutral-medium bg-neutral-dark px-4 py-3 text-primary"
                  >
                    <option value="">Select company type</option>
                    <option value="private-limited">Private Limited</option>
                    <option value="partnership">Partnership</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="llp">LLP</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Business Address"
                    value={profile.business_address}
                    onChange={(e) => updateField('business_address', e.target.value)}
                    placeholder="Enter business address"
                  />
                </div>
                <Input
                  label="City"
                  value={profile.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Enter city"
                />
                <Input
                  label="State"
                  value={profile.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="Enter state"
                />
                <Input
                  label="Pincode"
                  value={profile.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder="Enter pincode"
                />
                <Input
                  label="Registered Email (read-only)"
                  value={profile.email}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="bg-neutral-dark border border-neutral-medium rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary mb-4">Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Person"
                  value={profile.contact_person}
                  onChange={(e) => updateField('contact_person', e.target.value)}
                  placeholder="Enter contact person name"
                />
                <Input
                  label="Designation"
                  value={profile.designation}
                  onChange={(e) => updateField('designation', e.target.value)}
                  placeholder="Enter designation"
                />
                <Input
                  label="Phone"
                  value={profile.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-h-6">
                {message && <span className="text-success text-sm">{message}</span>}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ContractorDashboardLayout>
  );
}
