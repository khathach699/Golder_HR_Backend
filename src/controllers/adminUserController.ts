// File: src/controllers/adminUserController.ts

import { Request, Response } from "express";
import * as AdminUserService from "../services/adminUserService";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";

// === GET ALL USERS ===
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination and filtering (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, hr, manager, user]
 *         description: Filter by role
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include soft deleted users
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [fullname, email, department, position, createdAt, updatedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: (req.query.search as string) || "",
      role: (req.query.role as string) || "",
      department: (req.query.department as string) || "",
      includeDeleted: req.query.includeDeleted === "true",
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    const result = await AdminUserService.getAllUsers(options);
    return CreateSuccessResponse(res, 200, result);
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

// === CREATE USER ===
/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - email
 *               - password
 *               - role
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, hr, manager, user]
 *               organization:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Admin access required
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const newUser = await AdminUserService.createUser(userData);
    return CreateSuccessResponse(res, 201, { user: newUser });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

// === GET USER BY ID ===
/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await AdminUserService.getUserById(userId);
    return CreateSuccessResponse(res, 200, { user });
  } catch (error: any) {
    return CreateErrorResponse(res, 404, error.message);
  }
};

// === UPDATE USER ===
/**
 * @swagger
 * /api/admin/users/{userId}:
 *   put:
 *     summary: Update user information (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, hr, manager, user]
 *               organization:
 *                 type: string
 *               isdisable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    const updatedUser = await AdminUserService.updateUser(userId, updateData);
    return CreateSuccessResponse(res, 200, { user: updatedUser });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

// === SOFT DELETE USER ===
/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Soft delete user (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete yourself
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
export const softDeleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user._id.toString();

    // Prevent admin from deleting themselves
    if (userId === currentUserId) {
      return CreateErrorResponse(res, 400, "Cannot delete your own account");
    }

    const deletedUser = await AdminUserService.softDeleteUser(userId);
    return CreateSuccessResponse(res, 200, {
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

// === RESTORE USER ===
/**
 * @swagger
 * /api/admin/users/{userId}/restore:
 *   patch:
 *     summary: Restore soft deleted user (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User restored successfully
 *       400:
 *         description: User is not deleted
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
export const restoreUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const restoredUser = await AdminUserService.restoreUser(userId);
    return CreateSuccessResponse(res, 200, {
      message: "User restored successfully",
      user: restoredUser,
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

// === TOGGLE USER STATUS ===
/**
 * @swagger
 * /api/admin/users/{userId}/toggle-status:
 *   patch:
 *     summary: Toggle user active/disabled status (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       400:
 *         description: Cannot disable yourself
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user._id.toString();

    // Prevent admin from disabling themselves
    if (userId === currentUserId) {
      return CreateErrorResponse(res, 400, "Cannot disable your own account");
    }

    const updatedUser = await AdminUserService.toggleUserStatus(userId);
    if (!updatedUser) {
      return CreateErrorResponse(res, 404, "User not found");
    }

    return CreateSuccessResponse(res, 200, {
      message: `User ${
        updatedUser.isdisable ? "disabled" : "enabled"
      } successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

// === GET USER STATISTICS ===
/**
 * @swagger
 * /api/admin/users/statistics:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
export const getUserStatistics = async (req: Request, res: Response) => {
  try {
    const statistics = await AdminUserService.getUserStatistics();
    return CreateSuccessResponse(res, 200, { statistics });
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

// === RESET USER PASSWORD ===
/**
 * @swagger
 * /api/admin/users/{userId}/reset-password:
 *   patch:
 *     summary: Reset user password (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: New password for the user
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Import User model and bcrypt for password reset
    const User = require("../models/user").default;
    const bcrypt = require("bcrypt");

    const user = await User.findById(userId);
    if (!user || user.isdeleted) {
      return CreateErrorResponse(res, 404, "User not found");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    return CreateSuccessResponse(res, 200, {
      message: "Password reset successfully",
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

// === BULK OPERATIONS ===

/**
 * @swagger
 * /api/admin/users/bulk-delete:
 *   post:
 *     summary: Bulk soft delete users (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Users deleted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Admin access required
 */
export const bulkDeleteUsers = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;
    const currentUserId = (req as any).user._id.toString();

    // Remove current user from the list to prevent self-deletion
    const filteredUserIds = userIds.filter(
      (id: string) => id !== currentUserId
    );

    if (filteredUserIds.length === 0) {
      return CreateErrorResponse(res, 400, "No valid users to delete");
    }

    const User = require("../models/user").default;

    const result = await User.updateMany(
      {
        _id: { $in: filteredUserIds },
        isdeleted: false,
      },
      {
        $set: {
          isdeleted: true,
          isdisable: true,
        },
      }
    );

    return CreateSuccessResponse(res, 200, {
      message: `${result.modifiedCount} users deleted successfully`,
      deletedCount: result.modifiedCount,
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

/**
 * @swagger
 * /api/admin/users/bulk-restore:
 *   post:
 *     summary: Bulk restore users (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Users restored successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Admin access required
 */
export const bulkRestoreUsers = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    const User = require("../models/user").default;

    const result = await User.updateMany(
      {
        _id: { $in: userIds },
        isdeleted: true,
      },
      {
        $set: {
          isdeleted: false,
          isdisable: false,
        },
      }
    );

    return CreateSuccessResponse(res, 200, {
      message: `${result.modifiedCount} users restored successfully`,
      restoredCount: result.modifiedCount,
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};
