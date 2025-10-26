'use client';

import React, { useState, useEffect } from 'react';
import { ContractorDashboardLayout } from '@/components/ContractorDashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

interface Vendor {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  specialties: string;
  createdAt: string;
  updatedAt: string;
}

export default function NetworkPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { contractor, loading: contractorLoading } = useContractorV2();

  // State management
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    specialties: '',
    gstNumber: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, user, router]);

  // Fetch vendors
  useEffect(() => {
    if (contractor?.id) {
      fetchVendors();
    }
  }, [contractor?.id]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vendors?contractor_id=${contractor.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setVendorForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      specialties: '',
      gstNumber: ''
    });
    setShowVendorDialog(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      specialties: vendor.specialties,
      gstNumber: vendor.gstNumber
    });
    setShowVendorDialog(true);
  };

  const handleSaveVendor = async () => {
    try {
      if (!vendorForm.name || !vendorForm.phone) {
        alert('Please fill in required fields: Name and Phone');
        return;
      }

      const url = editingVendor ? '/api/vendors' : '/api/vendors';
      const method = editingVendor ? 'PUT' : 'POST';
      const body = editingVendor 
        ? { id: editingVendor.id, ...vendorForm }
        : { contractor_id: contractor.id, ...vendorForm };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchVendors();
        setShowVendorDialog(false);
        alert(editingVendor ? 'Vendor updated successfully!' : 'Vendor added successfully!');
      } else {
        alert('Failed to save vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Failed to save vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: number) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchVendors();
        alert('Vendor deleted successfully!');
      } else {
        alert('Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  // Show loading state
  if (!isLoaded || contractorLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show access denied if no contractor
  if (!contractor) {
    return (
      <div className="min-h-screen bg-neutral-darker flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-4">
            You don't have access to the contractor network. Please contact support.
          </p>
          <Button onClick={() => window.location.href = '/dashboard/contractor'} variant="primary" size="sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ContractorDashboardLayout 
      currentContractorId={contractor.id}
      activeSection="network"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Network</h1>
          <p className="text-secondary">
            Manage your vendors, suppliers, and business partners
          </p>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL VENDORS</div>
            <div className="text-2xl font-bold text-primary mb-1">{vendors.length}</div>
            <div className="text-xs text-secondary">All vendors</div>
          </div>
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
            <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE VENDORS</div>
            <div className="text-2xl font-bold text-primary mb-1">{vendors.length}</div>
            <div className="text-xs text-success">Currently available</div>
          </div>
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
            <div className="text-accent-amber text-sm font-mono mb-2">GST VERIFIED</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {vendors.filter(v => v.gstNumber).length}
            </div>
            <div className="text-xs text-secondary">GST registered</div>
          </div>
          <div className="bg-neutral-dark border border-neutral-medium rounded-lg p-4">
            <div className="text-accent-amber text-sm font-mono mb-2">SPECIALTIES</div>
            <div className="text-2xl font-bold text-primary mb-1">
              {new Set(vendors.flatMap(v => v.specialties.split(',').map(s => s.trim()))).size}
            </div>
            <div className="text-xs text-secondary">Material categories</div>
          </div>
        </div>

        {/* Vendors Section */}
        <div className="bg-neutral-dark border border-neutral-medium rounded-lg">
          <div className="border-b border-neutral-medium p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary mb-2">Vendors & Suppliers</h2>
                <p className="text-secondary">
                  Manage your trusted vendors for material procurement
                </p>
              </div>
              <button
                onClick={handleAddVendor}
                className="bg-accent-amber text-neutral-dark px-4 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
              >
                + Add Vendor
              </button>
            </div>
          </div>

          <div className="p-6">
            {vendors.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏢</div>
                <h3 className="text-lg font-semibold text-primary mb-2">No Vendors Added</h3>
                <p className="text-secondary mb-4">
                  Add your first vendor to start building your network
                </p>
                <button
                  onClick={handleAddVendor}
                  className="bg-accent-amber text-neutral-dark px-6 py-2 rounded-lg font-medium hover:bg-accent-amber/90 transition-colors"
                >
                  Add Your First Vendor
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="bg-neutral-darker border border-neutral-medium rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-primary">{vendor.name}</h3>
                        {vendor.contactPerson && (
                          <p className="text-sm text-secondary">{vendor.contactPerson}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditVendor(vendor)}
                          className="text-accent-blue hover:text-accent-blue/80 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(vendor.id)}
                          className="text-error hover:text-error/80 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-secondary">
                        <span className="w-4">📞</span>
                        <span className="ml-2">{vendor.phone}</span>
                      </div>
                      {vendor.email && (
                        <div className="flex items-center text-secondary">
                          <span className="w-4">✉️</span>
                          <span className="ml-2">{vendor.email}</span>
                        </div>
                      )}
                      {vendor.gstNumber && (
                        <div className="flex items-center text-secondary">
                          <span className="w-4">🔢</span>
                          <span className="ml-2">{vendor.gstNumber}</span>
                        </div>
                      )}
                      {vendor.specialties && (
                        <div className="mt-3">
                          <div className="text-xs text-secondary mb-1">Specialties:</div>
                          <div className="flex flex-wrap gap-1">
                            {vendor.specialties.split(',').map((specialty, index) => (
                              <span
                                key={index}
                                className="bg-accent-amber/20 text-accent-amber text-xs px-2 py-1 rounded"
                              >
                                {specialty.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Dialog */}
      {showVendorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-dark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-medium">
            <h2 className="text-xl font-bold mb-4 text-primary">
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ABC Suppliers"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@supplier.com"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={vendorForm.gstNumber}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                  />
                </div>
                <div></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Address
                </label>
                <textarea
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Vendor's business address"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md h-20 text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Specialties
                </label>
                <input
                  type="text"
                  value={vendorForm.specialties}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, specialties: e.target.value }))}
                  placeholder="Cement, Steel, Aggregates (comma separated)"
                  className="w-full px-3 py-2 bg-neutral-darker border border-neutral-medium rounded-md text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowVendorDialog(false)}
                className="px-4 py-2 bg-neutral-medium text-secondary rounded-md hover:bg-neutral-medium/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVendor}
                disabled={!vendorForm.name || !vendorForm.phone}
                className="px-4 py-2 bg-accent-amber text-neutral-dark rounded-md hover:bg-accent-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingVendor ? 'Update Vendor' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContractorDashboardLayout>
  );
}