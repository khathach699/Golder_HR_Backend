import { Request, Response, NextFunction } from "express";
import { CreateErrorResponse } from "../utils/responseHandler";

export const validateOvertimeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { date, startTime, endTime, reason, type } = req.body;

  // Check required fields
  if (!date) {
    return CreateErrorResponse(res, 400, "Date is required");
  }

  if (!startTime) {
    return CreateErrorResponse(res, 400, "Start time is required");
  }

  if (!endTime) {
    return CreateErrorResponse(res, 400, "End time is required");
  }

  if (!reason || !reason.trim()) {
    return CreateErrorResponse(res, 400, "Reason is required");
  }

  // Validate date format
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return CreateErrorResponse(res, 400, "Invalid date format");
  }

  // Validate start time format
  const startTimeObj = new Date(startTime);
  if (isNaN(startTimeObj.getTime())) {
    return CreateErrorResponse(res, 400, "Invalid start time format");
  }

  // Validate end time format
  const endTimeObj = new Date(endTime);
  if (isNaN(endTimeObj.getTime())) {
    return CreateErrorResponse(res, 400, "Invalid end time format");
  }

  // Check if end time is after start time
  if (endTimeObj <= startTimeObj) {
    return CreateErrorResponse(res, 400, "End time must be after start time");
  }

  // Check if date is not in the past (allow today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);

  if (dateObj < today) {
    return CreateErrorResponse(
      res,
      400,
      "Cannot submit overtime request for past dates"
    );
  }

  // Check if date is not too far in the future (e.g., 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  if (dateObj > oneYearFromNow) {
    return CreateErrorResponse(
      res,
      400,
      "Cannot submit overtime request more than 1 year in advance"
    );
  }

  // Validate overtime type
  if (type && !["regular", "weekend", "holiday"].includes(type)) {
    return CreateErrorResponse(
      res,
      400,
      "Invalid overtime type. Must be regular, weekend, or holiday"
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

  // Calculate hours and validate reasonable duration
  const diffMs = endTimeObj.getTime() - startTimeObj.getTime();
  const hours = diffMs / (1000 * 60 * 60);

  if (hours < 0.5) {
    return CreateErrorResponse(
      res,
      400,
      "Overtime duration must be at least 30 minutes"
    );
  }

  if (hours > 12) {
    return CreateErrorResponse(
      res,
      400,
      "Overtime duration cannot exceed 12 hours"
    );
  }

  next();
};
