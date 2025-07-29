import Service from '../models/Service.js';
import User from '../models/UserModel.js'; // Import the User model
import * as gridlines from '../services/gridLinesService.js';

/**
 * @desc    Execute a service for a user with a VALID subscription
 * @route   POST /api/verification/verify
 * @access  Private (Protected by 'protect' and 'checkSubscription' middleware)
 */
export const executeSubscribedService = async (req, res, next) => {
  const { serviceKey, payload } = req.body;
  const user = req.user; // Assuming 'protect' middleware attaches user to req

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
      result = await gridlines.callFormApi(service.endpoint, formData);
    } else {
      if (!payload) throw new Error('A payload object is required.');
      result = await gridlines.callJsonApi(service.endpoint, payload);
    }


    // Increment the global usage count for the service
    service.globalUsageCount += 1;

    // Find the service in the user's usedServices array
    const serviceUsageIndex = user.usedServices.findIndex(
      (s) => s.service.toString() === service._id.toString()
    );

    if (serviceUsageIndex > -1) {
      // If found, increment the usage count
      user.usedServices[serviceUsageIndex].usageCount += 1;
    } else {
      // If not found, add the new service to the array
      user.usedServices.push({ service: service._id,serviceName:service.name, usageCount: 1 });
    }

    // Concurrently save the updated service and user documents
    await Promise.all([service.save(), user.save()]);


    res.status(200).json({
      success: true,
      data: result,
      outputFields: service.outputFields,
    });

  } catch (error) {
    next(error);
  }
};