import { Router, Request, Response } from "express";
import authRouter from "./authRoutes";
import attendanceRouter from "./attendanceRoutes";
import departmentSalaryRouter from "./departmentSalaryRoutes";
import notificationRouter from "./notificationRoutes";
import overtimeRouter from "./overtimeRoutes";
import leaveRouter from "./leaveRoutes";
import adminUserRouter from "./adminUserRoutes";
import roleRouter from "./roleRoutes";
import departmentRouter from "./departmentRoutes";

const router = Router();

// Health check endpoint for Docker
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Golder HR Backend is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
router.use("/auth", authRouter);
router.use("/attendance", attendanceRouter);
router.use("/department-salary", departmentSalaryRouter);
router.use("/notifications", notificationRouter);
router.use("/overtime", overtimeRouter);
router.use("/leave", leaveRouter);
router.use("/admin/users", adminUserRouter);
router.use("/admin/roles", roleRouter);
router.use("/admin/departments", departmentRouter);

export default router;
