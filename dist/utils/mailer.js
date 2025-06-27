"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailForgotPassword = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 465,
    secure: false,
    auth: {
        user: "e2663260cd36ad",
        pass: "69f60b1862defd",
    },
});
const sendMailForgotPassword = async function (to, otpCode) {
    return await transporter.sendMail({
        to: to,
        subject: "Your Password Reset OTP Code",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password. Please use the OTP code below to proceed:</p>
        
        <div style="font-size: 24px; font-weight: bold; background-color: #f2f2f2; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px;">
          ${otpCode}
        </div>

        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request a password reset, please ignore this email or contact support.</p>
        
        <p>Thank you,<br>Your App Team</p>
      </div>
    `,
    });
};
exports.sendMailForgotPassword = sendMailForgotPassword;
