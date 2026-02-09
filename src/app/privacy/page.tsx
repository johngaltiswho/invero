import React from 'react';
import { Layout } from '@/components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-primary mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none text-secondary">
          <p className="text-lg mb-6">
            <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Finverno ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">2. Information We Collect</h2>
            <p className="mb-4">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Identity Data:</strong> includes first name, maiden name, last name, username or similar identifier, marital status, title, date of birth and gender.</li>
              <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
              <li><strong>Financial Data:</strong> includes bank account and payment card details.</li>
              <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
              <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
              <li><strong>Profile Data:</strong> includes your username and password, purchases or orders made by you, your interests, preferences, feedback and survey responses.</li>
              <li><strong>Usage Data:</strong> includes information about how you use our website, products and services.</li>
              <li><strong>Marketing and Communications Data:</strong> includes your preferences in receiving marketing from us and our third parties and your communication preferences.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>To register you as a new customer</li>
              <li>To process and deliver your order including managing payments, fees and charges, and to collect and recover money owed to us</li>
              <li>To manage our relationship with you which will include notifying you about changes to our terms or privacy policy</li>
              <li>To enable you to partake in a prize draw, competition or complete a survey</li>
              <li>To administer and protect our business and this website (including troubleshooting, data analysis, testing, system maintenance, support, reporting and hosting of data)</li>
              <li>To deliver relevant website content and advertisements to you and measure or understand the effectiveness of the advertising we serve to you</li>
              <li>To use data analytics to improve our website, products/services, marketing, customer relationships and experiences</li>
              <li>To make suggestions and recommendations to you about goods or services that may be of interest to you</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">4. Data Security</h2>
            <p className="mb-4">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">5. Data Retention</h2>
            <p className="mb-4">
              We will only retain your personal data for as long as reasonably necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">6. Your Legal Rights</h2>
            <p className="mb-4">Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Request access to your personal data</li>
              <li>Request correction of your personal data</li>
              <li>Request erasure of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request restriction of processing your personal data</li>
              <li>Request transfer of your personal data</li>
              <li>Right to withdraw consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">7. Third-Party Links</h2>
            <p className="mb-4">
              This website may include links to third-party websites, plug-ins and applications. Clicking on those links or enabling those connections may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">8. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this privacy policy or our privacy practices, please contact us at:
            </p>
            <p className="mb-2">
              Email:{' '}
              <a href="mailto:privacy@finverno.com" className="text-accent-orange hover:underline">
                privacy@finverno.com
              </a>
            </p>
            <p className="mb-2">
              Phone:{' '}
              <a href="tel:+91-9972508604" className="text-accent-orange hover:underline">
                +91 99725 08604
              </a>
            </p>
            <p className="mb-2">
              Address: Finverno Private Limited, 403, 3rd Floor, 22nd Cross, 2nd Sector, HSR Layout, Bengaluru – 560102,
              Karnataka, India
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">9. Changes to This Privacy Policy</h2>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top of this Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
