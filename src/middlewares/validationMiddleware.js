const Joi = require('joi');

/**
 * Middleware to validate request body against a Joi schema
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            error: errorMessage,
        });
    }

    next();
};

// Common Schemas
const schemas = {
    auth: {
        register: Joi.object({
            phone: Joi.string().min(10).max(15).required(),
            password: Joi.string().min(6).required(),
            name: Joi.string().min(2).required(),
            role: Joi.string().valid('customer', 'courier').required(),
            email: Joi.string().email().optional(),
            referred_by: Joi.string().optional(),
        }),
        login: Joi.object({
            phone: Joi.string().required(),
            password: Joi.string().required(),
            role: Joi.string().valid('customer', 'courier').optional(),
        }),
    },
    order: {
        create: Joi.object({
            customer_id: Joi.number().required(),
            pickup_location: Joi.object({
                lat: Joi.number().required(),
                lng: Joi.number().required(),
            }).required(),
            dropoff_location: Joi.object({
                lat: Joi.number().required(),
                lng: Joi.number().required(),
            }).required(),
            destinations: Joi.array().items(Joi.object({
                lat: Joi.number(),
                lng: Joi.number(),
                address: Joi.string(),
            })).optional(),
            details: Joi.string().required(),
            price: Joi.number().required(),
            order_type: Joi.string().optional(),
            tier_id: Joi.string().optional(),
            scheduled_at: Joi.date().iso().optional(),
            promoCode: Joi.string().optional().allow(''),
            pickup_address: Joi.string().optional(),
            delivery_address: Joi.string().optional(),
        }),
    },
    wallet: {
        addFunds: Joi.object({
            wallet_id: Joi.number().integer().required(),
            amount: Joi.number().positive().required(),
            description: Joi.string().optional()
        }),
        withdraw: Joi.object({
            wallet_id: Joi.number().integer().required(),
            amount: Joi.number().positive().required(),
            description: Joi.string().optional()
        }),
        reviewWithdrawal: Joi.object({
            transaction_id: Joi.number().integer().required(),
            status: Joi.string().valid('approved', 'rejected').required()
        })
    }
};

module.exports = { validate, schemas };
