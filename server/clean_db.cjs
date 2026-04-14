const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Transaction.deleteMany({ category: 'Subscription' });
  console.log("Deleted old test subscriptions.");
  process.exit();
}
run();
