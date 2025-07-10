import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import * as taskController from "../controllers/taskController";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ========================
// TASK MANAGEMENT ROUTES
// ========================

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - assignedTo
 *         - createdBy
 *         - status
 *         - priority
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         assignedTo:
 *           type: string
 *         createdBy:
 *           type: string
 *         teamId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [todo, in_progress, review, done, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         dueDate:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         estimatedHours:
 *           type: number
 *         actualHours:
 *           type: number
 *         completedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Create task
router.post(
  "/",
  [
    body("title")
      .notEmpty()
      .withMessage("Task title is required")
      .isLength({ min: 2, max: 200 })
      .withMessage("Task title must be between 2 and 200 characters"),
    body("description")
      .optional()
      .isLength({ max: 2000 })
      .withMessage("Description must not exceed 2000 characters"),
    body("assignedTo")
      .isMongoId()
      .withMessage("Invalid assigned user ID"),
    body("teamId")
      .optional()
      .isMongoId()
      .withMessage("Invalid team ID"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be one of: low, medium, high, urgent"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid due date format"),
    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage("Each tag must be a string with max 50 characters"),
    body("estimatedHours")
      .optional()
      .isNumeric()
      .withMessage("Estimated hours must be a number"),
  ],
  validateRequest,
  taskController.createTask
);

// Get user's tasks
router.get(
  "/my",
  [
    query("status")
      .optional()
      .isIn(["todo", "in_progress", "review", "done", "cancelled"])
      .withMessage("Invalid status"),
    query("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority"),
    query("teamId")
      .optional()
      .isMongoId()
      .withMessage("Invalid team ID"),
    query("dueDate")
      .optional()
      .isIn(["overdue", "today", "week"])
      .withMessage("Invalid due date filter"),
  ],
  validateRequest,
  taskController.getUserTasks
);

// Get team tasks
router.get(
  "/team/:teamId",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
    query("status")
      .optional()
      .isIn(["todo", "in_progress", "review", "done", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  taskController.getTeamTasks
);

// Update task status
router.put(
  "/:taskId/status",
  [
    param("taskId")
      .isMongoId()
      .withMessage("Invalid task ID"),
    body("status")
      .isIn(["todo", "in_progress", "review", "done", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  taskController.updateTaskStatus
);

// Add task comment
router.post(
  "/:taskId/comments",
  [
    param("taskId")
      .isMongoId()
      .withMessage("Invalid task ID"),
    body("message")
      .notEmpty()
      .withMessage("Comment message is required")
      .isLength({ min: 1, max: 1000 })
      .withMessage("Comment must be between 1 and 1000 characters"),
  ],
  validateRequest,
  taskController.addTaskComment
);

// Get task statistics
router.get(
  "/stats",
  [
    query("teamId")
      .optional()
      .isMongoId()
      .withMessage("Invalid team ID"),
  ],
  validateRequest,
  taskController.getTaskStats
);

export default router;
