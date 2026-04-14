const mongoose = require('mongoose');
require('./models/Listing'); // Fix the missing schema error
const Transaction = require('./models/Transaction');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tx = await Transaction.find({ category: 'Subscription' }).sort({ createdAt: -1 }).limit(1).populate('listingId', 'title location');
  console.log(JSON.stringify(tx, null, 2));
  process.exit();
}
run();
