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
  EMAIL_AND_PASSWORD_WRONG: "Invalid email or password",
  EMAIL_NOT_FOUND: "Email not found",
  WRONG_PASSWORD: "Incorrect password",
  OTP_EXPIRED: "OTP expired or invalid",
};