import { Router } from "express";
import * as calendarController from "../controllers/calendarController";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  validateCreateEvent,
  validateUpdateEvent,
  validateGetEvents,
  validateGetEventById,
  validateDeleteEvent,
  validateGetWeeklyEvents,
  validateCheckConflicts,
} from "../validators/calendarValidator";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Calendar events routes
router
  .route("/")
  .post(validateCreateEvent, calendarController.createEvent)
  .get(validateGetEvents, calendarController.getEvents);

// Calendar summary and analytics
router.get("/summary", calendarController.getCalendarSummary);

// Today events
router.get("/today", calendarController.getTodayEvents);

// Upcoming events
router.get("/upcoming", calendarController.getUpcomingEvents);

// Weekly events
router.get("/weekly", validateGetWeeklyEvents, calendarController.getWeeklyEvents);

// Check conflicts
router.post("/conflicts", validateCheckConflicts, calendarController.checkEventConflicts);

// Individual event routes (must be last to avoid conflicts with other routes)
router
  .route("/:id")
  .get(validateGetEventById, calendarController.getEventById)
  .put(validateUpdateEvent, calendarController.updateEvent)
  .delete(validateDeleteEvent, calendarController.deleteEvent);

export default router;
