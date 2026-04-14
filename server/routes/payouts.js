const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/host/stats/payouts
 * @desc  Get financial overview for the host
 * @access Private (Host only)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 1. Find all listings owned by this host
    const hostListings = await Listing.find({ hostId: req.user.id });
    const listingIds = hostListings.map(l => l._id);

    // 2. Find all bookings for these listings
    const bookings = await Booking.find({ 
      listing: { $in: listingIds },
      status: 'Confirmed'
    }).populate('listing');

    // 3. Aggregate financial data
    let totalGross = 0;
    let pendingBalance = 0;
    let availableBalance = 0;
    let totalPaid = 0;
    
    const TRANSACTION_FEE_RATE = 0.03; // Placeholder 3%

    const payouts = bookings.map(booking => {
      const gross = booking.totalPrice;
      const fee = gross * TRANSACTION_FEE_RATE;
      const net = gross - fee;
      
      totalGross += gross;

      const now = new Date();
      // Logic: Available if payoutDate exists and is in the past
      // For now, if no payoutDate, treat as pending
      const isAvailable = booking.payoutDate && new Date(booking.payoutDate) < now;
      const isReleased = booking.payoutStatus === 'Released';

      if (isReleased) {
        totalPaid += net;
      } else if (isAvailable) {
        availableBalance += net;
      } else {
        pendingBalance += net;
      }

      return {
        id: booking._id,
        bookingCode: booking.code,
        guest: booking.user,
        propertyName: booking.listing.title,
        checkIn: booking.startDate,
        amount: gross,
        netAmount: net,
        status: isReleased ? 'Paid' : (isAvailable ? 'Available' : 'Pending'),
        payoutDate: booking.payoutDate || 'TBD'
      };
    });

    res.json({
      summary: {
        totalGross,
        totalNet: totalGross * (1 - TRANSACTION_FEE_RATE),
        pendingBalance,
        availableBalance,
        totalPaid,
        currency: 'INR'
      },
      transactions: payouts.sort((a, b) => new Date(b.payoutDate) - new Date(a.payoutDate))
    });

  } catch (err) {
    console.error('[Payout Error]:', err);
    res.status(500).json({ message: 'Error fetching payout stats', error: err.message });
  }
});

module.exports = router;
