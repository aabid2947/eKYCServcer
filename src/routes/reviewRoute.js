import express from 'express';
import { check } from 'express-validator';
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

// Route to get reviews for a specific service
// This will be nested under the service routes, e.g., /api/services/:serviceId/reviews
router.route('/').get(getServiceReviews);

// Standalone review routes
const reviewRouter = express.Router();

reviewRouter
  .route('/')
  .post(
    [
      protect,
      check('transactionId', 'Transaction ID is required').not().isEmpty(),
      check('rating', 'Rating must be a number between 1 and 5').isInt({ min: 1, max: 5 }),
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
        
    )


reviewRouter.route('/:id').delete(protect,authorize('admin'),deleteReviewById)
reviewRouter
    .route('/all')
    .get(protect, getAllReviews);


reviewRouter.route('/me').get(protect, getMyReviews);


export { router as serviceReviewRoutes, reviewRouter };