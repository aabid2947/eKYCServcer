
import express from 'express';
import { param } from 'express-validator';
import { getAllServices, getServiceById } from '../controllers/servicesController.js';

const router = express.Router();

// @route   GET /api/services
// A public route to see all available services
router.get('/', getAllServices);

// @route   GET /api/services/:serviceId
// A public route to get details of a single service
router.get(
  '/:serviceId',
  [
    param('serviceId')
      .isMongoId()
      .withMessage('Invalid Service ID format.'),
  ],
  getServiceById
);

// --- NOTE ---
// The logic for a user to "use" a service will be added later.
// It would likely be a POST request to a route like '/api/services/use/:serviceId'
// and would be protected by the auth middleware.

export default router;