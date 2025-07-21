// controllers/verificationController.js

import Service from '../models/Service.js';
import * as gridlines from '../services/gridLinesService.js';
import Transaction from '../models/TransactionModel.js'

// @desc    Handle all dynamic verification requests
// @route   POST /api/verification/verify
// @access  Private (Protected, Rate-Limited)
export const handleVerificationRequest = async (req, res, next) => {
  // The frontend sends a 'serviceKey' and a 'payload' object.
  const { serviceKey, payload } = req.body;

  if (!serviceKey) {
    res.status(400);
    return next(new Error('A serviceKey is required.'));
  }

  try {
    //  Find the service in the DB using the key from the request.
    const service = await Service.findOne({ service_key: serviceKey });

    //  Handle non-existent or inactive services.
    if (!service || !service.is_active) {
      res.status(404); // Not Found
      return next(
        new Error(`Service with key '${serviceKey}' not found or is inactive.`)
      );
    }

    let result;

    //  Dynamically call the Gridlines API based on the service's configuration
    if (service.apiType === 'form') {
      // Handle file uploads (form data)
      if (!req.files && !req.file) {
        throw new Error('This service requires file uploads.');
      }

      const formData = new FormData();

      // Append text fields from payload to formData
      if (payload) {
        for (const key in payload) {
          formData.append(key, payload[key]);
        }
      }

      // Append files to formData
      // This handles single (req.file) and multiple (req.files) uploads
      if (req.file) {
        formData.append(req.file.fieldname, req.file.buffer, req.file.originalname);
      } else if (req.files) {
        if (Array.isArray(req.files)) { // Array of files
          req.files.forEach(file => {
            formData.append(file.fieldname, file.buffer, file.originalname);
          });
        } else { // Object of files
          for (const key in req.files) {
            req.files[key].forEach(file => {
              formData.append(key, file.buffer, file.originalname);
            });
          }
        }
      }

      result = await gridlines.callFormApi(service.endpoint, formData);

    } else {
      // Handle standard JSON requests
      if (!payload) {
        throw new Error('A payload object is required for this service.');
      }
      result = await gridlines.callJsonApi(service.endpoint, payload);
    }
    // On successful verification, create a transaction record.
    await Transaction.create({
      user: req?.user?._id , // User ID from the 'protect' middleware
      service: service._id, // The ID of the service document
      status: 'completed',
      metadata: {
        // Storing a non-sensitive part of the result for reference
        responseCode: result.code,
        message: result.message,
      },
    });



    // 4. Send the successful result back to the frontend.
    res.status(200).json({
      success: true,
      data: result,
      
      outputFields: service.outputFields,
    });

  } catch (error) {
   
    next(error);
  }
};