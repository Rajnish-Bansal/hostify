import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const Terms = () => (
  <div className="legal-page">
    <nav className="legal-navbar">
      <Link to="/" className="legal-logo">Hostify</Link>
      <div className="legal-nav-links">
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/refund-policy">Refund Policy</Link>
      </div>
    </nav>

    <div className="legal-hero">
      <div className="legal-hero-tag">📋 Legal</div>
      <h1>Terms & Conditions</h1>
      <p>Please read these terms carefully before using our platform.</p>
    </div>

    <div className="legal-content">

      <div className="legal-section">
        <h2><span>1</span> Acceptance of Terms</h2>
        <p>By accessing or using Hostify ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our platform. These terms apply to all visitors, users, hosts, and guests who access or use the Platform.</p>
      </div>

      <div className="legal-section">
        <h2><span>2</span> Description of Service</h2>
        <p>Hostify is an online marketplace that connects property owners ("Hosts") with travellers seeking accommodation ("Guests"). Hostify does not own, manage, or control any properties listed on the platform. We provide technology infrastructure to facilitate connections and transactions between Hosts and Guests.</p>
      </div>

      <div className="legal-section">
        <h2><span>3</span> User Accounts</h2>
        <ul>
          <li>You must be at least 18 years of age to create an account.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You agree to provide accurate, current, and complete information during registration.</li>
          <li>Hostify reserves the right to suspend or terminate accounts that violate these terms.</li>
          <li>One person may not maintain more than one active account.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>4</span> Host Responsibilities</h2>
        <p>Hosts who list properties on Hostify agree to:</p>
        <ul>
          <li>Provide accurate and complete information about their property, including photos, amenities, and house rules.</li>
          <li>Maintain their property in a safe, clean, and habitable condition.</li>
          <li>Honour confirmed bookings unless extenuating circumstances apply.</li>
          <li>Comply with all applicable local laws, including rental licensing, zoning, and tax regulations.</li>
          <li>Pay the required monthly listing subscription fee to keep their property active and visible on the platform.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>5</span> Guest Responsibilities</h2>
        <ul>
          <li>Guests must respect the Host's property and adhere to house rules.</li>
          <li>Guests are liable for any damages caused to the property during their stay.</li>
          <li>Guests must not use the property for any illegal activity.</li>
          <li>The number of guests must not exceed the maximum capacity stated in the listing.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>6</span> Payments & Fees</h2>
        <p>All payments are processed securely through our certified payment partners. Hostify charges a <strong>10% platform commission</strong> on bookings. Hosts on a monthly subscription plan enjoy reduced commission rates as per their plan details. By making a payment, you authorize us to charge the stated amount through your selected payment method.</p>
      </div>

      <div className="legal-section">
        <h2><span>7</span> Prohibited Activities</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Circumvent the platform by contacting the other party directly to avoid platform fees.</li>
          <li>Post false, misleading, or fraudulent listings.</li>
          <li>Harass, threaten, or discriminate against other users.</li>
          <li>Use automated scripts, bots, or crawlers to access the Platform.</li>
          <li>Attempt to gain unauthorized access to our systems or another user's account.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>8</span> Limitation of Liability</h2>
        <p>Hostify acts as a neutral marketplace and is not responsible for the acts or omissions of Hosts or Guests. To the maximum extent permitted by law, Hostify shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use the Platform.</p>
      </div>

      <div className="legal-section">
        <h2><span>9</span> Governing Law</h2>
        <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Bangalore, Karnataka, India.</p>
      </div>

      <div className="legal-section">
        <h2><span>10</span> Changes to Terms</h2>
        <p>Hostify reserves the right to update these Terms at any time. We will notify users of material changes via email or a prominent notice on the Platform. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>
      </div>

      <p className="legal-updated">Last updated: April 2026 &nbsp;·&nbsp; <Link to="/contact" style={{ color: '#db2777' }}>Contact Support</Link></p>
    </div>
  </div>
);

export default Terms;
