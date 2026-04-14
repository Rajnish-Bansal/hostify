const Transaction = require('../models/Transaction');

/**
 * Records a financial transaction in the system
 * @param {Object} params - Transaction details
 */
const recordTransaction = async ({
  userId,
  type,
  category,
  amount,
  listingId = null,
  bookingId = null,
  description = '',
  metadata = {},
  status = 'Completed'
}) => {
  try {
    const transaction = new Transaction({
      userId,
      type,
      category,
      amount,
      listingId,
      bookingId,
      description,
      metadata,
      status
    });
    return await transaction.save();
  } catch (err) {
    console.error('[Transaction Error]:', err);
    throw err;
  }
};

module.exports = { recordTransaction };
