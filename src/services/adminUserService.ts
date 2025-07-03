// File: src/services/adminUserService.ts

import User from "../models/user";
import Role from "../models/role";
import Organization from "../models/organization";
import { AUTH_ERRORS } from "../utils/constants";
import bcrypt from "bcrypt";

// === INTERFACE DEFINITIONS ===
export interface CreateUserData {
  fullname: string;
  email: string;
  password: string;
  phone?: string;
  department?: string;
  position?: string;
  role: string;
  organization?: string;
}

export interface UpdateUserData {
  fullname?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  role?: string;
  organization?: string;
  isdisable?: boolean;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  department?: string;
  includeDeleted?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// === ADMIN USER MANAGEMENT SERVICES ===

/**
 * Get all users with pagination and filtering (Admin only)
 */
export const getAllUsers = async (options: UserListOptions = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    role = "",
    department = "",
    includeDeleted = false,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  // Build query
  const query: any = {};

  // Include/exclude deleted users
  if (!includeDeleted) {
    query.isdeleted = false;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { fullname: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by department
  if (department) {
    query.department = department;
  }

  console.log(
    "🔍 [DEBUG] AdminUserService: Built query:",
    JSON.stringify(query)
  );
  console.log("🔍 [DEBUG] AdminUserService: Search term:", search);
  console.log("🔍 [DEBUG] AdminUserService: Role filter:", role);

  // Build aggregation pipeline for role filtering
  const pipeline: any[] = [
    { $match: query },
    {
      $lookup: {
        from: "roles",
        localField: "role",
        foreignField: "_id",
        as: "roleInfo",
      },
    },
    {
      $lookup: {
        from: "organizations",
        localField: "organization",
        foreignField: "_id",
        as: "organizationInfo",
      },
    },
  ];

  // Filter by role name (add after lookup but before addFields)
  if (role) {
    pipeline.push({
      $match: { "roleInfo.name": role },
    });
  }

  // Add fields and project
  pipeline.push(
    {
      $addFields: {
        role: { $arrayElemAt: ["$roleInfo", 0] },
        organization: { $arrayElemAt: ["$organizationInfo", 0] },
      },
    },
    {
      $project: {
        password: 0,
        otpCode: 0,
        otpExpires: 0,
        roleInfo: 0,
        organizationInfo: 0,
      },
    }
  );

  // Add sorting
  const sortObj: any = {};
  sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
  pipeline.push({ $sort: sortObj });

  // Add pagination
  pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

  // Execute aggregation
  const users = await User.aggregate(pipeline);

  // Get total count for pagination
  const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
  countPipeline.push({ $count: "total" });
  const countResult = await User.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

/**
 * Create a new user (Admin only)
 */
export const createUser = async (userData: CreateUserData) => {
  // Check if email already exists
  const existingUser = await User.findOne({
    email: userData.email,
    isdeleted: false,
  });

  if (existingUser) {
    throw new Error(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
  }

  // Validate role
  const roleObj = await Role.findOne({ name: userData.role });
  if (!roleObj) {
    throw new Error(AUTH_ERRORS.ROLE_NOT_FOUND);
  }

  // Validate organization if provided
  let organizationObj = null;
  if (userData.organization) {
    organizationObj = await Organization.findById(userData.organization);
    if (!organizationObj) {
      throw new Error("Organization not found");
    }
  }

  // Create new user
  const newUser = new User({
    fullname: userData.fullname,
    email: userData.email,
    password: userData.password, // Will be hashed by pre-save middleware
    phone: userData.phone,
    department: userData.department,
    position: userData.position,
    role: roleObj._id,
    organization: organizationObj?._id || null,
    isdisable: false,
    isdeleted: false,
  });

  const savedUser = await newUser.save();

  // Return user without sensitive data
  return await User.findById(savedUser._id)
    .populate("role", "name")
    .populate("organization", "name")
    .select("-password -otpCode -otpExpires");
};

/**
 * Update user information (Admin only)
 */
export const updateUser = async (
  userId: string,
  updateData: UpdateUserData
) => {
  // Find user
  const user = await User.findById(userId);
  if (!user || user.isdeleted) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  // Check email uniqueness if email is being updated
  if (updateData.email && updateData.email !== user.email) {
    const existingUser = await User.findOne({
      email: updateData.email,
      isdeleted: false,
      _id: { $ne: userId },
    });

    if (existingUser) {
      throw new Error(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
    }
  }

  // Validate role if being updated
  if (updateData.role) {
    const roleObj = await Role.findOne({ name: updateData.role });
    if (!roleObj) {
      throw new Error(AUTH_ERRORS.ROLE_NOT_FOUND);
    }
    updateData.role = roleObj._id as any;
  }

  // Validate organization if being updated
  if (updateData.organization) {
    const organizationObj = await Organization.findById(
      updateData.organization
    );
    if (!organizationObj) {
      throw new Error("Organization not found");
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate("role", "name")
    .populate("organization", "name")
    .select("-password -otpCode -otpExpires");

  return updatedUser;
};

/**
 * Soft delete user (Admin only)
 */
export const softDeleteUser = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || user.isdeleted) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  // Prevent admin from deleting themselves
  // This check should be done in the controller with req.user.id

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        isdeleted: true,
        isdisable: true, // Also disable the user
      },
    },
    { new: true }
  )
    .populate("role", "name")
    .populate("organization", "name")
    .select("-password -otpCode -otpExpires");

  return updatedUser;
};

/**
 * Restore soft deleted user (Admin only)
 */
export const restoreUser = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  if (!user.isdeleted) {
    throw new Error("User is not deleted");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        isdeleted: false,
        isdisable: false, // Also enable the user
      },
    },
    { new: true }
  )
    .populate("role", "name")
    .populate("organization", "name")
    .select("-password -otpCode -otpExpires");

  return updatedUser;
};

/**
 * Get user by ID with full details (Admin only)
 */
export const getUserById = async (userId: string) => {
  const user = await User.findById(userId)
    .populate("role", "name")
    .populate("organization", "name")
    .select("-password -otpCode -otpExpires");

  if (!user) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  return user;
};

/**
 * Toggle user active status (Admin only)
 */
export const toggleUserStatus = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || user.isdeleted) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { isdisable: !user.isdisable } },
    { new: true }
  )
    .populate("role", "name")
    .populate("organization", "name")
    .select("-password -otpCode -otpExpires");

  return updatedUser;
};

/**
 * Get user statistics (Admin only)
 */
export const getUserStatistics = async () => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: {
          $sum: {
            $cond: [{ $eq: ["$isdeleted", false] }, 1, 0],
          },
        },
        activeUsers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isdeleted", false] },
                  { $eq: ["$isdisable", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
        disabledUsers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isdeleted", false] },
                  { $eq: ["$isdisable", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
        deletedUsers: {
          $sum: {
            $cond: [{ $eq: ["$isdeleted", true] }, 1, 0],
          },
        },
      },
    },
  ]);

  const roleStats = await User.aggregate([
    { $match: { isdeleted: false } },
    {
      $lookup: {
        from: "roles",
        localField: "role",
        foreignField: "_id",
        as: "roleInfo",
      },
    },
    {
      $group: {
        _id: { $arrayElemAt: ["$roleInfo.name", 0] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const departmentStats = await User.aggregate([
    {
      $match: {
        isdeleted: false,
        $and: [
          { department: { $exists: true } },
          { department: { $ne: null } },
          { department: { $ne: "" } },
        ],
      },
    },
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return {
    overview: stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      disabledUsers: 0,
      deletedUsers: 0,
    },
    roleDistribution: roleStats,
    departmentDistribution: departmentStats,
  };
};
