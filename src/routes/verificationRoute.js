// routes/verificationRoute.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; 
import { executeSubscribedService,getUserVerificationHistory} from '../controllers/verificationController.js';
import { checkSubscription } from '../middleware/SubscriptionMiddleware.js'; 

const router = express.Router();

router
  .route('/verify')
  .post(protect, checkSubscription, executeSubscribedService);

  router.route('/verification-history').get(protect, getUserVerificationHistory);



export default router;