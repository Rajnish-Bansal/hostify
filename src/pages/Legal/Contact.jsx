import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production this would hit a /api/contact endpoint
    setSubmitted(true);
  };

  return (
    <div className="legal-page">
      <nav className="legal-navbar">
        <Link to="/" className="legal-logo">Hostify</Link>
        <div className="legal-nav-links">
          <Link to="/about">About</Link>
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/refund-policy">Refund Policy</Link>
        </div>
      </nav>

      <div className="legal-hero">
        <div className="legal-hero-tag">✉️ Support</div>
        <h1>Contact Us</h1>
        <p>We're here to help. Reach out through any of our channels below.</p>
      </div>

      <div className="legal-content">

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-card-icon">📧</div>
            <h3>Email Support</h3>
            <p>For general queries and booking issues<br /><a href="mailto:support@hostify.in">support@hostify.in</a></p>
          </div>
          <div className="contact-card">
            <div className="contact-card-icon">💳</div>
            <h3>Billing & Payments</h3>
            <p>For refunds, invoices, and payment issues<br /><a href="mailto:billing@hostify.in">billing@hostify.in</a></p>
          </div>
          <div className="contact-card">
            <div className="contact-card-icon">🏠</div>
            <h3>Host Support</h3>
            <p>For listing, subscription, and host queries<br /><a href="mailto:hosts@hostify.in">hosts@hostify.in</a></p>
          </div>
          <div className="contact-card">
            <div className="contact-card-icon">📍</div>
            <h3>Registered Address</h3>
            <p>Hostify Technologies Pvt. Ltd.<br />Bangalore, Karnataka — 560001<br />India</p>
          </div>
        </div>

        <div className="contact-form-section">
          <h2>Send us a Message</h2>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Message Received!</h3>
              <p style={{ color: '#64748b' }}>We'll get back to you within 24 hours at {form.email}.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <select
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  required
                >
                  <option value="">Select a topic</option>
                  <option>Booking Issue</option>
                  <option>Payment / Refund</option>
                  <option>Host Subscription</option>
                  <option>Account Access</option>
                  <option>Report a Listing</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  placeholder="Describe your issue in detail..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-contact-submit">Send Message →</button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default Contact;
