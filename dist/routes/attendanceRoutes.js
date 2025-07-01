"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const attendanceController = __importStar(require("../controllers/attendanceController"));
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
router.post("/check-in", upload.single("image"), authMiddleware_1.authenticateToken, attendanceController.checkIn);
router.post("/check-out", upload.single("image"), authMiddleware_1.authenticateToken, attendanceController.checkOut);
router.get("/users-dropdown", authMiddleware_1.authenticateToken, (0, authMiddleware_1.check_authorization)(["admin"]), attendanceController.getUsersForDropdown);
// Route upload ảnh khuôn mặt (chỉ admin)
router.post("/upload-face/:userId", authMiddleware_1.authenticateToken, (0, authMiddleware_1.check_authorization)(["admin"]), upload.single("image"), attendanceController.uploadEmployeeFace);
router.get("/check-status", authMiddleware_1.authenticateToken, attendanceController.checkAttendanceStatus);
router.get("/today-summary", authMiddleware_1.authenticateToken, attendanceController.getTodaySummary);
router.get("/summary/week", authMiddleware_1.authenticateToken, attendanceController.getWeekSummary);
router.get("/summary/month", authMiddleware_1.authenticateToken, attendanceController.getMonthSummary);
router.get("/monthly-details", authMiddleware_1.authenticateToken, attendanceController.getMonthlyDetails);
router.get("/daily-details", authMiddleware_1.authenticateToken, attendanceController.getDailyAttendanceDetails);
router.get("/history", authMiddleware_1.authenticateToken, attendanceController.getHistory);
exports.default = router;
