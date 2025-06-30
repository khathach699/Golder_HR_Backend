import { Request, Response, NextFunction } from "express";
import { CreateErrorResponse } from "../utils/responseHandler";

export const validateLeaveRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { type, startDate, endDate, reason } = req.body;

  // Check required fields
  if (!type) {
    return CreateErrorResponse(res, 400, "Leave type is required");
  }

  if (!startDate) {
    return CreateErrorResponse(res, 400, "Start date is required");
  }

  if (!endDate) {
    return CreateErrorResponse(res, 400, "End date is required");
  }

  if (!reason || !reason.trim()) {
    return CreateErrorResponse(res, 400, "Reason is required");
  }

  // Validate leave type
  if (!["annual", "sick", "personal", "maternity", "unpaid"].includes(type)) {
    return CreateErrorResponse(
      res,
      400,
      "Invalid leave type. Must be annual, sick, personal, maternity, or unpaid"
    );
  }

  // Validate date format
  const startDateObj = new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    return CreateErrorResponse(res, 400, "Invalid start date format");
  }

  const endDateObj = new Date(endDate);
  if (isNaN(endDateObj.getTime())) {
    return CreateErrorResponse(res, 400, "Invalid end date format");
  }

  // Check if end date is after or equal to start date
  if (endDateObj < startDateObj) {
    return CreateErrorResponse(res, 400, "End date must be after or equal to start date");
  }

  // Check if start date is not in the past (allow today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDateObj.setHours(0, 0, 0, 0);

  if (startDateObj < today) {
    return CreateErrorResponse(
      res,
      400,
      "Cannot submit leave request for past dates"
    );
  }

  // Check if dates are not too far in the future (e.g., 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  if (startDateObj > oneYearFromNow || endDateObj > oneYearFromNow) {
    return CreateErrorResponse(
      res,
      400,
      "Cannot submit leave request more than 1 year in advance"
    );
  }

  // Validate reason length
  if (reason.trim().length < 10) {
    return CreateErrorResponse(
      res,
      400,
      "Reason must be at least 10 characters long"
    );
  }

  if (reason.trim().length > 500) {
    return CreateErrorResponse(
      res,
      400,
      "Reason must not exceed 500 characters"
    );
  }

  // Calculate duration and validate reasonable length
  const timeDiff = endDateObj.getTime() - startDateObj.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

  if (daysDiff < 1) {
    return CreateErrorResponse(
      res,
      400,
      "Leave duration must be at least 1 day"
    );
  }

  if (daysDiff > 365) {
    return CreateErrorResponse(
      res,
      400,
      "Leave duration cannot exceed 365 days"
    );
  }

  // Special validation for different leave types
  switch (type) {
    case "sick":
      // Sick leave can be immediate (today)
      break;
    case "annual":
      // Annual leave should be planned in advance (at least 1 day notice for short leaves)
      if (daysDiff > 5) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(0, 0, 0, 0);
        
        if (startDateObj < threeDaysFromNow) {
          return CreateErrorResponse(
            res,
            400,
            "Annual leave longer than 5 days requires at least 3 days advance notice"
          );
        }
      }
      break;
    case "maternity":
      // Maternity leave can be longer
      if (daysDiff > 180) {
        return CreateErrorResponse(
          res,
          400,
          "Maternity leave cannot exceed 180 days per request"
        );
      }
      break;
    case "personal":
    case "unpaid":
      // Personal and unpaid leave should have reasonable advance notice
      if (daysDiff > 3) {
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        twoDaysFromNow.setHours(0, 0, 0, 0);
        
        if (startDateObj < twoDaysFromNow) {
          return CreateErrorResponse(
            res,
            400,
            "Personal/unpaid leave longer than 3 days requires at least 2 days advance notice"
          );
        }
      }
      break;
  }

  next();
};
