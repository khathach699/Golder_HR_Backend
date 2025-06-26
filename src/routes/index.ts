import { Router } from "express";
import authRouter from "./authRoutes";
import attendanceRouter from "./attendanceRoutes";
import departmentSalaryRouter from "./departmentSalaryRoutes";

const router = Router();

// index.ts
router.use("/auth", authRouter);
router.use("/attendance", attendanceRouter);
router.use("/department-salary", departmentSalaryRouter);
// app.ts

export default router;
