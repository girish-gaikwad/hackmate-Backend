const { Resend } = require("resend");
const config = require("../config/env");

const resend = new Resend(config.RESEND_API_KEY);


class EmailService {
  // Generate OTP
  static generateOTP() {
    return Math.floor(Math.random() * 900000 + 100000)
      .toString()
      .slice(0, 6);
  }

  // Calculate OTP expiry
  static getOTPExpiry() {
    return new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  // Check if OTP is expired
  static isOTPExpired(expiryDate) {
    return new Date() > new Date(expiryDate);
  }

  // Send registration OTP email
  static async sendRegistrationOTP(email, otp) {
    try {
      const response = await resend.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: email,
        subject: "HackMate - Email Verification OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Welcome to HackMate!</p>
            <p>Your OTP for email verification is:</p>
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center;">
              <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP is valid for <strong>${config.OTP_EXPIRY_MINUTES} minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">HackMate Authentication System</p>
          </div>
        `,
      });

      return response;
    } catch (error) {
      console.error("Error sending registration OTP:", error);
      throw new Error("Failed to send OTP email");
    }
  }

  // Send password reset OTP email
  static async sendPasswordResetOTP(email, otp) {
    try {
      const response = await resend.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: email,
        subject: "HackMate - Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>We received a request to reset your password.</p>
            <p>Your OTP for password reset is:</p>
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center;">
              <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP is valid for <strong>${config.OTP_EXPIRY_MINUTES} minutes</strong>.</p>
            <p><strong>Security Note:</strong> If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">HackMate Authentication System</p>
          </div>
        `,
      });

      return response;
    } catch (error) {
      console.error("Error sending password reset OTP:", error);
      throw new Error("Failed to send OTP email");
    }
  }

  // Send welcome email after successful registration
  static async sendWelcomeEmail(email, userName = "User") {
    try {
      const response = await resend.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: email,
        subject: "Welcome to HackMate! 🚀",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome ${userName}!</h2>
            <p>Your account has been created successfully. You're all set to explore HackMate.</p>
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; border-left: 4px solid #4caf50;">
              <p style="margin: 0; color: #2e7d32;">✓ Email verified</p>
              <p style="margin: 0; color: #2e7d32;">✓ Account activated</p>
            </div>
            <p style="margin-top: 20px;">You can now log in with your credentials.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">HackMate Authentication System</p>
          </div>
        `,
      });

      return response;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw new Error("Failed to send welcome email");
    }
  }
}

module.exports = EmailService;
