import express from 'express';
import {
  addPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  getAllPricingPlans,
  addMultiplePricingPlans,
  updateLimits,
  syncSubcategoriesInPlans
  
} from '../controllers/pricingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; 


const router = express.Router();
// router.route('/bulk').post( addMultiplePricingPlans);
// router.get('/test',updateLimits)
router
  .route('/')
  .post(protect, authorize('admin'), addPricingPlan)
  .get(getAllPricingPlans);
  // router.route('/sync-subcategories').post(syncSubcategoriesInPlans);

router
  .route('/:id')
  .put(protect, authorize('admin'), updatePricingPlan)
  .delete(protect, authorize('admin'), deletePricingPlan);

export default router;