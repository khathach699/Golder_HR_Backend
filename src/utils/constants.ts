export const VALIDATOR_ERRORS = {
  EMAIL: "Invalid email format",
  PASSWORD:
    "Password must be at least %d characters long with %d lowercase, %d uppercase, %d number, and %d symbol",
  FULLNAME: "Fullname must be at least %d characters long",
};

export const AUTH_ERRORS = {
  UNAUTHORIZED: "Unauthorized access",
  AUTHENTICATION_REQUIRED: "Authentication required",
  JWT_NOT_DEFINED: "JWT secret not defined",
  INVALID_TOKEN: "Invalid or expired token",
  ROLE_NOT_FOUND: "Role not found",
  EMAIL_OR_PASSWORD_WRONG: "Invalid email or password",
  EMAIL_NOT_FOUND: "Email not found",
  EMAIL_ALREADY_EXISTS:"Email already exists",
  WRONG_PASSWORD: "Incorrect password",
  OTP_EXPIRED_OR_INVALID: "OTP expired or invalid",
  INVALID_OR_EXPIRED_TOKEN:"Invalid or expired token",
  USER_NOT_FOUND: "User not found",
 
  USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE: 'User not found or no reference image provided',
};

