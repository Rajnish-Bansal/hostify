import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Eye } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './ListingCard.css';

const ListingCard = ({ id, image, location, distance, price, rating, isRecentlyViewed, ...listing }) => {
  const navigate = useNavigate();
  const { user, openAuthModal, showNotification } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  const handleCardClick = () => {
    navigate(`/rooms/${id}`, {
      state: {
        listing: {
          id,
          image,
          location,
          distance,
          price,
          rating,
          ...listing,
        }
      }
    });
  };

  const handleBookNow = (e) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal();
      return;
    }
    navigate(`/book/stays/${id}`, {
      state: {
        listing: {
          id,
          image,
          location,
          distance,
          price,
          rating,
          ...listing,
        }
      }
    });
  };

  return (
    <div className="listing-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="listing-image-wrapper">
        <img src={image} alt={location} className="listing-image" />
        <button 
          className="favorite-button" 
          onClick={(e) => {
            e.stopPropagation();
            if (!user) {
              showNotification('To save property, please login', 'info');
              return;
            }
            
            setIsFavorite(!isFavorite);
            if (!isFavorite) {
              showNotification('Saved to wishlist!', 'success');
            }
          }}
        >
          <Heart 
            size={20} 
            className="heart-icon" 
            fill={isFavorite ? 'var(--primary)' : 'none'}
            stroke={isFavorite ? 'var(--primary)' : 'white'}
          />
        </button>
        {isRecentlyViewed && (
          <div className="recently-viewed-badge">
            <Eye size={12} />
            <span>Recently viewed</span>
          </div>
        )}
      </div>
      <div className="listing-details">
        <div className="listing-header">
          <h3 className="listing-location">{location}</h3>
          <div className="listing-rating">
            <span className="rating-dot"></span>
            <span>{rating}</span>
          </div>
        </div>
        <p className="listing-info">{distance}</p>
        <p className="listing-price">
          <span className="price-bold">₹{price.toLocaleString('en-IN')}</span> / night
        </p>
        <button className="btn-book-now" onClick={handleBookNow}>Book Now</button>
      </div>
    </div>
  );
};

export default ListingCard;
