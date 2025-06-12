import dotenv from "dotenv";
import express, { Express, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import createError from "http-errors";
import routes from "./routes/index";
import { CreateErrorResponse } from "./utils/responseHandler";

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/golden_hr";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your_cookie_secret_here";

// Database connection function
const connectDB = async () => {
  try {
    await mongoose.connect(DB_URL);
    console.log("Connected to MongoDB");
    console.log(`Database URL: ${DB_URL}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Initialize Express app only after DB connection
const initializeApp = async () => {
  await connectDB();

  const app: Express = express();

  // Middleware
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { success: false, message: "Too many requests, please try again later." },
    })
  );
  app.use(morgan("dev"));
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser(COOKIE_SECRET));

  // Routes
  app.use("/api", routes);

  // 404 Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(createError(404, "Resource not found"));
  });

  // Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV === "development" ? err : {};
    CreateErrorResponse(res, err.status || 500, err.message);
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

// Start the application
initializeApp().catch((error) => {
  console.error("Error starting the server:", error);
  process.exit(1);
});