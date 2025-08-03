// controllers/serviceController.js

import Service from '../models/Service.js';

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
    const serviceData = req.body;
    
    if (!serviceData || typeof serviceData !== 'object' || Array.isArray(serviceData)) {
      res.status(400);
      throw new Error('Request body must be a valid service object.');
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
    // Destructure all possible fields, including combo_price
    const { name, service_key, description, endpoint, price, combo_price, category, is_active } = req.body.changes;
    
    // Construct the update object dynamically to only include provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (service_key) updateData.service_key = service_key;
    if (description) updateData.description = description;
    if (endpoint) updateData.endpoint = endpoint;
    if (price) updateData.price = price;
    if (category) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Specifically handle the nested combo_price object
    if (combo_price) {
        if (combo_price.monthly) updateData['combo_price.monthly'] = combo_price.monthly;
        if (combo_price.yearly) updateData['combo_price.yearly'] = combo_price.yearly;
    }
   
    const updated = await Service.findByIdAndUpdate(id, { $set: updateData }, {
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
    const result = await Service.deleteMany({});
    res.status(200).json({
      message: 'All services deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
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