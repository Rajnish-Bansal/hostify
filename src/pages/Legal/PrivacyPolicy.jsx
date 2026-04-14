import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const PrivacyPolicy = () => (
  <div className="legal-page">
    <nav className="legal-navbar">
      <Link to="/" className="legal-logo">Hostify</Link>
      <div className="legal-nav-links">
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/refund-policy">Refund Policy</Link>
      </div>
    </nav>

    <div className="legal-hero">
      <div className="legal-hero-tag">🔒 Legal</div>
      <h1>Privacy Policy</h1>
      <p>How we collect, use, and protect your personal information.</p>
    </div>

    <div className="legal-content">

      <div className="legal-section">
        <h2><span>1</span> Information We Collect</h2>
        <p>When you use Hostify, we collect information to provide and improve our services. This includes:</p>
        <ul>
          <li><strong>Account Information:</strong> Name, email address, phone number, and profile photo when you register.</li>
          <li><strong>Payment Information:</strong> Billing address and payment method details. We do not store full card numbers — all payment processing is handled by our certified payment partners.</li>
          <li><strong>Listing Information:</strong> Property details, photos, pricing, and availability that hosts provide.</li>
          <li><strong>Usage Data:</strong> Pages visited, search queries, booking history, and interaction logs to improve our platform.</li>
          <li><strong>Device Information:</strong> IP address, browser type, and operating system for security and analytics.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>2</span> How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Operate and maintain the Hostify platform and facilitate bookings between hosts and guests.</li>
          <li>Process payments and send transaction receipts and tax invoices.</li>
          <li>Send you service notifications, booking confirmations, and important account updates.</li>
          <li>Verify your identity for host onboarding and to prevent fraud.</li>
          <li>Improve our platform through analytics and user research.</li>
          <li>Comply with legal obligations including tax reporting requirements.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>3</span> How We Share Your Information</h2>
        <p>We do not sell your personal data. We share information only in these limited circumstances:</p>
        <ul>
          <li><strong>Between Hosts and Guests:</strong> Basic profile information is shared to facilitate confirmed bookings.</li>
          <li><strong>Payment Processors:</strong> Payment data is shared with our certified PCI-DSS compliant payment gateway partners (Razorpay / Stripe).</li>
          <li><strong>Legal Requirements:</strong> We may disclose information when required by law, court order, or government authority.</li>
          <li><strong>Service Providers:</strong> We engage trusted third-party vendors for hosting, analytics, and customer support who are bound by confidentiality agreements.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>4</span> Data Retention</h2>
        <p>We retain your personal data for as long as your account is active or as needed to provide our services. You may request deletion of your account at any time by contacting <strong>support@hostify.in</strong>. Some data may be retained for up to 7 years for GST/tax compliance as required by Indian law.</p>
      </div>

      <div className="legal-section">
        <h2><span>5</span> Cookies</h2>
        <p>We use cookies and similar tracking technologies to store your session, remember preferences, and analyze site usage. You can control cookies through your browser settings. Disabling cookies may affect certain functionality of the platform.</p>
      </div>

      <div className="legal-section">
        <h2><span>6</span> Your Rights</h2>
        <p>Under applicable data protection laws, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your personal data (right to erasure).</li>
          <li>Object to our processing of your data.</li>
          <li>Withdraw consent at any time where we rely on consent to process data.</li>
        </ul>
        <p>To exercise any of these rights, contact us at <strong>privacy@hostify.in</strong>.</p>
      </div>

      <div className="legal-section">
        <h2><span>7</span> Contact</h2>
        <p>If you have questions about this Privacy Policy, contact our Data Protection team at:</p>
        <p><strong>Email:</strong> privacy@hostify.in<br />
        <strong>Address:</strong> Hostify Technologies Pvt. Ltd., Bangalore, Karnataka, India — 560001</p>
      </div>

      <p className="legal-updated">Last updated: April 2026 &nbsp;·&nbsp; <Link to="/terms" style={{ color: '#db2777' }}>View Terms of Service</Link></p>
    </div>
  </div>
);

export default PrivacyPolicy;
