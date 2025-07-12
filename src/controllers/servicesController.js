
import Service from '../models/ServiceModel.js';

// @desc    Get all available services
// @route   GET /api/services
// @access  Public
export const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find({});
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
// @route   GET /api/services/:serviceId
// @access  Public
export const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.serviceId);

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