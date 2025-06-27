import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CreateErrorResponse } from "../utils/responseHandler";
import { AUTH_ERRORS } from "../utils/constants";
import { GetUserByID } from "../services/authService";

interface JwtPayload {
  id: string;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(`🔍 [AUTH] Authenticating request to ${req.path}`);
  let token: string | undefined;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.signedCookies.token) {
    token = req.signedCookies.token;
  }

  console.log(`🔍 [AUTH] Token found: ${token ? "YES" : "NO"}`);
  if (!token) {
    console.log(`❌ [AUTH] No token provided for ${req.path}`);
    return CreateErrorResponse(res, 401, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    console.log(`🔍 [AUTH] Token decoded, user ID: ${decoded.id}`);
    const user = await GetUserByID(decoded.id);
    if (!user) {
      console.log(`❌ [AUTH] User not found for ID: ${decoded.id}`);
      return CreateErrorResponse(res, 401, AUTH_ERRORS.INVALID_TOKEN);
    }
    console.log(
      `✅ [AUTH] User authenticated: ${user._id}, role: ${
        typeof user.role === "object" ? user.role?.name : user.role
      }`
    );
    req.user = user;
    next();
  } catch (error) {
    console.log(`❌ [AUTH] Token verification failed: ${error}`);
    return CreateErrorResponse(res, 401, AUTH_ERRORS.INVALID_TOKEN);
  }
};

export const check_authorization = (requireRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(
      `🔍 [AUTH] check_authorization called for ${req.method} ${req.path}`
    );
    console.log(`🔍 [AUTH] Required roles: ${requireRoles.join(", ")}`);
    console.log(`🔍 [AUTH] User object:`, JSON.stringify(req.user, null, 2));

    const user = req.user as any;
    console.log(`🔍 [AUTH] User ID: ${user?._id}`);
    console.log(`🔍 [AUTH] User email: ${user?.email}`);
    console.log(
      `🔍 [AUTH] User role object:`,
      JSON.stringify(user?.role, null, 2)
    );

    const userRole = user?.role?.name;
    console.log(`🔍 [AUTH] User role name: ${userRole}`);
    console.log(`🔍 [AUTH] Role type: ${typeof userRole}`);

    if (!userRole || !requireRoles.includes(userRole)) {
      console.log(
        `❌ [AUTH] Access denied - user role '${userRole}' not in required roles [${requireRoles.join(
          ", "
        )}]`
      );
      return CreateErrorResponse(res, 403, AUTH_ERRORS.UNAUTHORIZED);
    }

    console.log(`✅ [AUTH] Access granted for role: ${userRole}`);
    next();
  };
};

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
