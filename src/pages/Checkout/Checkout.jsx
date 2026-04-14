import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Star, CreditCard, Wallet, Smartphone, ShieldCheck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fetchListingById, createBooking } from '../../services/api';
import { useHost } from '../../context/HostContext';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../../components/molecules/AuthModal/AuthModal';
import './Checkout.css';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { listings: hostListings } = useHost();
  const { user, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth();
  
  const [listing, setListing] = useState(location.state?.listing || null);
  const [loading, setLoading] = useState(!location.state?.listing);
  
  // Fetch listing if not in state
  React.useEffect(() => {
    if (!listing && id) {
      const getListing = async () => {
        try {
          // Try to find in host listings first (local state/dummy data)
          const localListing = hostListings.find(l => (l._id || l.id) == id);
          if (localListing) {
            setListing({
              ...localListing,
              image: localListing.image || (localListing.photos && localListing.photos[0])
            });
            setLoading(false);
            return;
          }

          // Otherwise fetch from API
          const data = await fetchListingById(id);
          const normalizedData = {
            ...data,
            image: data.image || (data.photos && data.photos[0])
          };
          setListing(normalizedData);
        } catch (err) {
          console.error("Failed to fetch listing for checkout:", err);
        } finally {
          setLoading(false);
        }
      };
      getListing();
    }
  }, [id, listing, hostListings]);

  const stateData = location.state || {};
  
  // Get dynamic data from state or use fallbacks
  const bookingData = {
    startDate: stateData.startDate || new Date().toISOString(),
    endDate: stateData.endDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    guests: stateData.guests || { adults: 1, children: 0 },
    nights: stateData.nights || 5,
    totalPrice: stateData.totalPrice || (listing?.price || 0) * 5 + 2500
  };

  const { startDate, endDate, guests, nights, totalPrice } = bookingData;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const formattedDates = `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
  const totalGuestsCount = guests.adults + guests.children;
  const guestsLabel = `${totalGuestsCount} guest${totalGuestsCount > 1 ? 's' : ''}`;

  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  if (loading) return <div className="loading-container">Loading checkout details...</div>;
  if (!listing) return <div className="error-container">Listing not found</div>;

  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) {
       setCouponError('Please enter a coupon code');
       return;
    }

    // Mock valid coupon: SAVE20 gives 20% off
    if (couponCode.trim().toUpperCase() === 'SAVE20') {
       const calculatedDiscount = Math.floor(totalPrice * 0.20);
       setDiscount(calculatedDiscount);
       setIsCouponApplied(true);
    } else {
       setCouponError('Invalid or expired coupon code');
       setDiscount(0);
       setIsCouponApplied(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setIsCouponApplied(false);
    setCouponError('');
  };

  const finalPrice = totalPrice - discount;

  const handleConfirmPay = async () => {
    // Require login before finalizing booking
    if (!user) {
      openAuthModal();
      return;
    }

    if (!listing._id && !listing.id) {
      setBookingError('Cannot book this listing — missing listing ID.');
      return;
    }

    setIsProcessing(true);
    setBookingError('');

    try {
      const result = await createBooking({
        listingId: listing._id || listing.id,
        startDate,
        endDate,
        guests,
        totalPrice: finalPrice
      });

      // Show confirmation
      setConfirmedBooking(result);
    } catch (err) {
      setBookingError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // If booking confirmed, show a success screen
  if (confirmedBooking) {
    return (
      <div className="checkout-container" style={{ maxWidth: 600, margin: '120px auto', textAlign: 'center', padding: '48px 32px' }}>
        <CheckCircle size={72} color="var(--primary)" style={{ marginBottom: 24 }} />
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Booking Confirmed! 🎉</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 8 }}>
          Your stay at <strong>{confirmedBooking.listing?.location || listing.location}</strong> is booked.
        </p>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '20px 32px', margin: '24px 0', display: 'inline-block' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Booking Reference</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: 'var(--primary)' }}>{confirmedBooking.code}</div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
          {confirmedBooking.dates} &nbsp;·&nbsp; {finalPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button
            className="confirm-btn"
            style={{ maxWidth: 200 }}
            onClick={() => navigate('/bookings')}
          >
            View My Trips
          </button>
          <button
            style={{ padding: '16px 32px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="checkout-navbar">
         <div className="checkout-nav-container" style={{ padding: '0 48px', width: '100%', display: 'flex', alignItems: 'center' }}>
            <div className="logo-text" onClick={() => navigate('/')} style={{ cursor: 'pointer', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>Hostify</div>
         </div>
      </div>
      
      <div className="checkout-container">
         <div className="checkout-header">
            <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
            <h1>Confirm and pay</h1>
         </div>

         <div className="checkout-grid">
            {/* Left Column: Form */}
            <div className="checkout-left">
               <div className="checkout-section">
                  <h2>Your trip</h2>
                  <div className="trip-details">
                     <div className="trip-row">
                        <div>
                           <div className="trip-label">Dates</div>
                           <div className="trip-value">{formattedDates}</div>
                        </div>
                        <div className="edit-link">Edit</div>
                     </div>
                     <div className="trip-row">
                        <div>
                           <div className="trip-label">Guests</div>
                           <div className="trip-value">{guestsLabel}</div>
                        </div>
                        <div className="edit-link">Edit</div>
                     </div>
                  </div>
               </div>

               <div className="checkout-divider" style={{ height: '1px', background: 'var(--border-light)', margin: '48px 0' }}></div>

               <div className="checkout-section">
                  <h2>Pay with</h2>
                   <div className="payment-method-selector">
                      <div className="pm-option selected">
                         <div className="pm-info">
                            <CreditCard size={22} strokeWidth={1.5} />
                            <span>Credit or debit card</span>
                         </div>
                         <div className="pm-radio-outer">
                            <div className="pm-radio-inner"></div>
                         </div>
                      </div>
                      <div className="pm-option">
                         <div className="pm-info">
                            <Smartphone size={22} strokeWidth={1.5} />
                            <span>UPI (PhonePe, Google Pay)</span>
                         </div>
                         <div className="pm-radio-outer">
                            <div className="pm-radio-inner"></div>
                         </div>
                      </div>
                      <div className="pm-option">
                         <div className="pm-info">
                            <Wallet size={22} strokeWidth={1.5} />
                            <span>Digital Wallets</span>
                         </div>
                         <div className="pm-radio-outer">
                            <div className="pm-radio-inner"></div>
                         </div>
                      </div>
                   </div>

                  <div className="card-form">
                     <div className="input-group">
                        <input type="text" placeholder="Card number" className="card-input" />
                     </div>
                     <div className="card-row">
                        <input type="text" placeholder="Exp date" className="card-input" />
                        <input type="text" placeholder="CVV" className="card-input" />
                     </div>
                     <div className="input-group">
                        <input type="text" placeholder="Cardholder name" className="card-input" />
                     </div>
                  </div>
               </div>

               <div className="checkout-divider" style={{ height: '1px', background: 'var(--border-light)', margin: '48px 0' }}></div>

               <div className="checkout-section">
                  <h2>Trust & Safety</h2>
                  <div className="trust-badges">
                     <div className="trust-item">
                        <ShieldCheck size={28} strokeWidth={1.5} />
                        <div className="trust-text">
                           <h4>Secure Booking</h4>
                           <p>Your data is encrypted and transactions are processed through enterprise-grade security layers.</p>
                        </div>
                     </div>
                     <div className="trust-item">
                        <Star size={28} strokeWidth={1.5} />
                        <div className="trust-text">
                           <h4>Price Guarantee</h4>
                           <p>Found a better price? We'll match it and give you an extra 5% discount on your next stay.</p>
                        </div>
                     </div>
                  </div>
               </div>
                
               <button className="confirm-btn" onClick={handleConfirmPay} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : user ? 'Confirm and Pay Now' : 'Log in to Confirm'}
               </button>

               {bookingError && (
                 <div style={{ color: '#dc2626', fontSize: 14, marginTop: 12, padding: '12px 16px', background: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }}>
                   ⚠️ {bookingError}
                 </div>
               )}

               <div className="secure-checkout">
                  <span style={{ opacity: 0.6 }}>Guaranteed safe & secure checkout</span>
               </div>
            </div>

            {/* Right Column: Listing Summary (Sticky) */}
            <div className="checkout-right">
               <div className="listing-summary-card">
                  <div className="summary-header">
                     <div className="summary-image" style={{backgroundImage: `url(${listing.image})`}}></div>
                     <div className="summary-container">
                        <div className="summary-category">Boutique Stay</div>
                        <div className="summary-title">{listing.title || 'Premium Property'}</div>
                        <div className="summary-rating">
                           <Star size={14} fill="currentColor" /> 
                           <span>{listing.rating}</span>
                           <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(124 reviews)</span>
                        </div>
                     </div>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="price-details-title">Price details</div>
                  
                  <div className="summary-row">
                     <span>₹{listing.price.toLocaleString('en-IN')} x {nights} nights</span>
                     <span>₹{(listing.price * nights).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="summary-row">
                     <span>Service & cleaning fee</span>
                     <span>₹2,500</span>
                  </div>
                  
                  {isCouponApplied && (
                     <div className="summary-row discount-row" style={{ color: '#16a34a', fontWeight: '600' }}>
                        <span>Coupon ({couponCode.toUpperCase()})</span>
                        <span>-₹{discount.toLocaleString('en-IN')}</span>
                     </div>
                  )}
                  
                  <div className="summary-divider"></div>

                  <div className="summary-total">
                     <span>Total (INR)</span>
                     <span>₹{finalPrice.toLocaleString('en-IN')}</span>
                  </div>

                  {!isCouponApplied ? (
                    <div className="coupon-inline" style={{ marginTop: '32px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                           <input 
                              type="text" 
                              style={{ flex: 1, padding: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} 
                              placeholder="Add coupon" 
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                           />
                           <button 
                             onClick={handleApplyCoupon}
                             style={{ padding: '0 20px', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}
                           >
                             Apply
                           </button>
                        </div>
                        {couponError && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>{couponError}</div>}
                    </div>
                  ) : (
                    <div style={{ marginTop: '32px', padding: '16px', background: '#f0fdf4', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>✓ Coupon Applied</span>
                        <button onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>Remove</button>
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* Auth Modal - shown when unauthenticated user tries to confirm booking */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={(userData) => {
          closeAuthModal();
          // If login was successful, auto-proceed with booking
          if (userData) {
            setTimeout(() => handleConfirmPay(), 300);
          }
        }}
      />
    </>
  );
};

export default Checkout;
