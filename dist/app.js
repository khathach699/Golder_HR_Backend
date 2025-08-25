"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables first
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// import { createServer } from "http";
const index_1 = __importDefault(require("./routes/index"));
const errorhandlers_1 = require("./middlewares/errorhandlers");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./utils/swagger");
const notificationScheduler_1 = __importDefault(require("./services/notificationScheduler"));
const leaveService_1 = require("./services/leaveService");
// import { SocketService, socketService as socketServiceInstance } from "./services/socketService";
const MONGO_URL = process.env.MONGO_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your_cookie_secret_here";
if (!MONGO_URL) {
    console.error("MONGO_URL environment variable is not defined!");
    process.exit(1);
}
// Create Express app
const app = (0, express_1.default)();
// const server = createServer(app); ❌ Không dùng server.listen nữa
// ⚠ Tạm thời không dùng Socket.IO khi deploy Vercel
// const socketService = new SocketService(server);
// export { socketService };
// Connect to MongoDB
mongoose_1.default
    .connect(MONGO_URL)
    .then(() => {
    console.log("✅ Connected to MongoDB");
})
    .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Too many requests, please try again later.",
    },
}));
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)({ origin: "*", credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)(COOKIE_SECRET));
// Swagger UI
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Routes
app.use("/api", index_1.default);
// Error handlers
app.use(errorhandlers_1.notFoundHandler);
app.use(errorhandlers_1.errorHandler);
// Initialize leave policies
leaveService_1.LeaveService.initializeLeavePolicies()
    .then(() => console.log("✅ Leave policies initialized"))
    .catch((error) => console.error("❌ Error initializing leave policies:", error));
// Start notification scheduler (nếu phù hợp cho serverless)
const notificationScheduler = notificationScheduler_1.default.getInstance();
notificationScheduler.start();
// ❌ KHÔNG DÙNG server.listen trên Vercel
// server.listen(PORT, () => {
//   console.log("🚀 Server is running on port " + PORT);
//   console.log("📚 Swagger UI available at http://localhost:" + PORT + "/api-docs");
//   console.log("🔔 Notification scheduler started");
//   console.log("💬 Socket.IO server initialized for real-time chat");
// });
exports.default = app;
