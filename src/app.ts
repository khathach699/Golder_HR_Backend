import dotenv from "dotenv";
// Load environment variables first
dotenv.config();

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "http";
import mongoose from "mongoose";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { errorHandler, notFoundHandler } from "./middlewares/errorhandlers";
import routes from "./routes/index";
import { LeaveService } from "./services/leaveService";
import NotificationScheduler from "./services/notificationScheduler";
import { SocketService } from "./services/socketService";
import { swaggerSpec } from "./utils/swagger";

const PORT = Number(process.env.PORT) || 3000;

const MONGO_URL = process.env.MONGO_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your_cookie_secret_here";

if (!MONGO_URL) {
  console.error("MONGO_URL environment variable is not defined!");
  process.exit(1);
}

// Create Express app and HTTP server
const app: Express = express();
const server = createServer(app);

// Initialize Socket.IO service
const socketService = new SocketService(server);
// Export for use in other modules
export { socketService };

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
server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server is running on port " + PORT);
  console.log(
    "📚 Swagger UI available at http://localhost:" + PORT + "/api-docs"
  );
  console.log("🔔 Notification scheduler started");
  console.log("💬 Socket.IO server initialized for real-time chat");
});

export default app;
