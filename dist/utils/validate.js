"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePasswordValidator = exports.LoginValidator = exports.SignupValidator = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const constants_1 = require("../utils/constants");
const responseHandler_1 = require("../utils/responseHandler");
const options = {
    password: {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    },
    fullname: {
        minLength: 3,
    },
};
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg).join(", ");
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, errorMessages);
    }
    next();
};
exports.validate = validate;
exports.SignupValidator = [
    (0, express_validator_1.body)("email").isEmail().withMessage(constants_1.VALIDATOR_ERRORS.EMAIL),
    (0, express_validator_1.body)("password")
        .isStrongPassword(options.password)
        .withMessage(`Password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`),
    (0, express_validator_1.body)("fullname")
        .isLength({ min: options.fullname.minLength })
        .withMessage(`Fullname must be at least ${options.fullname.minLength} characters long`),
];
exports.LoginValidator = [
    (0, express_validator_1.body)("email").isEmail().withMessage(constants_1.VALIDATOR_ERRORS.EMAIL),
    (0, express_validator_1.body)("password")
        .isStrongPassword(options.password)
        .withMessage(`Password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`),
];
exports.ChangePasswordValidator = [
    (0, express_validator_1.body)("oldPassword")
        .isStrongPassword(options.password)
        .withMessage(`Old password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`),
    (0, express_validator_1.body)("newPassword")
        .isStrongPassword(options.password)
        .withMessage(`New password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`),
];
