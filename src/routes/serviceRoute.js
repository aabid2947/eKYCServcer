import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateServiceById,
  deleteServiceById,
  deleteAllServices,
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // Updated imports

const router = express.Router();

router.route('/').get( getAllServices);

// Public route to get a single service
router.route('/:id').get(getServiceById);


router.route('/create').post(protect, authorize('admin'), createService);
router
  .route('/:id')
  .put(protect, authorize('admin'), updateServiceById)
  .delete(protect, authorize('admin'), deleteServiceById);

  
router.route('/deleteAll').delete(protect, authorize('admin'), deleteAllServices);


export default router;