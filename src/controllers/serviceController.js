// controllers/serviceController.js

import Service from '../models/Service.js';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../utils/cloudinary.js';

// @desc    Get all ACTIVE services for frontend display
// @route   GET /api/services
// @access  Public
export const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find({ is_active: true });
    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single service by its ID
// @route   GET /api/services/:id
// @access  Public
export const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      res.status(404);
      throw new Error('Service not found with that ID');
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Admin Only)

export const createService = async (req, res, next) => {
  try {
    // When using multipart/form-data, req.body contains the text fields
    const serviceData = req.body;

    // Since FormData sends all values as strings, we need to parse the nested JSON fields.
    if (serviceData.combo_price && typeof serviceData.combo_price === 'string') {
        serviceData.combo_price = JSON.parse(serviceData.combo_price);
    }
    if (serviceData.inputFields && typeof serviceData.inputFields === 'string') {
        serviceData.inputFields = JSON.parse(serviceData.inputFields);
    }
    if (serviceData.outputFields && typeof serviceData.outputFields === 'string') {
        serviceData.outputFields = JSON.parse(serviceData.outputFields);
    }
    
    // Handle image upload if a file is present in the request
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'services');
      serviceData.imageUrl = result.secure_url;
    }

    const createdService = await Service.create(serviceData);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: createdService,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Update an existing service by its ID
// @route   PUT /api/services/:id
// @access  Private (Admin Only)
export const updateServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the existing service to check for an old image
    const existingService = await Service.findById(id);
    if (!existingService) {
        res.status(404);
        throw new Error('Service not found with that ID');
    }

    // If a new image is uploaded (req.file exists)
    if (req.file) {
        // 1. Delete the old image from Cloudinary if it exists
        if (existingService.imageUrl) {
            try {
                const publicId = getPublicIdFromUrl(existingService.imageUrl);
                await deleteFromCloudinary(publicId);
            } catch (cloudinaryError) {
                console.error("Failed to delete old image from Cloudinary:", cloudinaryError);
                // Decide if you want to proceed even if deletion fails
            }
        }

        // 2. Upload the new image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'services');
        updateData.imageUrl = result.secure_url;
    }

    // Since FormData sends all values as strings, we need to parse the nested JSON fields.
    if (updateData.combo_price && typeof updateData.combo_price === 'string') {
        updateData.combo_price = JSON.parse(updateData.combo_price);
    }
    if (updateData.inputFields && typeof updateData.inputFields === 'string') {
        updateData.inputFields = JSON.parse(updateData.inputFields);
    }
    if (updateData.outputFields && typeof updateData.outputFields === 'string') {
        updateData.outputFields = JSON.parse(updateData.outputFields);
    }

    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Delete a service by its ID
// @route   DELETE /api/services/:id
// @access  Private (Admin Only)
export const deleteServiceById = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id); 

    if (!service) {
      res.status(404);
      throw new Error('Service not found with that ID');
    }

    // Optionally delete image from Cloudinary when deleting the service
    if (service.imageUrl) {
        try {
            const publicId = getPublicIdFromUrl(service.imageUrl);
            await deleteFromCloudinary(publicId);
        } catch (cloudinaryError) {
            console.error("Failed to delete image from Cloudinary during service deletion:", cloudinaryError);
        }
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually update all services to set a default combo price.
 * @route   PUT /api/services/admin/manual-update
 * @access  Private/Admin
 */
export const manualUpdate = async (req, res, next) => {
  try {
    const updatePayload = {
      $set: {
        combo_price: {
          monthly: 299,
          yearly: 2990,
        },
      },
    };

    const result = await Service.updateMany({}, updatePayload);

    if (result.modifiedCount === 0 && result.matchedCount > 0) {
        return res.status(200).json({
            success: true,
            message: "All services already had the correct combo prices set. No documents were modified.",
            data: result,
        });
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated combo prices for ${result.modifiedCount} services.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllServices = async (req, res, next) => {
  try {
    // Note: This does not delete associated images from Cloudinary.
    // A more robust implementation would fetch all services, loop through them to delete images, then delete the DB entries.
    const result = await Service.deleteMany({});
    res.status(200).json({
      message: 'All services deleted successfully. Cloudinary images were not removed.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};



// @desc    Create multiple new services
// @route   POST /api/services/bulk
// @access  Private (Admin Only)
export const createMultipleServices = async (req, res, next) => {
  try {
    const servicesData = req.body; // Expect an array of service objects
    console.log('BODY TYPE:', typeof req.body);
console.log('BODY VALUE:', req.body)

    // Validate that servicesData is an array
    if (!Array.isArray(servicesData)) {
      res.status(400);
      throw new Error('Request body must be an array of service objects.');
    }

    const createdServices = [];
    const errors = [];

    for (const serviceData of servicesData) {
      try {
        // Parse nested JSON fields if they are strings (e.g., from FormData or if sent as stringified JSON)
        if (serviceData.combo_price && typeof serviceData.combo_price === 'string') {
            serviceData.combo_price = JSON.parse(serviceData.combo_price);
        }
        if (serviceData.inputFields && typeof serviceData.inputFields === 'string') {
            serviceData.inputFields = JSON.parse(serviceData.inputFields);
        }
        if (serviceData.outputFields && typeof serviceData.outputFields === 'string') {
            serviceData.outputFields = JSON.parse(serviceData.outputFields);
        }
        
        // Note: Image upload for multiple services in a single request can be complex.
        // This implementation assumes image URLs are provided within the serviceData
        // or that images are handled separately (e.g., pre-uploaded to Cloudinary).
        // If you need to handle multiple file uploads, you'd typically use 'upload.array()'
        // and link files to their respective service objects, which is beyond this simple bulk create.

        const createdService = await Service.create(serviceData);
        createdServices.push(createdService);
      } catch (error) {
        errors.push({ serviceData, error: error.message });
      }
    }

    if (createdServices.length > 0) {
      res.status(201).json({
        success: true,
        message: `${createdServices.length} services created successfully.`,
        data: createdServices,
        failed: errors.length > 0 ? errors : undefined,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No services were created. Check the provided data.',
        failed: errors,
      });
    }

  } catch (error) {
    next(error);
  }
};