import { Request, Response } from "express";
import Organization from "../models/organization";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";

/**
 * @swagger
 * /api/admin/departments:
 *   get:
 *     summary: Get all departments with pagination and search
 *     tags: [Department]
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
 *         description: Search by department name
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include deleted departments
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 *       500:
 *         description: Failed to retrieve departments
 */
export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const includeDeleted = req.query.includeDeleted === "true";

    const query: any = {};

    // Add search functionality
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Include/exclude deleted departments
    if (!includeDeleted) {
      query.isdeleted = false;
    }

    const skip = (page - 1) * limit;

    const [departments, total] = await Promise.all([
      Organization.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Organization.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    CreateSuccessResponse(res, 200, "Departments retrieved successfully", {
      departments,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    console.error("Error getting departments:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve departments");
  }
};

/**
 * @swagger
 * /api/admin/departments/{departmentId}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department retrieved successfully
 *       404:
 *         description: Department not found
 *       500:
 *         description: Failed to retrieve department
 */
export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;

    const department = await Organization.findById(departmentId);

    if (!department) {
      return CreateErrorResponse(res, 404, "Department not found");
    }

    CreateSuccessResponse(
      res,
      200,
      "Department retrieved successfully",
      department
    );
  } catch (error: any) {
    console.error("Error getting department:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve department");
  }
};

/**
 * @swagger
 * /api/admin/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Department]
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
 *                 description: Department name
 *               description:
 *                 type: string
 *                 description: Department description
 *               code:
 *                 type: string
 *                 description: Department code
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Department with this name or code already exists
 *       500:
 *         description: Failed to create department
 */
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, description, code } = req.body;

    // Check if department already exists
    const existingDepartment = await Organization.findOne({
      $or: [{ name }, ...(code ? [{ code }] : [])],
    });

    if (existingDepartment) {
      return CreateErrorResponse(
        res,
        400,
        "Department with this name or code already exists"
      );
    }

    const department = new Organization({
      name,
      description,
      code,
      isActive: true,
      isdeleted: false,
      isdisable: false,
    });

    await department.save();

    CreateSuccessResponse(
      res,
      201,
      "Department created successfully",
      department
    );
  } catch (error: any) {
    console.error("Error creating department:", error);
    if (error.code === 11000) {
      CreateErrorResponse(
        res,
        400,
        "Department with this name or code already exists"
      );
    } else {
      CreateErrorResponse(res, 500, "Failed to create department");
    }
  }
};

/**
 * @swagger
 * /api/admin/departments/{departmentId}:
 *   put:
 *     summary: Update a department
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New department name
 *               description:
 *                 type: string
 *                 description: New department description
 *               code:
 *                 type: string
 *                 description: New department code
 *               isActive:
 *                 type: boolean
 *                 description: Department active status
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       400:
 *         description: Department with this name or code already exists
 *       404:
 *         description: Department not found
 *       500:
 *         description: Failed to update department
 */
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const { name, description, code, isActive } = req.body;

    // Check if department exists
    const department = await Organization.findById(departmentId);
    if (!department) {
      return CreateErrorResponse(res, 404, "Department not found");
    }

    // Check if new name/code already exists (excluding current department)
    if (name || code) {
      const existingDepartment = await Organization.findOne({
        $or: [...(name ? [{ name }] : []), ...(code ? [{ code }] : [])],
        _id: { $ne: departmentId },
      });

      if (existingDepartment) {
        return CreateErrorResponse(
          res,
          400,
          "Department with this name or code already exists"
        );
      }
    }

    // Update department
    const updatedDepartment = await Organization.findByIdAndUpdate(
      departmentId,
      {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(code !== undefined && { code }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );

    CreateSuccessResponse(
      res,
      200,
      "Department updated successfully",
      updatedDepartment
    );
  } catch (error: any) {
    console.error("Error updating department:", error);
    if (error.code === 11000) {
      CreateErrorResponse(
        res,
        400,
        "Department with this name or code already exists"
      );
    } else {
      CreateErrorResponse(res, 500, "Failed to update department");
    }
  }
};

/**
 * @swagger
 * /api/admin/departments/{departmentId}:
 *   delete:
 *     summary: Soft delete a department
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       400:
 *         description: Cannot delete department (assigned to users)
 *       404:
 *         description: Department not found
 *       500:
 *         description: Failed to delete department
 */
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;

    // Check if department exists
    const department = await Organization.findById(departmentId);
    if (!department) {
      return CreateErrorResponse(res, 404, "Department not found");
    }

    // Check if department is being used by any users
    const User = require("../models/user").default;
    const usersInDepartment = await User.countDocuments({
      organization: departmentId,
    });

    if (usersInDepartment > 0) {
      return CreateErrorResponse(
        res,
        400,
        `Cannot delete department. ${usersInDepartment} user(s) are assigned to this department.`
      );
    }

    // Soft delete
    await Organization.findByIdAndUpdate(departmentId, { isdeleted: true });

    CreateSuccessResponse(res, 200, "Department deleted successfully");
  } catch (error: any) {
    console.error("Error deleting department:", error);
    CreateErrorResponse(res, 500, "Failed to delete department");
  }
};

