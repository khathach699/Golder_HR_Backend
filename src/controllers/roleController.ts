import { Request, Response } from "express";
import Role from "../models/role";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";

/**
 * @swagger
 * /api/admin/roles:
 *   get:
 *     summary: Get all roles with pagination and search
 *     tags: [Role]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by role name
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *       500:
 *         description: Failed to retrieve roles
 */
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};

    // Add search functionality
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      Role.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Role.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    CreateSuccessResponse(res, 200, "Roles retrieved successfully", {
      roles,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    console.error("Error getting roles:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve roles");
  }
};

/**
 * @swagger
 * /api/admin/roles/{roleId}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Role]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 *       500:
 *         description: Failed to retrieve role
 */
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);

    if (!role) {
      return CreateErrorResponse(res, 404, "Role not found");
    }

    CreateSuccessResponse(res, 200, "Role retrieved successfully", role);
  } catch (error: any) {
    console.error("Error getting role:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve role");
  }
};

/**
 * @swagger
 * /api/admin/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Role]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Role with this name already exists
 *       500:
 *         description: Failed to create role
 */
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return CreateErrorResponse(
        res,
        400,
        "Role with this name already exists"
      );
    }

    const role = new Role({ name });
    await role.save();

    CreateSuccessResponse(res, 201, "Role created successfully", role);
  } catch (error: any) {
    console.error("Error creating role:", error);
    if (error.code === 11000) {
      CreateErrorResponse(res, 400, "Role with this name already exists");
    } else {
      CreateErrorResponse(res, 500, "Failed to create role");
    }
  }
};

/**
 * @swagger
 * /api/admin/roles/{roleId}:
 *   put:
 *     summary: Update a role
 *     tags: [Role]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New role name
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Role with this name already exists
 *       404:
 *         description: Role not found
 *       500:
 *         description: Failed to update role
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { name } = req.body;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return CreateErrorResponse(res, 404, "Role not found");
    }

    // Check if new name already exists (excluding current role)
    if (name) {
      const existingRole = await Role.findOne({
        name,
        _id: { $ne: roleId },
      });
      if (existingRole) {
        return CreateErrorResponse(
          res,
          400,
          "Role with this name already exists"
        );
      }
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { name },
      { new: true, runValidators: true }
    );

    CreateSuccessResponse(res, 200, "Role updated successfully", updatedRole);
  } catch (error: any) {
    console.error("Error updating role:", error);
    if (error.code === 11000) {
      CreateErrorResponse(res, 400, "Role with this name already exists");
    } else {
      CreateErrorResponse(res, 500, "Failed to update role");
    }
  }
};

/**
 * @swagger
 * /api/admin/roles/{roleId}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Role]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Cannot delete system role or role is assigned to users
 *       404:
 *         description: Role not found
 *       500:
 *         description: Failed to delete role
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return CreateErrorResponse(res, 404, "Role not found");
    }

    // Prevent deletion of system roles
    const systemRoles = ["admin", "hr", "manager", "user"];
    if (systemRoles.includes(role.name.toLowerCase())) {
      return CreateErrorResponse(
        res,
        400,
        `Cannot delete system role "${role.name}". System roles are protected and cannot be deleted.`
      );
    }

    // Check if role is being used by any users
    const User = require("../models/user").default;
    const usersWithRole = await User.countDocuments({ role: roleId });

    if (usersWithRole > 0) {
      return CreateErrorResponse(
        res,
        400,
        `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`
      );
    }

    await Role.findByIdAndDelete(roleId);

    CreateSuccessResponse(res, 200, "Role deleted successfully");
  } catch (error: any) {
    console.error("Error deleting role:", error);
    CreateErrorResponse(res, 500, "Failed to delete role");
  }
};

/**
 * @swagger
 * /api/admin/roles/dropdown:
 *   get:
 *     summary: Get roles for dropdown
 *     tags: [Role]
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *       500:
 *         description: Failed to retrieve roles
 */
export const getRolesForDropdown = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find({}, { name: 1 }).sort({ name: 1 });

    CreateSuccessResponse(res, 200, "Roles retrieved successfully", roles);
  } catch (error: any) {
    console.error("Error getting roles for dropdown:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve roles");
  }
};

/**
 * @swagger
 * /api/admin/roles/check-name:
 *   get:
 *     summary: Check if role name exists
 *     tags: [Role]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Role name to check
 *       - in: query
 *         name: excludeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Exclude this role ID from check
 *     responses:
 *       200:
 *         description: Role name check completed
 *       500:
 *         description: Failed to check role name
 */
export const checkRoleName = async (req: Request, res: Response) => {
  try {
    const { name, excludeId } = req.query;

    if (!name) {
      return CreateErrorResponse(res, 400, "Role name is required");
    }

    const query: any = { name };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingRole = await Role.findOne(query);
    const exists = !!existingRole;

    CreateSuccessResponse(res, 200, "Role name check completed", { exists });
  } catch (error: any) {
    console.error("Error checking role name:", error);
    CreateErrorResponse(res, 500, "Failed to check role name");
  }
};
