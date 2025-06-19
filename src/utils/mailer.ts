import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 465,
  secure: false,
  auth: {
    user: "e2663260cd36ad",
    pass: "69f60b1862defd",
  },
});

export const sendMailForgotPassword = async function (
  to: string,
  otpCode: string
) {
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