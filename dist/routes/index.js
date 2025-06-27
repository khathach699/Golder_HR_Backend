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
const router = (0, express_1.Router)();
// index.ts
router.use("/auth", authRoutes_1.default);
router.use("/attendance", attendanceRoutes_1.default);
router.use("/department-salary", departmentSalaryRoutes_1.default);
router.use("/notifications", notificationRoutes_1.default);
// app.ts
exports.default = router;
