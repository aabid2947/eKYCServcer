import Service from '../models/Service.js';
import PricingPlan from '../models/PricingModel.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc Middleware to check if a user has a valid and active subscription for a specific service.
 * It verifies:
 * 1. The subscription is not expired.
 * 2. The usage limit for the plan has not been reached.
 * 3. The requested service is included in the user's subscription plan.
 * If a subscription for the service is found to be invalid (expired or usage limit reached), it is removed.
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

    // 2. Find a valid, active subscription that covers this service and clean up invalid ones.
    let validSubscription = null;
    let subscriptionIndex = -1;
    const invalidSubsForThisServiceIndices = [];

    // Find all pricing plans that include this service
    const coveringPlans = await PricingPlan.find({ includedServices: service._id }).select('name');
    const coveringPlanNames = coveringPlans.map(p => p.name);

    // Iterate through all user subscriptions to find a valid one for the requested service.
    // Along the way, collect indices of subscriptions for this service that are invalid (expired or used up).
    for (let i = 0; i < user.activeSubscriptions.length; i++) {
        const sub = user.activeSubscriptions[i];
        
        const isPlanCovered = coveringPlanNames.includes(sub.category);
        const isNotExpired = sub.expiresAt > new Date();
        const hasUsageLeft = sub.usageCount < sub.usageLimit;

        if (isPlanCovered) {
            if (isNotExpired && hasUsageLeft) {
                // This is a valid subscription for the service.
                // If we haven't found one yet, assign it. We don't break, to ensure we check all subs.
                if (!validSubscription) {
                    validSubscription = sub;
                    subscriptionIndex = i;
                }
            } else {
                // This subscription is for the correct service but is invalid. Flag it for removal.
                invalidSubsForThisServiceIndices.push(i);
            }
        }
    }

    // 3. Handle the outcome of the subscription check
    if (!validSubscription) {
        // No valid subscription was found. Remove any invalid ones we found for this service.
        if (invalidSubsForThisServiceIndices.length > 0) {
            // Filter out subscriptions using their indices. This is safe from index shifting issues
            // as we are creating a new array.
            user.activeSubscriptions = user.activeSubscriptions.filter(
                (_, index) => !invalidSubsForThisServiceIndices.includes(index)
            );
            await user.save(); // Persist the changes to the user document.
        }

        res.status(403); // Forbidden
        throw new Error('You do not have a valid subscription to use this service, or you have reached your usage limit for the month.');
    }

    // A valid subscription was found. Attach it to the request and proceed.
    req.subscription = validSubscription;
    req.subscriptionIndex = subscriptionIndex;

    next();
});
