// controllers/serviceController.js

import Service from '../models/Service.js';

// @desc    Get all ACTIVE services for frontend display
// @route   GET /api/services
// @access  Public
export const getAllServices = async (req, res, next) => {
  try {
    // Only find services that are marked as active
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
    const servicesData = req.body;

    // 1. Validate the input
    // Ensure the body is a non-empty array.
    if (!Array.isArray(servicesData) || servicesData.length === 0) {
      res.status(400); // Bad Request
      throw new Error('Request body must be a non-empty array of services.');
    }

    // 2. Use insertMany for efficient bulk creation
    // This is much faster than a loop as it's a single database operation.
    // Mongoose will also validate each object in the array against the schema.
    const createdServices = await Service.insertMany(servicesData);

    // 3. Send a success response
    res.status(201).json({
      success: true,
      message: `${createdServices.length} service(s) created successfully`,
      data: createdServices,
    });
  } catch (error) {
    // This will catch any errors from insertMany, including:
    // - Validation errors (e.g., a required field is missing)
    // - Duplicate key errors (if a service_key already exists)
    next(error);
  }
};

// @desc    Update an existing service by its ID
// @route   PUT /api/services/:id
// @access  Private (Admin Only)
export const updateServiceById = async (req, res, next) => {
  try {
    const serviceId = req.params.id;
    const updateData = req.body;

    const updatedService = await Service.findByIdAndUpdate(serviceId, updateData, {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Run schema validators on update
    });

    if (!updatedService) {
      res.status(404);
      throw new Error('Service not found with that ID');
    }

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

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllServices = async (req, res, next) => {
  try {
    // deleteMany with no filter wipes the entire collection
    const result = await Service.deleteMany({});
    
    // result.deletedCount is the number of docs removed
    res.status(200).json({
      message: 'All services deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    // let your error‐handling middleware pick this up
    next(err);
  }
};