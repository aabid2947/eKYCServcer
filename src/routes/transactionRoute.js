

import express from 'express';
import {
  createTransaction,
  getUserTransactions,
  getAllTransactions,
  getServiceUsageStats,
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // Updated imports

const router = express.Router();

router
  .route('/')
  .post(protect, createTransaction);

router.route('/me').get(protect, getUserTransactions);

// router.route('/admin/all').get(protect, authorize('admin'), getAllTransactions);
router.route('/admin/all').get( getAllTransactions);

router.route('/admin/stats').get(protect, authorize('admin'), getServiceUsageStats);

export default router;