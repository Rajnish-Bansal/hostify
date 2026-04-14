import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const About = () => (
  <div className="legal-page">
    <nav className="legal-navbar">
      <Link to="/" className="legal-logo">Hostify</Link>
      <div className="legal-nav-links">
        <Link to="/contact">Contact</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/refund-policy">Refund Policy</Link>
      </div>
    </nav>

    <div className="legal-hero">
      <div className="legal-hero-tag">🏢 Company</div>
      <h1>About Hostify</h1>
      <p>Connecting India's premium properties with travellers who appreciate quality.</p>
    </div>

    <div className="legal-content">

      <div className="legal-section">
        <h2><span>1</span> Who We Are</h2>
        <p><strong>Hostify Technologies Pvt. Ltd.</strong> is an Indian technology company operating an online marketplace for short-term and boutique property rentals. We connect property owners ("Hosts") with domestic and international travellers ("Guests") looking for unique, high-quality accommodation experiences.</p>
        <p>Incorporated under the Companies Act 2013, Hostify is registered in Bangalore, Karnataka, India.</p>
      </div>

      <div className="legal-section">
        <h2><span>2</span> Our Mission</h2>
        <p>Our mission is to make it seamlessly easy for independent property owners to earn income from their spaces, while giving guests access to beautiful, local, personally hosted stays that hotels simply cannot replicate.</p>
        <p>We believe travel is richer when it's personal — when you stay in a real home, meet its owner, and experience a destination from the inside out.</p>
      </div>

      <div className="legal-section">
        <h2><span>3</span> How Hostify Works</h2>
        <ul>
          <li><strong>For Hosts:</strong> List your property with photos, pricing, and availability. Activate a monthly subscription to go live. Accept booking requests from verified guests. Receive payouts directly to your bank account.</li>
          <li><strong>For Guests:</strong> Search thousands of unique properties across India. Book instantly or send a request to the Host. Pay securely through our platform. Check in, enjoy your stay, and leave a review.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>4</span> Business Model</h2>
        <p>Hostify operates on a flat-fee subscription model for Hosts, combined with a transparent commission on bookings. This means Hosts know exactly what they're paying, with no hidden charges.</p>
        <ul>
          <li><strong>Monthly Listing Subscription:</strong> ₹499/month per property — keeps the property active and visible on the platform.</li>
          <li><strong>Platform Commission:</strong> 10% on each confirmed booking — charged to the host, deducted at payout.</li>
          <li><strong>Guest Service Fee:</strong> A small service fee is added to the booking total, visible before checkout.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>5</span> Legal & Compliance</h2>
        <p><strong>Company Name:</strong> Hostify Technologies Pvt. Ltd.<br />
        <strong>Registered Address:</strong> Bangalore, Karnataka, India — 560001<br />
        <strong>CIN:</strong> U74999KA2024PTC000001<br />
        <strong>GST Number:</strong> 29AABCH1234A1Z5<br />
        <strong>Customer Support Email:</strong> support@hostify.in<br />
        <strong>Support Phone:</strong> +91 80 4567 8900 (Mon–Fri, 9AM–6PM IST)</p>
      </div>

      <div className="legal-section">
        <h2><span>6</span> Contact</h2>
        <p>For business inquiries, media relations, or partnership opportunities:</p>
        <p><strong>Email:</strong> hello@hostify.in<br />
        <strong>Press:</strong> press@hostify.in</p>
        <p style={{ marginTop: '16px' }}><Link to="/contact" style={{ color: '#db2777', fontWeight: 600 }}>→ Go to Support Contact Form</Link></p>
      </div>

      <p className="legal-updated">Hostify Technologies Pvt. Ltd. &nbsp;·&nbsp; Bangalore, India &nbsp;·&nbsp; 2024–2026</p>
    </div>
  </div>
);

export default About;
