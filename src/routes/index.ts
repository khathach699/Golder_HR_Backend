import { Router } from "express";
import authRouter from "./authRoutes";
import attendanceRouter from "./attendanceRoutes";


const router = Router();

// index.ts
router.use("/auth", authRouter);
router.use("/attendance",attendanceRouter)
// app.ts


export default router;