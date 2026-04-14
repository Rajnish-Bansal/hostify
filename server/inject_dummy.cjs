const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await User.findOne();
    const newListing = new Listing({
      hostId: user._id,
      title: "Luxury Hillside Retreat (Test)",
      location: "Shimla, India",
      price: 15999,
      status: "Payment Required",
      image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1000",
      description: "A beautiful hillside retreat Perfect for testing.",
      rating: 4.8,
      reviewsCount: 15,
      maxGuests: 4,
      propertyType: "Villa",
      instantBook: true,
      amenities: ["WiFi", "Kitchen", "Fireplace"],
      location_geo: {
        type: "Point",
        coordinates: [77.1734, 31.1048]
      }
    });
    await newListing.save();
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR:", err.message);
  }
  process.exit();
}
run();
