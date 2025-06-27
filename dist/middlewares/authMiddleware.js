"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.check_authorization = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const responseHandler_1 = require("../utils/responseHandler");
const constants_1 = require("../utils/constants");
const authService_1 = require("../services/authService");
const authenticateToken = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if (req.signedCookies.token) {
        token = req.signedCookies.token;
    }
    if (!token) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 401, constants_1.AUTH_ERRORS.AUTHENTICATION_REQUIRED);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await (0, authService_1.GetUserByID)(decoded.id);
        if (!user) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 401, constants_1.AUTH_ERRORS.INVALID_TOKEN);
        }
        req.user = user;
        next();
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 401, constants_1.AUTH_ERRORS.INVALID_TOKEN);
    }
};
exports.authenticateToken = authenticateToken;
const check_authorization = (requireRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role?.name;
        if (!userRole || !requireRoles.includes(userRole)) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 403, constants_1.AUTH_ERRORS.UNAUTHORIZED);
        }
        next();
    };
};
exports.check_authorization = check_authorization;
