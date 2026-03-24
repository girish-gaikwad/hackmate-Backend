const { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendNotificationEmail } = require('../utils/sendEmail');
const logger = require('../utils/logger');

/**
 * Email Service - Handles all email operations
 */
class EmailService {
  /**
   * Send verification email to user
   * @param {Object} user - User object
   * @param {string} token - Verification token
   */
  static async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    try {
      await sendVerificationEmail(user.email, user.firstName, verificationUrl);
      logger.info(`Verification email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send verification email to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send password reset email to user
   * @param {Object} user - User object
   * @param {string} token - Reset token
   */
  static async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    try {
      await sendPasswordResetEmail(user.email, user.firstName, resetUrl);
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send welcome email after verification
   * @param {Object} user - User object
   */
  static async sendWelcomeEmail(user) {
    const subject = 'Welcome to Hackathon Companion!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to the Community!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName}!</h2>
            <p>Your email has been verified and your account is now active. You're now part of the ${user.collegeName} hackathon community!</p>
            
            <h3>What you can do now:</h3>
            <div class="feature">🔍 <strong>Discover Hackathons</strong> - Browse upcoming hackathons from top platforms</div>
            <div class="feature">👥 <strong>Find Teammates</strong> - Connect with fellow students from your college</div>
            <div class="feature">📚 <strong>Share Resources</strong> - Exchange code, designs, and tutorials</div>
            <div class="feature">💬 <strong>Chat</strong> - Message potential teammates directly</div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/hackathons" class="button">Start Exploring</a>
            </p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy Hacking! 🚀</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Hackathon Companion. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject,
        html,
        text: `Welcome to Hackathon Companion, ${user.firstName}! Your email has been verified.`,
      });
      logger.info(`Welcome email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${user.email}: ${error.message}`);
      // Don't throw error for welcome emails - not critical
    }
  }

  /**
   * Send team invitation email
   * @param {Object} invitee - User being invited
   * @param {Object} inviter - User sending invitation
   * @param {Object} team - Team object
   */
  static async sendTeamInvitationEmail(invitee, inviter, team) {
    const title = `Team Invitation: ${team.teamName}`;
    const message = `${inviter.firstName} ${inviter.lastName} has invited you to join their team "${team.teamName}" for a hackathon. Check the app to accept or decline the invitation.`;
    const actionUrl = `${process.env.FRONTEND_URL}/teams/${team._id}`;

    try {
      await sendNotificationEmail(invitee.email, invitee.firstName, title, message, actionUrl);
      logger.info(`Team invitation email sent to ${invitee.email}`);
    } catch (error) {
      logger.error(`Failed to send team invitation email to ${invitee.email}: ${error.message}`);
    }
  }

  /**
   * Send teammate interest notification
   * @param {Object} requestOwner - Owner of teammate request
   * @param {Object} interestedUser - User expressing interest
   * @param {Object} request - Teammate request object
   */
  static async sendTeammateInterestEmail(requestOwner, interestedUser, request) {
    const title = 'New Interest in Your Teammate Request';
    const message = `${interestedUser.firstName} ${interestedUser.lastName} is interested in joining your team for "${request.title}". Check their profile and respond to their interest.`;
    const actionUrl = `${process.env.FRONTEND_URL}/teammate-requests/${request._id}`;

    try {
      await sendNotificationEmail(requestOwner.email, requestOwner.firstName, title, message, actionUrl);
      logger.info(`Teammate interest email sent to ${requestOwner.email}`);
    } catch (error) {
      logger.error(`Failed to send teammate interest email to ${requestOwner.email}: ${error.message}`);
    }
  }

  /**
   * Send hackathon deadline reminder
   * @param {Object} user - User object
   * @param {Object} hackathon - Hackathon object
   * @param {number} daysRemaining - Days until deadline
   */
  static async sendHackathonReminderEmail(user, hackathon, daysRemaining) {
    const title = `Reminder: ${hackathon.name} ${daysRemaining === 0 ? 'Starts Today!' : `Starts in ${daysRemaining} Day(s)`}`;
    const message = daysRemaining === 0
      ? `The hackathon "${hackathon.name}" starts today! Make sure you're ready to participate.`
      : `The hackathon "${hackathon.name}" starts in ${daysRemaining} day(s). Don't forget to prepare!`;
    const actionUrl = `${process.env.FRONTEND_URL}/hackathons/${hackathon.slug}`;

    try {
      await sendNotificationEmail(user.email, user.firstName, title, message, actionUrl);
      logger.info(`Hackathon reminder email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send hackathon reminder email to ${user.email}: ${error.message}`);
    }
  }

  /**
   * Send bulk emails (with rate limiting)
   * @param {Array} emails - Array of email configurations
   * @param {number} delayMs - Delay between emails in ms
   */
  static async sendBulkEmails(emails, delayMs = 100) {
    const results = [];
    
    for (const emailConfig of emails) {
      try {
        await sendEmail(emailConfig);
        results.push({ email: emailConfig.to, success: true });
        
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        results.push({ email: emailConfig.to, success: false, error: error.message });
        logger.error(`Bulk email failed for ${emailConfig.to}: ${error.message}`);
      }
    }

    return results;
  }
}

module.exports = EmailService;
