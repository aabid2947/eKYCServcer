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
    // Mongoose will validate each object in the array against the updated schema.
    const createdServices = await Service.insertMany(servicesData);

    // 3. Send a success response
    res.status(201).json({
      success: true,
      message: `${createdServices.length} service(s) created successfully`,
      data: createdServices,
    });
  } catch (error) {
    // This will catch any errors, including validation or duplicate key errors.
    next(error);
  }
};

// @desc    Update an existing service by its ID
// @route   PUT /api/services/:id
// @access  Private (Admin Only)
export const updateServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, service_key, description, endpoint, price, category, is_active } = req.body.changes;
    const updateData = { name, service_key, description, endpoint, price, category, is_active };
   
    
    const updated = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404);
      throw new Error('Service not found with that ID');
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updated,
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
    const key = req.params.id; 
    const service = await Service.findOneAndDelete({ service_key: key });

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
    // let your error-handling middleware pick this up
    next(err);
  }
};