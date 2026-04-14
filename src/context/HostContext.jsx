import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { fetchMyListings } from '../services/api';

const HostContext = createContext();

const initialListingData = {
  id: null,
  step: 1, // Track current step
  category: '',
  type: '',
  placeType: 'entire',
  location: '',
  guests: 4,
  bedrooms: 1,
  bathrooms: 1,
  beds: 1,
  isMultiUnit: false,
  unitCount: 1,
  amenities: [],
  title: '',
  description: '',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  houseRules: {
    smoking: false,
    events: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
  cancellationPolicy: {
    fullRefundDays: 1,
    fullRefundUnit: 'days',
    partialRefundDays: 0,
    partialRefundUnit: 'days',
    partialRefundPercent: 50,
  },
  minStay: 1,
  maxStay: 365,
  instantBooking: false,
  sharedSpaces: {
    privateBathroom: true,
    sharedKitchen: true,
    sharedLivingRoom: true,
    otherSpaces: '',
  },
  hostPresence: {
    hostPresent: false,
    roommatesPresent: false,
    accessHours: '24/7',
  },
  guestRequirements: {
    verifiedID: true,
    positiveReviews: false,
  },
  price: '',
  weekendPrice: '',
  roomCategory: '',
  rooms: [],
  photos: [],
  address: {
    apt: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  },
  coordinates: {
    lat: 28.6139,
    lng: 77.2090
  },
  notification: null
};

// Helper to get initial listings from localStorage or fallback to mock data
const getInitialListings = () => {
  try {
    const saved = localStorage.getItem('host_listings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter out null/undefined or invalid objects to prevent excessive crashes
        const validListings = parsed.map(l => {
           // Ensure basic fields exist
           if (!l || typeof l !== 'object') return null;
           
           // Sanitize photos: if they were files, they are now empty objects. 
           // If they were objects with url, keep them if url is string.
           // Ideally we should have uploaded them, but for now we'll just try to salvage what we can or empty the array.
           let sanitizedPhotos = [];
           if (Array.isArray(l.photos)) {
             sanitizedPhotos = l.photos.filter(p => {
               if (typeof p === 'string') return true;
               if (p && typeof p === 'object' && p.url && typeof p.url === 'string') return true;
               return false;
             });
           }

           // Normalize types for UI consistency
           let type = l.type;
           if (type === 'Apartment') type = 'Apartment/Flat';
           if (type === 'Villa') type = 'Villa (Luxury)';
           if (type === 'Home' || type === 'Cabin') type = 'House (Standard)';

           return {
             ...l,
             type,
             photos: sanitizedPhotos,
             // Ensure ID exists
             id: l.id || Date.now() + Math.random(),
             // Ensure status exists
             status: l.status || 'In Progress',
             rating: l.rating || (l.id === 1700001 ? 4.8 : l.id === 1700002 ? 4.9 : l.id === 1700003 ? 4.7 : 0),
             reviewsCount: l.reviewsCount || (l.id === 1700001 ? 12 : l.id === 1700002 ? 24 : l.id === 1700003 ? 8 : 0)
           };
        }).filter(Boolean);

        if (validListings.length > 0) {
           return validListings;
        }
      }
    }
  } catch (err) {
    console.error("Error parsing host listings from localStorage:", err);
    // Continue to fallback
  }
  
  return [
    {
      id: 1700001,
      hostId: 1,
      title: "The Oak Street Loft",
      type: "Apartment",
      location: "Phuket, Thailand",
      price: 12500,
      status: "Active",
      rating: 4.8,
      distance: "2,400 km away",
      reviewsCount: 12,
      createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
      photos: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700002,
      hostId: 1,
      title: "Modern Urban Retreat",
      type: "Condo",
      location: "Bali, Indonesia",
      price: 18500,
      status: "Active",
      rating: 4.9,
      distance: "1,200 km away",
      reviewsCount: 24,
      createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      photos: ["https://images.unsplash.com/photo-1510017803434-a899398421b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700003,
      hostId: 1,
      title: "Serene Coastal Villa",
      type: "Villa",
      location: "Maldives",
      price: 45000,
      status: "Active",
      rating: 5.0,
      distance: "3,100 km away",
      reviewsCount: 42,
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      photos: ["https://images.unsplash.com/photo-1544124499-58912cbddaad?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700004,
      hostId: 1,
      title: "Azure Bay Resort",
      type: "Resort",
      location: "Koh Samui, Thailand",
      price: 22000,
      status: "Active",
      rating: 4.7,
      distance: "2,600 km away",
      reviewsCount: 18,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      photos: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700005,
      hostId: 1,
      title: "Zen Garden Sanctuary",
      type: "House",
      location: "Kyoto, Japan",
      price: 15000,
      status: "Active",
      rating: 4.9,
      distance: "4,500 km away",
      reviewsCount: 56,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      photos: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700006,
      hostId: 1,
      title: "Santorini Sunset Edge",
      type: "Villa",
      location: "Oia, Greece",
      price: 32000,
      status: "Active",
      rating: 4.8,
      distance: "6,200 km away",
      reviewsCount: 89,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      photos: ["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700007,
      hostId: 1,
      title: "Skyline Glass House",
      type: "Penthouse",
      location: "Singapore",
      price: 28000,
      status: "Active",
      rating: 4.9,
      distance: "3,800 km away",
      reviewsCount: 15,
      createdAt: new Date().toISOString(),
      photos: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    },
    {
      id: 1700008,
      hostId: 1,
      title: "Ethereal Desert Loft",
      type: "Loft",
      location: "Dubai, UAE",
      price: 21000,
      status: "Active",
      rating: 4.6,
      distance: "2,100 km away",
      reviewsCount: 7,
      createdAt: new Date().toISOString(),
      photos: ["https://images.unsplash.com/photo-1551882547-ff43c61f1c9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"]
    }
  ];
};


export const HostProvider = ({ children }) => {
  const { user } = useAuth();
  const [listingData, setListingData] = useState(initialListingData);
  const [allListings, setListings] = useState(getInitialListings);
  const [apiListings, setApiListings] = useState([]); // Listings loaded from server

  const refreshListings = async () => {
    if (!user) {
      setApiListings([]);
      return;
    }
    try {
      const data = await fetchMyListings();
      if (Array.isArray(data)) {
        const normalized = data.map(l => ({
          ...l,
          id: l._id,
          hostId: String(l.hostId),
          title: l.title || l.description?.split(' - ')[0] || `Stay in ${l.location}`,
          // Map explicitly from the nested MongoDB subscription object. Fallback to Payment Required.
          status: l.subscription?.status === 'Active' ? 'Active' : (l.status || 'Payment Required'),
          rating: l.rating || 0,
          reviewsCount: l.reviewsCount || 0,
          createdAt: l.createdAt || new Date().toISOString(),
          photos: l.photos?.map(p => typeof p === 'string' ? p : p.url).filter(Boolean)
                  || (l.image ? [l.image] : [])
        }));
        setApiListings(normalized);
      }
    } catch (err) {
      console.warn('Could not load listings from API:', err.message);
    }
  };

  // Fetch host's real listings from the API whenever user logs in
  useEffect(() => {
    refreshListings();
  }, [user]);

  // Merge: API listings take priority; fall-back to localStorage ones when no API data
  const mergedListings = apiListings.length > 0
    ? [
        ...apiListings,
        // Include any in-progress drafts from localStorage that aren't in the API yet
        ...allListings.filter(l =>
          l.status === 'In Progress' &&
          !apiListings.some(a => String(a._id) === String(l._id || l.id))
        )
      ]
    : allListings;

  const filteredListings = mergedListings
    .filter(l => {
       // Filter out old hardcoded integer properties to strictly prevent 500 cast errors
       if (l.id === 1700001 || l.id === 1700002 || l.id === 1700003) return false;
       return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Persist only user-created / draft listings to localStorage
  useEffect(() => {
    localStorage.setItem('host_listings', JSON.stringify(allListings));
  }, [allListings]);
  
  const updateListingData = (updates) => {
    setListingData(prev => ({ ...prev, ...updates }));
  };

  const loadListingForEdit = (listing) => {
    setListingData({
      ...initialListingData, // Reset first to ensure structure
      ...listing,
      notification: null
    });
  };

  const publishListing = () => {
    if (listingData.id) {
       // Update existing - status becomes Pending for approval
       const updatedListing = { ...listingData, status: 'Pending' };
       setListings(prev => prev.map(l => l.id === listingData.id ? updatedListing : l));
       return updatedListing;
    } else {
       // Create new - status becomes Pending for approval
       const newListing = {
         ...listingData,
         id: Date.now(),
         status: 'Pending', 
         createdAt: new Date().toISOString(),
         hostId: user?.id
       };
       setListings(prev => [...prev, newListing]);
       return newListing;
    }
  };

  const approveListing = (id) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'Payment Required' } : l));
  };

  const rejectListing = (id) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'Rejected' } : l));
  };

  const saveDraft = (currentStep) => {
    // Requirements removed so user can save anytime
    const dataToSave = {
      ...listingData,
      step: currentStep || listingData.step || 1
    };

    if (listingData.id) {
       // Update existing draft
       setListings(prev => prev.map(l => l.id === listingData.id ? dataToSave : l));
    } else {
       // Create new draft
       const newId = Date.now();
       const newListing = {
         ...dataToSave,
         id: newId,
         status: 'In Progress',
         createdAt: new Date().toISOString(),
         hostId: user?.id
       };
       setListingData(prev => ({ ...prev, id: newId, step: dataToSave.step }));
       setListings(prev => [...prev, newListing]);
    }
  };

  const updateListingStatus = (id, newStatus) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const deleteListing = (id) => {
    // Confirmation handled by UI modal
    console.log("Deleting listing with ID:", id);
    setListings(prev => prev.filter(l => l.id != id));
  };

  const importAirbnbListing = async (url) => {
    try {
      const response = await fetch('/api/listings/import-airbnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import listing');
      }

      const data = await response.json();
      
      // Map scraped data to our internal listing state
      const importedData = {
        title: data.title,
        description: data.description,
        location: data.location,
        price: data.price,
        photos: data.photos,
        amenities: data.amenities,
        guests: data.guests,
        bedrooms: data.bedrooms,
        beds: data.beds,
        bathrooms: data.bathrooms,
        step: 1 // Start at step 1 for review
      };

      setListingData(prev => ({ ...prev, ...importedData }));
      return importedData;
    } catch (err) {
      console.error("Import Error:", err);
      throw err;
    }
  };

  const activateUnits = (id, unitsToActivate) => {
    setListings(prev => prev.map(l => {
      if (l.id === id) {
         const now = new Date();
         const created = new Date(l.createdAt || now);
         const currentExpiry = new Date(created);
         currentExpiry.setMonth(created.getMonth() + 1);

         let newCreatedAt;
         if (currentExpiry > now) {
            // If still active, extend from current expiry
            newCreatedAt = currentExpiry.toISOString();
         } else {
            // If expired, start fresh from now
            newCreatedAt = now.toISOString();
         }
         
         return { 
           ...l, 
           createdAt: newCreatedAt, 
           status: 'Active',
           activeSubscriptionUnits: (l.activeSubscriptionUnits || 0) + unitsToActivate 
         };
      }
      return l;
    }));
  };

  const resetListingData = () => {
    setListingData(initialListingData);
  };

  return (
    <HostContext.Provider value={{ 
      listingData, 
      updateListingData, 
      listings: filteredListings, 
      publishListing, 
      saveDraft,
      updateListingStatus,
      loadListingForEdit,
      deleteListing,
      resetListingData,
      approveListing,
      rejectListing,
      activateUnits,
      importAirbnbListing,
      refreshListings
    }}>
      {children}
    </HostContext.Provider>
  );
};

export const useHost = () => useContext(HostContext);
