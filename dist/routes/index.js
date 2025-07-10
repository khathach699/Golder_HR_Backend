"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const attendanceRoutes_1 = __importDefault(require("./attendanceRoutes"));
const departmentSalaryRoutes_1 = __importDefault(require("./departmentSalaryRoutes"));
const notificationRoutes_1 = __importDefault(require("./notificationRoutes"));
const overtimeRoutes_1 = __importDefault(require("./overtimeRoutes"));
const leaveRoutes_1 = __importDefault(require("./leaveRoutes"));
const adminUserRoutes_1 = __importDefault(require("./adminUserRoutes"));
const roleRoutes_1 = __importDefault(require("./roleRoutes"));
const departmentRoutes_1 = __importDefault(require("./departmentRoutes"));
const calendarRoutes_1 = __importDefault(require("./calendarRoutes"));
const teamRoutes_1 = __importDefault(require("./teamRoutes"));
const taskRoutes_1 = __importDefault(require("./taskRoutes"));
const router = (0, express_1.Router)();
// Health check endpoint for Docker
router.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Golder HR Backend is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
    });
});
// API routes
router.use("/auth", authRoutes_1.default);
router.use("/attendance", attendanceRoutes_1.default);
router.use("/department-salary", departmentSalaryRoutes_1.default);
router.use("/notifications", notificationRoutes_1.default);
router.use("/overtime", overtimeRoutes_1.default);
router.use("/leave", leaveRoutes_1.default);
router.use("/calendar", calendarRoutes_1.default);
router.use("/teams", teamRoutes_1.default);
router.use("/tasks", taskRoutes_1.default);
router.use("/admin/users", adminUserRoutes_1.default);
router.use("/admin/roles", roleRoutes_1.default);
router.use("/admin/departments", departmentRoutes_1.default);
exports.default = router;
