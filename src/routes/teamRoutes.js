const express = require('express');
const router = express.Router();
const { teamController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { teamValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');


router.get(
  '/',
  protect,
  teamController.getTeams
);


router.get(
  '/my-teams',
  protect,
  teamController.getMyTeams
);


router.get(
  '/invitations',
  protect,
  teamController.getMyInvitations
);


router.get(
  '/looking-for-members',
  protect,
  teamController.getTeamsLookingForMembers
);


router.post(
  '/',
  protect,
  validate(teamValidation.createTeam),
  teamController.createTeam
);


router.get(
  '/:id',
  protect,
  teamController.getTeam
);


router.put(
  '/:id',
  protect,
  validate(teamValidation.updateTeam),
  teamController.updateTeam
);


router.delete(
  '/:id',
  protect,
  teamController.deleteTeam
);


router.post(
  '/:id/invite',
  protect,
  validate(teamValidation.inviteToTeam),
  teamController.inviteToTeam
);


router.post(
  '/:id/accept-invite',
  protect,
  teamController.acceptInvitation
);


router.post(
  '/:id/decline-invite',
  protect,
  teamController.declineInvitation
);


router.post(
  '/:id/request-join',
  protect,
  validate(teamValidation.requestToJoin),
  teamController.requestToJoin
);


router.post(
  '/:id/accept-request/:userId',
  protect,
  teamController.acceptJoinRequest
);


router.post(
  '/:id/reject-request/:userId',
  protect,
  teamController.rejectJoinRequest
);


router.delete(
  '/:id/members/:userId',
  protect,
  teamController.removeMember
);


router.post(
  '/:id/leave',
  protect,
  teamController.leaveTeam
);


router.post(
  '/:id/transfer-leadership',
  protect,
  validate(teamValidation.transferLeadership),
  teamController.transferLeadership
);

module.exports = router;
