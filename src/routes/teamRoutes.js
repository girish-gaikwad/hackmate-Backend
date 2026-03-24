const express = require('express');
const router = express.Router();
const { teamController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { teamValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/v1/teams:
 *   get:
 *     summary: Get all teams
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hackathon
 *         schema:
 *           type: string
 *       - in: query
 *         name: lookingForMembers
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teams retrieved
 */
router.get(
  '/',
  protect,
  teamController.getTeams
);

/**
 * @swagger
 * /api/v1/teams/my-teams:
 *   get:
 *     summary: Get current user's teams
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's teams retrieved
 */
router.get(
  '/my-teams',
  protect,
  teamController.getMyTeams
);

/**
 * @swagger
 * /api/v1/teams/invitations:
 *   get:
 *     summary: Get pending team invitations
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invitations retrieved
 */
router.get(
  '/invitations',
  protect,
  teamController.getMyInvitations
);

/**
 * @swagger
 * /api/v1/teams/looking-for-members:
 *   get:
 *     summary: Get teams looking for members
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hackathon
 *         schema:
 *           type: string
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teams retrieved
 */
router.get(
  '/looking-for-members',
  protect,
  teamController.getTeamsLookingForMembers
);

/**
 * @swagger
 * /api/v1/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTeamInput'
 *     responses:
 *       201:
 *         description: Team created successfully
 */
router.post(
  '/',
  protect,
  validate(teamValidation.createTeam),
  teamController.createTeam
);

/**
 * @swagger
 * /api/v1/teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team retrieved
 *       404:
 *         description: Team not found
 */
router.get(
  '/:id',
  protect,
  teamController.getTeam
);

/**
 * @swagger
 * /api/v1/teams/{id}:
 *   put:
 *     summary: Update team (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team updated
 */
router.put(
  '/:id',
  protect,
  validate(teamValidation.updateTeam),
  teamController.updateTeam
);

/**
 * @swagger
 * /api/v1/teams/{id}:
 *   delete:
 *     summary: Delete team (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team deleted
 */
router.delete(
  '/:id',
  protect,
  teamController.deleteTeam
);

/**
 * @swagger
 * /api/v1/teams/{id}/invite:
 *   post:
 *     summary: Invite user to team (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post(
  '/:id/invite',
  protect,
  validate(teamValidation.inviteToTeam),
  teamController.inviteToTeam
);

/**
 * @swagger
 * /api/v1/teams/{id}/accept-invite:
 *   post:
 *     summary: Accept team invitation
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation accepted
 */
router.post(
  '/:id/accept-invite',
  protect,
  teamController.acceptInvitation
);

/**
 * @swagger
 * /api/v1/teams/{id}/decline-invite:
 *   post:
 *     summary: Decline team invitation
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation declined
 */
router.post(
  '/:id/decline-invite',
  protect,
  teamController.declineInvitation
);

/**
 * @swagger
 * /api/v1/teams/{id}/request-join:
 *   post:
 *     summary: Request to join team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Join request sent
 */
router.post(
  '/:id/request-join',
  protect,
  validate(teamValidation.requestToJoin),
  teamController.requestToJoin
);

/**
 * @swagger
 * /api/v1/teams/{id}/accept-request/{userId}:
 *   post:
 *     summary: Accept join request (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request accepted
 */
router.post(
  '/:id/accept-request/:userId',
  protect,
  teamController.acceptJoinRequest
);

/**
 * @swagger
 * /api/v1/teams/{id}/reject-request/{userId}:
 *   post:
 *     summary: Reject join request (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request rejected
 */
router.post(
  '/:id/reject-request/:userId',
  protect,
  teamController.rejectJoinRequest
);

/**
 * @swagger
 * /api/v1/teams/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from team (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete(
  '/:id/members/:userId',
  protect,
  teamController.removeMember
);

/**
 * @swagger
 * /api/v1/teams/{id}/leave:
 *   post:
 *     summary: Leave team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left team successfully
 */
router.post(
  '/:id/leave',
  protect,
  teamController.leaveTeam
);

/**
 * @swagger
 * /api/v1/teams/{id}/transfer-leadership:
 *   post:
 *     summary: Transfer team leadership (Leader only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newLeaderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leadership transferred
 */
router.post(
  '/:id/transfer-leadership',
  protect,
  validate(teamValidation.transferLeadership),
  teamController.transferLeadership
);

module.exports = router;
