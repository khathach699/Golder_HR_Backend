import dotenv from "dotenv";
// Load environment variables
dotenv.config();
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
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";




const PORT = process.env.PORT || 3000
const MONGO_URL = process.env.MONGO_URL ;
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your_cookie_secret_here";
if(!MONGO_URL){
    throw new Error("❌ MONGO_URL environment variable is not defined!");
}

// Database connection function
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log(`Connected to MongoDB: ${MONGO_URL}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
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
  },
  apis: ["./src/controllers/*.ts"],
};


const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Initialize Express app
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

  // Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  });
};

// Start the application
initializeApp().catch((error) => {
  console.error("Error starting the server:", error);
  process.exit(1);
});