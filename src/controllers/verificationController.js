import Service from '../models/Service.js';
import User from '../models/UserModel.js'; // User model is already imported
import * as gridlines from '../services/gridLinesService.js';
import VerificationResult from '../models/VerificationResultModel.js';
/**
 * @desc    Execute a service for a user with a VALID subscription
 * @route   POST /api/verification/verify
 * @access  Private (Protected by 'protect' and 'checkSubscription' middleware)
 */
export const executeSubscribedService = async (req, res, next) => {
  // The 'checkSubscription' middleware has already validated the user and their subscription.
  // It attaches the subscription to req.subscription and its index to req.subscriptionIndex.
  const { serviceKey, payload } = req.body;
  const user = req.user; 

  try {
    const service = await Service.findOne({ service_key: serviceKey });
    
    // This check is redundant as the middleware already does it, but serves as a good failsafe.
    if (!service) {
      res.status(404);
      return next(new Error(`Service with key '${serviceKey}' not found.`));
    }

    let result;
    if (service.apiType === 'form') {
      const formData = new FormData();
      // NOTE: You need to populate formData from req.files and req.body here
      result = await gridlines.callFormApi(service.endpoint, formData);
    } else {
      if (!payload) throw new Error('A payload object is required for JSON APIs.');
      result = await gridlines.callJsonApi(service.endpoint, payload);
    }



      await VerificationResult.create({
      verificationId: `VRF-${Date.now()}`,
      user: user._id,
      service: service._id,
      status: 'success',
      inputPayload: payload,
      resultData: result, 
    });
    // 1. Increment the usage count on the specific subscription that was used
    user.activeSubscriptions[req.subscriptionIndex].usageCount += 1;
    
    // 2. Increment the global usage count for the service (for general analytics)
    service.globalUsageCount += 1;

    // 3. Increment the user's historical usage log (for their personal history)
    const serviceUsageIndex = user.usedServices.findIndex(
      (s) => s.service.toString() === service._id.toString()
    );

    if (serviceUsageIndex > -1) {
      user.usedServices[serviceUsageIndex].usageCount += 1;
    } else {
      user.usedServices.push({ service: service._id, serviceName: service.name, usageCount: 1 });
    }

    // Concurrently save the updated service and user documents
    await Promise.all([service.save(), user.save({ validateModifiedOnly: true })]);

    res.status(200).json({
      success: true,
      data: result,
      outputFields: service.outputFields,
    });

  } catch (error) {
     if (user && service) {
      await VerificationResult.create({
        verificationId: `VRF-${Date.now()}`,
        user: user._id,
        service: service._id,
        status: 'failed',
        inputPayload: payload,
        resultData: error.response?.data, // Store the API's error response if available
        errorMessage: error.message,
      });
    }
    next(error);
  }
};


export const getUserVerificationHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await VerificationResult.countDocuments({ user: req.user.id });
    
    const results = await VerificationResult.find({ user: req.user.id })
      .populate('service', 'name service_key imageUrl category') // Populate service details
      .sort({ createdAt: -1 }) // Show most recent first
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: results.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: results,
    });
  } catch (error) {
    next(error);
  }
};