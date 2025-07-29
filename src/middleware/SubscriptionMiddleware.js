// middleware/subscriptionMiddleware.js
import Service from '../models/Service.js';
import User from '../models/UserModel.js';

export const checkSubscription = async (req, res, next) => {
    try {
        const { serviceKey } = req.body;
        if (!serviceKey) {
            res.status(400);
            throw new Error('A serviceKey is required.');
        }

        const service = await Service.findOne({ service_key: serviceKey });
        if (!service) {
            res.status(404);
            throw new Error(`Service with key '${serviceKey}' not found.`);
        }

        const user = await User.findById(req.user.id);
        const { category } = service;

        // Check 1: Is the user promoted for this category by an admin?
        const isPromoted = user.promotedCategories.includes(category);
        if (isPromoted) {
            return next(); // Access granted
        }

        // Check 2: Does the user have an active, non-expired subscription?
        const activeSub = user.activeSubscriptions.find(sub => 
            sub.category === category && sub.expiresAt > new Date()
        );

        if (activeSub) {
            return next(); // Access granted
        }

        // If neither check passes, deny access.
        res.status(402); // 402 Payment Required
        throw new Error(`You do not have an active subscription for the '${category}' category. Please subscribe to use this service.`);

    } catch (error) {
        next(error);
    }
};