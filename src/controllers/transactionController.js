import Transaction from '../models/TransactionModel.js';

/**
 * NOTE: This controller uses manual try-catch blocks to handle asynchronous errors.
 * Errors are passed to the global error handler middleware using `next(error)`.
 */

/**
 * @desc    Create a new transaction
 * @route   POST /api/transactions
 * @access  Private
 * @param   {object} req - Express request object, expects req.user and req.body
 * @param   {object} res - Express response object
 * @param   {function} next - Express next middleware function
 * @body    { serviceId: string, quantity?: number, metadata?: object }
 * @returns { success: boolean, data: Transaction }
 */
export const createTransaction = async (req, res, next) => {
  try {
    const { serviceId, quantity, metadata } = req.body;

    if (!serviceId) {
      res.status(400);
      // This error will be caught by the catch block below
      throw new Error('Service ID is required');
    }

    const transaction = await Transaction.create({
      user: req.user.id, // Comes from 'protect' middleware
      service: serviceId,
      quantity,
      metadata,
      status: 'completed',
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    // Pass any caught errors to the global error handler
    next(error);
  }
};

/**
 * @desc    Get transactions for the logged-in user (paginated)
 * @route   GET /api/transactions/me
 * @access  Private
 * @param   {object} req - Express request object, expects req.user and req.query
 * @param   {object} res - Express response object
 * @param   {function} next - Express next middleware function
 * @query   { page?: number, limit?: number }
 * @returns { success: boolean, count: number, pagination: object, data: Transaction[] }
 */
export const getUserTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Transaction.countDocuments({ user: req.user.id });
    const transactions = await Transaction.find({ user: req.user.id })
      .populate('service', 'name price')
      .populate('user', 'name email')    
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        total,
        page,
        limit,
        next: skip + limit < total ? page + 1 : null,
        prev: page > 1 ? page - 1 : null,
      },
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions (admin only)
 * @route   GET /api/admin/transactions
 * @access  Private/Admin
 * @param   {object} req - Express request object
 * @param   {object} res - Express response object
 * @param   {function} next - Express next middleware function
 * @returns { success: boolean, data: Transaction[] }
 */
export const getAllTransactions = async (req, res, next) => {
  try {
    // Advanced filtering could be added here from req.query
    const transactions = await Transaction.find({})
      .populate('user', 'name email')
      .populate('service', 'name price');

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregated service usage statistics (admin only)
 * @route   GET /api/admin/transactions/stats
 * @access  Private/Admin
 * @param   {object} req - Express request object
 * @param   {object} res - Express response object
 * @param   {function} next - Express next middleware function
 * @returns { success: boolean, data: object[] }
 */
export const getServiceUsageStats = async (req, res, next) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$service', // Group by service ID
          usageCount: { $sum: '$quantity' }, // Sum the quantity for each service
        },
      },
      {
        $lookup: {
          from: 'services', // The actual collection name for the Service model
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDetails',
        },
      },
      {
        $unwind: '$serviceDetails',
      },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: '$serviceDetails.name',
          serviceKey: '$serviceDetails.service_key',
          totalUsage: '$usageCount',
        },
      },
      {
        $sort: { totalUsage: -1 },
      },
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};