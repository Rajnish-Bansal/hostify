import React, { useState } from 'react';
import { X, TrendingUp, Calendar, Percent, ShieldCheck } from 'lucide-react';
import './PricingModal.css';

const PricingModal = ({ isOpen, onClose, listing, onUpdate }) => {
  const [basePrice, setBasePrice] = useState(listing?.price ?? 0);
  const [weekendPrice, setWeekendPrice] = useState(listing?.weekendPrice ?? listing?.price ?? 0);
  const [weeklyDiscount, setWeeklyDiscount] = useState(listing?.discounts?.weekly ?? 10);
  const [monthlyDiscount, setMonthlyDiscount] = useState(listing?.discounts?.monthly ?? 20);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(listing.id, {
        price: Number(basePrice),
        weekendPrice: Number(weekendPrice),
        discounts: {
          weekly: Number(weeklyDiscount),
          monthly: Number(monthlyDiscount)
        }
      });
      onClose();
    } catch (err) {
      console.error("Failed to update pricing", err);
    } finally {
      setSaving(false);
    }
  };

  // Pricing Preview Logic
  const weekendTotal = weekendPrice * 2;
  const weeklyTotal = basePrice * 7 * (1 - weeklyDiscount / 100);

  return (
    <div className="modal-overlay">
      <div className="pricing-modal-container">
        <header className="modal-header">
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
          <h2>Smart Pricing: {listing?.title}</h2>
        </header>

        <div className="modal-body">
          <section className="pricing-section">
            <div className="section-title">
              <TrendingUp size={18} />
              <h3>Base Nightly Price</h3>
            </div>
            <p className="description">Set your standard nightly rate for Sunday through Thursday.</p>
            <div className="price-input-wrapper">
              <span className="currency-prefix">₹</span>
              <input 
                type="number" 
                value={basePrice} 
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Base Price"
              />
              <span className="per-night">per night</span>
            </div>
          </section>

          <section className="pricing-section">
            <div className="section-title">
              <Calendar size={18} />
              <h3>Weekend Premium</h3>
            </div>
            <p className="description">Set a higher rate for Friday and Saturday nights to maximize revenue during peak demand.</p>
            <div className="price-input-wrapper">
              <span className="currency-prefix">₹</span>
              <input 
                type="number" 
                value={weekendPrice} 
                onChange={(e) => setWeekendPrice(e.target.value)}
                placeholder="Weekend Price"
              />
              <span className="per-night">per weekend night</span>
            </div>
            <div className="pricing-preview-tip">
              Current base: ₹{basePrice} · Weekend markup: +{basePrice > 0 ? Math.round(((weekendPrice - basePrice) / basePrice) * 100) : 0}%
            </div>
          </section>

          <footer className="pricing-section">
            <div className="section-title">
              <Percent size={18} />
              <h3>Long-stay Discounts</h3>
            </div>
            <p className="description">Attract guests for longer stays by offering tiered discounts.</p>
            
            <div className="discount-inputs">
              <div className="discount-item">
                <label>Weekly (7+ nights)</label>
                <div className="input-group">
                  <input 
                    type="number" 
                    value={weeklyDiscount}
                    onChange={(e) => setWeeklyDiscount(e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="discount-item">
                <label>Monthly (28+ nights)</label>
                <div className="input-group">
                  <input 
                    type="number" 
                    value={monthlyDiscount}
                    onChange={(e) => setMonthlyDiscount(e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </footer>

          <div className="pricing-pro-tip">
             <ShieldCheck size={20} className="pro-icon" />
             <div>
                <strong>Pro Strategy:</strong> Stays over 28 days reduce your turnover costs (cleaning, coordination) by up to 40%. A 20% discount is recommended.
             </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save-pricing" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