/**
 * @swagger
 * /api/admin/departments/{departmentId}/restore:
 *   patch:
 *     summary: Restore a soft deleted department
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department restored successfully
 *       404:
 *         description: Department not found
 *       500:
 *         description: Failed to restore department
 */
export const restoreDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;

    const department = await Organization.findByIdAndUpdate(
      departmentId,
      { isdeleted: false },
      { new: true }
    );

    if (!department) {
      return CreateErrorResponse(res, 404, "Department not found");
    }

    CreateSuccessResponse(
      res,
      200,
      "Department restored successfully",
      department
    );
  } catch (error: any) {
    console.error("Error restoring department:", error);
    CreateErrorResponse(res, 500, "Failed to restore department");
  }
};

/**
 * @swagger
 * /api/admin/departments/dropdown:
 *   get:
 *     summary: Get departments for dropdown
 *     tags: [Department]
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 *       500:
 *         description: Failed to retrieve departments
 */
export const getDepartmentsForDropdown = async (
  req: Request,
  res: Response
) => {
  try {
    const departments = await Organization.find(
      { isdeleted: false, isActive: true },
      { name: 1, code: 1 }
    ).sort({ name: 1 });

    CreateSuccessResponse(
      res,
      200,
      "Departments retrieved successfully",
      departments
    );
  } catch (error: any) {
    console.error("Error getting departments for dropdown:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve departments");
  }
};

/**
 * @swagger
 * /api/admin/departments/check-name:
 *   get:
 *     summary: Check if department name exists
 *     tags: [Department]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Department name to check
 *       - in: query
 *         name: excludeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Exclude this department ID from check
 *     responses:
 *       200:
 *         description: Department name check completed
 *       500:
 *         description: Failed to check department name
 */
export const checkDepartmentName = async (req: Request, res: Response) => {
  try {
    const { name, excludeId } = req.query;

    if (!name) {
      return CreateErrorResponse(res, 400, "Department name is required");
    }

    const query: any = { name };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingDepartment = await Organization.findOne(query);
    const exists = !!existingDepartment;

    CreateSuccessResponse(res, 200, "Department name check completed", {
      exists,
    });
  } catch (error: any) {
    console.error("Error checking department name:", error);
    CreateErrorResponse(res, 500, "Failed to check department name");
  }
};

/**
 * @swagger
 * /api/admin/departments/check-code:
 *   get:
 *     summary: Check if department code exists
 *     tags: [Department]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Department code to check
 *       - in: query
 *         name: excludeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Exclude this department ID from check
 *     responses:
 *       200:
 *         description: Department code check completed
 *       500:
 *         description: Failed to check department code
 */
export const checkDepartmentCode = async (req: Request, res: Response) => {
  try {
    const { code, excludeId } = req.query;

    if (!code) {
      return CreateErrorResponse(res, 400, "Department code is required");
    }

    const query: any = { code };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingDepartment = await Organization.findOne(query);
    const exists = !!existingDepartment;

    CreateSuccessResponse(res, 200, "Department code check completed", {
      exists,
    });
  } catch (error: any) {
    console.error("Error checking department code:", error);
    CreateErrorResponse(res, 500, "Failed to check department code");
  }
};

/**
 * @swagger
 * /api/admin/departments/{departmentId}/toggle-status:
 *   patch:
 *     summary: Toggle department active/inactive status
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department status updated successfully
 *       404:
 *         description: Department not found
 *       500:
 *         description: Failed to toggle department status
 */
export const toggleDepartmentStatus = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;

    // Check if department exists
    const department = await Organization.findById(departmentId);
    if (!department) {
      return CreateErrorResponse(res, 404, "Department not found");
    }

    // Toggle isActive status
    const updatedDepartment = await Organization.findByIdAndUpdate(
      departmentId,
      { isActive: !department.isActive },
      { new: true, runValidators: true }
    );

    CreateSuccessResponse(
      res,
      200,
      "Department status updated successfully",
      updatedDepartment
    );
  } catch (error: any) {
    console.error("Error toggling department status:", error);
    CreateErrorResponse(res, 500, "Failed to toggle department status");
  }
};

/**
 * @swagger
 * /api/admin/departments/hierarchy:
 *   get:
 *     summary: Get department hierarchy
 *     tags: [Department]
 *     responses:
 *       200:
 *         description: Department hierarchy retrieved successfully
 *       500:
 *         description: Failed to retrieve department hierarchy
 */
export const getDepartmentHierarchy = async (req: Request, res: Response) => {
  try {
    const departments = await Organization.find(
      { isdeleted: false },
      { name: 1, code: 1, parentId: 1, isActive: 1 }
    ).sort({ name: 1 });

    // Build hierarchy structure (simple flat list for now)
    // You can enhance this to build actual tree structure if needed
    CreateSuccessResponse(
      res,
      200,
      "Department hierarchy retrieved successfully",
      departments
    );
  } catch (error: any) {
    console.error("Error getting department hierarchy:", error);
    CreateErrorResponse(res, 500, "Failed to retrieve department hierarchy");
  }
};
