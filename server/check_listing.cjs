const mongoose = require('mongoose');
const Listing = require('./models/Listing');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const listings = await Listing.find({ title: "Luxury Hillside Retreat (Test)" });
  console.log(JSON.stringify(listings, null, 2));
  process.exit();
}
run();
