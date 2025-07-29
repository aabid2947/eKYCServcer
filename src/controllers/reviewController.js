import { validationResult } from 'express-validator';
import Review from '../models/ReviewModel.js';
import Transaction from '../models/TransactionModel.js';
// Service model is not directly needed for creation but good for context
// import Service from '../models/Service.js';


/**
 * @description Create a new review for a transaction. The review can be general, for a service, or for a category.
 * @route POST /api/reviews
 * @access Private
 */
export const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { transactionId, rating, comment, serviceId, category } = req.body;
  const userId = req.user.id;

  try {
    // 1. Verify the transaction exists, belongs to the user, and is completed
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }
    if (transaction.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'This transaction does not belong to you.' });
    }
    if (transaction.status !== 'completed') {
        return res.status(400).json({ success: false, error: 'Cannot review a transaction that was not completed.' });
    }

    // 2. Check if the user has already reviewed the specific service or category.
    // The database index provides a robust final check, but this gives a clearer error message.
    if (serviceId) {
      const existingServiceReview = await Review.findOne({ user: userId, service: serviceId });
      if (existingServiceReview) {
        return res.status(400).json({ success: false, error: 'You have already submitted a review for this service.' });
      }
    } else if (category) {
      const existingCategoryReview = await Review.findOne({ user: userId, category });
      if (existingCategoryReview) {
        return res.status(400).json({ success: false, error: 'You have already submitted a review for this category.' });
      }
    }

    // 3. Prepare review data
    const reviewData = {
      transaction: transactionId,
      user: userId,
      rating,
      comment,
    };

    if (serviceId) {
      reviewData.service = serviceId;
    } else if (category) {
      reviewData.category = category;
    }

    // 4. Create and save the new review
    const review = await Review.create(reviewData);

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    // This will catch duplicate key errors from any of the unique indexes
    if (error.code === 11000) {
        return res.status(400).json({ success: false, error: 'A review for this transaction or item has already been submitted.' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


/**
 * @description Update an existing review.
 * @route PATCH /api/reviews/:id
 * @access Private (Author only)
 */
export const updateReview = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }

        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized to update this review' });
        }

        const { rating, comment } = req.body;
        if (rating) review.rating = rating;
        if (comment !== undefined) review.comment = comment;

        await review.save();

        res.status(200).json({ success: true, data: review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @description Get all reviews for a specific service.
 * @route GET /api/services/:serviceId/reviews
 * @access Public
 */
export const getServiceReviews = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ service: serviceId })
            .populate('user', 'name') 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({ service: serviceId });

        res.status(200).json({
            success: true,
            count: reviews.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: reviews,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};


/**
 * @description Get all reviews written by the current user.
 * @route GET /api/reviews/me
 * @access Private
 */
export const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user.id })
            .populate('service', 'name')
            .populate('user', 'name');

        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @description Get all reviews in the system (Admin only).
 * @route GET /api/reviews/all
 * @access Private/Admin
 */
export const getAllReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({})
            .populate('user', 'name email') 
            .populate('service', 'name')     
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({});

        res.status(200).json({
            success: true,
            count: reviews.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: reviews,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
}

/**
 * @description Delete a review by its ID (Admin only).
 * @route DELETE /api/reviews/:id
 * @access Private/Admin
 */
export const deleteReviewById = async (req, res) => {
    try {
        // findByIdAndDelete is more idiomatic for this operation
        const review = await Review.findByIdAndDelete(req.params.id);
       
        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};