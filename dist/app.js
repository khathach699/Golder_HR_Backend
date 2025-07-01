"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_errors_1 = __importDefault(require("http-errors"));
const index_1 = __importDefault(require("./routes/index"));
const responseHandler_1 = require("./utils/responseHandler");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const notificationScheduler_1 = __importDefault(require("./services/notificationScheduler"));
const leaveService_1 = require("./services/leaveService");
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your_cookie_secret_here";
if (!MONGO_URL) {
    throw new Error("❌ MONGO_URL environment variable is not defined!");
}
// Database connection function
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(MONGO_URL);
        console.log(`Connected to MongoDB: ${MONGO_URL}`);
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};
// Manual Swagger specification
const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "Golden HR API",
        version: "1.0.0",
        description: "API documentation for Golden HR Backend",
        contact: {
            name: "Support",
            email: "support@goldenhr.com",
        },
    },
    servers: [
        {
            url: `http://localhost:${PORT}`,
            description: "Development server",
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
    paths: {
        "/api/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "User login",
                description: "Authenticate user with email and password",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "user@example.com",
                                    },
                                    password: {
                                        type: "string",
                                        format: "password",
                                        example: "password123",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Login successful",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        message: { type: "string" },
                                        data: {
                                            type: "object",
                                            properties: {
                                                token: { type: "string" },
                                                user: { type: "object" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Invalid credentials",
                    },
                },
            },
        },
        "/api/auth/me": {
            get: {
                tags: ["Auth"],
                summary: "Get current user profile",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "User profile retrieved successfully",
                    },
                    "401": {
                        description: "Unauthorized",
                    },
                },
            },
        },
        "/api/leave/summary": {
            get: {
                tags: ["Leave"],
                summary: "Get leave summary",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Leave summary retrieved successfully",
                    },
                },
            },
        },
        "/api/leave/submit": {
            post: {
                tags: ["Leave"],
                summary: "Submit leave request",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["type", "startDate", "endDate", "reason"],
                                properties: {
                                    type: {
                                        type: "string",
                                        enum: ["annual", "sick", "personal", "maternity", "unpaid"],
                                        example: "annual",
                                    },
                                    startDate: {
                                        type: "string",
                                        format: "date",
                                        example: "2024-01-15",
                                    },
                                    endDate: {
                                        type: "string",
                                        format: "date",
                                        example: "2024-01-17",
                                    },
                                    reason: {
                                        type: "string",
                                        example: "Family vacation",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Leave request submitted successfully",
                    },
                    "400": {
                        description: "Invalid request data",
                    },
                },
            },
        },
        "/api/leave/admin/all": {
            get: {
                tags: ["Leave Admin"],
                summary: "Get all leave requests (Admin)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        schema: { type: "integer", default: 1 },
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 10 },
                    },
                    {
                        name: "status",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["pending", "approved", "rejected"],
                        },
                    },
                ],
                responses: {
                    "200": {
                        description: "Leave requests retrieved successfully",
                    },
                },
            },
        },
        "/api/attendance/checkin": {
            post: {
                tags: ["Attendance"],
                summary: "Check in attendance",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Check in successful",
                    },
                },
            },
        },
        "/api/attendance/checkout": {
            post: {
                tags: ["Attendance"],
                summary: "Check out attendance",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Check out successful",
                    },
                },
            },
        },
    },
};
// Debug logging
console.log("🔍 Swagger configuration:");
console.log("- Environment:", process.env.NODE_ENV);
console.log("- Manual spec loaded:", Object.keys(swaggerSpec).length > 0);
console.log("- Paths found:", Object.keys(swaggerSpec.paths).length);
// Initialize Express app
const initializeApp = async () => {
    await connectDB();
    const app = (0, express_1.default)();
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
    app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
    // Routes
    app.use("/api", index_1.default);
    // 404 Handler
    app.use((req, res, next) => {
        next((0, http_errors_1.default)(404, "Resource not found"));
    });
    // Error Handler
    app.use((err, req, res, next) => {
        res.locals.message = err.message;
        res.locals.error = process.env.NODE_ENV === "development" ? err : {};
        (0, responseHandler_1.CreateErrorResponse)(res, err.status || 500, err.message);
    });
    // Initialize leave policies
    try {
        await leaveService_1.LeaveService.initializeLeavePolicies();
    }
    catch (error) {
        console.error("❌ Error initializing leave policies:", error);
    }
    // Start notification scheduler
    const notificationScheduler = notificationScheduler_1.default.getInstance();
    notificationScheduler.start();
    // Start server
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
        console.log(`Notification scheduler started`);
    });
};
// Start the application
initializeApp().catch((error) => {
    console.error("Error starting the server:", error);
    process.exit(1);
});
