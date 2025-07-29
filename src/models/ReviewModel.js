import mongoose from 'mongoose';

/**
 * @typedef {Object} Review
 * @property {mongoose.Schema.Types.ObjectId} transaction - The completed transaction this review is for.
 * @property {mongoose.Schema.Types.ObjectId} user - The user who wrote the review.
 * @property {mongoose.Schema.Types.ObjectId} [service] - The specific service being reviewed (optional).
 * @property {String} [category] - The service category being reviewed (optional).
 * @property {Number} rating - The star rating from 1 to 5.
 * @property {String} [comment] - An optional text comment.
 */
const ReviewSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true, // A single transaction can only be reviewed once.
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: false, // Make service optional for general or category-level reviews.
    },
    category: {
        type: String,
        required: false, // Add category for category-level reviews.
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ReviewSchema.index({ service: 1, rating: -1 });
ReviewSchema.index({ category: 1, rating: -1 });
ReviewSchema.index({ user: 1 });

// A user can only review a specific service once.
// This index is applied only when the 'service' field exists.
ReviewSchema.index({ user: 1, service: 1 }, { unique: true, partialFilterExpression: { service: { $exists: true } } });

// A user can only review a specific category once.
// This index is applied only when the 'category' field exists.
ReviewSchema.index({ user: 1, category: 1 }, { unique: true, partialFilterExpression: { category: { $exists: true } } });


const Review = mongoose.model('Review', ReviewSchema);
export default Review;