import React, { useEffect, useState, Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Star, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import './MapView.css';

/**
 * Error Boundary to catch Leaflet/React-Leaflet initialization crashes
 */
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("MapView Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="map-error-fallback">
          <AlertCircle size={40} />
          <h3>Map failed to load</h3>
          <p>This usually happens due to coordinate inconsistencies. Please refresh or try again.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create custom marker icons with safety checks
const createCustomIcon = (price, isHovered = false) => {
  try {
    const displayPrice = typeof price === 'number' 
      ? price.toLocaleString('en-IN') 
      : (price ? price.toString() : '0');
      
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-pin ${isHovered ? 'hovered' : ''}">
          <div class="marker-price">₹${displayPrice}</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  } catch (err) {
    return L.divIcon({ className: 'fallback-marker', html: '📍' });
  }
};

// Component to handle map updates & bounds
const MapUpdater = ({ listings, isSingle }) => {
  const map = useMap();
  const [lastListingsId, setLastListingsId] = useState('');

  useEffect(() => {
    if (!listings || listings.length === 0) return;

    // Create a unique key for the current set of listings
    const currentId = listings.map(l => l._id || l.id).sort().join(',');
    
    // Only update bounds if the set of listings has actually changed
    if (currentId === lastListingsId) return;

    try {
      const validPoints = listings
        .filter(l => l?.coordinates?.lat && l?.coordinates?.lng)
        .map(l => [l.coordinates.lat, l.coordinates.lng]);

      if (validPoints.length === 0) return;

      if (isSingle || validPoints.length === 1) {
        map.setView(validPoints[0], 15, { animate: true });
      } else {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 12,
          animate: true,
          duration: 1
        });
      }
      setLastListingsId(currentId);
    } catch (err) {
      console.warn("Map interaction warning:", err);
    }
  }, [listings, map, isSingle, lastListingsId]);

  return null;
};

const MapViewContent = ({ listings, isSingle = false }) => {
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);

  // Filter valid listings for map display
  const validListings = (listings || []).filter(l => 
    l && l.coordinates && 
    typeof l.coordinates.lat === 'number' && 
    typeof l.coordinates.lng === 'number'
  );

  // Calculate center of valid listings
  const center = validListings.length > 0
    ? [
        validListings.reduce((sum, l) => sum + l.coordinates.lat, 0) / validListings.length,
        validListings.reduce((sum, l) => sum + l.coordinates.lng, 0) / validListings.length,
      ]
    : [20.5937, 78.9629]; // Fallback to India center

  if (validListings.length === 0 && !isSingle) {
    return (
      <div className="map-empty-state">
        <MapPin size={48} className="secondary-text" />
        <p>No listings with geographic data found.</p>
      </div>
    );
  }

  return (
    <div className={`map-view-container ${isSingle ? 'single-property' : ''}`}>
      <MapContainer
        center={center}
        zoom={isSingle ? 15 : 5}
        scrollWheelZoom={!isSingle}
        dragging={true}
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater listings={validListings} isSingle={isSingle} />
        
        {validListings.map(listing => {
          const lId = listing._id || listing.id;
          const photo = listing.photos?.[0] || listing.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300';
          
          return (
            <Marker
              key={lId}
              position={[listing.coordinates.lat, listing.coordinates.lng]}
              icon={createCustomIcon(listing.price, hoveredMarkerId === lId)}
              eventHandlers={{
                mouseover: () => setHoveredMarkerId(lId),
                mouseout: () => setHoveredMarkerId(null)
              }}
            >
              {!isSingle && (
                <Popup className="custom-popup" closeButton={false}>
                  <Link to={`/rooms/${lId}`} className="map-popup-link">
                    <div className="map-popup-content">
                      <img src={photo} alt={listing.location} className="popup-image" />
                      <div className="popup-info">
                        <h4>{listing.location || listing.title}</h4>
                        <div className="popup-rating">
                          <Star size={12} fill="#222" />
                          <span>{listing.rating || 'New'}</span>
                          <span className="reviews-count">({listing.reviewsCount || 0})</span>
                        </div>
                        <p className="popup-price">₹{(listing.price || 0).toLocaleString('en-IN')} / night</p>
                      </div>
                    </div>
                  </Link>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const MapView = (props) => (
  <MapErrorBoundary>
    <MapViewContent {...props} />
  </MapErrorBoundary>
);

export default MapView;
