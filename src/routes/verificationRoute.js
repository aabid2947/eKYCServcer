// routes/verificationRoute.js

import express from 'express';
import { handleVerificationRequest } from '../controllers/verificationController.js';
import { protect } from '../middleware/authMiddleware.js'; 
import { verificationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router
  .route('/verify')
  .post(verificationLimiter, protect, handleVerificationRequest);

export default router;