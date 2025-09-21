import React from 'react';
import { Layout } from '@/components/Layout';

export default function TermsOfService() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-primary mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none text-secondary">
          <p className="text-lg mb-6">
            <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Finverno's financial intelligence platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">2. Description of Service</h2>
            <p className="mb-4">
              Finverno provides a project supply enablement platform that connects institutional partners with contractors and provides supply chain analytics, project management, and execution tools. The Service includes but is not limited to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Partnership opportunity matching</li>
              <li>Contractor verification and management</li>
              <li>Supply chain analytics and reporting</li>
              <li>Project tracking and management tools</li>
              <li>Document management and storage</li>
              <li>Communication and collaboration features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">3. User Accounts</h2>
            <p className="mb-4">
              To access certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security and confidentiality of your login credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">4. User Conduct</h2>
            <p className="mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Transmit any harmful, offensive, or inappropriate content</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service for any fraudulent or illegal purposes</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or harvest personal information from other users</li>
              <li>Use automated scripts or bots to access the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">5. Platform Services Disclaimer</h2>
            <p className="mb-4">
              <strong>Important:</strong> Finverno is a technology platform that facilitates supply chain enablement between institutional partners and contractors. We do not provide financial services, lending, or credit facilities. We enable project supply arrangements backed by verified work orders.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Past project performance does not guarantee future execution</li>
              <li>All project partnerships carry execution risks</li>
              <li>Users should consult with qualified professionals before making partnership decisions</li>
              <li>Finverno does not guarantee the accuracy of project data or projections</li>
              <li>Users are responsible for their own due diligence on contractors and projects</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">6. Intellectual Property</h2>
            <p className="mb-4">
              The Service and its original content, features, and functionality are and will remain the exclusive property of Finverno and its licensors. The Service is protected by copyright, trademark, and other laws. You may not copy, modify, distribute, sell, or lease any part of our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">7. Privacy</h2>
            <p className="mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">8. Fees and Payment</h2>
            <p className="mb-4">
              Certain features of the Service may require payment of fees. You agree to pay all applicable fees as described on the Service. All fees are non-refundable unless otherwise stated. We reserve the right to change our fees at any time with reasonable notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">9. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">10. Disclaimer of Warranties</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. INVERO MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">11. Limitation of Liability</h2>
            <p className="mb-4">
              IN NO EVENT SHALL INVERO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">12. Governing Law</h2>
            <p className="mb-4">
              These Terms shall be interpreted and enforced in accordance with the laws of the State of Delaware, without regard to conflict of law provisions. Any disputes shall be resolved in the courts of Delaware.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">13. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Effective Date." Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">14. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mb-2">Email: <a href="mailto:legal@finverno.com" className="text-accent-orange hover:underline">legal@finverno.com</a></p>
            <p className="mb-2">Phone: <a href="tel:+1-555-0123" className="text-accent-orange hover:underline">+1 (555) 012-3456</a></p>
            <p className="mb-2">Address: Finverno Financial Intelligence, 123 Business Ave, Suite 100, City, State 12345</p>
          </section>
        </div>
      </div>
    </Layout>
  );
}