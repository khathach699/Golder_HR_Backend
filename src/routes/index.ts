import { Router } from "express";
import authRouter from "./authRoutes";


const router = Router();

// index.ts
router.use("/auth", authRouter);
// app.ts


export default router;