import { Response } from "express";

export const CreateSuccessResponse = (
  res: Response,
  status: number,
  messageOrData: string | unknown,
  data?: unknown
) => {
  if (typeof messageOrData === "string") {
    res.status(status).json({ success: true, message: messageOrData, data });
  } else {
    res.status(status).json({ success: true, data: messageOrData });
  }
};

export const CreateErrorResponse = (
  res: Response,
  status: number,
  message: string,
  data?: unknown
) => {
  res.status(status).json({
    success: false,
    message,
    data,
    error: process.env.NODE_ENV === "development" ? message : undefined,
  });
};

export const CreateCookieResponse = (
  res: Response,
  key: string,
  value: string,
  exp: number
) => {
  res.cookie(key, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(exp),
    signed: true,
  });
};
