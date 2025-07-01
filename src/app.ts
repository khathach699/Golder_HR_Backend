import dotenv from "dotenv";
// Load environment variables first
dotenv.config();

import express, { Express } from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import routes from "./routes/index";
import { errorHandler, notFoundHandler } from "./middlewares/errorhandlers";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./utils/swagger";
import NotificationScheduler from "./services/notificationScheduler";
import { LeaveService } from "./services/leaveService";

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your_cookie_secret_here";

if (!MONGO_URL) {
  console.error("MONGO_URL environment variable is not defined!");
  process.exit(1);
}

// Create Express app
const app: Express = express();

// Connect to MongoDB
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Middleware
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  })
);
app.use(morgan("dev"));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(COOKIE_SECRET));

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api", routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize leave policies
LeaveService.initializeLeavePolicies()
  .then(() => console.log("Leave policies initialized"))
  .catch((error) => console.error("Error initializing leave policies:", error));

// Start notification scheduler
const notificationScheduler = NotificationScheduler.getInstance();
notificationScheduler.start();

// Start server
app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
  console.log("Swagger UI available at http://localhost:" + PORT + "/api-docs");
  console.log("Notification scheduler started");
});

export default app;
