import { Request, Response } from "express";
import { TeamService } from "../services/teamService";
import { CreateSuccessResponse, CreateErrorResponse } from "../utils/responseHandler";

// ========================
// TEAM MANAGEMENT
// ========================

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description, departmentId, memberIds } = req.body;
    const leaderId = (req as any).user._id;

    const team = await TeamService.createTeam({
      name,
      description,
      leaderId,
      departmentId,
      memberIds,
    });

    CreateSuccessResponse(res, 201, "Team created successfully", team);
  } catch (error: any) {
    console.error("Error creating team:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to create team");
  }
};

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Get user's teams
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 */
export const getUserTeams = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const teams = await TeamService.getUserTeams(userId);

    CreateSuccessResponse(res, 200, "Teams retrieved successfully", teams);
  } catch (error: any) {
    console.error("Error getting user teams:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve teams");
  }
};

/**
 * @swagger
 * /api/teams/{teamId}:
 *   get:
 *     summary: Get team details
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 */
export const getTeamDetails = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user._id;

    const teamDetails = await TeamService.getTeamDetails(teamId, userId);

    CreateSuccessResponse(res, 200, "Team details retrieved successfully", teamDetails);
  } catch (error: any) {
    console.error("Error getting team details:", error);
    CreateErrorResponse(res, error.message.includes('not a member') ? 403 : 500, 
                       error.message || "Failed to retrieve team details");
  }
};

/**
 * @swagger
 * /api/teams/{teamId}/members:
 *   post:
 *     summary: Add member to team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member, viewer]
 */
export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { userId, role } = req.body;
    const addedBy = (req as any).user._id;

    const teamMember = await TeamService.addTeamMember(teamId, userId, addedBy, role);

    CreateSuccessResponse(res, 201, "Member added successfully", teamMember);
  } catch (error: any) {
    console.error("Error adding team member:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to add team member");
  }
};

// ========================
// TEAM STATISTICS
// ========================

/**
 * @swagger
 * /api/teams/{teamId}/stats:
 *   get:
 *     summary: Get team statistics
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 */
export const getTeamStats = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user._id;

    const stats = await TeamService.getTeamStats(teamId, userId);

    CreateSuccessResponse(res, 200, "Team statistics retrieved successfully", stats);
  } catch (error: any) {
    console.error("Error getting team stats:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve team statistics");
  }
};

// ========================
// CHAT MANAGEMENT
// ========================

/**
 * @swagger
 * /api/teams/{teamId}/chat:
 *   get:
 *     summary: Get team chat history
 *     tags: [Team Chat]
 *     security:
 *       - bearerAuth: []
 */
export const getTeamChatHistory = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const chatHistory = await TeamService.getTeamChatHistory(teamId, page, limit);

    CreateSuccessResponse(res, 200, "Chat history retrieved successfully", chatHistory);
  } catch (error: any) {
    console.error("Error getting chat history:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve chat history");
  }
};

/**
 * @swagger
 * /api/teams/{teamId}/chat/{messageId}/pin:
 *   put:
 *     summary: Pin/unpin a message
 *     tags: [Team Chat]
 *     security:
 *       - bearerAuth: []
 */
export const pinMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user._id;

    await TeamService.pinMessage(messageId, userId);

    CreateSuccessResponse(res, 200, "Message pin status updated successfully");
  } catch (error: any) {
    console.error("Error pinning message:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to update message pin status");
  }
};

// ========================
// MEETING MANAGEMENT
// ========================

/**
 * @swagger
 * /api/teams/{teamId}/meetings:
 *   post:
 *     summary: Create a new meeting
 *     tags: [Team Meetings]
 *     security:
 *       - bearerAuth: []
 */
export const createMeeting = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { title, description, startTime, endTime, location, meetingLink, attendeeIds } = req.body;
    const createdBy = (req as any).user._id;

    const meeting = await TeamService.createMeeting({
      teamId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      meetingLink,
      attendeeIds,
      createdBy,
    });

    CreateSuccessResponse(res, 201, "Meeting created successfully", meeting);
  } catch (error: any) {
    console.error("Error creating meeting:", error);
    CreateErrorResponse(res, 400, error.message || "Failed to create meeting");
  }
};
