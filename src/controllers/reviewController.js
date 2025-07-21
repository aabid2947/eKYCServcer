import { check, validationResult } from 'express-validator';
import Review from '../models/ReviewModel.js';
import Transaction from '../models/TransactionModel.js';
import Service from '../models/Service.js';


/**
 * @description Create a new review for a transaction.
 * @route POST /api/reviews
 * @access Private
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 *
 * @example_request_body
 * {
 * "transactionId": "60c72b2f9b1d8c001f8e4c6a",
 * "rating": 5,
 * "comment": "Excellent service!"
 * }
 *
 * @example_success_response
 * {
 * "success": true,
 * "data": { ...review object... }
 * }
 *
 * @example_error_response
 * { "success": false, "error": "You have already submitted the maximum number of reviews." }
 */
export const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { transactionId, rating, comment } = req.body;
  const userId = req.user.id;

  try {
    // Check if user has already submitted 3 reviews
    const userReviewCount = await Review.countDocuments({ user: userId });
    if (userReviewCount >= 3) {
      return res.status(403).json({ success: false, error: 'You have already submitted the maximum number of reviews (3).' });
    }

    // Verify the transaction exists, belongs to the user, and is completed
    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.user.toString() !== userId) {
      return res.status(404).json({ success: false, error: 'Transaction not found or does not belong to you.' });
    }
    if (transaction.status !== 'completed') {
        return res.status(400).json({ success: false, error: 'Cannot review a transaction that was not completed.' });
    }

    //  Check if a review for this transaction already exists
    const existingReview = await Review.findOne({ transaction: transactionId });
    if (existingReview) {
      return res.status(400).json({ success: false, error: 'A review for this transaction already exists.' });
    }

    //  Create and save the new review
    const review = await Review.create({
      transaction: transactionId,
      user: userId,
      service: transaction.service,
      rating,
      comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
        return res.status(400).json({ success: false, error: 'A review for this transaction has already been submitted.' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


/**
 * @description Update an existing review.
 * @route PATCH /api/reviews/:id
 * @access Private (Author only)
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
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

        // Check if the user is the author of the review
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
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
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
 * @route GET /api/users/me/reviews
 * @access Private
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
export const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user.id }).populate('service', 'name');
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
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
export const getAllReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Fetching all reviews with user and service details populated
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
 * @description Delete a review by its ID.
 * @route DELETE /api/reviews/:id
 * @access Private (Author or Admin)
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
export const deleteReviewById = async (req, res) => {
    try {
        const review = await Review.findOneAndDelete(req.params.id);
       

        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }


        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};