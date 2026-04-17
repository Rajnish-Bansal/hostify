import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Share, Heart, Star, MapPin, Wifi, Car, Utensils, Monitor, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Navbar from '../../components/organisms/Navbar/Navbar';
import GuestSelector from '../../components/molecules/GuestSelector/GuestSelector';
import { useAuth } from '../../context/AuthContext';
import { useHost } from '../../context/HostContext';
import { useSearch } from '../../context/SearchContext';
import { fetchListingById } from '../../services/api';
import { differenceInDays, format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import MapView from '../../components/molecules/MapView/MapView';
import { DUMMY_LISTINGS } from '../../constants/mockData';
import './RoomDetails.css';

const normalizeListing = (data) => {
  if (!data) return null;

  const firstPhoto =
    data.image ||
    (Array.isArray(data.photos) && data.photos.length > 0
      ? (typeof data.photos[0] === 'string' ? data.photos[0] : data.photos[0]?.url)
      : '') ||
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop';

  return {
    ...data,
    id: data.id || data._id,
    title: data.title || data.description?.split(' - ')[0] || 'Stay',
    location: data.location || data.city || 'Unknown location',
    propertyType: data.propertyType || data.type || 'Stay',
    description: data.description || 'A beautiful place to stay.',
    image: firstPhoto,
    photos: Array.isArray(data.photos) ? data.photos : [firstPhoto],
    rating: data.rating ?? 0,
    reviewsCount: data.reviewsCount ?? 0,
    price: Number(data.price || 0),
    weekendPrice: Number(data.weekendPrice || data.price || 0),
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    host: data.host || {
      name: 'Hostify Host',
      image: 'https://i.pravatar.cc/150?u=hostify'
    },
    coordinates: data.coordinates || { lat: 20.5937, lng: 78.9629 }
  };
};

const RoomDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, openAuthModal, showNotification } = useAuth();
  const { listings: hostListings } = useHost();
  const { addToRecentlyViewed } = useSearch();
  const routeListing = location.state?.listing || null;
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch listing data
  useEffect(() => {
    const getListing = async () => {
      try {
        if (routeListing && (routeListing.id || routeListing._id) == id) {
          setListing(normalizeListing(routeListing));
          setLoading(false);
          return;
        }

        // 1. Try to find in host listings first (local state)
        const localListing = hostListings.find(l => (l._id || l.id) == id);
        if (localListing) {
          setListing(normalizeListing(localListing));
          setLoading(false);
          return;
        }

        // 2. Try to find in DUMMY_LISTINGS (mock data fallback)
        const mockListing = DUMMY_LISTINGS.find(l => (l._id || l.id) == id);
        if (mockListing) {
          setListing(normalizeListing(mockListing));
          setLoading(false);
          return;
        }

        // 3. Otherwise fetch from API
        const data = await fetchListingById(id);
        setListing(normalizeListing(data));
      } catch (err) {
        console.error("Failed to fetch listing details:", err);
      } finally {
        setLoading(false);
      }
    };
    getListing();
  }, [id, hostListings, routeListing]);

  // Track recently viewed
  useEffect(() => {
    if (listing) {
      addToRecentlyViewed(listing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing]);

  // Date State
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 5);
    return tomorrow;
  });

  // Guest State
  const [guests, setGuests] = useState({ adults: 1, children: 0 });
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const guestSelectorRef = useRef(null);
  const mapRef = useRef(null);

  // Pending reserve: set when user clicks Reserve but isn't logged in yet
  const [pendingReserve, setPendingReserve] = useState(false);

  const scrollToMap = () => {
    mapRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guestSelectorRef.current && !guestSelectorRef.current.contains(event.target)) {
        setShowGuestSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-complete reserve after login
  useEffect(() => {
    if (user && pendingReserve && listing) {
      setPendingReserve(false);
      navigate('/booking', {
        state: {
          listing,
          startDate,
          endDate,
          guests,
          totalPrice: priceStats?.totalPrice,
          nights
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingReserve]);

  // Reviews State
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // Inject mock reviews for demo purposes if listing has reviewsCount but empty list
  const getAugmentedReviews = () => {
    if (!listing) return [];
    if (listing.reviews && listing.reviews.length > 0) return listing.reviews;
    
    if (listing.reviewsCount > 0) {
      return [
        {
          id: 'mock1',
          user: 'Sarah Miller',
          date: 'March 2024',
          avatar: 'https://i.pravatar.cc/150?u=sarah',
          comment: 'This place is exactly as pictured. Very clean and the view is spectacular. The host was very responsive and check-in was a breeze.',
          ratings: { cleanliness: 5, accuracy: 5, communication: 5, location: 5, checkin: 5, value: 5 }
        },
        {
          id: 'mock2',
          user: 'James Wilson',
          date: 'February 2024',
          avatar: 'https://i.pravatar.cc/150?u=james',
          comment: 'Excellent stay! The location is perfect for exploring. Beds were comfortable and the wifi was fast enough for my remote work.',
          ratings: { cleanliness: 5, accuracy: 4, communication: 5, location: 5, checkin: 5, value: 4 }
        },
        {
          id: 'mock3',
          user: 'Priya Sharma',
          date: 'January 2024',
          avatar: 'https://i.pravatar.cc/150?u=priya',
          comment: 'Beautiful apartment with everything we needed. We loved sitting on the balcony in the evenings. Definitely recommended for a peaceful getaway.',
          ratings: { cleanliness: 4, accuracy: 5, communication: 5, location: 4, checkin: 5, value: 5 }
        }
      ];
    }
    return [];
  };

  const reviewsToDisplay = getAugmentedReviews();
  const displayedReviews = showAllReviews ? reviewsToDisplay : reviewsToDisplay.slice(0, 6);
  const hostName = listing?.host?.name || 'Host';
  const hostImage = listing?.host?.image || 'https://i.pravatar.cc/150?u=hostify';

  if (loading) return <div className="loading-container">Loading property details...</div>;
  if (!listing) return <div className="error-container">Property not found</div>;

  const nights = Math.max(differenceInDays(endDate, startDate), 1);
  const totalGuests = (guests.adults || 0) + (guests.children || 0);

  const calculateDetailedPrice = () => {
    let subtotal = 0;
    let weekendNights = 0;
    let weekdayNights = 0;

    for (let i = 0; i < nights; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(currentDay.getDate() + i);
        const dayOfWeek = currentDay.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

        if ((dayOfWeek === 5 || dayOfWeek === 6) && listing.weekendPrice) {
            subtotal += listing.weekendPrice;
            weekendNights++;
        } else {
            subtotal += listing.price;
            weekdayNights++;
        }
    }

    // Apply Weekly/Monthly Discounts
    let discountAmount = 0;
    let discountBadge = null;

    if (nights >= 28 && listing.discounts?.monthly > 0) {
        discountAmount = Math.round(subtotal * (listing.discounts.monthly / 100));
        discountBadge = `Monthly discount (${listing.discounts.monthly}%)`;
    } else if (nights >= 7 && listing.discounts?.weekly > 0) {
        discountAmount = Math.round(subtotal * (listing.discounts.weekly / 100));
        discountBadge = `Weekly discount (${listing.discounts.weekly}%)`;
    }

    const totalBasePrice = subtotal - discountAmount;
    
    // GST Logic: 5% if below 7500, 18% otherwise
    const gstRate = listing.price < 7500 ? 0.05 : 0.18;
    const gstAmount = Math.round(totalBasePrice * gstRate);
    
    const totalPrice = totalBasePrice + gstAmount;

    return { 
        subtotal, 
        discountAmount, 
        discountBadge, 
        totalBasePrice, 
        gstAmount, 
        gstPercentage: Math.round(gstRate * 100),
        totalPrice,
        weekendNights,
        weekdayNights
    };
  };

  const priceStats = calculateDetailedPrice();

  const guestLabel = `${totalGuests} guest${totalGuests > 1 ? 's' : ''}`;

  const calculateReviewCategories = () => {
    if (!reviewsToDisplay || reviewsToDisplay.length === 0) return null;
    
    const totals = {
      cleanliness: 0,
      accuracy: 0,
      communication: 0,
      location: 0,
      checkin: 0,
      value: 0
    };

    reviewsToDisplay.forEach(r => {
      const rt = r.ratings || { cleanliness: 5, accuracy: 5, communication: 5, location: 5, checkin: 5, value: 5 };
      totals.cleanliness += rt.cleanliness || 5;
      totals.accuracy += rt.accuracy || 5;
      totals.communication += rt.communication || 5;
      totals.location += rt.location || 5;
      totals.checkin += rt.checkin || 5;
      totals.value += rt.value || 5;
    });

    const count = reviewsToDisplay.length;
    return {
      cleanliness: (totals.cleanliness / count).toFixed(1),
      accuracy: (totals.accuracy / count).toFixed(1),
      communication: (totals.communication / count).toFixed(1),
      location: (totals.location / count).toFixed(1),
      checkin: (totals.checkin / count).toFixed(1),
      value: (totals.value / count).toFixed(1)
    };
  };

  const reviewStats = calculateReviewCategories();

  const handleReserve = () => {
    if (!user) {
      setPendingReserve(true);
      openAuthModal();
      return;
    }
    
    navigate('/booking', {
      state: {
        listing,
        startDate,
        endDate,
        guests,
        totalPrice: priceStats.totalPrice,
        nights
      }
    });
  };

  const handleSave = () => {
    if (!user) {
      showNotification('To save property, please login', 'info');
      return;
    }
    
    setIsFavorite(!isFavorite);
    if (!isFavorite) {
      showNotification('Saved to wishlist!', 'success');
    }
  };

  return (
    <div className="room-details">
      <Helmet>
        <title>{listing.title ? `${listing.propertyType || 'Stay'} in ${listing.location} - ${listing.title}` : `Hostify | ${listing.propertyType || 'Stay'} in ${listing.location}`}</title>
        <meta name="description" content={listing.description} />
        <meta property="og:title" content={`${listing.propertyType} in ${listing.location}`} />
        <meta property="og:description" content={listing.description} />
        <meta property="og:image" content={listing.image} />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navbar />
      <div className="room-content">
        {location.state?.fromHost ? (
          <Link 
            to="/become-a-host/dashboard?tab=listings" 
            className="back-button"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
        ) : (
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        )}
        {/* Title Header */}
        <h1 className="room-title">{listing.title || `Stunning stay in ${listing.location}`}</h1>
        <div className="room-header-meta">
          <div className="left-meta">
            <Star size={14} fill="black" /> 
            <span className="rating-bold">{listing.rating}</span>
            <span className="dot">·</span>
            <span className="reviews-link">{listing.reviewsCount} reviews</span>
            <span className="dot">·</span>
            <button 
              className="location-link-btn" 
              onClick={scrollToMap}
            >
              {listing.location}
            </button>
            <span className="dot">·</span>
            <button 
              className="view-on-map-link"
              onClick={scrollToMap}
            >
              View on map
            </button>
          </div>
          <div className="right-actions">
            <button className="action-btn"><Share size={16} /> Share</button>
            <button 
              className={`action-btn ${isFavorite ? 'active' : ''}`} 
              onClick={handleSave}
              style={{ color: isFavorite ? 'var(--primary)' : 'inherit' }}
            >
              <Heart 
                size={16} 
                fill={isFavorite ? 'var(--primary)' : 'none'} 
                stroke={isFavorite ? 'var(--primary)' : 'currentColor'} 
              /> 
              {isFavorite ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="room-gallery">
          <div className="main-image" style={{backgroundImage: `url(${listing.image})`}}></div>
          <div className="side-images">
             <div className="side-img" style={{backgroundImage: `url(${listing.image || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'})`}}></div>
             <div className="side-img" style={{backgroundImage: `url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80')`}}></div>
             <div className="side-img" style={{backgroundImage: `url('https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80')`}}></div>
             <div className="side-img" style={{backgroundImage: `url(${listing.image})`, opacity: 0.8}}>
               <button className="show-photos-btn">Show all photos</button>
             </div>
          </div>
        </div>

        <div className="room-content-grid">
           {/* Left Column: Details */}
           <div className="room-details-left">
              <div className="host-section">
                 <div className="host-info">
                    <h2>Hosted by {hostName}</h2>
                    <p>4 guests · 2 bedrooms · 2 beds · 2 baths</p>
                 </div>
                 <div className="host-avatar" style={{backgroundImage: `url(${hostImage})`}}></div>
              </div>

              {/* Highlights */}
              <div className="highlights-section">
                 <div className="highlight-item">
                    <div className="h-icon"><MapPin size={24} /></div>
                    <div className="h-text">
                       <h3>Great location</h3>
                       <p>95% of recent guests gave the location a 5-star rating.</p>
                    </div>
                 </div>
                 <div className="highlight-item">
                    <div className="h-icon"><Wifi size={24} /></div>
                    <div className="h-text">
                       <h3>Fast Wifi</h3>
                       <p>At 246 Mbps, you can take video calls and stream videos for your whole group.</p>
                    </div>
                 </div>
              </div>

              <div className="divider"></div>

              <div className="description-section">
                 <p>{listing.description}</p>
                 <br />
                 <p>Relax in this calm, stylish space. Enjoy morning coffee on the private terrace overlooking the ocean, just steps away from the finest beaches.</p>
              </div>

              <div className="divider"></div>

              {/* Amenities */}
              <div className="amenities-section">
                 <h2>What this place offers</h2>
                 <div className="amenities-grid">
                    <div className="amenity-item"><Wifi size={20} /> Wifi</div>
                    <div className="amenity-item"><Car size={20} /> Free parking</div>
                    <div className="amenity-item"><Utensils size={20} /> Kitchen</div>
                    <div className="amenity-item"><Monitor size={20} /> TV</div>
                 </div>
              </div>
           </div>

           {/* Right Column: Reservation Sidebar */}
           <div className="room-sidebar-wrapper">
              <div className="reservation-card">
                 <div className="card-header hide-on-mobile">
                    <div className="price-tag">
                       <span className="price-large">₹{listing.price.toLocaleString('en-IN')}</span> <span className="night-text">night</span>
                    </div>
                 </div>

                 <div className="mobile-price-display show-only-mobile">
                    <div className="price-tag">
                       <span className="price-large">₹{listing.price.toLocaleString('en-IN')}</span> <span className="night-text">night</span>
                    </div>
                    <div className="mobile-dates-summary">
                       {format(startDate, 'MMM d')} – {format(endDate, 'MMM d')}
                    </div>
                 </div>

                 <div className="date-picker-box hide-on-mobile">
                    <div className="date-inputs">
                       <div className="date-input border-right">
                          <label>CHECK-IN</label>
                          <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            dateFormat="MMM d"
                            customInput={<div className="clickable-date">{format(startDate, 'MMM d')}</div>}
                          />
                       </div>
                       <div className="date-input">
                          <label>CHECKOUT</label>
                          <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            dateFormat="MMM d"
                            customInput={<div className="clickable-date">{format(endDate, 'MMM d')}</div>}
                          />
                       </div>
                    </div>
                    <div className="guest-input-wrapper" ref={guestSelectorRef}>
                      <div className="guest-input" onClick={() => setShowGuestSelector(!showGuestSelector)}>
                         <label>GUESTS</label>
                         <div className="guest-display">
                           <span>{guestLabel}</span>
                           {showGuestSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                         </div>
                      </div>
                      {showGuestSelector && (
                        <div className="details-guest-selector">
                          <GuestSelector guests={guests} onChange={setGuests} />
                        </div>
                      )}
                    </div>
                 </div>

                 <button className="reserve-btn" onClick={handleReserve}>Reserve</button>

                 <div className="no-charge-text">You won't be charged yet</div>

                 <div className="price-breakdown hide-on-mobile">
                     <div className="pb-row">
                        <span>
                          {priceStats.weekendNights > 0 ? (
                            `₹${listing.price.toLocaleString('en-IN')} x ${priceStats.weekdayNights} weekdays + ₹${listing.weekendPrice.toLocaleString('en-IN')} x ${priceStats.weekendNights} weekends`
                          ) : (
                            `₹${listing.price.toLocaleString('en-IN')} x ${nights} nights`
                          )}
                        </span>
                        <span>₹{priceStats.subtotal.toLocaleString('en-IN')}</span>
                     </div>
                     {priceStats.discountAmount > 0 && (
                        <div className="pb-row discount-row" style={{ color: '#008a05', fontWeight: '600' }}>
                           <span className="discount-label">{priceStats.discountBadge}</span>
                           <span className="discount-value">-₹{priceStats.discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                     )}
                     <div className="pb-row">
                        <span>GST ({priceStats.gstPercentage}%)</span>
                        <span>₹{priceStats.gstAmount.toLocaleString('en-IN')}</span>
                     </div>
                  </div>

                  <div className="total-row hide-on-mobile">
                     <span>Total (incl. taxes)</span>
                     <span>₹{priceStats.totalPrice.toLocaleString('en-IN')}</span>
                  </div>
              </div>
           </div>
        </div>

         <div className="divider"></div>

        {/* Reviews Section */}
        <div className="reviews-section">
           {reviewStats && (
              <div className="review-categories-grid">
                 {Object.entries(reviewStats).map(([key, value]) => (
                    <div key={key} className="category-item">
                       <div className="category-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                       <div className="category-bar-wrapper">
                          <div className="category-bar">
                             <div 
                               className="category-progress" 
                               style={{ width: `${(value / 5) * 100}%` }}
                             ></div>
                          </div>
                          <span className="category-value">{value}</span>
                       </div>
                    </div>
                 ))}
              </div>
           )}

           <div className="reviews-grid">
              {(displayedReviews && displayedReviews.length > 0) ? (
                displayedReviews.map(review => (
                  <div key={review.id} className="review-item">
                     <div className="review-user-info">
                        <div className="user-avatar" style={{backgroundImage: `url(${review.avatar})`}}></div>
                        <div>
                           <div className="user-name">{review.user}</div>
                           <div className="review-date">{review.date}</div>
                        </div>
                     </div>
                     <div className="review-comment">
                        {review.comment}
                     </div>
                  </div>
                ))
              ) : (
                <div className="no-reviews">No reviews yet for this stay.</div>
              )}
           </div>

           {reviewsToDisplay && reviewsToDisplay.length > 6 && (
             <button 
               className="show-more-reviews"
               onClick={() => setShowAllReviews(!showAllReviews)}
             >
               {showAllReviews ? (
                 <>
                   <ChevronUp size={18} />
                   Show less
                 </>
               ) : (
                 <>
                   <ChevronDown size={18} />
                   Show all {listing.reviewsCount} reviews
                 </>
               )}
             </button>
           )}
        </div>


         {/* Map Section */}
         <div className="location-section" ref={mapRef}>
            <h2 className="section-subtitle">Where you'll be</h2>
            <div className="location-info">
               <div className="location-text">
                  <h3>{listing.location || listing.city}</h3>
                  <p className="secondary-text">
                     {listing.neighborhoodDescription || "This property is located in a vibrant and safe neighborhood, offering a perfect blend of convenience and local character. Exact location details will be shared after your booking is confirmed."}
                  </p>
               </div>
            </div>
            
            <MapView listings={[listing]} isSingle={true} />
            
            <div className="location-security-notice">
               <div className="security-icon">🛡️</div>
               <div className="security-text">
                  <h4>Getting here</h4>
                  <p>Detailed check-in instructions and exact address are shared 48 hours before arrival for safety.</p>
               </div>
            </div>
         </div>
      </div>
        <div className="divider"></div>
    </div>
  );
};

export default RoomDetails;
