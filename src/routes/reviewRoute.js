import express from 'express';
import { check, body } from 'express-validator';
import {
  createReview,
  updateReview,
  getServiceReviews,
  getMyReviews,
  getAllReviews,
  deleteReviewById
} from '../controllers/reviewController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Route to get reviews for a specific service (no change needed)
router.route('/').get(getServiceReviews);

// Standalone review routes
const reviewRouter = express.Router();

reviewRouter
  .route('/')
  .post(
    [
      protect,
      check('transactionId', 'Transaction ID is required').not().isEmpty().isMongoId(),
      check('rating', 'Rating must be a number between 1 and 5').isInt({ min: 1, max: 5 }),
      check('comment', 'Comment must be a string').optional().isString().trim(),
      // Optional fields for specific reviews
      check('serviceId', 'Invalid Service ID format').optional().isMongoId(),
      check('category', 'Category must be a string').optional().isString().trim(),
      // Custom validator to ensure serviceId and category are mutually exclusive
      body().custom((value, { req }) => {
          if (req.body.serviceId && req.body.category) {
              throw new Error('Please provide either a serviceId or a category to review, not both.');
          }
          return true;
      })
    ],
    createReview
  );

reviewRouter
    .route('/:id')
    .patch(
        [
            protect,
            check('rating', 'Rating must be a number between 1 and 5').optional().isInt({ min: 1, max: 5 }),
            check('comment', 'Comment must be a string').optional().isString(),
        ],
        updateReview
    );

reviewRouter.route('/:id').delete(protect, authorize('admin'), deleteReviewById);

reviewRouter
    .route('/all')
    .get(
      protect,
     getAllReviews); // Ensured admin access

reviewRouter.route('/me').get(protect, getMyReviews);

export { router as serviceReviewRoutes, reviewRouter };