'use client';

import React, { useState } from 'react';
import { Layout, Button, Input } from '@/components';
import Link from 'next/link';

interface FormData {
  // Company Information
  companyName: string;
  registrationNumber: string;
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
  
  // Business Profile
  yearsInBusiness: string;
  employeeCount: string;
  annualTurnover: string;
  businessCategory: string;
  specializations: string;
  
  // Financial Information
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  currentWorkingCapital: string;
  existingLoans: string;
  creditScore: string;
  
  // Previous Experience
  totalProjectsCompleted: string;
  largestProjectValue: string;
  clientReferences: string;
  
  // Documents
  documents: {
    panCard: File | null;
    gstCertificate: File | null;
    incorporationCertificate: File | null;
    bankStatements: File | null;
    financialStatements: File | null;
  };
}

const steps = [
  { id: 1, title: 'Company Information', description: 'Basic company details and registration' },
  { id: 2, title: 'Business Profile', description: 'Business operations and capabilities' },
  { id: 3, title: 'Financial Information', description: 'Banking and financial details' },
  { id: 4, title: 'Documents & Review', description: 'Upload documents and review application' }
];

export default function ContractorApplyPage(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    applicationId?: string;
  }>({ type: null, message: '' });
  const [formData, setFormData] = useState<FormData>({
    companyName: '', registrationNumber: '', gstin: '', incorporationDate: '', companyType: '', businessAddress: '',
    contactPerson: '', designation: '', email: '', phone: '', alternatePhone: '',
    yearsInBusiness: '', employeeCount: '', annualTurnover: '', businessCategory: '', specializations: '',
    bankName: '', accountNumber: '', ifscCode: '', currentWorkingCapital: '', existingLoans: '', creditScore: '',
    totalProjectsCompleted: '', largestProjectValue: '', clientReferences: '',
    documents: {
      panCard: null, gstCertificate: null, incorporationCertificate: null, bankStatements: null, financialStatements: null
    }
  });

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

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
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
      submitFormData.append('panNumber', ''); // Would need to be added to form
      submitFormData.append('bankName', formData.bankName);
      submitFormData.append('accountNumber', formData.accountNumber);
      submitFormData.append('ifscCode', formData.ifscCode);
      submitFormData.append('annualRevenue', formData.annualTurnover);
      submitFormData.append('yearsInBusiness', formData.yearsInBusiness);
      submitFormData.append('keyServices', formData.specializations);
      submitFormData.append('clientReferences', formData.clientReferences);
      
      // Add file uploads
      Object.entries(formData.documents).forEach(([docType, file]) => {
        if (file) {
          submitFormData.append(docType, file);
        }
      });

      const response = await fetch('/api/contractor-application', {
        method: 'POST',
        // Don't set Content-Type header - let browser set it with boundary for FormData
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message,
          applicationId: result.applicationId,
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || 'Failed to submit application. Please try again.',
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileUpload = ({ label, docType, required = false }: { label: string; docType: keyof FormData['documents']; required?: boolean }) => (
    <div>
      <label className="block text-sm font-medium text-primary mb-2">
        {label} {required && '*'}
      </label>
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
          <div className="text-xs text-secondary mt-1">PDF, JPG, PNG up to 10MB</div>
        </label>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Company Name *" name="companyName" value={formData.companyName} onChange={handleInputChange} required />
              <Input label="Registration Number *" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="GSTIN *" name="gstin" value={formData.gstin} onChange={handleInputChange} required />
              <Input label="Incorporation Date *" name="incorporationDate" type="date" value={formData.incorporationDate} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Company Type *</label>
                <select name="companyType" value={formData.companyType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" required>
                  <option value="">Select company type</option>
                  <option value="private-limited">Private Limited</option>
                  <option value="partnership">Partnership</option>
                  <option value="proprietorship">Proprietorship</option>
                  <option value="llp">LLP</option>
                </select>
              </div>
              <Input label="Contact Person *" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Business Address *</label>
              <textarea name="businessAddress" value={formData.businessAddress} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" rows={3} required />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Input label="Designation *" name="designation" value={formData.designation} onChange={handleInputChange} required />
              <Input label="Email *" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
              <Input label="Phone *" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Input label="Years in Business *" name="yearsInBusiness" type="number" value={formData.yearsInBusiness} onChange={handleInputChange} required />
              <Input label="Employee Count *" name="employeeCount" type="number" value={formData.employeeCount} onChange={handleInputChange} required />
              <Input label="Annual Turnover (₹) *" name="annualTurnover" value={formData.annualTurnover} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Business Category *</label>
                <select name="businessCategory" value={formData.businessCategory} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" required>
                  <option value="">Select category</option>
                  <option value="construction">Construction</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="engineering">Engineering Services</option>
                  <option value="it-services">IT Services</option>
                  <option value="logistics">Logistics</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input label="Alternate Phone" name="alternatePhone" type="tel" value={formData.alternatePhone} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Specializations & Core Competencies *</label>
              <textarea name="specializations" value={formData.specializations} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" rows={4} placeholder="Describe your key areas of expertise, certifications, and competitive advantages" required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Total Projects Completed *" name="totalProjectsCompleted" type="number" value={formData.totalProjectsCompleted} onChange={handleInputChange} required />
              <Input label="Largest Project Value (₹) *" name="largestProjectValue" value={formData.largestProjectValue} onChange={handleInputChange} required />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Bank Name *" name="bankName" value={formData.bankName} onChange={handleInputChange} required />
              <Input label="Account Number *" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="IFSC Code *" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} required />
              <Input label="Current Working Capital (₹) *" name="currentWorkingCapital" value={formData.currentWorkingCapital} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Existing Loans (₹)" name="existingLoans" value={formData.existingLoans} onChange={handleInputChange} />
              <Input label="Credit Score" name="creditScore" type="number" value={formData.creditScore} onChange={handleInputChange} helperText="If known (optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Client References</label>
              <textarea name="clientReferences" value={formData.clientReferences} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" rows={4} placeholder="Provide 2-3 client references with contact details" />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FileUpload label="PAN Card" docType="panCard" required />
              <FileUpload label="GST Certificate" docType="gstCertificate" required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FileUpload label="Incorporation Certificate" docType="incorporationCertificate" required />
              <FileUpload label="Bank Statements (6 months)" docType="bankStatements" required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FileUpload label="Financial Statements" docType="financialStatements" />
              <div></div>
            </div>
            
            <div className="bg-neutral-medium p-6 rounded-lg mt-8">
              <h3 className="text-xl font-bold text-primary mb-4">Application Summary</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-secondary">Company:</span> <span className="text-primary">{formData.companyName}</span></div>
                <div><span className="text-secondary">GST Number:</span> <span className="text-primary">{formData.gstin}</span></div>
                <div><span className="text-secondary">Annual Revenue:</span> <span className="text-primary">₹{formData.annualTurnover}</span></div>
                <div><span className="text-secondary">Years in Business:</span> <span className="text-primary">{formData.yearsInBusiness}</span></div>
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
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
            FUNDING APPLICATION
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
            Apply for <span className="accent-orange">Project Financing</span>
          </h1>
          <p className="text-lg text-secondary mb-8 leading-relaxed">
            Complete our comprehensive application to access working capital for your project. 
            Our proprietary vetting process ensures fast approval for qualified contractors.
          </p>
        </div>
      </section>

      {/* Progress Indicator */}
      <section className="bg-neutral-dark py-8">
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
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium">
              <h2 className="text-2xl font-bold text-primary mb-8">
                {steps[currentStep - 1]?.title || 'Application Step'}
              </h2>
              
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
                
                {currentStep < 4 ? (
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
      <section className="bg-neutral-dark py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-primary mb-8">What Happens Next?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl accent-orange mb-4">📋</div>
                <h3 className="text-lg font-bold text-primary mb-2">Application Review</h3>
                <p className="text-secondary">Our team reviews your application within 48 hours using our proprietary scoring model.</p>
              </div>
              <div>
                <div className="text-3xl accent-orange mb-4">🤝</div>
                <h3 className="text-lg font-bold text-primary mb-2">Due Diligence</h3>
                <p className="text-secondary">We conduct comprehensive due diligence including client verification and project assessment.</p>
              </div>
              <div>
                <div className="text-3xl accent-orange mb-4">💰</div>
                <h3 className="text-lg font-bold text-primary mb-2">Funding Disbursement</h3>
                <p className="text-secondary">Upon approval, funds are disbursed according to project milestones within 5-7 business days.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back Link */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <Link href="/contractors" className="inline-block">
            <Button variant="outline" size="md">
              ← Back to Contractors Page
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}