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
    console.log(`🔍 [AUTH] Authenticating request to ${req.path}`);
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if (req.signedCookies.token) {
        token = req.signedCookies.token;
    }
    console.log(`🔍 [AUTH] Token found: ${token ? "YES" : "NO"}`);
    if (!token) {
        console.log(`❌ [AUTH] No token provided for ${req.path}`);
        return (0, responseHandler_1.CreateErrorResponse)(res, 401, constants_1.AUTH_ERRORS.AUTHENTICATION_REQUIRED);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log(`🔍 [AUTH] Token decoded, user ID: ${decoded.id}`);
        const user = await (0, authService_1.GetUserByID)(decoded.id);
        if (!user) {
            console.log(`❌ [AUTH] User not found for ID: ${decoded.id}`);
            return (0, responseHandler_1.CreateErrorResponse)(res, 401, constants_1.AUTH_ERRORS.INVALID_TOKEN);
        }
        console.log(`✅ [AUTH] User authenticated: ${user._id}, role: ${typeof user.role === "object" ? user.role?.name : user.role}`);
        req.user = user;
        next();
    }
    catch (error) {
        console.log(`❌ [AUTH] Token verification failed: ${error}`);
        return (0, responseHandler_1.CreateErrorResponse)(res, 401, constants_1.AUTH_ERRORS.INVALID_TOKEN);
    }
};
exports.authenticateToken = authenticateToken;
const check_authorization = (requireRoles) => {
    return (req, res, next) => {
        console.log(`🔍 [AUTH] check_authorization called for ${req.method} ${req.path}`);
        console.log(`🔍 [AUTH] Required roles: ${requireRoles.join(", ")}`);
        console.log(`🔍 [AUTH] User object:`, JSON.stringify(req.user, null, 2));
        const user = req.user;
        console.log(`🔍 [AUTH] User ID: ${user?._id}`);
        console.log(`🔍 [AUTH] User email: ${user?.email}`);
        console.log(`🔍 [AUTH] User role object:`, JSON.stringify(user?.role, null, 2));
        const userRole = user?.role?.name;
        console.log(`🔍 [AUTH] User role name: ${userRole}`);
        console.log(`🔍 [AUTH] Role type: ${typeof userRole}`);
        if (!userRole || !requireRoles.includes(userRole)) {
            console.log(`❌ [AUTH] Access denied - user role '${userRole}' not in required roles [${requireRoles.join(", ")}]`);
            return (0, responseHandler_1.CreateErrorResponse)(res, 403, constants_1.AUTH_ERRORS.UNAUTHORIZED);
        }
        console.log(`✅ [AUTH] Access granted for role: ${userRole}`);
        next();
    };
};
exports.check_authorization = check_authorization;
