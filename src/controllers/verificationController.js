// controllers/verificationController.js

import Service from '../models/Service.js';
import * as gridlines from '../services/gridLinesService.js';

// @desc    Handle all dynamic verification requests
// @route   POST /api/verification/verify
// @access  Private (Protected, Rate-Limited)
export const handleVerificationRequest = async (req, res, next) => {
  const { serviceKey, payload } = req.body;

  if (!serviceKey || !payload) {
    res.status(400);
    return next(new Error('A serviceKey and payload are required.'));
  }

  try {
    // 1. Find the service in the DB using the key from the request.
    const service = await Service.findOne({ service_key: serviceKey });

    // 2. Handle non-existent or inactive services
    if (!service || !service.is_active) {
      res.status(404); // Not Found
      return next(
        new Error(`Service with key '${serviceKey}' not found or is inactive.`)
      );
    }

    let result;

    // 3. Route to the correct Gridlines API call based on the service_key
    // This switch statement is the core of the routing logic.
    switch (service.service_key) {
      case 'pan_father_name_lookup':
        result = await gridlines.getFathersNameByPan(payload.pan_number);
        break;

      case 'bank_account_verification':
        result = await gridlines.verifyBankAccount(
          payload.account_number,
          payload.ifsc
        );
        break;

      case 'aadhaar_ocr_v2':
        // NOTE: File uploads require 'multer' middleware on the route
        // This example assumes the file is available at req.file
        if (!req.file) throw new Error('Aadhaar image file is required.');
        result = await gridlines.extractAadhaarDataFromImage(req.file);
        break;
      
      // ... ADD A CASE FOR EVERY `service_key` IN YOUR DATABASE ...

      default:
        res.status(400);
        return next(new Error(`No verification logic defined for service key: '${serviceKey}'`));
    }

    // TODO: Here you could add logic to deduct credits from req.user
    // and increment service.globalUsageCount

    // 4. Send the successful result back to the frontend
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Pass any errors (from the DB, switch logic, or Gridlines service) to the error handler
    next(error);
  }
};