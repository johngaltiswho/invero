'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Button, Input } from '@/components';
import Link from 'next/link';

interface FormData {
  // Company Information
  companyName: string;
  registrationNumber: string;
  panNumber: string;
  gstin: string;
  incorporationDate: string;
  companyType: string;
  businessAddress: string;
  
  // Contact Information
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  alternatePhone: string;
  
  
  // KYC Documents
  documents: {
    panCard: File | null;
    gstCertificate: File | null;
    companyRegistration: File | null;
    cancelledCheque: File | null;
  };
}

const steps = [
  { id: 1, title: 'Basic Details', description: 'Confirm GSTIN and contact details' },
  { id: 2, title: 'Documents & Review', description: 'Upload core proof and submit' }
];

export default function ContractorApplyPage(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [gstLookup, setGstLookup] = useState<{
    loading: boolean;
    pan: string | null;
    stateName: string | null;
    error: string | null;
  }>({ loading: false, pan: null, stateName: null, error: null });
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    applicationId?: string;
  }>({ type: null, message: '' });
  const [formData, setFormData] = useState<FormData>({
    companyName: '', registrationNumber: '', panNumber: '', gstin: '', incorporationDate: '', companyType: '', businessAddress: '',
    contactPerson: '', designation: '', email: '', phone: '', alternatePhone: '',
    documents: {
      panCard: null, gstCertificate: null, companyRegistration: null, cancelledCheque: null
    }
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/contractor/profile');
        const result = await response.json();
        if (!response.ok || !result?.success || !active) return;

        const data = result.data;
        setFormData((prev) => ({
          ...prev,
          companyName: data.company_name || prev.companyName,
          registrationNumber: data.registration_number || prev.registrationNumber,
          panNumber: data.pan_number || prev.panNumber,
          gstin: data.gstin || prev.gstin,
          incorporationDate: data.incorporation_date || prev.incorporationDate,
          companyType: data.company_type || prev.companyType,
          businessAddress: data.business_address || prev.businessAddress,
          contactPerson: data.contact_person || prev.contactPerson,
          designation: data.designation || prev.designation,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
        }));
      } finally {
        if (active) setIsLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (formData.gstin.trim().length === 15) {
      void runGstinLookup();
    } else {
      setGstLookup({ loading: false, pan: null, stateName: null, error: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.gstin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: keyof FormData['documents']) => {
    const file = e.target.files?.[0] || null;
    setFormData({
      ...formData,
      documents: { ...formData.documents, [docType]: file }
    });
  };

  const runGstinLookup = async () => {
    if (formData.gstin.trim().length !== 15) {
      setGstLookup({ loading: false, pan: null, stateName: null, error: null });
      return;
    }

    setGstLookup((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/contractor/gstin-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: formData.gstin }),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        setGstLookup({ loading: false, pan: null, stateName: null, error: result?.error || 'GST lookup failed' });
        return;
      }

      setGstLookup({
        loading: false,
        pan: result.data?.pan || null,
        stateName: result.data?.stateName || null,
        error: null,
      });
    } catch {
      setGstLookup({ loading: false, pan: null, stateName: null, error: 'GST lookup failed' });
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 2));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // Prepare FormData with both text fields and files
      const submitFormData = new FormData();
      
      // Add text fields
      submitFormData.append('companyName', formData.companyName);
      submitFormData.append('registrationNumber', formData.registrationNumber);
      submitFormData.append('panNumber', formData.panNumber);
      submitFormData.append('incorporationDate', formData.incorporationDate);
      submitFormData.append('companyType', formData.companyType);
      submitFormData.append('businessAddress', formData.businessAddress);
      submitFormData.append('city', ''); // Extract from address if needed
      submitFormData.append('state', ''); // Extract from address if needed
      submitFormData.append('pincode', ''); // Extract from address if needed
      submitFormData.append('contactPerson', formData.contactPerson);
      submitFormData.append('designation', formData.designation);
      submitFormData.append('email', formData.email);
      submitFormData.append('phone', formData.phone);
      submitFormData.append('gstNumber', formData.gstin);
      
      // Add file uploads (map to correct field names)
      Object.entries(formData.documents).forEach(([docType, file]) => {
        if (file) {
          submitFormData.append(docType, file);
        }
      });
      

      const response = await fetch('/api/contractor-application-v2', {
        method: 'POST',
        // Don't set Content-Type header - let browser set it with boundary for FormData
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message,
          applicationId: result.data?.applicationId,
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || 'Failed to submit application. Please try again.',
        });
      }
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileUpload = ({ label, docType, required = false, helpText }: { 
    label: string; 
    docType: keyof FormData['documents']; 
    required?: boolean;
    helpText?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-primary mb-2">
        {label} {required && '*'}
      </label>
      {helpText && (
        <p className="text-xs text-secondary mb-2">{helpText}</p>
      )}
      <div className="border-2 border-dashed border-neutral-medium rounded-lg p-4 text-center hover:border-accent-orange transition-colors">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileChange(e, docType)}
          className="hidden"
          id={docType}
        />
        <label htmlFor={docType} className="cursor-pointer">
          <div className="text-accent-orange mb-2">📁</div>
          <div className="text-sm text-secondary">
            {formData.documents[docType] ? formData.documents[docType]!.name : 'Click to upload or drag and drop'}
          </div>
          <div className="text-xs text-secondary mt-1">PDF, JPG, PNG up to 20MB</div>
        </label>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-accent-orange/10 border border-accent-orange/20 p-4 rounded-lg">
              <h4 className="text-accent-orange font-semibold mb-2">Start with basic onboarding</h4>
              <p className="text-sm text-secondary">
                Confirm your GSTIN and basic contact details. We use the admin-created profile as the starting point.
                Registered business details can be enriched from GST verification and updated later if needed.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Company Name *" name="companyName" value={formData.companyName} onChange={handleInputChange} required />
              <Input label="GSTIN *" name="gstin" value={formData.gstin} onChange={handleInputChange} onBlur={runGstinLookup} required />
            </div>
            <div className="rounded-lg border border-neutral-medium bg-neutral-darker/40 p-4 text-sm">
              {gstLookup.loading ? (
                <p className="text-secondary">Reading GSTIN structure...</p>
              ) : gstLookup.error ? (
                <p className="text-red-400">{gstLookup.error}</p>
              ) : gstLookup.pan || gstLookup.stateName ? (
                <div className="space-y-1 text-secondary">
                  {gstLookup.pan && <p>Derived PAN from GSTIN: <span className="text-primary">{gstLookup.pan}</span></p>}
                  {gstLookup.stateName && <p>Derived state from GSTIN: <span className="text-primary">{gstLookup.stateName}</span></p>}
                  <p className="text-xs">Full legal name and registered address will be pulled once we connect a GST data provider.</p>
                </div>
              ) : (
                <p className="text-secondary">Enter a valid GSTIN to derive PAN and state automatically.</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Contact Person *" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required />
              <Input label="Phone *" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} disabled />
              <Input label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-accent-orange/10 border border-accent-orange/20 p-4 rounded-lg mb-6">
              <h4 className="text-accent-orange font-semibold mb-2">📋 Basic onboarding documents</h4>
              <p className="text-sm text-secondary">
                Upload GST proof now. PAN can be shared as a fallback if GST verification does not give us the full business profile cleanly.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <FileUpload label="PAN Card" docType="panCard" helpText="Optional fallback if GST verification does not give us the PAN cleanly." />
              <FileUpload label="GST Certificate" docType="gstCertificate" required helpText="Primary proof for business verification and registered address." />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FileUpload label="Company Registration" docType="companyRegistration" helpText="Optional now. Needed later for financing activation." />
              <FileUpload label="Cancelled Cheque" docType="cancelledCheque" helpText="Optional now. Needed later for financing activation." />
            </div>
            
            <div className="bg-neutral-medium p-6 rounded-lg mt-8">
              <h3 className="text-xl font-bold text-primary mb-4">Application Summary</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-secondary">Company:</span> <span className="text-primary">{formData.companyName}</span></div>
                <div><span className="text-secondary">GST Number:</span> <span className="text-primary">{formData.gstin}</span></div>
                <div><span className="text-secondary">Contact Person:</span> <span className="text-primary">{formData.contactPerson}</span></div>
                <div><span className="text-secondary">Email:</span> <span className="text-primary">{formData.email}</span></div>
                <div><span className="text-secondary">Phone:</span> <span className="text-primary">{formData.phone}</span></div>
              </div>
            </div>
            
            {/* Submission Status */}
            {submitStatus.type && (
              <div className={`mt-6 p-4 rounded-lg ${
                submitStatus.type === 'success' 
                  ? 'bg-green-900/20 border border-green-500 text-green-400' 
                  : 'bg-red-900/20 border border-red-500 text-red-400'
              }`}>
                <div className="flex items-center">
                  <div className="mr-3">
                    {submitStatus.type === 'success' ? '✅' : '❌'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {submitStatus.type === 'success' ? 'Application Submitted!' : 'Submission Failed'}
                    </div>
                    <div className="text-sm mt-1">{submitStatus.message}</div>
                    {submitStatus.applicationId && (
                      <div className="text-sm mt-2 font-mono bg-black/20 px-2 py-1 rounded">
                        Application ID: {submitStatus.applicationId}
                      </div>
                    )}
                    {submitStatus.type === 'success' && (
                      <div className="mt-4">
                        <Link href="/contractors/status">
                          <Button variant="outline" size="sm">
                            Track Application Status
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      {/* Header */}
      <section className="public-page public-section container mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="public-kicker mb-4">
            SME ONBOARDING
          </div>
          <h1 className="font-public-display text-4xl md:text-5xl text-primary mb-8 leading-tight">
            Apply for <span className="public-accent italic">SME onboarding</span>
          </h1>
          <p className="text-lg public-body mb-8 leading-relaxed">
            Complete a light onboarding flow to access the portal and begin procurement review.
            We start with GST verification and the contact details already seeded by the admin team.
          </p>
        </div>
      </section>

      {/* Progress Indicator */}
      <section className="public-page public-section py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex-1">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      currentStep >= step.id ? 'bg-accent-orange text-white' : 'bg-neutral-medium text-secondary'
                    }`}>
                      {step.id}
                    </div>
                    <div className="ml-3 hidden md:block">
                      <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-primary' : 'text-secondary'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-secondary">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 mt-5 ${currentStep > step.id ? 'bg-accent-orange' : 'bg-neutral-medium'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="public-page py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="public-panel p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-primary mb-8">
                {steps[currentStep - 1]?.title || 'Onboarding Step'}
              </h2>
              {isLoadingProfile && (
                <p className="text-sm text-secondary mb-6">Loading your admin-invited profile...</p>
              )}
              
              {renderStepContent()}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-8 border-t border-neutral-medium">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Previous
                </Button>
                
                {currentStep < 2 ? (
                  <Button variant="primary" onClick={nextStep}>
                    Next Step
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="public-page public-section py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-public-display text-2xl md:text-3xl text-primary mb-8">What Happens Next?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl accent-orange mb-4">📋</div>
                <h3 className="text-lg font-bold text-primary mb-2">Application Review</h3>
                <p className="text-secondary">Our team reviews your basic onboarding details and core KYC first so you can move into procurement workflow quickly.</p>
              </div>
              <div>
                <div className="text-3xl accent-orange mb-4">🤝</div>
                <h3 className="text-lg font-bold text-primary mb-2">Procurement Activation</h3>
                <p className="text-secondary">Once approved, your team gets access to Finverno's procurement workflow, vendor coordination, and project-side visibility.</p>
              </div>
              <div>
                <div className="text-3xl accent-orange mb-4">🚚</div>
                <h3 className="text-lg font-bold text-primary mb-2">Financing Later If Needed</h3>
                <p className="text-secondary">If your account later moves into financing, we will separately request company registration and bank proof before commercial activation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back Link */}
      <section className="public-page py-16">
        <div className="container mx-auto px-4 text-center">
          <Link href="/contractors" className="inline-block">
            <Button variant="outline" size="md">
              ← Back to SMEs Page
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
