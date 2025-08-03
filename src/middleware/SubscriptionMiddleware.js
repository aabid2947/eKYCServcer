import Service from '../models/Service.js';
import PricingPlan from '../models/PricingModel.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc Middleware to check if a user has a valid and active subscription for a specific service.
 *       It verifies:
 *       1. The subscription is not expired.
 *       2. The usage limit for the plan has not been reached.
 *       3. The requested service is included in the user's subscription plan.
 * @access Private
 */
export const checkSubscription = asyncHandler(async (req, res, next) => {
    const { serviceKey } = req.body;
    const user = req.user;

    if (!serviceKey) {
        res.status(400);
        throw new Error('A serviceKey must be provided in the request body.');
    }

    // 1. Find the service to get its ID
    const service = await Service.findOne({ service_key: serviceKey, is_active: true });
    if (!service) {
        res.status(404);
        throw new Error(`Service with key '${serviceKey}' not found or is inactive.`);
    }

    // 2. Find a valid, active subscription that covers this service
    let validSubscription = null;
    let subscriptionIndex = -1;

    // Find all pricing plans that include this service
    const coveringPlans = await PricingPlan.find({ includedServices: service._id }).select('name');
    const coveringPlanNames = coveringPlans.map(p => p.name);

    // Now, check if the user is subscribed to any of these plans
    for (let i = 0; i < user.activeSubscriptions.length; i++) {
        const sub = user.activeSubscriptions[i];
        
        const isPlanCovered = coveringPlanNames.includes(sub.category); // sub.category holds the plan name
        const isNotExpired = sub.expiresAt > new Date();
        const hasUsageLeft = sub.usageCount < sub.usageLimit;

        if (isPlanCovered && isNotExpired && hasUsageLeft) {
            validSubscription = sub;
            subscriptionIndex = i;
            break; // Found a valid subscription, no need to check further
        }
    }

    if (!validSubscription) {
        res.status(403); // Forbidden
        throw new Error('You do not have a valid subscription to use this service, or you have reached your usage limit for the month.');
    }

    // 3. Attach the validated subscription and its index to the request object
    // This allows the next controller to know which subscription's usage to increment.
    req.subscription = validSubscription;
    req.subscriptionIndex = subscriptionIndex;

    next();
});