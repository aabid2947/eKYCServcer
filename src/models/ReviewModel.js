import mongoose from 'mongoose';

/**
 * @typedef {Object} Review
 * @property {mongoose.Schema.Types.ObjectId} transaction - The transaction this review is for.
 * @property {mongoose.Schema.Types.ObjectId} user - The user who wrote the review.
 * @property {mongoose.Schema.Types.ObjectId} service - The service being reviewed.
 * @property {Number} rating - The star rating from 1 to 5.
 * @property {String} comment - An optional text comment.
 */
const ReviewSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true, 
    },
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

// Index to find reviews for a specific service, sorted by rating
ReviewSchema.index({ service: 1, rating: -1 });

// Index to quickly find a user's reviews
ReviewSchema.index({ user: 1 });


const Review = mongoose.model('Review', ReviewSchema);
export default Review;