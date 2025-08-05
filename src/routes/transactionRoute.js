// routes/transactionRoute.js

import express from 'express';
import {
  getUserTransactions,
  getAllTransactions,
  getServiceUsageStats,
  getUserServiceUsage, // Import the new controller function
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get transactions for the currently logged-in user
router.route('/me').get(protect, getUserTransactions);

// Get a user's service usage stats (for admins or the user themselves)
router.route('/usage').get(protect, getUserServiceUsage);

// --- Admin Routes ---

// Get all transactions in the system
router.route('/admin/all').get( getAllTransactions);

// Get revenue statistics for subscription sales
router.route('/admin/stats').get(protect, authorize('admin'), getServiceUsageStats);

export default router;