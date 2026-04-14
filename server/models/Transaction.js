const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
  type: { 
    type: String, 
    enum: ['Credit', 'Debit'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['Booking', 'Payout', 'Subscription', 'Refund', 'Fee'], 
    required: true 
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Completed' 
  },
  description: { type: String },
  metadata: {
    bookingCode: String,
    propertyName: String,
    guestName: String,
    payoutDate: Date,
    planName: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
