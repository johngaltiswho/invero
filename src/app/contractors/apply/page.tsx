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
  
  // Project Details
  projectTitle: string;
  clientName: string;
  clientType: string;
  projectValue: string;
  fundingRequired: string;
  projectDuration: string;
  contractDate: string;
  projectDescription: string;
  paymentTerms: string;
  milestones: string;
  
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
    projectContract: File | null;
    financialStatements: File | null;
    clientPO: File | null;
  };
}

const steps = [
  { id: 1, title: 'Company Information', description: 'Basic company details and registration' },
  { id: 2, title: 'Business Profile', description: 'Business operations and capabilities' },
  { id: 3, title: 'Financial Information', description: 'Banking and financial details' },
  { id: 4, title: 'Project Details', description: 'Specific project information' },
  { id: 5, title: 'Documents & Review', description: 'Upload documents and review application' }
];

export default function ContractorApplyPage(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    companyName: '', registrationNumber: '', gstin: '', incorporationDate: '', companyType: '', businessAddress: '',
    contactPerson: '', designation: '', email: '', phone: '', alternatePhone: '',
    yearsInBusiness: '', employeeCount: '', annualTurnover: '', businessCategory: '', specializations: '',
    bankName: '', accountNumber: '', ifscCode: '', currentWorkingCapital: '', existingLoans: '', creditScore: '',
    projectTitle: '', clientName: '', clientType: '', projectValue: '', fundingRequired: '', projectDuration: '', 
    contractDate: '', projectDescription: '', paymentTerms: '', milestones: '',
    totalProjectsCompleted: '', largestProjectValue: '', clientReferences: '',
    documents: {
      panCard: null, gstCertificate: null, incorporationCertificate: null, bankStatements: null,
      projectContract: null, financialStatements: null, clientPO: null
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

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
              <Input label="Project Title *" name="projectTitle" value={formData.projectTitle} onChange={handleInputChange} required />
              <Input label="Client Name *" name="clientName" value={formData.clientName} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Client Type *</label>
                <select name="clientType" value={formData.clientType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" required>
                  <option value="">Select client type</option>
                  <option value="mnc">MNC</option>
                  <option value="large-enterprise">Large Enterprise</option>
                  <option value="government">Government</option>
                  <option value="psu">PSU</option>
                  <option value="sme">SME</option>
                </select>
              </div>
              <Input label="Project Value (₹) *" name="projectValue" value={formData.projectValue} onChange={handleInputChange} required />
              <Input label="Funding Required (₹) *" name="fundingRequired" value={formData.fundingRequired} onChange={handleInputChange} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Project Duration (months) *" name="projectDuration" type="number" value={formData.projectDuration} onChange={handleInputChange} required />
              <Input label="Contract Date *" name="contractDate" type="date" value={formData.contractDate} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Project Description *</label>
              <textarea name="projectDescription" value={formData.projectDescription} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" rows={4} required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Payment Terms *</label>
                <textarea name="paymentTerms" value={formData.paymentTerms} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" rows={3} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Project Milestones *</label>
                <textarea name="milestones" value={formData.milestones} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange border-neutral-medium" rows={3} required />
              </div>
            </div>
          </div>
        );

      case 5:
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
              <FileUpload label="Project Contract/Agreement" docType="projectContract" required />
              <FileUpload label="Financial Statements" docType="financialStatements" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FileUpload label="Client Purchase Order" docType="clientPO" required />
              <div></div>
            </div>
            
            <div className="bg-neutral-medium p-6 rounded-lg mt-8">
              <h3 className="text-xl font-bold text-primary mb-4">Application Summary</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-secondary">Company:</span> <span className="text-primary">{formData.companyName}</span></div>
                <div><span className="text-secondary">Project Value:</span> <span className="text-primary">₹{formData.projectValue}</span></div>
                <div><span className="text-secondary">Funding Required:</span> <span className="text-primary">₹{formData.fundingRequired}</span></div>
                <div><span className="text-secondary">Client:</span> <span className="text-primary">{formData.clientName}</span></div>
              </div>
            </div>
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
                
                {currentStep < 5 ? (
                  <Button variant="primary" onClick={nextStep}>
                    Next Step
                  </Button>
                ) : (
                  <Button variant="primary" type="submit">
                    Submit Application
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