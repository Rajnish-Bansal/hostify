const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users. Copying dummy property to all of them...`);
    
    // Grab the dummy we just created, strip off the ID and HostId, and duplicate it
    const dummyTemplate = await Listing.findOne({ title: "Luxury Hillside Retreat (Test)" }).lean();
    if (!dummyTemplate) {
      console.log("Template not found"); process.exit(1);
    }
    
    delete dummyTemplate._id;
    delete dummyTemplate.__v;
    delete dummyTemplate.createdAt;
    delete dummyTemplate.updatedAt;

    for (const u of users) {
      // Don't duplicate if they already have it
      const exists = await Listing.findOne({ hostId: u._id, title: "Luxury Hillside Retreat (Test)" });
      if (!exists) {
         const newListing = new Listing({
            ...dummyTemplate,
            hostId: u._id
         });
         await newListing.save();
         console.log(`Injected for user ${u.email}`);
      }
    }
    console.log("SUCCESS COMPLETE");
  } catch (err) {
    console.error("ERROR:", err.message);
  }
  process.exit();
}
run();
