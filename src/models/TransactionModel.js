import mongoose from 'mongoose';

/**
 * @typedef {Object} Transaction
 * @property {mongoose.Schema.Types.ObjectId} user - The user who initiated the transaction.
 * @property {mongoose.Schema.Types.ObjectId} service - The service that was used.
 * @property {Date} timestamp - The exact time of the transaction.
 * @property {String} status - The outcome of the transaction ('completed', 'failed').
 * @property {Number} quantity - The number of units consumed (default is 1).
 * @property {mongoose.Schema.Types.Mixed} metadata - Optional field for storing extra data, like API response snippets or error messages.
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

    timestamp: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      required: true,
      enum: ['completed', 'failed'],
      default: 'completed',
    },

    quantity: {
      type: Number,
      default: 1,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);


// Index to optimize queries for a specific user's transactions, sorted by time.
TransactionSchema.index({ user: 1, timestamp: -1 });

// Index to optimize queries for transactions related to a specific service.
TransactionSchema.index({ service: 1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;