import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { CreateErrorResponse } from "../utils/responseHandler";

/**
 * Middleware để validate request data
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.type === "field" ? (error as any).path : "unknown",
      message: error.msg,
      value: error.type === "field" ? (error as any).value : undefined,
    }));

    return CreateErrorResponse(res, 400, "Validation failed", errorMessages);
  }

  next();
};
