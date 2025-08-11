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

    // 1. Find the service to get its ID, category, and subcategory
    const service = await Service.findOne({ service_key: serviceKey, is_active: true });
    if (!service) {
        res.status(404);
        throw new Error(`Service with key '${serviceKey}' not found or is inactive.`);
    }

    // 2. Find all explicit pricing plans that include this service (e.g., "Personal", "Enterprise")
    const explicitPlans = await PricingPlan.find({ includedServices: service._id }).select('name');
    const explicitPlanNames = new Set(explicitPlans.map(p => p.name));

    // 3. Find a valid, active subscription that covers this service and clean up invalid ones.
    let validSubscription = null;
    let subscriptionIndex = -1;
    const invalidSubsIndices = [];

    // console.log(user)
    for (let i = 0; i < user.activeSubscriptions.length; i++) {
        const sub = user.activeSubscriptions[i];
        let isPlanCovered = false;
        // console.log(sub)

        // --- FIX: Determine if the subscription covers the service ---
        // A plan is covered if:
        // a) The plan name directly matches the service's category or subcategory.
        // b) The service is explicitly listed in a bundled plan (like "Personal").
        if (
            (service.category && sub.category === service.category) ||
            (service.subcategory && sub.category === service.subcategory) ||
            explicitPlanNames.has(sub.category)
        ) {
            isPlanCovered = true;
        }
        // console.log(isPlanCovered)
        
        // Only evaluate subscriptions that are meant for this service.
        if (isPlanCovered) {
            const isNotExpired = sub.expiresAt > new Date();
            const hasUsageLeft = sub.usageCount < sub.usageLimit;

            if (isNotExpired && hasUsageLeft && !validSubscription) {
                // This is a valid subscription. Store it and its index.
                // We only need to find the first valid one.
                validSubscription = sub;
                subscriptionIndex = i;
            } else if (!isNotExpired || !hasUsageLeft) {
                // This subscription is for the correct service but is invalid. Flag it for removal.
                invalidSubsIndices.push(i);
            }
        }
        // --- FIX: Removed the incorrect 'else' block that would flag all other subscriptions for deletion.
    }

    // 4. Handle the outcome of the subscription check
    if (validSubscription) {
        // A valid subscription was found. Attach it to the request and proceed.
        req.subscription = validSubscription;
        req.subscriptionIndex = subscriptionIndex;
        return next();
    }

    // 5. If no valid subscription was found, clean up any invalid ones and throw an error.
    if (invalidSubsIndices.length > 0) {
        // Filter out subscriptions using their indices. This is safe as we are creating a new array.
        user.activeSubscriptions = user.activeSubscriptions.filter(
            (_, index) => !invalidSubsIndices.includes(index)
        );
        await user.save(); // Persist the changes to the user document.
    }

    res.status(403); // Forbidden
    throw new Error('You do not have a valid subscription to use this service, or you have reached your usage limit for the month.');
});