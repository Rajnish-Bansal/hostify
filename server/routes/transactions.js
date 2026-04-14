const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/transactions
 * @desc  Fetch transaction history for the current user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User identifier missing in token' });
    }

    const filters = { userId: req.user.id };
    console.log(`[TRANSACTIONS] Fetching for userId: ${req.user.id}`);
    
    // Optional: filter by category or type
    if (req.query.category) filters.category = req.query.category;
    if (req.query.type) filters.type = req.query.type;

    const transactions = await Transaction.find(filters)
      .sort({ createdAt: -1 })
      .populate('listingId', 'title location');

    res.json(transactions);
  } catch (err) {
    console.error('[Fetch Transactions Error]:', err);
    res.status(500).json({ message: 'Error fetching transactions', error: err.message });
  }
});

module.exports = router;
