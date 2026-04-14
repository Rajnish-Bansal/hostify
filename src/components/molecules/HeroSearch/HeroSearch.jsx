import React, { useState, useRef, useEffect } from 'react';
import { Search, Minus, Plus, MapPin } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './HeroSearch.css';

const HeroSearch = ({ onSearch, allLocations = [] }) => {
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Date State
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [today, tomorrow];
  });
  const [startDate, endDate] = dateRange;

  // Guest State
  const [guestCounts, setGuestCounts] = useState({ adults: 1, children: 0 });
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  
  const totalGuests = guestCounts.adults + guestCounts.children;

  const [activeField, setActiveField] = useState(null);
  const guestPopoverRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveField(null);
        setShowGuestPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch({ 
        destination,
        startDate,
        endDate,
        guests: totalGuests
      });
    }
    setActiveField(null);
    setShowGuestPopover(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const updateGuests = (type, operation) => {
      setGuestCounts(prev => {
          const newCounts = { ...prev };
          if (operation === 'increase') {
              if (type === 'adults' || type === 'children') {
                  // Global max valid check if needed, e.g. 16 total
                  if (newCounts.adults + newCounts.children < 16) {
                      newCounts[type] += 1;
                  }
              }
          } else {
              if (type === 'adults') {
                  newCounts.adults = Math.max(newCounts.adults - 1, 1);
              } else if (type === 'children') {
                  newCounts.children = Math.max(newCounts.children - 1, 0);
              }
          }
          return newCounts;
      });
  };

  return (
    <div className="hero-search-container" ref={containerRef}>
      <div className="hero-search">
        {/* Location */}
        <div 
            className={`hero-search-group ${activeField === 'destination' ? 'active' : ''}`}
            onClick={() => {
                setActiveField('destination');
                setShowGuestPopover(false);
            }}
        >
          <label>Location</label>
          <input 
            type="text" 
            placeholder="Bali, Indonesia" 
            value={destination}
            onChange={(e) => {
                const val = e.target.value;
                setDestination(val);
                if (val.trim()) {
                   const filtered = allLocations.filter(loc => 
                       loc.toLowerCase().includes(val.toLowerCase())
                   );
                   setSuggestions(filtered);
                   setShowSuggestions(true);
                } else {
                   setShowSuggestions(false);
                }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
                setActiveField('destination');
                if (destination.trim()) setShowSuggestions(true);
            }}
          />
          {showSuggestions && suggestions.length > 0 && activeField === 'destination' && (
              <div className="search-suggestions">
                  {suggestions.map((loc, index) => (
                      <div 
                        key={index} 
                        className="suggestion-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDestination(loc);
                            setShowSuggestions(false);
                        }}
                      >
                          <div className="suggestion-icon">
                              <MapPin size={18} />
                          </div>
                          <span>{loc}</span>
                      </div>
                  ))}
              </div>
          )}
        </div>
        
        <div className="hero-divider"></div>
        
        {/* Date In */}
        <div 
            className={`hero-search-group ${activeField === 'dates' ? 'active' : ''}`}
            onClick={() => {
                setActiveField('dates');
                setShowGuestPopover(false);
            }}
        >
          <label>Check In</label>
          <div className="datepicker-wrapper">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                    setDateRange(update);
                }}
                placeholderText="Add dates"
                dateFormat="MMM d"
                className="datepicker-input"
                onFocus={() => setActiveField('dates')}
                customInput={
                    <input 
                        value={startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} 
                        readOnly 
                        placeholder="08 Nov 2024"
                    />
                }
               />
          </div>
        </div>

        <div className="hero-divider"></div>

        {/* Date Out */}
        <div 
            className={`hero-search-group ${activeField === 'dates-out' ? 'active' : ''}`}
            onClick={() => {
                setActiveField('dates');
                setShowGuestPopover(false);
            }}
        >
          <label>Check Out</label>
          <div className="datepicker-wrapper">
              <input 
                  value={endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} 
                  readOnly 
                  placeholder="12 Nov 2024"
                  onClick={() => setActiveField('dates')}
              />
          </div>
        </div>
        
        <div className="hero-divider"></div>
        
        {/* Room/Guests */}
        <div 
            className={`hero-search-group ${activeField === 'guests' ? 'active' : ''}`}
            onClick={() => {
                setActiveField('guests');
                setShowGuestPopover(true);
            }}
        >
          <label>Guests</label>
          <div style={{ fontSize: '14px', fontWeight: 500, color: totalGuests > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {totalGuests > 0 ? `${totalGuests} Guest${totalGuests > 1 ? 's' : ''}` : '1 Guest'}
          </div>
        </div>

        <button className="hero-search-button" onClick={(e) => {
            e.stopPropagation();
            handleSearchClick();
        }}>
          <Search size={22} strokeWidth={2.5} color="white" />
          <span className="search-btn-text">Search</span>
        </button>

          {/* Guest Popover */}
          {showGuestPopover && (
              <div 
                className="guest-popover" 
                ref={guestPopoverRef}
                onClick={(e) => e.stopPropagation()} 
              >
                  {/* Adults */}
                  <div className="guest-row">
                      <div className="guest-info">
                          <h4>Adults</h4>
                          <p>Ages 13 or above</p>
                      </div>
                      <div className="guest-controls">
                          <button 
                            className="guest-btn" 
                            disabled={guestCounts.adults <= 1}
                            onClick={() => updateGuests('adults', 'decrease')}
                          >
                              <Minus size={16} />
                          </button>
                          <span className="guest-count">{guestCounts.adults}</span>
                          <button 
                            className="guest-btn"
                            disabled={totalGuests >= 16}
                            onClick={() => updateGuests('adults', 'increase')}
                          >
                              <Plus size={16} />
                          </button>
                      </div>
                  </div>

                  {/* Children */}
                  <div className="guest-row" style={{ marginTop: '16px' }}>
                      <div className="guest-info">
                          <h4>Children</h4>
                          <p>Ages 2-12</p>
                      </div>
                      <div className="guest-controls">
                          <button 
                            className="guest-btn" 
                            disabled={guestCounts.children <= 0}
                            onClick={() => updateGuests('children', 'decrease')}
                          >
                              <Minus size={16} />
                          </button>
                          <span className="guest-count">{guestCounts.children}</span>
                          <button 
                            className="guest-btn"
                            disabled={totalGuests >= 16}
                            onClick={() => updateGuests('children', 'increase')}
                          >
                              <Plus size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default HeroSearch;
