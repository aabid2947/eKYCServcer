import mongoose from 'mongoose';

/**
 * @typedef {Object} Transaction
 * @property {mongoose.Schema.Types.ObjectId} user - The user who initiated the transaction.
 * @property {mongoose.Schema.Types.ObjectId} service - The service that was used.
 * @property {String} status - The outcome of the transaction ('pending', 'completed', 'failed').
 * @property {Number} quantity - The number of units consumed (default is 1).
 * @property {Number} amount - The amount charged for the transaction.
 * @property {String} razorpay_order_id - The order ID from Razorpay.
 * @property {String} razorpay_payment_id - The payment ID from Razorpay after successful payment.
 * @property {String} razorpay_signature - The signature from Razorpay to verify authenticity.
 * @property {mongoose.Schema.Types.Mixed} metadata - Optional field for storing extra data.
 */

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    quantity: {
      type: Number,
      default: 1,
    },
    amount: {
      type: Number,
      required: false, // Not required for free services
    },
    // --- Razorpay Payment Details ---
    razorpay_order_id: {
      type: String,
      required: false,
    },
    razorpay_payment_id: {
      type: String,
      required: false,
    },
    razorpay_signature: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields
  }
);

// Index to optimize queries for a specific user's transactions, sorted by time.
TransactionSchema.index({ user: 1, createdAt: -1 });

// Index to find transactions by Razorpay order ID
TransactionSchema.index({ razorpay_order_id: 1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;
