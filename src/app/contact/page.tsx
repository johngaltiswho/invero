'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function ContactUs() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Failed to submit contact form. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="public-page min-h-screen">
        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-4xl">
              <div className="public-kicker mb-5">Contact</div>
              <h1 className="font-public-display text-5xl md:text-7xl leading-[0.92] tracking-[-0.04em] text-primary">
                Speak with the
                <span className="block public-accent italic">Finverno team.</span>
              </h1>
              <p className="public-body mt-10 max-w-3xl text-xl leading-9">
                Reach out if you are an SME exploring onboarding, an investor evaluating the current private-access
                note, or a partner who wants to understand the platform more closely.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="public-panel rounded-lg p-8">
                {submitted ? (
                  <div className="py-8 text-center">
                    <div className="mb-4 text-6xl">✓</div>
                    <h2 className="font-public-display text-3xl text-primary mb-4">Thank you.</h2>
                    <p className="public-body mb-6">
                      Your message has been sent successfully. We&apos;ll get back to you shortly.
                    </p>
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          firstName: '',
                          lastName: '',
                          email: '',
                          company: '',
                          subject: '',
                          message: '',
                          consent: false,
                        });
                      }}
                      variant="outline"
                      className="public-button-outline hover:bg-[#c79a36]/10"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-public-display text-3xl text-primary mb-6">Send us a message</h2>

                    {error && (
                      <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-primary">
                            First Name *
                          </label>
                          <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            required
                            placeholder="John"
                            value={formData.firstName}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-primary">
                            Last Name *
                          </label>
                          <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            required
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-primary">
                          Email Address *
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="john.doe@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="company" className="mb-2 block text-sm font-medium text-primary">
                          Company
                        </label>
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          placeholder="Your Company Name"
                          value={formData.company}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="subject" className="mb-2 block text-sm font-medium text-primary">
                          Subject *
                        </label>
                        <select
                          id="subject"
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-white/10 bg-[#151514] px-4 py-3 text-primary outline-none transition focus:border-[#c79a36] focus:ring-2 focus:ring-[#c79a36]/20"
                        >
                          <option value="">Select a subject</option>
                          <option value="general">General Inquiry</option>
                          <option value="investor">Investor Questions</option>
                          <option value="contractor">SME Questions</option>
                          <option value="technical">Technical Support</option>
                          <option value="partnership">Partnership Opportunities</option>
                          <option value="press">Press & Media</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="message" className="mb-2 block text-sm font-medium text-primary">
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          rows={6}
                          required
                          placeholder="Tell us how we can help you..."
                          value={formData.message}
                          onChange={handleInputChange}
                          className="w-full resize-y rounded-lg border border-white/10 bg-[#151514] px-4 py-3 text-primary outline-none transition focus:border-[#c79a36] focus:ring-2 focus:ring-[#c79a36]/20 placeholder:text-[#7f7a71]"
                        />
                      </div>

                      <div className="flex items-start">
                        <input
                          id="consent"
                          name="consent"
                          type="checkbox"
                          required
                          checked={formData.consent}
                          onChange={handleInputChange}
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-[#151514] text-[#c79a36] focus:ring-[#c79a36]"
                        />
                        <label htmlFor="consent" className="ml-3 text-sm public-body">
                          I agree to receive communications from Finverno and understand that I can unsubscribe at any
                          time. View our{' '}
                          <a href="/privacy" className="public-accent hover:underline">
                            Privacy Policy
                          </a>
                          .
                        </label>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        className="public-button w-full hover:bg-[#d7ad58]"
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Send Message'}
                      </Button>
                    </form>
                  </>
                )}
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="font-public-display text-3xl text-primary mb-6">Get in touch</h2>
                  <p className="public-body">
                    Choose the most convenient way to reach us. We can help with SME onboarding, investor access, or
                    platform-related questions.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    ['Email', 'General inquiries', 'contact@finverno.com', 'mailto:contact@finverno.com'],
                    ['Phone', 'Monday - Friday, 9AM - 6PM IST', '+91 9972508604', 'tel:+919972508604'],
                  ].map(([title, subtitle, value, href]) => (
                    <div key={title} className="public-panel-soft rounded-lg p-6">
                      <h3 className="text-lg font-medium text-primary">{title}</h3>
                      <p className="public-body mt-1">{subtitle}</p>
                      <a href={href} className="public-accent mt-3 inline-block hover:underline">
                        {value}
                      </a>
                    </div>
                  ))}

                  <div className="public-panel-soft rounded-lg p-6">
                    <h3 className="text-lg font-medium text-primary">Office</h3>
                    <p className="public-body mt-1">Visit us at our headquarters</p>
                    <address className="public-body mt-3 not-italic leading-8">
                      Finverno Private Limited
                      <br />
                      403, 3rd Floor, 22nd Cross
                      <br />
                      2nd Sector, HSR Layout
                      <br />
                      Bengaluru – 560102, Karnataka
                    </address>
                  </div>
                </div>

                <div className="public-panel rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Registered Company Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <dt className="public-body">Company Name</dt>
                      <dd className="text-primary font-medium">Finverno Private Limited</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <dt className="public-body">Incorporation Date</dt>
                      <dd className="text-primary font-medium">17 December 2025</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <dt className="public-body">CIN</dt>
                      <dd className="text-primary font-medium">U70200KA2025PTC212659</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <dt className="public-body">PAN</dt>
                      <dd className="text-primary font-medium">AAGCF7643D</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <dt className="public-body">GSTIN</dt>
                      <dd className="text-primary font-medium">29AAGCF7643D1ZI</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
