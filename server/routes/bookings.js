const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route POST /api/bookings
 * @desc  Create a new booking with overlap check
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  const { listingId, startDate, endDate, guests, totalPrice } = req.body;

  try {
    // 1. Basic validation
    if (!listingId || !startDate || !endDate || !totalPrice) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // 2. Overlap Check
    const existingBooking = await Booking.findOne({
      listing: listingId,
      status: 'Confirmed',
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }]
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: 'These dates are already booked. Please choose different dates.' 
      });
    }

    // 3. Create Booking
    const payoutDate = new Date(start);
    payoutDate.setHours(payoutDate.getHours() + 24);

    const newBooking = new Booking({
      user: req.user.id,
      listing: listingId,
      dates: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      startDate: start,
      endDate: end,
      guests,
      totalPrice,
      status: 'Confirmed', 
      code: 'RES-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      payoutDate,
      processingFee: totalPrice * 0.03
    });

    await newBooking.save();

    // 4. Record Transactions
    const { recordTransaction } = require('../utils/transactionHelper');
    
    // Guest Debit (Payment)
    await recordTransaction({
      userId: req.user.id,
      type: 'Debit',
      category: 'Booking',
      amount: totalPrice,
      listingId,
      bookingId: newBooking._id,
      description: `Payment for stay in ${newBooking.dates}`,
      metadata: {
        bookingCode: newBooking.code,
        propertyName: (await Listing.findById(listingId)).title
      }
    });

    // Host Credit (Earnings)
    const hostListing = await Listing.findById(listingId);
    await recordTransaction({
      userId: hostListing.hostId,
      type: 'Credit',
      category: 'Booking',
      amount: totalPrice - (newBooking.processingFee || 0),
      listingId,
      bookingId: newBooking._id,
      description: `Earnings from booking ${newBooking.code}`,
      metadata: {
        bookingCode: newBooking.code,
        propertyName: hostListing.title,
        guestName: req.user.name
      }
    });

    // Populate listing and user info for response
    await newBooking.populate('listing');
    await newBooking.populate('user', 'name email avatar phone');

    res.status(201).json(newBooking);

  } catch (err) {
    console.error('[Booking Error]:', err);
    res.status(500).json({ message: 'Server error during booking', error: err.message });
  }
});

/**
 * @route GET /api/bookings/my-trips
 * @desc  Get bookings for current guest
 * @access Private
 */
router.get('/my-trips', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('listing')
      .sort({ startDate: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching trips', error: err.message });
  }
});

/**
 * @route GET /api/bookings/my-listings
 * @desc  Get all bookings for listings owned by the authenticated host
 * @access Private (Host)
 */
router.get('/my-listings', authenticateToken, async (req, res) => {
  try {
    // Find all listings that belong to this host
    const hostListings = await Listing.find({ hostId: req.user.id });
    const listingIds = hostListings.map(l => l._id);

    if (listingIds.length === 0) {
      return res.json([]);
    }

    // Find all bookings for those listings
    const bookings = await Booking.find({ listing: { $in: listingIds } })
      .populate('listing', 'location title image photos price')
      .populate('user', 'name email avatar phone')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('[Host Bookings Error]:', err);
    res.status(500).json({ message: 'Error fetching host bookings', error: err.message });
  }
});

/**
 * @route PATCH /api/bookings/:id/status
 * @desc  Update booking status (host can accept/decline, guest can cancel)
 * @access Private
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Confirmed', 'Pending Approval', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('listing', 'location title').populate('user', 'name email');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error updating booking', error: err.message });
  }
});

module.exports = router;
