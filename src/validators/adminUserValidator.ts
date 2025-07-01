// File: src/validators/adminUserValidator.ts

import { body, query, param } from "express-validator";
import { VALIDATOR_ERRORS } from "../utils/constants";

const passwordOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

const fullnameOptions = {
  minLength: 3,
};

// === CREATE USER VALIDATORS ===
export const CreateUserValidator = [
  body("fullname")
    .isLength({ min: fullnameOptions.minLength })
    .withMessage(
      `Fullname must be at least ${fullnameOptions.minLength} characters long`
    )
    .trim(),
  
  body("email")
    .isEmail()
    .withMessage(VALIDATOR_ERRORS.EMAIL)
    .normalizeEmail(),
  
  body("password")
    .isStrongPassword(passwordOptions)
    .withMessage(
      `Password must be at least ${passwordOptions.minLength} characters long with ${passwordOptions.minLowercase} lowercase, ${passwordOptions.minUppercase} uppercase, ${passwordOptions.minNumbers} number, and ${passwordOptions.minSymbols} symbol`
    ),
  
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number format"),
  
  body("department")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters")
    .trim(),
  
  body("position")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position must be between 2 and 100 characters")
    .trim(),
  
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["admin", "hr", "manager", "user"])
    .withMessage("Role must be one of: admin, hr, manager, user"),
  
  body("organization")
    .optional()
    .isMongoId()
    .withMessage("Invalid organization ID format")
];

// === UPDATE USER VALIDATORS ===
export const UpdateUserValidator = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID format"),
  
  body("fullname")
    .optional()
    .isLength({ min: fullnameOptions.minLength })
    .withMessage(
      `Fullname must be at least ${fullnameOptions.minLength} characters long`
    )
    .trim(),
  
  body("email")
    .optional()
    .isEmail()
    .withMessage(VALIDATOR_ERRORS.EMAIL)
    .normalizeEmail(),
  
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number format"),
  
  body("department")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters")
    .trim(),
  
  body("position")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position must be between 2 and 100 characters")
    .trim(),
  
  body("role")
    .optional()
    .isIn(["admin", "hr", "manager", "user"])
    .withMessage("Role must be one of: admin, hr, manager, user"),
  
  body("organization")
    .optional()
    .isMongoId()
    .withMessage("Invalid organization ID format"),
  
  body("isdisable")
    .optional()
    .isBoolean()
    .withMessage("isdisable must be a boolean value")
];

// === GET USERS LIST VALIDATORS ===
export const GetUsersListValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  
  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters")
    .trim(),
  
  query("role")
    .optional()
    .isIn(["admin", "hr", "manager", "user"])
    .withMessage("Role must be one of: admin, hr, manager, user"),
  
  query("department")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters")
    .trim(),
  
  query("includeDeleted")
    .optional()
    .isBoolean()
    .withMessage("includeDeleted must be a boolean value")
    .toBoolean(),
  
  query("sortBy")
    .optional()
    .isIn(["fullname", "email", "department", "position", "createdAt", "updatedAt"])
    .withMessage("sortBy must be one of: fullname, email, department, position, createdAt, updatedAt"),
  
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be either 'asc' or 'desc'")
];

// === USER ID VALIDATORS ===
export const UserIdValidator = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID format")
];

// === RESET PASSWORD VALIDATOR ===
export const ResetUserPasswordValidator = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID format"),
  
  body("newPassword")
    .isStrongPassword(passwordOptions)
    .withMessage(
      `New password must be at least ${passwordOptions.minLength} characters long with ${passwordOptions.minLowercase} lowercase, ${passwordOptions.minUppercase} uppercase, ${passwordOptions.minNumbers} number, and ${passwordOptions.minSymbols} symbol`
    )
];

// === BULK OPERATIONS VALIDATORS ===
export const BulkDeleteValidator = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("userIds must be a non-empty array"),
  
  body("userIds.*")
    .isMongoId()
    .withMessage("Each user ID must be a valid MongoDB ObjectId")
];

export const BulkRestoreValidator = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("userIds must be a non-empty array"),
  
  body("userIds.*")
    .isMongoId()
    .withMessage("Each user ID must be a valid MongoDB ObjectId")
];

export const BulkToggleStatusValidator = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("userIds must be a non-empty array"),
  
  body("userIds.*")
    .isMongoId()
    .withMessage("Each user ID must be a valid MongoDB ObjectId"),
  
  body("disable")
    .isBoolean()
    .withMessage("disable must be a boolean value")
];

// === ASSIGN ROLE VALIDATOR ===
export const AssignRoleValidator = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID format"),
  
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["admin", "hr", "manager", "user"])
    .withMessage("Role must be one of: admin, hr, manager, user")
];

// === ASSIGN ORGANIZATION VALIDATOR ===
export const AssignOrganizationValidator = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID format"),
  
  body("organizationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid organization ID format")
];
