const mongoose = require('mongoose');
const Listing = require('./models/Listing');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const listing = await Listing.findOne();
    if (listing) {
      listing.subscription = {
        plan: 'Pro',
        status: 'Active',
        expiryDate: new Date(),
        autoRenew: true
      };
      await listing.save();
      console.log("SAVE SUCCESS");
    } else {
      console.log("No listing found");
    }
  } catch (err) {
    console.error("SAVE ERROR:", err.message);
  }
  process.exit();
}
run();
