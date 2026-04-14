const mongoose = require('mongoose');
require('./models/Listing');
require('./models/User');
const { recordTransaction } = require('./utils/transactionHelper');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const tx = await recordTransaction({
      userId: new mongoose.Types.ObjectId(),
      type: 'Debit',
      category: 'Subscription',
      amount: 499,
      listingId: new mongoose.Types.ObjectId(),
      description: "Test",
      metadata: { planName: "Pro" }
    });
    console.log("Success:", tx);
  } catch (err) {
    console.error("TX_ERROR:", err.message);
  }
  process.exit();
}
run();
