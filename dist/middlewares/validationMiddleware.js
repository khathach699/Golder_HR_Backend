"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const responseHandler_1 = require("../utils/responseHandler");
/**
 * Middleware để validate request data
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: error.type === "field" ? error.path : "unknown",
            message: error.msg,
            value: error.type === "field" ? error.value : undefined,
        }));
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Validation failed", errorMessages);
    }
    next();
};
exports.validateRequest = validateRequest;
