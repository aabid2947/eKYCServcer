// controllers/verificationController.js
import Service from '../models/Service.js';
import * as gridlines from '../services/gridLinesService.js';

/**
 * @desc    Execute a service for a user with a VALID subscription
 * @route   POST /api/verification/verify
 * @access  Private (Protected by 'protect' and 'checkSubscription' middleware)
 */
export const executeSubscribedService = async (req, res, next) => {
  const { serviceKey, payload } = req.body;

  try {
    const service = await Service.findOne({ service_key: serviceKey });
    
    if (!service || !service.is_active) {
      res.status(404);
      return next(new Error(`Service with key '${serviceKey}' not found or is inactive.`));
    }

    let result;
    if (service.apiType === 'form') {
      // Logic for form-data APIs
      const formData = new FormData();
      // ... (build formData from payload and req.files)
      result = await gridlines.callFormApi(service.endpoint, formData);
    } else {
      if (!payload) throw new Error('A payload object is required.');
      result = await gridlines.callJsonApi(service.endpoint, payload);
    }
    

    res.status(200).json({
      success: true,
      data: result,
      outputFields: service.outputFields,
    });

  } catch (error) {
    next(error);
  }
};