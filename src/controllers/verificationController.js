// controllers/verificationController.js

import Service from '../models/Service.js';
import * as gridlines from '../services/gridLinesService.js';
import VerificationResult from '../models/VerificationResultModel.js';
import FormData from 'form-data';

/**
 * @desc    Execute a service for a user with a VALID subscription
 * @route   POST /api/verification/verify
 * @access  Private (Protected by middleware)
 */
export const executeSubscribedService = async (req, res, next) => {
  // Text fields are in req.body, and uploaded files are now in req.files.
  const { serviceKey } = req.body;
  const user = req.user;
  
  // Reconstruct the payload by removing the serviceKey from the body.
  const payload = { ...req.body };
  delete payload.serviceKey;

  const service = await Service.findOne({ service_key: serviceKey });

  try {
    if (!service) {
      res.status(404);
      return next(new Error(`Service with key '${serviceKey}' not found.`));
    }

    let result;

    // Determine how to call the external API based on the service's defined apiType.
    if (service.apiType === 'form') {
      // For services requiring file uploads or form-data.
      const externalFormData = new FormData();
      
      // Append all text fields from the payload.
      for (const key in payload) {
        externalFormData.append(key, payload[key]);
      }
      
      // **UPDATED LOGIC**: Process multiple files from `req.files` instead of a single `req.file`
      if (req.files) {
        // Find all fields that are defined as file inputs for this service
        const serviceFileFields = service.inputFields.filter(f => f.type === 'file');

        // Loop through each defined file field (e.g., 'file', 'file_back')
        serviceFileFields.forEach(field => {
          // Check if a file was uploaded for this specific field name
          if (req.files[field.name] && req.files[field.name].length > 0) {
            const uploadedFile = req.files[field.name][0]; // Get the actual file object
            
            // Append the file buffer to the external form data using the correct field name
            externalFormData.append(field.name, uploadedFile.buffer, {
                filename: uploadedFile.originalname,
                contentType: uploadedFile.mimetype,
            });
          }
        });
      }
      
      result = await gridlines.callFormApi(service.endpoint, externalFormData,payload.reference_id);

    } else {
      // For standard JSON-based services, the existing logic is used.
      if (Object.keys(payload).length === 0) {
          throw new Error('A payload object is required for JSON APIs.');
      }
      result = await gridlines.callJsonApi(service.endpoint, payload);
    }

    // --- The rest of the function remains unchanged ---

    await VerificationResult.create({
      verificationId: `VRF-${Date.now()}`,
      user: user._id,
      service: service._id,
      status: 'success',
      inputPayload: payload,
      resultData: result,
    });

    user.activeSubscriptions[req.subscriptionIndex].usageCount += 1;
    service.globalUsageCount += 1;

    const serviceUsageIndex = user.usedServices.findIndex(
      s => s.service.toString() === service._id.toString()
    );

    if (serviceUsageIndex > -1) {
      const usedService = user.usedServices[serviceUsageIndex];
      usedService.usageTimestamps.push(new Date());
      usedService.usageCount = usedService.usageTimestamps.length;
      usedService.serviceName = service.name;
      usedService.subcategory = service.subcategory;
    } else {
      user.usedServices.push({
        service: service._id,
        serviceName: service.name,
        subcategory: service.subcategory,
        usageTimestamps: [new Date()],
        usageCount: 1,
      });
    }

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
        resultData: error.response?.data, 
        errorMessage: error.message,
      });
    }
     const msg = error?.message || error?.metadata?.fields?.[0]?.message || `Request failed`;
    next(error);
  }
};

/**
 * @desc    Get the user's verification history with pagination
 * @route   GET /api/verification/verification-history
 * @access  Private
 */
export const getUserVerificationHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const total = await VerificationResult.countDocuments({ user: req.user.id });
    const results = await VerificationResult.find({ user: req.user.id })
      .populate('service', 'name service_key imageUrl category')
      .sort({ createdAt: -1 })
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