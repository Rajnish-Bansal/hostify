import React, { useState } from 'react';
import Navbar from '../../components/organisms/Navbar/Navbar';
import './Bookings.css';
import { MapPin, Calendar, Users, Briefcase, MessageSquare, Star, FileText } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import RatingModal from '../../components/molecules/RatingModal/RatingModal';
import InvoiceModal from '../../components/molecules/InvoiceModal/InvoiceModal';

const Bookings = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const { userBookings } = useBooking();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Filter logic
  const upcomingBookings = userBookings;
  
  // Mock past bookings for demo if none exist
  const pastBookings = [
    {
      id: 'past-101',
      title: "Himalayan Stone House",
      location: "Manali, India",
      dates: "Dec 10 - Dec 15, 2023",
      guests: "2 guests",
      price: "₹32,500",
      nights: 5,
      status: "Completed",
      code: "HST-44921",
      image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop",
      host: {
        name: "Rajesh",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop"
      }
    },
    {
       id: 'past-102',
       title: "Beachfront Villa",
       location: "Goa, India",
       dates: "Nov 20 - Nov 24, 2023",
       guests: "4 guests",
       price: "₹45,000",
       nights: 4,
       status: "Completed",
       code: "BVF-99021",
       image: "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=800&auto=format&fit=crop",
       host: {
         name: "Anya",
         image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop"
       }
     }
  ];

  const bookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleRateStay = (booking) => {
    setSelectedBooking(booking);
    setShowRatingModal(true);
  };

  const handleViewInvoice = (booking) => {
    setSelectedBooking(booking);
    setShowInvoiceModal(true);
  };

  const handleSubmitRating = (ratingData) => {
    console.log('Rating submitted:', ratingData);
    alert(`Thank you for rating ${ratingData.booking.title}!`);
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">My Bookings</h1>
        
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
        </div>

        <div className="bookings-grid">
          {bookings.length > 0 ? (
             bookings.map(booking => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-image-wrapper">
                    <div className="booking-image" style={{backgroundImage: `url(${booking.image})`}}></div>
                    <div className="image-shine"></div>
                    <div className={`booking-status-badge ${booking.status === 'Pending Approval' ? 'pending' : booking.status === 'Completed' ? 'completed' : 'confirmed'}`}>
                      {booking.status === 'Pending Approval' ? (
                        <><Calendar size={12} /> Pending Approval</>
                      ) : booking.status === 'Completed' ? (
                        <><Star size={12} fill="white" /> Completed</>
                      ) : (
                        <><Star size={12} fill="white" /> Confirmed</>
                      )}
                    </div>
                  </div>
                  
                  <div className="booking-info">
                    <div className="booking-header">
                       <div className="booking-main-data">
                         <h3 className="booking-title">{booking.title}</h3>
                         <div className="booking-location">
                           <MapPin size={14} /> {booking.location}
                         </div>
                       </div>
                       {booking.host && (
                          <div className="host-avatar" 
                               style={{backgroundImage: `url(${booking.host.image})`}}
                               title={`Hosted by ${booking.host.name}`}
                          ></div>
                       )}
                    </div>
                    
                    <div className="booking-info-box">
                      <div className="detail-item">
                        <span className="detail-label">Dates</span>
                        <div className="detail-value">
                          <Calendar size={14} className="detail-icon" />
                          <span>{booking.dates}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                         <span className="detail-label">Guests</span>
                         <div className="detail-value">
                           <Users size={14} className="detail-icon" />
                           <span>{booking.guests || '1 guest'}</span>
                         </div>
                      </div>
                      {booking.code && (
                        <div className="detail-item">
                            <span className="detail-label">{booking.status === 'Pending Approval' ? 'Request ID' : 'Reference'}</span>
                            <div className="detail-value">
                              <Briefcase size={14} className="detail-icon" />
                              <span>{booking.code}</span>
                            </div>
                        </div>
                      )}
                    </div>

                    <div className="booking-footer">
                       <div className="booking-price">
                          <span className="price-label">Paid</span>
                          <span className="price-value">{booking.price}</span>
                       </div>
                       
                       <div className="booking-actions">
                          {activeTab === 'upcoming' ? (
                            <>
                              <button className="action-btn-secondary" title="Message Host">
                                <MessageSquare size={16} />
                              </button>
                              {booking.status === 'Pending Approval' ? (
                                 <button className="action-btn-primary cancel-btn">Cancel</button>
                              ) : (
                                 <button className="action-btn-primary">Manage</button>
                              )}
                            </>
                          ) : (
                            <div className="past-actions">
                              <button className="action-btn-secondary invoice-btn" onClick={() => handleViewInvoice(booking)} title="Download Invoice">
                                 <FileText size={16} />
                                 <span>Invoice</span>
                              </button>
                              <button className="action-btn-primary" onClick={() => handleRateStay(booking)}>
                                 Rate Stay
                              </button>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                </div>
             ))
          ) : (
            <div className="empty-state">
              <h3>No trips booked... yet!</h3>
              <p>Time to dust off your bags and start planning your next adventure</p>
            </div>
          )}
        </div>
      </div>

      {selectedBooking && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          booking={selectedBooking}
          onSubmit={handleSubmitRating}
        />
      )}

      {selectedBooking && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          booking={selectedBooking}
        />
      )}
    </>
  );
};

export default Bookings;

