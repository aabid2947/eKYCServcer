import express from 'express';
import {
  addPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  getAllPricingPlans,
  addMultiplePricingPlans
} from '../controllers/pricingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; 

const router = express.Router();
router.route('/bulk').post( addMultiplePricingPlans);

router
  .route('/')
  .post(protect, authorize('admin'), addPricingPlan)
  .get(getAllPricingPlans);

router
  .route('/:id')
  .put(protect, authorize('admin'), updatePricingPlan)
  .delete(protect, authorize('admin'), deletePricingPlan);

export default router;