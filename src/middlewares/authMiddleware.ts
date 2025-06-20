import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CreateErrorResponse } from "../utils/responseHandler";
import { AUTH_ERRORS } from "../utils/constants";
import { GetUserByID } from "../services/authService";

interface JwtPayload {
  id: string;
}

export const check_authentication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.signedCookies.token) {
    token = req.signedCookies.token;
  }

  if (!token) {
    return CreateErrorResponse(res, 401, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await GetUserByID(decoded.id);
    if (!user) {
      return CreateErrorResponse(res, 401, AUTH_ERRORS.INVALID_TOKEN);
    }
    req.user = user;
    next();
  } catch (error) {
    return CreateErrorResponse(res, 401, AUTH_ERRORS.INVALID_TOKEN);
  }
};

export const check_authorization = (requireRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.user as any)?.role?.name;
    if (!userRole || !requireRoles.includes(userRole)) {
      return CreateErrorResponse(res, 403, AUTH_ERRORS.UNAUTHORIZED);
    }
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
