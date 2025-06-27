import { Router } from "express";
import authRouter from "./authRoutes";
import attendanceRouter from "./attendanceRoutes";
import departmentSalaryRouter from "./departmentSalaryRoutes";
import notificationRouter from "./notificationRoutes";
import overtimeRouter from "./overtimeRoutes";

const router = Router();

// index.ts
router.use("/auth", authRouter);
router.use("/attendance", attendanceRouter);
router.use("/department-salary", departmentSalaryRouter);
router.use("/notifications", notificationRouter);
router.use("/overtime", overtimeRouter);
// app.ts

export default router;
