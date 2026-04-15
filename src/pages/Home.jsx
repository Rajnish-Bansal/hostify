import React from 'react';
import Navbar from '../components/organisms/Navbar/Navbar';
import HeroSearch from '../components/molecules/HeroSearch/HeroSearch';
import Categories from '../components/molecules/Categories/Categories';
import ListingCard from '../components/molecules/ListingCard/ListingCard';
import FilterPanel from '../components/molecules/FilterPanel/FilterPanel';
// import FilterSidebar from '../components/molecules/FilterSidebar/FilterSidebar'; // Option 3: Always-visible sidebar
import FilterChips from '../components/molecules/FilterChips/FilterChips';
import MapView from '../components/molecules/MapView/MapView';
import { Helmet } from 'react-helmet-async';
import './Home.css';

import { fetchListings } from '../services/api';
import { Link } from 'react-router-dom';
import { Sliders, Map, List } from 'lucide-react';
import { useSearch } from '../context/SearchContext';
import Footer from '../components/organisms/Footer/Footer';

const DUMMY_LISTINGS = [
  {
    _id: "1700001",
    location: "Phuket, Thailand",
    distance: "2,400 km away",
    price: 12500,
    rating: 4.85,
    reviewsCount: 124,
    photos: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop"],
    title: "The Oak Street Loft",
    propertyType: "Apartment",
    maxGuests: 4,
    priceRange: [0, 50000],
    coordinates: { lat: 7.8804, lng: 98.3923 }
  },
  {
    _id: "1700002",
    location: "Bali, Indonesia",
    distance: "1,200 km away",
    price: 18500,
    rating: 4.92,
    reviewsCount: 86,
    photos: ["https://images.unsplash.com/photo-1510017803434-a899398421b3?w=1000&auto=format&fit=crop"],
    title: "Modern Urban Retreat",
    propertyType: "Condo",
    maxGuests: 2,
    priceRange: [0, 50000],
    coordinates: { lat: -8.4095, lng: 115.1889 }
  },
  {
    _id: "1700003",
    location: "Maldives",
    distance: "3,100 km away",
    price: 45000,
    rating: 5.0,
    reviewsCount: 210,
    photos: ["https://images.unsplash.com/photo-1544124499-58912cbddaad?w=1000&auto=format&fit=crop"],
    title: "Serene Coastal Villa",
    propertyType: "Villa",
    maxGuests: 2,
    priceRange: [0, 50000],
    coordinates: { lat: 3.2028, lng: 73.2207 }
  },
  {
    _id: "1700004",
    location: "Koh Samui, Thailand",
    distance: "2,600 km away",
    price: 22000,
    rating: 4.75,
    reviewsCount: 156,
    photos: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1000&auto=format&fit=crop"],
    title: "Azure Bay Resort",
    propertyType: "Resort",
    maxGuests: 6,
    priceRange: [0, 50000],
    coordinates: { lat: 9.512, lng: 100.013 }
  },
  {
    _id: "1700005",
    location: "Kyoto, Japan",
    distance: "4,500 km away",
    price: 15000,
    rating: 4.95,
    reviewsCount: 56,
    photos: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1000&auto=format&fit=crop"],
    title: "Zen Garden Sanctuary",
    propertyType: "House",
    maxGuests: 3,
    priceRange: [0, 50000],
    coordinates: { lat: 35.0116, lng: 135.7681 }
  },
  {
    _id: "1700006",
    location: "Oia, Greece",
    distance: "6,200 km away",
    price: 32000,
    rating: 4.88,
    reviewsCount: 89,
    photos: ["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1000&auto=format&fit=crop"],
    title: "Santorini Sunset Edge",
    propertyType: "Villa",
    maxGuests: 5,
    priceRange: [0, 50000]
  }
];

