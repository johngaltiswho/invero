'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components';
import { Input } from '@/components/Input';
import { useInvestor } from '@/contexts/InvestorContext';

type InvestorProfile = {
  email: string;
  name: string;
  investor_type: string;
  phone: string;
  pan_number: string;
  address: string;
  agreement_status: string;
  activation_status: string;
};

type InvestorDocument = {
  name: string;
  documentType?: string;
  signedUrl?: string | null;
  createdAt?: string | null;
};

const emptyProfile: InvestorProfile = {
  email: '',
  name: '',
  investor_type: '',
  phone: '',
  pan_number: '',
  address: '',
  agreement_status: 'not_started',
  activation_status: 'inactive',
};

export default function InvestorProfilePage(): React.ReactElement {
  const [profile, setProfile] = useState<InvestorProfile>(emptyProfile);
  const [bankForm, setBankForm] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: ''
  });
  const [chequeFileName, setChequeFileName] = useState('');
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState<string | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panFileName, setPanFileName] = useState('');
  const [panUploading, setPanUploading] = useState(false);
  const [panMessage, setPanMessage] = useState<string | null>(null);
  const [panDocument, setPanDocument] = useState<{ name: string; signedUrl: string | null; createdAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refetch } = useInvestor();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/investor/profile');
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Failed to load profile');
        }

        setProfile({
          email: result.data.email || '',
          name: result.data.name || '',
          investor_type: result.data.investor_type || '',
          phone: result.data.phone || '',
          pan_number: result.data.pan_number || '',
          address: result.data.address || '',
          agreement_status: result.data.agreement_status || 'not_started',
          activation_status: result.data.activation_status || 'inactive',
        });

        const bankResponse = await fetch('/api/investor/bank-details');
        const bankResult = await bankResponse.json();
        if (bankResponse.ok && bankResult?.success && bankResult?.data) {
          setBankForm({
            accountHolder: bankResult.data.bank_account_holder || '',
            bankName: bankResult.data.bank_name || '',
            accountNumber: bankResult.data.bank_account_number || '',
            ifscCode: bankResult.data.bank_ifsc || '',
            branchName: bankResult.data.bank_branch || '',
          });
          if (bankResult.data.cancelled_cheque_path) {
            setChequeFileName('cancelled-cheque');
          }
        }

        const documentsResponse = await fetch('/api/investor/documents');
        const documentsResult = await documentsResponse.json();
        if (documentsResponse.ok && documentsResult?.success) {
          const panDoc = ((documentsResult.documents || []) as InvestorDocument[]).find((doc) => doc.documentType === 'pan');
          if (panDoc) {
            setPanDocument({
              name: panDoc.name,
              signedUrl: panDoc.signedUrl || null,
              createdAt: panDoc.createdAt || null,
            });
          }
        }
      } catch (loadError) {
        const errorMessage = loadError instanceof Error ? loadError.message : 'Failed to load profile';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateField = (key: keyof InvestorProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleBankFieldChange = (field: keyof typeof bankForm, value: string) => {
    setBankForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/investor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          pan_number: profile.pan_number,
          address: profile.address,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to save profile');
      }

      setProfile({
        email: result.data.email || '',
        name: result.data.name || '',
        investor_type: result.data.investor_type || '',
        phone: result.data.phone || '',
        pan_number: result.data.pan_number || '',
        address: result.data.address || '',
        agreement_status: result.data.agreement_status || 'not_started',
        activation_status: result.data.activation_status || 'inactive',
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

  const handleSaveBankDetails = async () => {
    setBankSaving(true);
    setBankMessage(null);
    try {
      let cancelledChequePath = '';

      if (chequeFile) {
        const formData = new FormData();
        formData.append('file', chequeFile);
        formData.append('documentType', 'cancelled-cheque');

        const uploadResponse = await fetch('/api/investor/documents', {
          method: 'POST',
          body: formData
        });

        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadResult?.error || 'Failed to upload cheque');
        }

        cancelledChequePath = uploadResult?.document?.path || '';
      }

      const saveResponse = await fetch('/api/investor/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_holder: bankForm.accountHolder,
          bank_name: bankForm.bankName,
          bank_account_number: bankForm.accountNumber,
          bank_ifsc: bankForm.ifscCode,
          bank_branch: bankForm.branchName,
          cancelled_cheque_path: cancelledChequePath || undefined
        })
      });

      const saveResult = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveResult?.error || 'Failed to save bank details');
      }

      setChequeFile(null);
      setBankMessage('Bank details saved. We will verify and enable payouts.');
    } catch (saveError) {
      setBankMessage(saveError instanceof Error ? saveError.message : 'Failed to save bank details');
    } finally {
      setBankSaving(false);
    }
  };

  const handleUploadPan = async () => {
    if (!panFile) {
      setPanMessage('Please select a PAN file first.');
      return;
    }

    setPanUploading(true);
    setPanMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', panFile);
      formData.append('documentType', 'pan');

      const response = await fetch('/api/investor/documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to upload PAN');
      }

      setPanMessage('PAN uploaded successfully.');
      setPanFile(null);
      setPanDocument({
        name: result?.document?.name || panFileName || 'PAN',
        signedUrl: null,
        createdAt: new Date().toISOString()
      });
    } catch (uploadError) {
      setPanMessage(uploadError instanceof Error ? uploadError.message : 'Failed to upload PAN');
    } finally {
      setPanUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout activeTab="profile">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-primary">Investor Profile</h1>
          <p className="text-secondary">Maintain your personal details used for agreements, tax handling, and investor communications.</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-neutral-medium bg-neutral-dark p-6 text-secondary">
            Loading profile...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-error">{error}</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-medium bg-neutral-dark p-6">
              <h2 className="mb-4 text-xl font-semibold text-primary">Personal Details</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Full Name"
                  value={profile.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Enter full legal name"
                />
                <Input
                  label="Registered Email (read-only)"
                  value={profile.email}
                  disabled
                  readOnly
                />
                <Input
                  label="Investor Type (read-only)"
                  value={profile.investor_type}
                  disabled
                  readOnly
                />
                <Input
                  label="Phone"
                  value={profile.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Enter phone number"
                />
                <Input
                  label="PAN Number"
                  value={profile.pan_number}
                  onChange={(event) => updateField('pan_number', event.target.value.toUpperCase())}
                  placeholder="Enter PAN number"
                  helperText="This will be used to auto-fill your investor agreement."
                />
                <div className="rounded-lg border border-neutral-medium bg-neutral-darker px-4 py-3">
                  <div className="mb-1 text-sm font-medium text-primary">Agreement Status</div>
                  <div className="text-sm capitalize text-secondary">{profile.agreement_status.replace(/_/g, ' ')}</div>
                </div>
                <div className="rounded-lg border border-neutral-medium bg-neutral-darker px-4 py-3">
                  <div className="mb-1 text-sm font-medium text-primary">Activation Status</div>
                  <div className="text-sm capitalize text-secondary">{profile.activation_status.replace(/_/g, ' ')}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-primary">Address</label>
                  <textarea
                    rows={4}
                    value={profile.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    placeholder="Enter full address"
                    className="w-full rounded-lg border border-neutral-medium bg-neutral-dark px-4 py-3 text-primary placeholder-text-secondary transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  />
                  <p className="mt-2 text-sm text-secondary">This will be used in agreements and investor communications.</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-medium bg-neutral-dark p-6">
              <h2 className="mb-2 text-xl font-semibold text-primary">Payout Preferences</h2>
              <p className="mb-6 text-sm text-secondary">
                Provide your bank details and a cancelled cheque to enable automated payouts.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Account Holder Name"
                  value={bankForm.accountHolder}
                  onChange={(event) => handleBankFieldChange('accountHolder', event.target.value)}
                  placeholder="Name as per bank account"
                />
                <Input
                  label="Bank Name"
                  value={bankForm.bankName}
                  onChange={(event) => handleBankFieldChange('bankName', event.target.value)}
                  placeholder="Bank name"
                />
                <Input
                  label="Account Number"
                  value={bankForm.accountNumber}
                  onChange={(event) => handleBankFieldChange('accountNumber', event.target.value)}
                  placeholder="Account number"
                />
                <Input
                  label="IFSC Code"
                  value={bankForm.ifscCode}
                  onChange={(event) => handleBankFieldChange('ifscCode', event.target.value)}
                  placeholder="IFSC code"
                />
                <Input
                  label="Branch Name"
                  value={bankForm.branchName}
                  onChange={(event) => handleBankFieldChange('branchName', event.target.value)}
                  placeholder="Branch"
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-primary">Cancelled Cheque</label>
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-medium bg-neutral-darker px-3 py-2 text-sm text-secondary">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setChequeFile(file);
                        setChequeFileName(file?.name || '');
                      }}
                      className="text-xs text-secondary"
                    />
                    {chequeFileName && <span className="text-xs text-primary">{chequeFileName}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs text-secondary">
                  {bankMessage || 'We will verify these details before enabling payouts.'}
                </p>
                <Button size="sm" onClick={handleSaveBankDetails} disabled={bankSaving}>
                  {bankSaving ? 'Saving...' : 'Save Bank Details'}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-medium bg-neutral-dark p-6">
              <h2 className="mb-2 text-xl font-semibold text-primary">PAN Document</h2>
              <p className="mb-6 text-sm text-secondary">
                Upload your PAN card for compliance and payout processing.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="text-sm text-secondary"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setPanFile(file);
                    setPanFileName(file?.name || '');
                  }}
                />
                <Button variant="outline" size="sm" onClick={handleUploadPan} disabled={panUploading}>
                  {panUploading ? 'Uploading...' : panDocument ? 'Replace PAN' : 'Upload PAN'}
                </Button>
              </div>
              {panFileName && <p className="mt-2 text-xs text-secondary">Selected: {panFileName}</p>}
              {panDocument && (
                <div className="mt-3 text-xs text-secondary">
                  Uploaded PAN: <span className="text-primary">{panDocument.name}</span>{' '}
                  {panDocument.createdAt ? `on ${formatDate(panDocument.createdAt)}` : ''}
                  {panDocument.signedUrl && (
                    <>
                      {' '}·{' '}
                      <a href={panDocument.signedUrl} className="text-accent-amber hover:underline" target="_blank" rel="noreferrer">
                        View
                      </a>
                    </>
                  )}
                </div>
              )}
              {panMessage && <p className="mt-2 text-xs text-secondary">{panMessage}</p>}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-h-6">
                {message && <span className="text-sm text-success">{message}</span>}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
