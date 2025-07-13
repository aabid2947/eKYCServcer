// routes/verificationRoute.js

import express from 'express';
import { handleVerificationRequest } from '../controllers/verificationController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming this exists
import { verificationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// This is the single, central endpoint for all verification services.
// 1. verificationLimiter: First, apply rate limiting to prevent spam.
// 2. protect: Second, ensure the user is authenticated and logged in.
// 3. handleVerificationRequest: Finally, pass the request to the controller.
router
  .route('/verify')
  .post(verificationLimiter, protect, handleVerificationRequest);

export default router;