import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-inner">
      <div className="footer-top">

        {/* Brand */}
        <div className="footer-brand">
          <Link to="/" className="footer-logo">🏠 Hostify</Link>
          <p className="footer-tagline">Premium boutique stays, curated for every traveller across India.</p>
          <p className="footer-company">
            Hostify Technologies Pvt. Ltd.<br />
            Bangalore, Karnataka — 560001<br />
            CIN: U74999KA2024PTC000001
          </p>

        </div>

        {/* Links */}
        <div className="footer-links-group">
          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/contact">Contact Us</Link>
            <Link to="/refund-policy">Refund Policy</Link>
            <a href="mailto:support@hostify.in">support@hostify.in</a>
            <a href="tel:+918045678900">+91 80 4567 8900</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/become-a-host">Become a Host</Link>
            <Link to="/">Browse Stays</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/refund-policy">Cancellation Policy</Link>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} <span>Hostify</span> Technologies Pvt. Ltd. · All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/refund-policy">Refunds</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/about">About</Link>
        </div>
      </div>

    </div>
  </footer>
);

export default Footer;
