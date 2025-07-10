import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import * as teamController from "../controllers/teamController";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ========================
// TEAM MANAGEMENT ROUTES
// ========================

/**
 * @swagger
 * components:
 *   schemas:
 *     Team:
 *       type: object
 *       required:
 *         - name
 *         - leaderId
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         avatar:
 *           type: string
 *         leaderId:
 *           type: string
 *         departmentId:
 *           type: string
 *         memberIds:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Create team
router.post(
  "/",
  [
    body("name")
      .notEmpty()
      .withMessage("Team name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Team name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must not exceed 500 characters"),
    body("departmentId")
      .optional()
      .isMongoId()
      .withMessage("Invalid department ID"),
    body("memberIds")
      .optional()
      .isArray()
      .withMessage("Member IDs must be an array"),
    body("memberIds.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid member ID"),
  ],
  validateRequest,
  teamController.createTeam
);

// Get user's teams
router.get("/", teamController.getUserTeams);

// Get team details
router.get(
  "/:teamId",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
  ],
  validateRequest,
  teamController.getTeamDetails
);

// Add team member
router.post(
  "/:teamId/members",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
    body("userId")
      .isMongoId()
      .withMessage("Invalid user ID"),
    body("role")
      .optional()
      .isIn(["member", "viewer"])
      .withMessage("Role must be either 'member' or 'viewer'"),
  ],
  validateRequest,
  teamController.addTeamMember
);

// ========================
// TEAM STATISTICS ROUTES
// ========================

// Get team statistics
router.get(
  "/:teamId/stats",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
  ],
  validateRequest,
  teamController.getTeamStats
);

// ========================
// CHAT MANAGEMENT ROUTES
// ========================

// Get chat history
router.get(
  "/:teamId/chat",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  validateRequest,
  teamController.getTeamChatHistory
);

// Pin/unpin message
router.put(
  "/:teamId/chat/:messageId/pin",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
    param("messageId")
      .isMongoId()
      .withMessage("Invalid message ID"),
  ],
  validateRequest,
  teamController.pinMessage
);

// ========================
// MEETING MANAGEMENT ROUTES
// ========================

// Create meeting
router.post(
  "/:teamId/meetings",
  [
    param("teamId")
      .isMongoId()
      .withMessage("Invalid team ID"),
    body("title")
      .notEmpty()
      .withMessage("Meeting title is required")
      .isLength({ min: 2, max: 200 })
      .withMessage("Meeting title must be between 2 and 200 characters"),
    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description must not exceed 1000 characters"),
    body("startTime")
      .isISO8601()
      .withMessage("Invalid start time format"),
    body("endTime")
      .isISO8601()
      .withMessage("Invalid end time format"),
    body("location")
      .optional()
      .isLength({ max: 200 })
      .withMessage("Location must not exceed 200 characters"),
    body("meetingLink")
      .optional()
      .isURL()
      .withMessage("Invalid meeting link URL"),
    body("attendeeIds")
      .isArray({ min: 1 })
      .withMessage("At least one attendee is required"),
    body("attendeeIds.*")
      .isMongoId()
      .withMessage("Invalid attendee ID"),
  ],
  validateRequest,
  teamController.createMeeting
);

export default router;