const Home = () => {
  const [allListings, setAllListings] = React.useState([]);
  const [filteredListings, setFilteredListings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchKey, setSearchKey] = React.useState(0);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { filters, recentlyViewed, searchParams, updateSearchParams, updateFilters } = useSearch();
  
  // Handle Scroll Morph
  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch listings on mount
  React.useEffect(() => {
    const getListings = async () => {
      try {
        const data = await fetchListings();
        if (data && data.length > 0) {
          setAllListings(data);
          setFilteredListings(data);
        } else {
          // Fallback to dummy data for design demo if API is empty
          setAllListings(DUMMY_LISTINGS);
          setFilteredListings(DUMMY_LISTINGS);
        }
      } catch (err) {
        console.error("Failed to fetch listings, using fallback:", err);
        setAllListings(DUMMY_LISTINGS);
        setFilteredListings(DUMMY_LISTINGS);
      } finally {
        setLoading(false);
      }
    };
    getListings();
  }, []);



  // Sync filtered listings with context on mount and when filters/params change
  React.useEffect(() => {
    if (allListings.length > 0) {
      applyFilters(searchParams, filters);
    }
  }, [searchParams, filters, allListings]);
  
  // Extract unique locations for autocomplete
  const allLocations = [...new Set(allListings.map(item => item.location))];

  const applyFilters = (searchParams, currentFilters) => {
    const { destination, guests, startDate, endDate } = searchParams;
    
    console.log('[Home] Applying filters:', { searchParams, currentFilters });
    let filtered = [...allListings];

    // Filter by Destination
    if (destination) {
      const lowerCaseDest = destination.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.location.toLowerCase().includes(lowerCaseDest)
      );
    }

    // Filter by Guests
    if (guests) {
      filtered = filtered.filter(listing => 
        (listing.maxGuests || 2) >= guests
      );
    }

    // Filter by Dates
    if (startDate && endDate) {
      filtered = filtered.filter(listing => {
        if (!listing.availableFrom || !listing.availableTo) return false;
        const availFrom = new Date(listing.availableFrom);
        const availTo = new Date(listing.availableTo);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return availFrom <= start && availTo >= end;
      });
    }

    // Apply advanced filters
    // Price Range
    filtered = filtered.filter(listing => 
      listing.price >= currentFilters.priceRange[0] && 
      listing.price <= currentFilters.priceRange[1]
    );

    // Property Types
    if (currentFilters.propertyTypes.length > 0) {
      filtered = filtered.filter(listing => 
        currentFilters.propertyTypes.includes(listing.propertyType)
      );
    }

    // Amenities
    if (currentFilters.amenities.length > 0) {
      filtered = filtered.filter(listing => 
        currentFilters.amenities.every(amenity => 
          listing.amenities.includes(amenity)
        )
      );
    }

    // Instant Book
    if (currentFilters.instantBook) {
      filtered = filtered.filter(listing => listing.instantBook === true);
    }

    // Minimum Rating
    if (currentFilters.minRating > 0) {
      filtered = filtered.filter(listing => listing.rating >= currentFilters.minRating);
    }

    setFilteredListings(filtered);
  };

  const handleSearch = (newSearchParams) => {
    updateSearchParams(newSearchParams);
  };

  const handleFilterApply = (newFilters) => {
    updateFilters(newFilters);
  };

  const handleReset = () => {
    updateSearchParams({ destination: '', guests: null, startDate: null, endDate: null });
    setFilteredListings(allListings);
    setSearchKey(prev => prev + 1);
  };

  return (
    <>
    <div className="home-container">
      <Helmet>
        <title>Hostify - Find your next home away from home</title>
        <meta name="description" content="Discover unique properties around the world. Book your perfect stay with Hostify." />
        <meta property="og:title" content="Hostify - Premium Vacation Rentals" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop" />
      </Helmet>
      
      <Navbar onSearch={handleSearch} onLogoClick={handleReset} scrolled={isScrolled} />
      
      <div className={`hero-search-wrapper ${isScrolled ? 'scrolled' : ''}`}>
        <div className="compact-search-container">
          <HeroSearch key={searchKey} onSearch={handleSearch} allLocations={allLocations} />
        </div>
      </div>

      <div className="sticky-sub-navbar">
        <div className="sub-navbar-container">
          <Categories />
          <div className="sub-navbar-filters">
            <button className="filter-trigger-btn elevate" onClick={() => setShowFilters(true)}>
              <Sliders size={18} />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      <main className="main-content">
        {/* Results Header */}
        <div className="results-header">
          <div className="results-info">
            <h2 className="section-title">
              {searchParams.destination ? `Stays in ${searchParams.destination}` : 'Recently added properties'}
            </h2>
            <div className="results-count">
              {filteredListings.length} {filteredListings.length === 1 ? 'property' : 'properties'} found
            </div>
          </div>
          
        </div>

        {/* Active Filter Chips */}
        <FilterChips onFilterRemove={handleFilterApply} />

        {/* Map or List View */}
        {showMap ? (
          <MapView listings={filteredListings} />
        ) : (
          <div className="listings-grid">
            {filteredListings.map(listing => {
              const listingId = listing._id || listing.id;
              const isRecentlyViewed = recentlyViewed.some(item => (item._id || item.id) === listingId);
              return (
                <ListingCard 
                  key={listingId}
                  {...listing} 
                  image={listing.image || (listing.photos && listing.photos[0])}
                  id={listingId} 
                  isRecentlyViewed={isRecentlyViewed} 
                />
              );
            })}
          </div>
        )}
      </main>

      <FilterPanel 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)}
        onApply={handleFilterApply}
      />

      {/* ========== OPTION 3: Always-Visible Sidebar (COMMENTED OUT) ========== */}
      {/* 
      <div className="home-layout">
        <FilterSidebar onApply={handleFilterApply} />
        
        <main className="main-content-with-sidebar">
          <RecentlyViewed />
          
          <div className="results-header">
            <h2>{filteredListings.length} {filteredListings.length === 1 ? 'property' : 'properties'}</h2>
          </div>

          <div className="listings-grid">
            {filteredListings.map(listing => (
              <Link to={`/rooms/${listing.id}`} key={listing.id} style={{textDecoration: 'none', color: 'inherit', display: 'block'}}>
                <ListingCard {...listing} />
              </Link>
            ))}
          </div>
        </main>
      </div>
      */}
      {/* Floating Toggle Button */}
      <button 
        className={`view-toggle-btn floating-toggle ${showMap ? 'active' : ''}`}
        onClick={() => setShowMap(!showMap)}
      >
        {showMap ? (
          <>
            <List size={18} />
            <span>Show list</span>
          </>
        ) : (
          <>
            <Map size={18} />
            <span>Show map</span>
          </>
        )}
      </button>
    </div>
    <Footer />
    </>
  );
};

export default Home;
