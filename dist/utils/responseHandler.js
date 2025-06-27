"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCookieResponse = exports.CreateErrorResponse = exports.CreateSuccessResponse = void 0;
const CreateSuccessResponse = (res, status, messageOrData, data) => {
    if (typeof messageOrData === "string") {
        res.status(status).json({ success: true, message: messageOrData, data });
    }
    else {
        res.status(status).json({ success: true, data: messageOrData });
    }
};
exports.CreateSuccessResponse = CreateSuccessResponse;
const CreateErrorResponse = (res, status, message, data) => {
    res.status(status).json({
        success: false,
        message,
        data,
        error: process.env.NODE_ENV === "development" ? message : undefined,
    });
};
exports.CreateErrorResponse = CreateErrorResponse;
const CreateCookieResponse = (res, key, value, exp) => {
    res.cookie(key, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: new Date(exp),
        signed: true,
    });
};
exports.CreateCookieResponse = CreateCookieResponse;
