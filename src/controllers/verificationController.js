// controllers/verificationController.js

import Service from '../models/Service.js';
import * as gridlines from '../services/gridLinesService.js';
import Transaction from '../models/TransactionModel.js'

// @desc    Handle all dynamic verification requests FOR FREE SERVICES
// @route   POST /api/verification/verify
// @access  Private (Protected, Rate-Limited)
export const handleVerificationRequest = async (req, res, next) => {
  const { serviceKey, payload } = req.body;

  if (!serviceKey) {
    res.status(400);
    return next(new Error('A serviceKey is required.'));
  }

  try {
    const service = await Service.findOne({ service_key: serviceKey });

    if (!service || !service.is_active) {
      res.status(404);
      return next(
        new Error(`Service with key '${serviceKey}' not found or is inactive.`)
      );
    }

    if (service.price && service.price > 0) {
      res.status(402); // 402 Payment Required
      return next(
        new Error(`This is a paid service. Please use the payment flow.`)
      );
    }

    let result;

    if (service.apiType === 'form') {
      if (!req.files && !req.file) {
        throw new Error('This service requires file uploads.');
      }
      const formData = new FormData();
      if (payload) {
        for (const key in payload) {
          formData.append(key, payload[key]);
        }
      }
      if (req.file) {
        formData.append(req.file.fieldname, req.file.buffer, req.file.originalname);
      } else if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach(file => {
            formData.append(file.fieldname, file.buffer, file.originalname);
          });
        } else {
          for (const key in req.files) {
            req.files[key].forEach(file => {
              formData.append(key, file.buffer, file.originalname);
            });
          }
        }
      }
      result = await gridlines.callFormApi(service.endpoint, formData);
    } else {
      if (!payload) {
        throw new Error('A payload object is required for this service.');
      }
      result = await gridlines.callJsonApi(service.endpoint, payload);
    }
    
    // On successful verification for a FREE service, create a completed transaction record.
    await Transaction.create({
      user: req.user._id,
      service: service._id,
      status: 'completed',
      amount: 0, // Free service
      metadata: {
        responseCode: result.code,
        message: result.message,
      },
    });

    // Send the successful result back to the frontend.
    res.status(200).json({
      success: true,
      data: result,
      outputFields: service.outputFields,
    });

  } catch (error) {
    next(error);
  }
};
