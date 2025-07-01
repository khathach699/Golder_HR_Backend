import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { CreateErrorResponse } from "../utils/responseHandler";

// 404 handler for routes that don't exist
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(createError(404, "Resource not found"));
};

// Global error handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === "development" ? err : {};

  // Send error response
  CreateErrorResponse(res, err.status || 500, err.message || "Internal Server Error");
};
