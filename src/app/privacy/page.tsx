import React from 'react';
import { Layout } from '@/components/Layout';

const EFFECTIVE_DATE = 'March 28, 2026';
const DATA_REQUEST_EMAIL = 'privacy@finverno.com';
const DATA_REQUEST_PHONE = '+91 99725 08604';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-primary mb-4">Privacy Policy / Data Notice</h1>
          <p className="text-lg text-secondary max-w-3xl">
            This notice explains how Finverno Private Limited collects, uses, stores, shares, retains, and protects
            business information and digital personal data across the Finverno platform, including SME onboarding,
            procurement workflows, financing review, investor operations, support, and compliance processes.
          </p>
          <p className="text-sm text-secondary mt-4">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </p>
        </div>

        <div className="space-y-10 text-secondary">
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">1. Scope</h2>
            <p className="mb-4">
              This Privacy Policy / Data Notice applies to visitors to the Finverno website, SME applicants and users,
              investors, vendors, fuel partners, service providers, and other individuals who interact with Finverno
              through our website, portals, documents, communications, workflows, or financing processes.
            </p>
            <p>
              Finverno may act as a business operator collecting information directly from you, and in some cases may
              also receive data from SMEs, investors, counterparties, or service providers in connection with platform
              operations, onboarding, procurement, financing, dispute handling, collections, compliance, and support.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">2. Information We Collect</h2>
            <p className="mb-4">Depending on your relationship with Finverno, we may collect the following categories of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identity and contact data:</strong> name, email address, phone number, designation, organization, address, signatory details, and login identifiers.</li>
              <li><strong>KYC and company records:</strong> PAN, GSTIN, registration documents, cancelled cheques, bank letters, incorporation records, authorization records, and related compliance documents.</li>
              <li><strong>Project and procurement data:</strong> BOQs, drawings, schedules, invoices, purchase requests, delivery records, vendor information, work orders, client references, and supporting project records.</li>
              <li><strong>Financing and payment data:</strong> financing applications, payment submissions, bank details, repayment records, escrow or controlled-collection information, and transaction history.</li>
              <li><strong>Usage and technical data:</strong> IP address, browser/device metadata, access logs, timestamps, workflow actions, error logs, and related security records.</li>
              <li><strong>Communications data:</strong> support tickets, emails, notices, acknowledgements, chats, call notes, and dispute correspondence.</li>
              <li><strong>Professional and relationship data:</strong> client names, vendor contacts, employee/representative details, role-based access records, and contractual relationship metadata.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">3. Sources of Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Directly from you when you submit forms, create accounts, upload documents, complete workflows, or contact us.</li>
              <li>From SMEs, investors, vendors, and counterparties who share records in connection with projects, procurement, financing, and platform operations.</li>
              <li>From service providers engaged for identity verification, storage, document management, communications, analytics, hosting, or support.</li>
              <li>Automatically through website and platform usage, security logging, and infrastructure monitoring.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">4. How We Use Information</h2>
            <p className="mb-4">We may use information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>account creation, authentication, and access control</li>
              <li>SME onboarding, KYC, compliance review, and due diligence</li>
              <li>procurement operations, document handling, vendor coordination, delivery tracking, and project workflows</li>
              <li>commercial review, financing evaluation, collections support, escrow-linked repayment workflows, and fraud prevention</li>
              <li>investor onboarding, agreement execution, payment processing, statements, and regulatory reporting</li>
              <li>customer support, dispute resolution, audit support, legal enforcement, and incident response</li>
              <li>system administration, monitoring, analytics, service improvement, and security</li>
              <li>meeting contractual, regulatory, tax, audit, legal, and evidentiary obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">5. Data Usage Authorization and Responsibilities</h2>
            <p className="mb-4">
              Where SMEs, investors, vendors, or other business users submit records that include employee,
              signatory, representative, or counterparty information, Finverno relies on the submitting party to
              ensure that such information is shared lawfully and with any required notices or authorizations.
            </p>
            <p>
              Finverno may process business records and related digital personal data for legitimate platform,
              contractual, compliance, audit, fraud-prevention, support, and legal-enforcement purposes. Finverno may
              also retain electronic audit trails, uploaded documents, workflow logs, acknowledgements, and execution
              records as evidence of platform activity and contractual performance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">6. Sharing and Processor Categories</h2>
            <p className="mb-4">We do not sell personal data. We may share information only where reasonably necessary with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Cloud and infrastructure providers</strong> for hosting, storage, compute, backup, and security operations.</li>
              <li><strong>Communications providers</strong> for email, OTP, and transactional messaging.</li>
              <li><strong>Document, workflow, and analytics providers</strong> used to run the platform, generate files, process forms, and monitor usage.</li>
              <li><strong>Professional advisers</strong> such as lawyers, auditors, accountants, and consultants subject to confidentiality obligations.</li>
              <li><strong>Regulators, courts, law enforcement, or government authorities</strong> where required by law, order, regulation, or legal process.</li>
              <li><strong>Counterparties and transactional participants</strong> where needed to process procurement, financing, payment, escrow, dispute, or recovery workflows.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">7. Retention Logic</h2>
            <p className="mb-4">
              Finverno retains information for as long as reasonably necessary for the purpose for which it was
              collected, and longer where required for legal, regulatory, tax, accounting, audit, dispute, fraud, or
              evidentiary reasons. Our working retention logic is as follows:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>SME onboarding, KYC, and agreement records:</strong> during the relationship and typically for up to 8 years after termination, rejection, expiry, or closure, unless a longer period is required by law or dispute.</li>
              <li><strong>Procurement, project, invoice, payment, financing, and audit records:</strong> typically for up to 8 years after transaction closure or relationship end, and longer where recovery, dispute, or legal process is ongoing.</li>
              <li><strong>Investor onboarding, payment, and agreement records:</strong> typically for up to 8 years after the relationship or applicable regulatory reporting period ends.</li>
              <li><strong>Support tickets and operational correspondence:</strong> typically for up to 3 years after closure unless needed for dispute, audit, or legal reasons.</li>
              <li><strong>Security logs, access records, and technical monitoring data:</strong> typically for 12 months, and longer where required for incident investigation, fraud review, or legal compliance.</li>
              <li><strong>Marketing preferences and contact opt-in records:</strong> until consent is withdrawn or no longer required, plus a reasonable suppression/logging period.</li>
            </ul>
            <p className="mt-4">
              We may anonymize or aggregate information instead of deleting it where appropriate for analytics,
              product improvement, risk analysis, or historical reporting.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">8. Internal Vendor / Processor Controls</h2>
            <p className="mb-4">Finverno applies internal controls to reduce privacy, confidentiality, and security risk when using vendors and processors. These controls may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>role-based access and least-privilege permissions</li>
              <li>need-to-know sharing and access logging</li>
              <li>contractual confidentiality and data-processing restrictions</li>
              <li>vendor onboarding review and periodic reassessment for critical providers</li>
              <li>segregated environments, encryption in transit/at rest where supported, and backup controls</li>
              <li>incident escalation, credential rotation, and access revocation on role change or separation</li>
              <li>documented retention and deletion workflows where operationally feasible</li>
            </ul>
            <p className="mt-4">
              No system is completely risk-free, but Finverno aims to apply reasonable administrative, technical, and
              organizational safeguards proportionate to the nature of the information we process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">9. Your Rights and Data Requests</h2>
            <p className="mb-4">
              Subject to applicable law, you may request access, correction, updating, deletion, or clarification in
              relation to digital personal data held by Finverno. You may also request details of processing, raise a
              concern, or withdraw consent where consent is the basis for processing.
            </p>
            <p className="mb-4">
              Finverno may need to verify identity, authority, or relationship status before acting on a request.
              We may retain information where required for legal obligations, security, fraud prevention, dispute
              handling, audit, or contractual recordkeeping.
            </p>
            <p>
              To submit a privacy or data request, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">10. Contact for Privacy and Data Requests</h2>
            <p className="mb-4">For privacy questions, data requests, correction requests, or complaints, please contact:</p>
            <p className="mb-2">
              Email:{' '}
              <a href={`mailto:${DATA_REQUEST_EMAIL}`} className="text-accent-orange hover:underline">
                {DATA_REQUEST_EMAIL}
              </a>
            </p>
            <p className="mb-2">
              Phone:{' '}
              <a href={`tel:${DATA_REQUEST_PHONE.replace(/\s+/g, '')}`} className="text-accent-orange hover:underline">
                {DATA_REQUEST_PHONE}
              </a>
            </p>
            <p className="mb-2">
              Address: Finverno Private Limited, 403, 3rd Floor, 22nd Cross Road, 2nd Sector, HSR Layout, Bengaluru - 560102, Karnataka, India
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">11. Changes to This Notice</h2>
            <p>
              Finverno may update this Privacy Policy / Data Notice from time to time to reflect operational,
              contractual, product, legal, or regulatory changes. The latest version will be posted on this page with
              an updated effective date.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
