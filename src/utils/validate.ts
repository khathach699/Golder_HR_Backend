import { Request, Response, NextFunction } from "express";
import { validationResult, body } from "express-validator";
import { VALIDATOR_ERRORS } from "../utils/constants";
import { CreateErrorResponse } from "../utils/responseHandler";

const options = {
  password: {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  },
  fullname: {
    minLength: 3,
  },
};

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join(", ");
    return CreateErrorResponse(res, 400, errorMessages);
  }
  next();
};

export const SignupValidator = [
  body("email").isEmail().withMessage(VALIDATOR_ERRORS.EMAIL),
  body("password")
    .isStrongPassword(options.password)
    .withMessage(
      `Password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`
    ),
  body("fullname")
    .isLength({ min: options.fullname.minLength })
    .withMessage(`Fullname must be at least ${options.fullname.minLength} characters long`),
];

export const LoginValidator = [
  body("email").isEmail().withMessage(VALIDATOR_ERRORS.EMAIL),
  body("password")
    .isStrongPassword(options.password)
    .withMessage(
      `Password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`
    ),
];

export const ChangePasswordValidator = [
  body("oldPassword")
    .isStrongPassword(options.password)
    .withMessage(
      `Old password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`
    ),
  body("newPassword")
    .isStrongPassword(options.password)
    .withMessage(
      `New password must be at least ${options.password.minLength} characters long with ${options.password.minLowercase} lowercase, ${options.password.minUppercase} uppercase, ${options.password.minNumbers} number, and ${options.password.minSymbols} symbol`
    ),
];