// routes/serviceRoute.js

import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateServiceById,
  deleteServiceById,
  deleteAllServices,
  manualUpdate,
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to get all active services
router.route('/').get(getAllServices);

// Admin route to create a new service
router.route('/').post(protect, authorize('admin'), createService);

// Public route to get a single service by its ID
router.route('/:id').get(getServiceById);

// Admin routes to update or delete a specific service by its ID
router
  .route('/:id')
  .put(protect, authorize('admin'), updateServiceById)
  .delete(protect, authorize('admin'), deleteServiceById);

// Utility admin route to delete all services
router.route('/deleteAll').delete(protect, authorize('admin'), deleteAllServices);
// Utility admin route for manual updates
// router.route('/admin/manual-update').put(protect, authorize('admin'), manualUpdate);

export default router;