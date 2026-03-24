const authValidation = require('./authValidation');
const userValidation = require('./userValidation');
const hackathonValidation = require('./hackathonValidation');
const teammateRequestValidation = require('./teammateRequestValidation');
const teamValidation = require('./teamValidation');
const resourceValidation = require('./resourceValidation');
const commonValidation = require('./commonValidation');

module.exports = {
  authValidation: {
    register: { body: authValidation.registerSchema },
    login: { body: authValidation.loginSchema },
    forgotPassword: { body: authValidation.forgotPasswordSchema },
    resetPassword: { body: authValidation.resetPasswordSchema },
    verifyEmail: { body: authValidation.verifyEmailSchema },
    changePassword: { body: authValidation.changePasswordSchema },
    refreshToken: { body: authValidation.refreshTokenSchema },
    resendVerification: { body: authValidation.forgotPasswordSchema }, // Same as forgotPassword - just needs email
  },
  userValidation: {
    updateProfile: { body: userValidation.updateProfileSchema },
    updateNotificationSettings: { body: userValidation.updateNotificationSettingsSchema },
  },
  hackathonValidation: {
    createHackathon: { body: hackathonValidation.createHackathonSchema },
    updateHackathon: { body: hackathonValidation.updateHackathonSchema },
    getHackathons: { query: hackathonValidation.getHackathonsSchema },
  },
  teammateRequestValidation: {
    createRequest: { body: teammateRequestValidation.createTeammateRequestSchema },
    updateRequest: { body: teammateRequestValidation.updateTeammateRequestSchema },
    expressInterest: { body: teammateRequestValidation.expressInterestSchema },
  },
  teamValidation: {
    createTeam: { body: teamValidation.createTeamSchema },
    updateTeam: { body: teamValidation.updateTeamSchema },
    inviteToTeam: { body: teamValidation.inviteToTeamSchema },
    respondToInvitation: { body: teamValidation.respondToInvitationSchema },
    respondToJoinRequest: { body: teamValidation.respondToJoinRequestSchema },
  },
  resourceValidation: {
    createResource: { body: resourceValidation.createResourceSchema },
    updateResource: { body: resourceValidation.updateResourceSchema },
    addComment: { body: resourceValidation.addCommentSchema },
  },
  commonValidation,
};
