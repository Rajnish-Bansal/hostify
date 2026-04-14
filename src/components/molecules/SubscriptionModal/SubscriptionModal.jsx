import React from 'react';
import { X } from 'lucide-react';
import Pricing from '../../../pages/Host/Pricing';
import './SubscriptionModal.css';

const SubscriptionModal = ({ isOpen, onClose, onConfirm, listingId, listingTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="sub-modal-overlay">
      <div className="sub-modal-content-premium">
        <div className="sub-modal-header-v2">
          <div className="header-meta">
            <h2>Activate Listing</h2>
            <p>Go live with <strong>{listingTitle || 'your property'}</strong> and start receiving bookings.</p>
          </div>
          <button className="close-btn-rounded" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="pricing-wrapper-inner">
          <Pricing 
            listingId={listingId} 
            onSubscribed={onConfirm} 
          />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
