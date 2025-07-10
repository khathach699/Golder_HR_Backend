import { Request, Response } from "express";
import { TaskService } from "../services/taskService";
import { CreateSuccessResponse, CreateErrorResponse } from "../utils/responseHandler";

// ========================
// TASK MANAGEMENT
// ========================

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - assignedTo
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               teamId:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               estimatedHours:
 *                 type: number
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, assignedTo, teamId, priority, dueDate, tags, estimatedHours } = req.body;
    const createdBy = (req as any).user._id;

    const task = await TaskService.createTask({
      title,
      description,
      assignedTo,
      createdBy,
      teamId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags,
      estimatedHours,
    });

    CreateSuccessResponse(res, 201, "Task created successfully", task);
  } catch (error: any) {
    console.error("Error creating task:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to create task");
  }
};

/**
 * @swagger
 * /api/tasks/my:
 *   get:
 *     summary: Get user's tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in_progress, review, done, cancelled]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dueDate
 *         schema:
 *           type: string
 *           enum: [overdue, today, week]
 */
export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { status, priority, teamId, dueDate } = req.query;

    const tasks = await TaskService.getUserTasks(userId, {
      status: status as string,
      priority: priority as string,
      teamId: teamId as string,
      dueDate: dueDate as 'overdue' | 'today' | 'week',
    });

    CreateSuccessResponse(res, 200, "Tasks retrieved successfully", tasks);
  } catch (error: any) {
    console.error("Error getting user tasks:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve tasks");
  }
};

/**
 * @swagger
 * /api/tasks/team/{teamId}:
 *   get:
 *     summary: Get team tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in_progress, review, done, cancelled]
 */
export const getTeamTasks = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const tasks = await TaskService.getTeamTasks(teamId, status as string);

    CreateSuccessResponse(res, 200, "Team tasks retrieved successfully", tasks);
  } catch (error: any) {
    console.error("Error getting team tasks:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve team tasks");
  }
};

/**
 * @swagger
 * /api/tasks/{taskId}/status:
 *   put:
 *     summary: Update task status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, review, done, cancelled]
 */
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user._id;

    const task = await TaskService.updateTaskStatus(taskId, status, userId);

    CreateSuccessResponse(res, 200, "Task status updated successfully", task);
  } catch (error: any) {
    console.error("Error updating task status:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to update task status");
  }
};

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   post:
 *     summary: Add comment to task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 */
export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { message } = req.body;
    const userId = (req as any).user._id;

    const task = await TaskService.addTaskComment(taskId, userId, message);

    CreateSuccessResponse(res, 200, "Comment added successfully", task);
  } catch (error: any) {
    console.error("Error adding task comment:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to add comment");
  }
};

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 */
export const getTaskStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { teamId } = req.query;

    const stats = await TaskService.getTaskStats(userId, teamId as string);

    CreateSuccessResponse(res, 200, "Task statistics retrieved successfully", stats);
  } catch (error: any) {
    console.error("Error getting task stats:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve task statistics");
  }
};
