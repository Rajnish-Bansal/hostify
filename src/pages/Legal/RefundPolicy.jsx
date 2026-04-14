import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const RefundPolicy = () => (
  <div className="legal-page">
    <nav className="legal-navbar">
      <Link to="/" className="legal-logo">Hostify</Link>
      <div className="legal-nav-links">
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </div>
    </nav>

    <div className="legal-hero">
      <div className="legal-hero-tag">💳 Policy</div>
      <h1>Refund & Cancellation Policy</h1>
      <p>Clear, fair policies for guests and hosts regarding cancellations and refunds.</p>
    </div>

    <div className="legal-content">

      <div className="legal-section">
        <h2><span>1</span> Guest Cancellation Policy</h2>
        <p>Refunds for guests depend on how far in advance the cancellation is made and the Host's chosen cancellation policy. Hostify offers three standard cancellation tiers:</p>
        <ul>
          <li><strong>Flexible:</strong> Full refund if cancelled at least 24 hours before check-in. No refund for cancellations made less than 24 hours before check-in.</li>
          <li><strong>Moderate:</strong> Full refund if cancelled at least 5 days before check-in. 50% refund if cancelled 1–5 days before check-in. No refund for cancellations on the day of check-in.</li>
          <li><strong>Strict:</strong> No refund for cancellations made within 7 days of check-in. 50% refund for cancellations made more than 7 days before check-in.</li>
        </ul>
        <p>The applicable policy for any booking is displayed on the listing page before you confirm your reservation.</p>
      </div>

      <div className="legal-section">
        <h2><span>2</span> Host Subscription Refund Policy</h2>
        <p>Monthly listing subscription fees paid by Hosts are <strong>non-refundable</strong> once the subscription period has been activated. This is because the property is immediately made live and visible to guests upon activation.</p>
        <p>If a Host cancels within <strong>24 hours of subscribing</strong> and no guest bookings have been received, we will issue a full credit to the Host's Hostify Wallet, usable for future subscription renewals.</p>
      </div>

      <div className="legal-section">
        <h2><span>3</span> Service Fee Refund</h2>
        <p>Hostify's platform service fee (commission) is refunded to guests only if the booking is cancelled under a policy that qualifies for a full refund and the cancellation is made within the eligible timeframe. Service fees are <strong>not refunded</strong> for partial refund cancellations.</p>
      </div>

      <div className="legal-section">
        <h2><span>4</span> Extenuating Circumstances</h2>
        <p>In exceptional cases — such as natural disasters, government travel restrictions, or serious illness — Hostify may override the standard cancellation policy on a case-by-case basis. Supporting documentation may be required. Extenuating circumstances requests must be submitted within 14 days of the impacted travel date.</p>
      </div>

      <div className="legal-section">
        <h2><span>5</span> How Refunds Are Processed</h2>
        <p>Approved refunds are returned to the <strong>original payment method</strong> used at the time of booking. Processing times depend on your bank or payment provider:</p>
        <ul>
          <li><strong>Credit/Debit Cards:</strong> 5–10 business days</li>
          <li><strong>UPI:</strong> 1–3 business days</li>
          <li><strong>Net Banking:</strong> 3–7 business days</li>
          <li><strong>Hostify Wallet Credit:</strong> Instant</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>6</span> How to Request a Refund</h2>
        <p>To request a refund or raise a cancellation dispute:</p>
        <ul>
          <li>Log into your Hostify account and navigate to <strong>Bookings → View Details → Cancel Booking</strong>.</li>
          <li>Alternatively, contact our support team at <strong>support@hostify.in</strong> with your booking reference number.</li>
          <li>Refund requests must be submitted within <strong>30 days</strong> of the checkout date.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2><span>7</span> Disputes</h2>
        <p>If you believe a refund has been unfairly denied, you may escalate the dispute to our Resolution Centre by contacting <strong>disputes@hostify.in</strong>. Hostify's decision in refund disputes is final and binding as per our Terms of Service.</p>
      </div>

      <p className="legal-updated">Last updated: April 2026 &nbsp;·&nbsp; <Link to="/contact" style={{ color: '#db2777' }}>Contact Support</Link></p>
    </div>
  </div>
);

export default RefundPolicy;
