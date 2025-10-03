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
    consent: false
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
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
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Contact Us</h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Get in touch with our team. We're here to help you with any questions about our financial intelligence platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-neutral-dark rounded-lg p-8 border border-neutral-medium">
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-semibold text-primary mb-4">Thank You!</h2>
                <p className="text-secondary mb-6">
                  Your message has been sent successfully. We'll get back to you within 24 hours.
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
                      consent: false
                    });
                  }}
                  variant="outline"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-primary mb-6">Send us a Message</h2>
                
                {error && (
                  <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-error text-sm">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-primary mb-2">
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
                  <label htmlFor="lastName" className="block text-sm font-medium text-primary mb-2">
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
                <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
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
                <label htmlFor="company" className="block text-sm font-medium text-primary mb-2">
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
                <label htmlFor="subject" className="block text-sm font-medium text-primary mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors duration-200 bg-neutral-dark text-primary"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="investor">Investor Questions</option>
                  <option value="contractor">Contractor Questions</option>
                  <option value="technical">Technical Support</option>
                  <option value="partnership">Partnership Opportunities</option>
                  <option value="press">Press & Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-primary mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  placeholder="Tell us how we can help you..."
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors duration-200 bg-neutral-dark text-primary placeholder-text-secondary resize-vertical"
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
                  className="mt-1 h-4 w-4 text-accent-orange focus:ring-accent-orange border-neutral-medium rounded"
                />
                <label htmlFor="consent" className="ml-3 text-sm text-secondary">
                  I agree to receive communications from Finverno and understand that I can unsubscribe at any time. 
                  View our <a href="/privacy" className="text-accent-orange hover:underline">Privacy Policy</a>.
                </label>
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
                </form>
              </>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-primary mb-6">Get in Touch</h2>
              <p className="text-secondary mb-8">
                We'd love to hear from you. Choose the most convenient way to reach us, and we'll get back to you as soon as possible.
              </p>
            </div>

            {/* Contact Methods */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-accent-orange rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-primary">Email</h3>
                  <p className="text-secondary">General inquiries</p>
                  <a href="mailto:contact@finverno.com" className="text-accent-orange hover:underline">
                    contact@finverno.com
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-accent-orange rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-primary">Phone</h3>
                  <p className="text-secondary">Monday - Friday, 9AM - 6PM EST</p>
                  <a href="tel:+1-555-0123" className="text-accent-orange hover:underline">
                    +1 (555) 012-3456
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-accent-orange rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-primary">Office</h3>
                  <p className="text-secondary">Visit us at our headquarters</p>
                  <address className="text-secondary not-italic">
                    Finverno Financial Intelligence<br />
                    123 Business Ave, Suite 100<br />
                    City, State 12345
                  </address>
                </div>
              </div>
            </div>

            {/* Support Hours */}
            <div className="bg-neutral-dark rounded-lg p-6 border border-neutral-medium">
              <h3 className="text-lg font-semibold text-primary mb-4">Support Hours</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Monday - Friday</span>
                  <span className="text-primary">9:00 AM - 6:00 PM EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Saturday</span>
                  <span className="text-primary">10:00 AM - 4:00 PM EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Sunday</span>
                  <span className="text-primary">Closed</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-error/10 border border-error/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-error mb-2">Emergency Support</h3>
              <p className="text-error/90 text-sm mb-2">
                For critical system issues affecting active investments:
              </p>
              <a href="tel:+1-555-0199" className="text-error font-medium hover:underline">
                +1 (555) 012-3499
              </a>
              <p className="text-error/80 text-xs mt-1">Available 24/7 for emergency situations only</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}