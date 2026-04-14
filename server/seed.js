require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const User = require('./models/User');

// We need a way to get the data from the frontend mock file.
// Since mockListings.js uses ES modules and imports images, we'll recreate a clean version for seeding.

const HOST_EMAIL = 'rajnishbansal0906@gmail.com';

const seedData = [
  {
    location: "Phuket, Thailand",
    distance: "2,400 km away",
    price: 12500,
    rating: 4.85,
    reviewsCount: 124,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop",
    description: "The Oak Street Loft - Relax in this stunning beachfront villa with private pool access.",
    host: { name: "Rajnish", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" },
    amenities: ["WiFi", "Pool", "Air Conditioning", "Kitchen"],
    maxGuests: 6,
    propertyType: "Apartment",
    instantBook: true,
    coordinates: { lat: 7.8804, lng: 98.3922 }
  },
  {
    location: "Bali, Indonesia",
    distance: "1,200 km away",
    price: 18500,
    rating: 4.92,
    reviewsCount: 86,
    image: "https://images.unsplash.com/photo-1510017803434-a899398421b3?w=1000&auto=format&fit=crop",
    description: "Modern Urban Retreat - Luxury resort stay with private pools and tropical gardens.",
    host: { name: "Rajnish", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" },
    amenities: ["WiFi", "Parking"],
    maxGuests: 4,
    propertyType: "Condo",
    instantBook: false,
    coordinates: { lat: -8.4095, lng: 115.1889 }
  },
  {
    location: "Maldives",
    distance: "3,100 km away",
    price: 45000,
    rating: 5.0,
    reviewsCount: 210,
    image: "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=1000&auto=format&fit=crop",
    description: "Serene Coastal Villa - Exclusive water bungalow with direct reef access.",
    host: { name: "Rajnish", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" },
    amenities: ["Air Conditioning", "Kitchen"],
    maxGuests: 2,
    propertyType: "Villa",
    instantBook: true,
    coordinates: { lat: 3.2028, lng: 73.2207 }
  },
  {
    location: "Koh Samui, Thailand",
    distance: "2,600 km away",
    price: 22000,
    rating: 4.75,
    reviewsCount: 156,
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1000&auto=format&fit=crop",
    description: "Azure Bay Resort - Panoramic ocean views and luxury spa services.",
    host: { name: "Rajnish", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" },
    amenities: ["WiFi", "Air Conditioning"],
    maxGuests: 3,
    propertyType: "Resort",
    instantBook: false,
    coordinates: { lat: 9.5120, lng: 100.0136 }
  },
  {
    location: "Kyoto, Japan",
    distance: "4,500 km away",
    price: 15000,
    rating: 4.95,
    reviewsCount: 56,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1000&auto=format&fit=crop",
    description: "Zen Garden Sanctuary - Traditional heritage stay in the heart of Kyoto.",
    host: { name: "Rajnish", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" },
    amenities: ["WiFi", "Air Conditioning"],
    maxGuests: 2,
    propertyType: "House",
    instantBook: true,
    coordinates: { lat: 35.0116, lng: 135.7681 }
  },
  {
    location: "Oia, Greece",
    distance: "6,200 km away",
    price: 32000,
    rating: 4.88,
    reviewsCount: 89,
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1000&auto=format&fit=crop",
    description: "Santorini Sunset Edge - Iconic white-washed villa with caldera views.",
    host: { name: "Rajnish", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" },
    amenities: ["WiFi", "Pool"],
    maxGuests: 4,
    propertyType: "Villa",
    instantBook: false,
    coordinates: { lat: 36.4618, lng: 25.3753 }
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // Find the host user
    const hostUser = await User.findOne({ email: HOST_EMAIL });
    let hostId = null;
    if (hostUser) {
      hostId = hostUser._id;
      console.log(`✅ Host found: ${hostUser.name || HOST_EMAIL} (ID: ${hostId})`);
      // Ensure host role
      if (hostUser.role !== 'Host') {
        await User.findByIdAndUpdate(hostId, { role: 'Host' });
        console.log('✅ Promoted to Host role');
      }
    } else {
      console.warn(`⚠️  Host user ${HOST_EMAIL} not found. Listings will have no hostId.`);
    }

    await Listing.deleteMany({});
    console.log('🗑️  Old listings cleared.');

    // Inject hostId into each seed record
    const dataWithHost = seedData.map(item => ({
      ...item,
      ...(hostId ? { hostId } : {})
    }));

    await Listing.insertMany(dataWithHost);
    console.log(`🌱 Data seeded successfully! (${dataWithHost.length} listings)`);

    process.exit();
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedDB();
