const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const User = require('../models/User'); // Still need to ensure role is Host
const { authenticateToken } = require('../middleware/auth');
const { recordTransaction } = require('../utils/transactionHelper');

// Plan metadata (These apply PER PROPERTY now)
const SUBSCRIPTION_PLANS = [
  {
    id: 'Pro',
    name: 'Monthly',
    price: 499,
    listingLimit: 1,
    commission: 10,
    features: [
      '30 Days Global Visibility',
      '10% Platform Commission',
      'Advanced Property Analytics',
      'Priority Host Support',
      'Verified Listing Badge'
    ]
  }
];

/**
 * @route GET /api/subscriptions/plans
 * @desc Get available per-property subscription plans
 * @access Public
 */
router.get('/plans', (req, res) => {
  res.json(SUBSCRIPTION_PLANS);
});

/**
 * @route GET /api/subscriptions/current/:listingId
 * @desc Get subscription status for a specific listing
 * @access Private
 */
router.get('/current/:listingId', authenticateToken, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.listingId)) {
      return res.status(400).json({ message: 'Invalid listing ID format' });
    }
    
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
   
    
    res.json(listing.subscription || { plan: 'None', status: 'Inactive' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching status', error: err.message });
  }
});


/**
 * @route POST /api/subscriptions/subscribe
 * @desc Subscribe a specific listing to a monthly plan
 * @access Private
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  const { planId, listingId } = req.body;
  console.log('[DEBUG-SUB] Request Body:', req.body);
  console.log('[DEBUG-SUB] User:', req.user);

  if (!listingId) {
    return res.status(400).json({ message: 'Listing ID is required for per-property subscription' });
  }

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!selectedPlan) {
    return res.status(400).json({ message: 'Invalid plan selected' });
  }

  try {
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    // Authorization check
    if (listing.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to modify this listing' });
    }

    // Update listing subscription
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    listing.subscription = {
      plan: selectedPlan.id,
      status: 'Active',
      expiryDate: expiryDate,
      autoRenew: true
    };
    
    await Listing.findByIdAndUpdate(listingId, {
      $set: { subscription: listing.subscription }
    });

    // Ensure User role is Host
    await User.findByIdAndUpdate(req.user.id, { role: 'Host' });

    // Record Transaction
    if (selectedPlan.price > 0) {
      await recordTransaction({
        userId: req.user.id,
        type: 'Debit',
        category: 'Subscription',
        amount: selectedPlan.price,
        listingId: listing._id,
        description: `Monthly Activation · ${listing.title}`,
        metadata: {
          planName: selectedPlan.name,
          expiryDate: expiryDate,
          propertyName: listing.title
        }
      });
    }

    res.json({
      message: `Successfully subscribed ${listing.title} to ${selectedPlan.name} plan`,
      subscription: listing.subscription
    });
  } catch (err) {
    console.error('[Subscription Error]:', err);
    require('fs').appendFileSync('SUB_ERROR.log', err.stack + '\n');
    res.status(500).json({ message: 'Error processing subscription', error: err.message });
  }
});

module.exports = router;
