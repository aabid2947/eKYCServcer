// routes/serviceRoute.js

import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateServiceById,
  deleteServiceById,
  deleteAllServices,
} from '../controllers/serviceController.js';

// Import security middleware
import { protect, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Routes ---
// Anyone can get the list of active services or a single service by its ID
router.route('/').get(protect,getAllServices)
                //  .delete(deleteAllServices);
router.route('/:id').get(protect,getServiceById);


// --- Admin-Only Routes ---
// Chaining middleware: The request must first pass `protect` (is logged in),
// then `authorizeAdmin` (user has 'admin' role).

// Route to create a new service
// router.route('/').post( createService);

// Routes to update or delete a service by its ID
router
  .route('/:id')
  .put( updateServiceById)
  .delete(protect, authorizeAdmin, deleteServiceById);

export default router;