import React, { useRef } from 'react';
import { X, Printer, Download, DownloadCloud, CheckCircle, MapPin, Calendar, Users, Building, FileText } from 'lucide-react';
import './InvoiceModal.css';

const InvoiceModal = ({ isOpen, onClose, booking }) => {
  const invoiceRef = useRef();

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  // Extract numeric price from string "₹18,500" -> 18500
  const parsePrice = (priceStr) => {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    return parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  };

  const basePrice = parsePrice(booking.price);
  const nights = booking.nights || 5;
  const pricePerNight = Math.round(basePrice / nights);
  
  // Fiscal Logic: 5% if below 7500, 18% otherwise
  const gstRate = pricePerNight < 7500 ? 0.05 : 0.18;
  const gstAmount = Math.round(basePrice * (gstRate / (1 + gstRate))); 
  const subtotal = basePrice - gstAmount;

  const invoiceNumber = booking.code || 'REC-' + Math.floor(100000 + Math.random() * 900000);
  const invoiceDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal-container" onClick={e => e.stopPropagation()}>
        <div className="invoice-modal-header no-print">
          <div className="header-actions">
            <button className="print-btn" onClick={handlePrint}>
              <Printer size={18} />
              Print / PDF
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="invoice-content" ref={invoiceRef}>
          {/* Brand Header */}
          <div className="invoice-brand-header">
            <div className="brand-left">
              <div className="invoice-logo">Hostify</div>
              <div className="india-tag">
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/1200px-Flag_of_India.svg.png" alt="India" className="flag-icon" />
                MADE IN INDIA
              </div>
            </div>
            <div className="brand-right">
              <h1 className="invoice-type-title">Receipt</h1>
              <div className="invoice-id-meta">
                <div className="meta-row">
                  <span className="meta-label">Receipt #:</span>
                  <span className="meta-value">{invoiceNumber}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{invoiceDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="invoice-details-grid">
            <div className="detail-column">
              <h3 className="column-title">ISSUED BY</h3>
              <div className="entity-info">
                <div className="entity-name">Hostify Managed Properties</div>
                <div className="entity-address">
                  12th Floor, Cyber Hub<br />
                  Gurgaon, Haryana 122002<br />
                  India
                </div>
              </div>
            </div>
            <div className="detail-column">
              <h3 className="column-title">BILLED TO</h3>
              <div className="entity-info">
                <div className="entity-name">Guest User</div>
                <div className="entity-id">ID: {booking.userId || 'GUEST-4492'}</div>
              </div>
            </div>
          </div>

          <div className="invoice-stay-summary">
            <h3 className="summary-title">STAY SUMMARY</h3>
            <div className="stay-banner">
              <div className="banner-item">
                <Building size={16} />
                <span>{booking.title}</span>
              </div>
              <div className="banner-item">
                <MapPin size={16} />
                <span>{booking.location}</span>
              </div>
              <div className="banner-item">
                <Calendar size={16} />
                <span>{booking.dates}</span>
              </div>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Nights</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="item-main">Accommodation Charges</div>
                  <div className="item-sub">Base room charges exclusive of taxes</div>
                </td>
                <td className="text-right">₹{(subtotal / nights).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td className="text-right">{nights}</td>
                <td className="text-right">₹{subtotal.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>
                  <div className="item-main">Taxes</div>
                  <div className="item-sub">Consolidated booking taxes</div>
                </td>
                <td></td>
                <td></td>
                <td className="text-right">₹{gstAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div className="invoice-footer">
            <div className="footer-notes">
              <h4 className="notes-title">NOTES</h4>
              <p>This is a computer-generated receipt and does not require a signature.</p>
              <p>Thank you for choosing Hostify for your stay.</p>
            </div>
            <div className="invoice-total-section">
              <div className="total-row subtotal">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="total-row tax">
                <span>Taxes</span>
                <span>₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="total-divider"></div>
              <div className="total-row grand-total">
                <span>Grand Total</span>
                <span>₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="invoice-security-footer">
            <div className="security-badge">
              <CheckCircle size={14} />
              <span>Verified Payment</span>
            </div>
            <div className="reference-code">REF: {booking.code}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
